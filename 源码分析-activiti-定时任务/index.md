# 源码分析 activiti 定时任务


> activiti 基于 8.0.0 版本

> 在这一节，详细介绍 `BoundaryEvent`, 这是工作流框架中很重要的节点，同时涉及到**定时任务**。

先来看看 `BoundaryEvent` 的 `xml` 定义

```xml
<userTask id="firstTask" name="First Task" />

<!-- 在到达 firstTask 节点时，会启动一个定时器 -->
<boundaryEvent id="escalationTimer1" cancelActivity="true" attachedToRef="firstTask">
  <timerEventDefinition>
    <timeDuration>PT2H</timeDuration>
  </timerEventDefinition>
</boundaryEvent>

<!-- 在定时器过期之后，会流转到 secondTask 节点 -->
<sequenceFlow id="flow3" sourceRef="escalationTimer1" targetRef="secondTask" />

<userTask id="secondTask" name="Second Task" />
```

## 执行 BoundaryEvent

源码位置: `org.activiti.engine.impl.agenda.ContinueProcessOperation#executeSynchronous`

```java
// 每流转一个节点，就会执行下面的方法
protected void executeSynchronous(FlowNode flowNode) {
  commandContext.getHistoryManager().recordActivityStart(execution);

  ....
  // Execute any boundary events, sub process boundary events will be executed from the activity behavior
  if (!inCompensation && flowNode instanceof Activity) { // Only activities can have boundary events
      List<BoundaryEvent> boundaryEvents = ((Activity) flowNode).getBoundaryEvents();
      if (CollectionUtil.isNotEmpty(boundaryEvents)) {
          // 执行 BoundaryEvent
          executeBoundaryEvents(boundaryEvents,
                                execution);
      }
  }

  // Execute actual behavior
  ActivityBehavior activityBehavior = (ActivityBehavior) flowNode.getBehavior();

  if (activityBehavior != null) {
      executeActivityBehavior(activityBehavior, flowNode);
  } else {
      logger.debug("No activityBehavior on activity '{}' with execution {}",
                   flowNode.getId(),
                   execution.getId());
      Context.getAgenda().planTakeOutgoingSequenceFlowsOperation(execution,
                                                                 true);
  }
}
```

源码位置: `org.activiti.engine.impl.agenda.ContinueProcessOperation#executeBoundaryEvents`

```java
// 执行 BoundaryEvent
protected void executeBoundaryEvents(Collection<BoundaryEvent> boundaryEvents,
                                   ExecutionEntity execution) {
  // The parent execution becomes a scope, and a child execution is created for each of the boundary events
  // 遍历 boundaryEvents
  for (BoundaryEvent boundaryEvent : boundaryEvents) {
      if (CollectionUtil.isEmpty(boundaryEvent.getEventDefinitions())
              || (boundaryEvent.getEventDefinitions().get(0) instanceof CompensateEventDefinition)) {
          continue;
      }

      // A Child execution of the current execution is created to represent the boundary event being active
      // 创建子节点, 会新增一条 ACT_RU_EXECUTION 表的数据
      ExecutionEntity childExecutionEntity = commandContext.getExecutionEntityManager().createChildExecution((ExecutionEntity) execution);
      childExecutionEntity.setParentId(execution.getId());
      childExecutionEntity.setCurrentFlowElement(boundaryEvent);
      childExecutionEntity.setScope(false);

      // 获取 behavior
      ActivityBehavior boundaryEventBehavior = ((ActivityBehavior) boundaryEvent.getBehavior());
      logger.debug("Executing boundary event activityBehavior {} with execution {}",
                   boundaryEventBehavior.getClass(),
                   childExecutionEntity.getId());
      // 执行 behavior
      boundaryEventBehavior.execute(childExecutionEntity);
  }
}
```

源码位置: `org.activiti.engine.impl.bpmn.behavior.BoundaryTimerEventActivityBehavior#execute`

```java
// 执行 behavior
public void execute(DelegateExecution execution) {
  ExecutionEntity executionEntity = (ExecutionEntity) execution;
  if (!(execution.getCurrentFlowElement() instanceof BoundaryEvent)) {
    throw new ActivitiException("Programmatic error: " + this.getClass() + " should not be used for anything else than a boundary event");
  }

  JobManager jobManager = Context.getCommandContext().getJobManager();
  // 创建定时任务
  TimerJobEntity timerJob = jobManager.createTimerJob(timerEventDefinition, interrupting, executionEntity, TriggerTimerEventJobHandler.TYPE,
      TimerEventHandler.createConfiguration(execution.getCurrentActivityId(), timerEventDefinition.getEndDate(), timerEventDefinition.getCalendarName()));
  if (timerJob != null) {
    // 调度定时任务, 会新增一条 ACT_RU_TIMER_JOB 表
    jobManager.scheduleTimerJob(timerJob);
  }
}

public void scheduleTimerJob(TimerJobEntity timerJob) {
  ...
  // 会新增一条 ACT_RU_TIMER_JOB 表
  processEngineConfiguration.getTimerJobEntityManager().insert(timerJob);
  ..
}
```

