# 07 常用的 ActivityBehavior


> activiti 基于 8.0.0 版本

> 通过在【agenda流转节点】章节，我们知道了每一个节点的**行为**由对应的 `behavior` 来决定，所以有必要看看**常用的 behavior 实现**。

## StartEvent

对应的 behavior 类: `NoneStartEventActivityBehavior`

可以运行 `org.activiti.examples.bpmn.receivetask.ReceiveTaskTest#testWaitStateBehavior` 来调试。

```java
// 没有实现 execute，直接使用父类的方法
public void execute(DelegateExecution execution) {
    // 离开节点
    leave(execution);
}
```

## ReceiveTask

对应的 behavior 类: `ReceiveTaskActivityBehavior`

可以运行 `org.activiti.examples.bpmn.receivetask.ReceiveTaskTest#testWaitStateBehavior` 来调试。

```java
// 空实现，表示停在当前节点
public void execute(DelegateExecution execution) {
    // Do nothing: waitstate behavior
}

// 调用 org.activiti.engine.RuntimeService#trigger 方法来流转到下个节点
public void trigger(DelegateExecution execution, String signalName, Object data) {
    leave(execution);
}
```

## ServiceTask

实际上有**多个实现类**，分为不同的类型，这里以 `DefaultServiceTaskBehavior` 为例.

可以运行模块 `activiti-examples/activiti-api-basic-connector-example` 来调试。

```java
@Override
public void execute(DelegateExecution execution) {
    // 获取 connector
    Connector connector = getConnector(getImplementation(execution));
    // 执行
    IntegrationContext integrationContext = connector.apply(integrationContextBuilder.from(execution));
  
    variablesPropagator.propagate(execution, integrationContext.getOutBoundVariables());
    // 离开节点
    leave(execution);
}
```

## UserTask

对应的 behavior 类: `UserTaskActivityBehavior`

可以运行 `org.activiti.examples.bpmn.usertask.SkipExpressionUserTaskTest#test` 来调试

```java
// 这个方法的代码比较多，但是代码结构很清晰
public void execute(DelegateExecution execution) {
    CommandContext commandContext = Context.getCommandContext();
    TaskEntityManager taskEntityManager = commandContext.getTaskEntityManager();
  
    // 创建 TaskEntity，然后填充参数
    TaskEntity task = taskEntityManager.create();
    ExecutionEntity executionEntity = (ExecutionEntity) execution;
    task.setExecution(executionEntity);
    task.setTaskDefinitionKey(userTask.getId());
    task.setBusinessKey(executionEntity.getProcessInstanceBusinessKey());
  
    ...
    // 新增 ACT_RU_TASK 表数据
    taskEntityManager.insert(task, executionEntity);
  
    ...
    if (skipUserTask) {
        // 删除 ACT_RU_TASK 表数据
        taskEntityManager.deleteTask(task, null, false, false);
        // 离开节点
        leave(execution);
    }
}
```

## BoundaryTimerEvent

对应的 behavior 类: `BoundaryTimerEventActivityBehavior`

可以运行 `org.activiti.examples.bpmn.event.timer.BoundaryTimerEventTest#testInterruptingTimerDuration` 来调试

> 这个比较复杂，涉及到工作流的定时器，以后会继续解析

```java
@Override
public void execute(DelegateExecution execution) {
    ExecutionEntity executionEntity = (ExecutionEntity) execution;
    // 判断是否为边界事件
    if (!(execution.getCurrentFlowElement() instanceof BoundaryEvent)) {
        throw new ActivitiException("Programmatic error: " + this.getClass() + " should not be used for anything else than a boundary event");
    }
  
    JobManager jobManager = Context.getCommandContext().getJobManager();
    // 创建定时任务
    TimerJobEntity timerJob = jobManager.createTimerJob(timerEventDefinition, interrupting, executionEntity, TriggerTimerEventJobHandler.TYPE,
        TimerEventHandler.createConfiguration(execution.getCurrentActivityId(), timerEventDefinition.getEndDate(), timerEventDefinition.getCalendarName()));
    if (timerJob != null) {
        // 调度定时任务, 插入到 ACT_RU_TIMER_JOB 表
        jobManager.scheduleTimerJob(timerJob);
    }
}
```

## EndEvent

对应的 behavior 类: `NoneEndEventActivityBehavior`

可以运行 `org.activiti.examples.bpmn.receivetask.ReceiveTaskTest#testWaitStateBehavior` 来调试。

```java
public void execute(DelegateExecution execution) {
    // EndEvent 没有连线了，所以会结束流程, 会执行 Agenda#planEndExecutionOperation 
    Context.getAgenda().planTakeOutgoingSequenceFlowsOperation((ExecutionEntity) execution, true);
}
```
