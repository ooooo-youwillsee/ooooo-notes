# 源码分析 nacos 任务执行器的设计


> nacos 基于 2.2.4 版本

## 任务执行器的设计

在 nacos 中，所有的任务都实现了 `NacosTask` 接口，所有的任务执行器都实现了 `NacosTaskExecuteEngine` 接口。

接下来看看这两个接口的设计

```java
// NacosTask
public interface NacosTask {

  /**
   * Judge Whether this nacos task should do.
   *
   * @return true means the nacos task should be done, otherwise false
   */
  // 对于立即执行的任务，默认 return true.
  // 对于延时执行的任务，判断 System.currentTimeMillis() - this.lastProcessTime >= this.taskInterval.
  boolean shouldProcess();
}
```

```java
// NacosTaskExecuteEngine
// 从接口中可以看出
// 1. addTask, 一个 key 对应一个 task
// 2. addProcessor, 一个 key 对应一个 processor, 有默认的 processor
public interface NacosTaskExecuteEngine<T extends NacosTask> extends Closeable {
    
    /**
     * Get Task size in execute engine.
     *
     * @return size of task
     */
    int size();
    
    /**
     * Whether the execute engine is empty.
     *
     * @return true if the execute engine has no task to do, otherwise false
     */
    boolean isEmpty();
    
    /**
     * Add task processor {@link NacosTaskProcessor} for execute engine.
     *
     * @param key           key of task
     * @param taskProcessor task processor
     */
    void addProcessor(Object key, NacosTaskProcessor taskProcessor);
    
    /**
     * Remove task processor {@link NacosTaskProcessor} form execute engine for key.
     *
     * @param key key of task
     */
    void removeProcessor(Object key);
    
    /**
     * Try to get {@link NacosTaskProcessor} by key, if non-exist, will return default processor.
     *
     * @param key key of task
     * @return task processor for task key or default processor if task processor for task key non-exist
     */
    NacosTaskProcessor getProcessor(Object key);
    
    /**
     * Get all processor key.
     *
     * @return collection of processors
     */
    Collection<Object> getAllProcessorKey();
    
    /**
     * Set default task processor. If do not find task processor by task key, use this default processor to process
     * task.
     *
     * @param defaultTaskProcessor default task processor
     */
    void setDefaultTaskProcessor(NacosTaskProcessor defaultTaskProcessor);
    
    /**
     * Add task into execute pool.
     *
     * @param key  key of task
     * @param task task
     */
    void addTask(Object key, T task);
    
    /**
     * Remove task.
     *
     * @param key key of task
     * @return nacos task
     */
    T removeTask(Object key);
    
    /**
     * Get all task keys.
     *
     * @return collection of task keys.
     */
    Collection<Object> getAllTaskKeys();
}
```

## 具体实现类(举例) 

`PushDelayTask` 和 `PushDelayTaskExecuteEngine`

源码位置: `com.alibaba.nacos.naming.push.v2.task.PushDelayTask`

```java
// PushDelayTask 的构造方法
// delay: 延时的事件
// targetClient: 推送的 clientId
public PushDelayTask(Service service, long delay, String targetClient) {
    this.service = service;
    this.pushToAll = false;
    this.targetClients = new HashSet<>(1);
    this.targetClients.add(targetClient);
    setTaskInterval(delay);
    // 设置上一次处理时间，用来判断是否过期
    setLastProcessTime(System.currentTimeMillis());
}

// 每一个延时任务都会有 merge 方法, 用来合并相同的 task, 这样可以更高效的处理任务
// 比如因为客户端重试，发起了两个一样的 task，经过 merge 之后，处理一个就行。 
@Override
public void merge(AbstractDelayTask task) {
    if (!(task instanceof PushDelayTask)) {
        return;
    }
    PushDelayTask oldTask = (PushDelayTask) task;
    if (isPushToAll() || oldTask.isPushToAll()) {
        pushToAll = true;
        targetClients = null;
    } else {
        targetClients.addAll(oldTask.getTargetClients());
    }
    setLastProcessTime(Math.min(getLastProcessTime(), task.getLastProcessTime()));
    Loggers.PUSH.info("[PUSH] Task merge for {}", service);
}
    
// shouldProcess 方法在父类上面, 判断当前任务都是过期
@Override
public boolean shouldProcess() {
    return (System.currentTimeMillis() - this.lastProcessTime >= this.taskInterval);
}
```


