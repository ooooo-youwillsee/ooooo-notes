# 源码分析 nacos 任务执行器的设计


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

```



源码位置: `com.alibaba.nacos.naming.push.v2.task.PushDelayTaskExecuteEngine#PushDelayTaskExecuteEngine`

```java
// delayTaskEngine 的初始化，在类 NamingSubscriberServiceV2Impl 中被调用
// pushExecutor 有两种实现， 一个是 udp, 一个是 rpc
public PushDelayTaskExecuteEngine(ClientManager clientManager, ClientServiceIndexesManager indexesManager,
                                  ServiceStorage serviceStorage, NamingMetadataManager metadataManager,
                                  PushExecutor pushExecutor, SwitchDomain switchDomain) {
    super(PushDelayTaskExecuteEngine.class.getSimpleName(), Loggers.PUSH);
    this.clientManager = clientManager;
    this.indexesManager = indexesManager;
    this.serviceStorage = serviceStorage;
    this.metadataManager = metadataManager;
    this.pushExecutor = pushExecutor;
    this.switchDomain = switchDomain;
    // 设置默认的processor, 用来处理 PushDelayTask
    setDefaultTaskProcessor(new PushDelayTaskProcessor(this));
}

// 在父类 NacosDelayTaskExecuteEngine 中用单一的线程池来启动，然后处理任务
public NacosDelayTaskExecuteEngine(String name, int initCapacity, Logger logger, long processInterval) {
    super(logger);
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


protected void processTasks() {
    Collection<Object> keys = getAllTaskKeys();
    for (Object taskKey : keys) {
        // 判断 task 是否到期，每个 task 创建时都是指定 taskInterval
        AbstractDelayTask task = removeTask(taskKey);
        if (null == task) {
            continue;
        }
        // 获取相应的 processor 来处理，一般来说就是默认的 processor, 比如 PushDelayTaskProcessor
        NacosTaskProcessor processor = getProcessor(taskKey);
        if (null == processor) {
            getEngineLog().error("processor not found for task, so discarded. " + task);
            continue;
        }
        try {
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
```


