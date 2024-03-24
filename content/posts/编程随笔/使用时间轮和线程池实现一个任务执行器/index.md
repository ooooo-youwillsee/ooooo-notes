---
title: 使用时间轮和线程池实现一个任务执行器
date: 2024-03-24T08:00:00+08:00
draft: false
tags: [ java ]
collections: [ 随笔 ]
---

> java 的线程池可以充当一个**任务执行器**的，但是有时候不符合我们的要求，所以需要自定义开发。<br/>
> 满足1：可以根据**任务数量**来动态调整**核心线程数**和**最大线程数**。<br/>
> 满足2：支持**重复执行**的任务。

## RepeatTask

```java
public class RepeatTask extends AbstractTask {

    private final long maxDelay;

    private final TimeUnit timeUnit;

    public RepeatTask(Runnable runnable, long maxDelay, TimeUnit timeUnit) {
        super(runnable);
        this.maxDelay = maxDelay;
        this.timeUnit = timeUnit;
    }

    @Override
    public void run() {
        long prevTime = System.currentTimeMillis();
        try {
            super.run();
        } finally {
            long diff = System.currentTimeMillis() - prevTime;
            diff = Long.max(maxDelay - diff, 0);
            taskExecutor.schedule(this, diff, timeUnit);
        }
    }
}
```

> 通过计算**执行的时间**来判断**下一次的延时时间**，从而实现**重复执行**。

## DefaultTaskExecutor

```java
private final HashedWheelTimer timer;
private final ThreadPoolExecutor threadPoolExecutor;
private final TaskExecutorPoolSizeAdjuster poolSizeAdjuster;

public DefaultTaskExecutor(ThreadPoolExecutor threadPoolExecutor, TaskExecutorPoolSizeAdjuster poolSizeAdjuster) {
    assert threadPoolExecutor != null;
    this.timer = new HashedWheelTimer(new DefaultThreadFactory("TaskExecutor-Timer"), 10, TimeUnit.MILLISECONDS, 100, true, -1, threadPoolExecutor);
    this.threadPoolExecutor = threadPoolExecutor;
    this.poolSizeAdjuster = poolSizeAdjuster;
    init();
}

private void init() {
    if (poolSizeAdjuster != null) {
        submit(new RepeatTask(() -> {
            int maxPoolSize = poolSizeAdjuster.calctMaximumPoolSize();
            threadPoolExecutor.setMaximumPoolSize(maxPoolSize);
            int corePoolSize = poolSizeAdjuster.calcCorePoolSize();
            threadPoolExecutor.setCorePoolSize(corePoolSize);
        }, 10, TimeUnit.SECONDS));
    }
}
```

> 使用 `HashedWheelTimer` 来**调度**延时任务。
> 在构造方法中传入 `TaskExecutorPoolSizeAdjuster` 来动态调整线程数。

## 示例代码

[demo-task-executor](https://github.com/ooooo-youwillsee/demo-task-executor)