源码位置: `com.alibaba.nacos.naming.push.v2.task.PushDelayTaskExecuteEngine#PushDelayTaskExecuteEngine`

```java
// PushDelayTaskExecuteEngine 的初始化
public PushDelayTaskExecuteEngine(ClientManager clientManager, ClientServiceIndexesManager indexesManager,
                                  ServiceStorage serviceStorage, NamingMetadataManager metadataManager,
                                  PushExecutor pushExecutor, SwitchDomain switchDomain) {
    ...
    // 设置默认的processor, 用来处理任务, 这里没有特殊的 processor
    setDefaultTaskProcessor(new PushDelayTaskProcessor(this));
}

// 在父类 NacosDelayTaskExecuteEngine 中用单一的线程池来启动，然后处理任务
public NacosDelayTaskExecuteEngine(String name, int initCapacity, Logger logger, long processInterval) {
    ...
    tasks = new ConcurrentHashMap<>(initCapacity);
    // 线程池
    processingExecutor = ExecutorFactory.newSingleScheduledExecutorService(new NameThreadFactory(name));
    // 最后调用自己的方法来处理任务
    processingExecutor
            .scheduleWithFixedDelay(new ProcessRunnable(), processInterval, processInterval, TimeUnit.MILLISECONDS);
}

// 处理任务
private class ProcessRunnable implements Runnable {
    
    @Override
    public void run() {
        try {
            processTasks();
        } catch (Throwable e) {
            getEngineLog().error(e.toString(), e);
        }
    }
}

// 在父类 NacosDelayTaskExecuteEngine 中
// com.alibaba.nacos.common.task.engine.NacosDelayTaskExecuteEngine#processTasks
protected void processTasks() {
    // 获取所有的 key，因为 addTask 方法，所以每一个 task 都会关联到一个 key
    Collection<Object> keys = getAllTaskKeys();
    for (Object taskKey : keys) {
        // 判断 task 是否到期，每个 task 创建时都是指定 taskInterval
        AbstractDelayTask task = removeTask(taskKey);
        if (null == task) {
            continue;
        }
        // 获取相应的 processor 来处理，一般来说就是默认的 processor, 比如 PushDelayTaskProcessor, 下面会说这个类
        NacosTaskProcessor processor = getProcessor(taskKey);
        if (null == processor) {
            getEngineLog().error("processor not found for task, so discarded. " + task);
            continue;
        }
        try {
            // 处理 task，如果处理失败，重新添加 task
            // ReAdd task if process failed
            if (!processor.process(task)) {
                retryFailedTask(taskKey, task);
            }
        } catch (Throwable e) {
            getEngineLog().error("Nacos task execute error ", e);
            retryFailedTask(taskKey, task);
        }
    }
}

// 重新添加 task
private void retryFailedTask(Object key, AbstractDelayTask task) {
    task.setLastProcessTime(System.currentTimeMillis());
    addTask(key, task);
}
```

源码位置: `com.alibaba.nacos.naming.push.v2.task.PushDelayTaskExecuteEngine.PushDelayTaskProcessor`

```java
// PushDelayTaskProcessor 处理 PushDelayTask, 重新包装为 PushExecuteTask, 然后放入线程池中运行
private static class PushDelayTaskProcessor implements NacosTaskProcessor {
    
    private final PushDelayTaskExecuteEngine executeEngine;
    
    public PushDelayTaskProcessor(PushDelayTaskExecuteEngine executeEngine) {
        this.executeEngine = executeEngine;
    }
    
    @Override
    public boolean process(NacosTask task) {
        PushDelayTask pushDelayTask = (PushDelayTask) task;
        Service service = pushDelayTask.getService();
        NamingExecuteTaskDispatcher.getInstance()
                .dispatchAndExecuteTask(service, new PushExecuteTask(service, executeEngine, pushDelayTask));
        return true;
    }
}
```

## 测试类

`com.alibaba.nacos.common.task.engine.NacosDelayTaskExecuteEngineTest`