从上面的代码可以看出，当遇到 `BoundaryEvent` 时，数据库就会插入**两条数据**，分别为 `ACT_RU_EXECUTION` 和 `ACT_RU_TIMER_JOB`。当前节点如果**停住**了，这些数据就会**持久化**到数据库中。

## 轮询 timerJob

源码位置: `org.activiti.engine.impl.asyncexecutor.AcquireTimerJobsRunnable#run`

```java
// 在工作流框架启动时,这个轮询任务就会执行
public synchronized void run() {
  log.info("{} starting to acquire async jobs due");
  Thread.currentThread().setName("activiti-acquire-timer-jobs");

  final CommandExecutor commandExecutor = asyncExecutor.getProcessEngineConfiguration().getCommandExecutor();

  while (!isInterrupted) {
    try {
      // 获取到期的 timerJob
      final AcquiredTimerJobEntities acquiredJobs = commandExecutor.execute(new AcquireTimerJobsCmd(asyncExecutor));

      commandExecutor.execute(new Command<Void>() {
        @Override
        public Void execute(CommandContext commandContext) {
          for (TimerJobEntity job : acquiredJobs.getJobs()) {
            // 移动 timerJob 到 job 中，也就是 ACT_RU_TIMER_JOB 表数据到 ACT_RU_JOB 表
            jobManager.moveTimerJobToExecutableJob(job);
          }
          return null;
        }
      });

    } catch (ActivitiOptimisticLockingException optimisticLockingException) {
      // 发生这个异常，说明同时有另外一个服务获取相同的 timerJob
      if (log.isDebugEnabled()) {
        log.debug("Optimistic locking exception during timer job acquisition. If you have multiple timer executors running against the same database, "
            + "this exception means that this thread tried to acquire a timer job, which already was acquired by another timer executor acquisition thread."
            + "This is expected behavior in a clustered environment. "
            + "You can ignore this message if you indeed have multiple timer executor acquisition threads running against the same database. " + "Exception message: {}",
            optimisticLockingException.getMessage());
      }
    } catch (Throwable e) {
      log.error("exception during timer job acquisition: {}", e.getMessage(), e);
      millisToWait = asyncExecutor.getDefaultTimerJobAcquireWaitTimeInMillis();
    }
    ...省略等待的代码
  }
  log.info("{} stopped async job due acquisition");
}
```

源码位置: `org.activiti.engine.impl.cmd.AcquireTimerJobsCmd#execute`

```java
// 获取到期的 timerJob
public AcquiredTimerJobEntities execute(CommandContext commandContext) {
  AcquiredTimerJobEntities acquiredJobs = new AcquiredTimerJobEntities();
  // 查找到期的 timerJob, mapperId = selectTimerJobsToExecute
  List<TimerJobEntity> timerJobs = commandContext.getTimerJobEntityManager()
      .findTimerJobsToExecute(new Page(0, asyncExecutor.getMaxAsyncJobsDuePerAcquisition()));

  for (TimerJobEntity job : timerJobs) {
    // 锁定 timerJob, 防止有其他服务获取
    // 这里只是设置了属性，因为 TimerJobEntity 实现了 HasRevision 接口，会根据 reversion 来判断是否并发
    lockJob(commandContext, job, asyncExecutor.getAsyncJobLockTimeInMillis());
    acquiredJobs.addJob(job);
  }

  return acquiredJobs;
}
```

源码位置: `org.activiti.engine.impl.asyncexecutor.DefaultJobManager#moveTimerJobToExecutableJob`

```java
// 移动 timerJob 到 job 中
public JobEntity moveTimerJobToExecutableJob(TimerJobEntity timerJob) {
  ...
  // 创建 job
  JobEntity executableJob = createExecutableJobFromOtherJob(timerJob);
  // 插入 job
  boolean insertSuccesful = processEngineConfiguration.getJobEntityManager().insertJobEntity(executableJob);
  if (insertSuccesful) {
    // 删除 timerJob
    processEngineConfiguration.getTimerJobEntityManager().delete(timerJob);
    // 触发 job 执行，最终会执行 asyncExecutor.executeAsyncJob(job)
    triggerExecutorIfNeeded(executableJob);
    return executableJob;
  }
  return null;
}
```

从上面的代码可以看出，先会筛选**到期**的 `timerJob`, 然后**移动**到 `job` 中，然后再触发**执行**。

## 执行 job

源码位置: `org.activiti.engine.impl.asyncexecutor.DefaultAsyncJobExecutor#executeAsyncJob`

```java
// asyncExecutor.executeAsyncJob(job)
public boolean executeAsyncJob(final Job job) {
  Runnable runnable = null;
  if (isActive) {
    // 创建 ExecuteAsyncRunnable
    runnable = createRunnableForJob(job);

    try {
      // 执行 ExecuteAsyncRunnable
      executorService.execute(runnable);
    } catch (RejectedExecutionException e) {
      CommandContext commandContext = Context.getCommandContext();
      if (commandContext != null) {
        // 发生异常，解锁 job
        commandContext.getJobManager().unacquire(job);
      } else {
        processEngineConfiguration.getCommandExecutor().execute(new Command<Void>() {
          public Void execute(CommandContext commandContext) {
            // 发生异常，解锁 job
            commandContext.getJobManager().unacquire(job);
            return null;
          }
        });
      }
      // Job queue full, returning true so (if wanted) the acquiring can be throttled
      return false;
    }

  } else {
    temporaryJobQueue.add(job);
  }
  return true;
}
```

源码位置: `org.activiti.engine.impl.asyncexecutor.ExecuteAsyncRunnable#run`

```java
// 执行 ExecuteAsyncRunnable
public void run() {
  if (job == null) {
    job = processEngineConfiguration.getCommandExecutor().execute(new Command<JobEntity>() {
      @Override
      public JobEntity execute(CommandContext commandContext) {
        return commandContext.getJobEntityManager().findById(jobId);
      }
    });
  }
  runInternal();
}

protected void runInternal(){
  // 锁定 job
  boolean lockNotNeededOrSuccess = lockJobIfNeeded();
  if (lockNotNeededOrSuccess) {
      // 执行 job
      executeJob();
      // 解锁 job
      unlockJobIfNeeded();
  }
}
```

源码位置: `org.activiti.engine.impl.asyncexecutor.ExecuteAsyncRunnable#executeJob`

```java
// 执行 job
protected void executeJob() {
  try {
    // 执行 ExecuteAsyncJobCmd, 最终就会执行 commandContext.getJobManager().execute(job)
    processEngineConfiguration.getCommandExecutor().execute(new ExecuteAsyncJobCmd(jobId));
  } catch (final ActivitiOptimisticLockingException e) {
    // 处理失败的 job, 最终会执行 JobRetryCmd，这个就不解析了
    handleFailedJob(e);
  } catch (Throwable exception) {
    // 处理失败的 job, 最终会执行 JobRetryCmd，这个就不解析了
    handleFailedJob(exception);

    // Finally, Throw the exception to indicate the ExecuteAsyncJobCmd failed
    String message = "Job " + jobId + " failed";
    log.error(message, exception);
  }
}
```

源码位置: `org.activiti.engine.impl.asyncexecutor.DefaultJobManager#execute`

```java
// commandContext.getJobManager().execute(job)
@Override
public void execute(Job job) {
  if (job instanceof JobEntity) {
    if (Job.JOB_TYPE_MESSAGE.equals(job.getJobType())) {
      executeMessageJob((JobEntity) job);
    } else if (Job.JOB_TYPE_TIMER.equals(job.getJobType())) {
      // 执行 timerJob
      executeTimerJob((JobEntity) job);
    }
  } else {
    throw new ActivitiException("Only jobs with type JobEntity are supported to be executed");
  }
}
```

源码位置: `org.activiti.engine.impl.asyncexecutor.DefaultJobManager#executeTimerJob`

```java
// 执行 timerJob
protected void executeTimerJob(JobEntity timerEntity) {
  TimerJobEntityManager timerJobEntityManager = processEngineConfiguration.getTimerJobEntityManager();

  ...
  // timerJob 已经到期了，删除 timerJob, dueDate 属性是在 xml 文件中配置的
  if (timerEntity.getDuedate() != null && !isValidTime(timerEntity, timerEntity.getDuedate(), variableScope)) {
    if (logger.isDebugEnabled()) {
      logger.debug("Timer {} fired. but the dueDate is after the endDate.  Deleting timer.", timerEntity.getId());
    }
    processEngineConfiguration.getJobEntityManager().delete(timerEntity);
    return;
  }

  // 使用 jobHandler 来执行 job
  executeJobHandler(timerEntity);
  // 删除 job
  processEngineConfiguration.getJobEntityManager().delete(timerEntity);

  if (logger.isDebugEnabled()) {
    logger.debug("Timer {} fired. Deleting timer.", timerEntity.getId());
  }

  // repeat 属性不为空，继续创建 timerJob 来执行
  if (timerEntity.getRepeat() != null) {
    TimerJobEntity newTimerJobEntity = timerJobEntityManager.createAndCalculateNextTimer(timerEntity, variableScope);
    if (newTimerJobEntity != null) {
      scheduleTimerJob(newTimerJobEntity);
    }
  }
}
```

从上面的代码可以看出，当获取到一个 `job` 时，最终由 `jobManager` 负责执行 `job`。

## 测试类

**定时任务**的代码在**工作流**中是**最复杂**的，一定要多**调试**几遍。

`org.activiti.engine.test.bpmn.event.timer.BoundaryTimerEventTest#testMultipleTimersOnUserTask`
