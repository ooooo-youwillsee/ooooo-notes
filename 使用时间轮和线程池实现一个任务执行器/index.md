# 使用时间轮和线程池实现一个任务执行器


&gt; java 的线程池可以充当一个**任务执行器**的，但是有时候不符合我们的要求，所以需要自定义开发。&lt;br/&gt;
&gt; 满足1：可以根据**任务数量**来动态调整**核心线程数**和**最大线程数**。&lt;br/&gt;
&gt; 满足2：支持**重复执行**的任务。

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

&gt; 通过计算**执行的时间**来判断**下一次的延时时间**，从而实现**重复执行**。

## DefaultTaskExecutor

```java
private final HashedWheelTimer timer;
private final ThreadPoolExecutor threadPoolExecutor;
private final TaskExecutorPoolSizeAdjuster poolSizeAdjuster;

public DefaultTaskExecutor(ThreadPoolExecutor threadPoolExecutor, TaskExecutorPoolSizeAdjuster poolSizeAdjuster) {
    assert threadPoolExecutor != null;
    this.timer = new HashedWheelTimer(new DefaultThreadFactory(&#34;TaskExecutor-Timer&#34;), 10, TimeUnit.MILLISECONDS, 100, true, -1, threadPoolExecutor);
    this.threadPoolExecutor = threadPoolExecutor;
    this.poolSizeAdjuster = poolSizeAdjuster;
    init();
}

private void init() {
    if (poolSizeAdjuster != null) {
        submit(new RepeatTask(() -&gt; {
            int maxPoolSize = poolSizeAdjuster.calctMaximumPoolSize();
            threadPoolExecutor.setMaximumPoolSize(maxPoolSize);
            int corePoolSize = poolSizeAdjuster.calcCorePoolSize();
            threadPoolExecutor.setCorePoolSize(corePoolSize);
        }, 10, TimeUnit.SECONDS));
    }
}
```

&gt; 使用 `HashedWheelTimer` 来**调度**延时任务。
&gt; 在构造方法中传入 `TaskExecutorPoolSizeAdjuster` 来动态调整线程数。

## 示例代码

[demo-task-executor](https://github.com/ooooo-youwillsee/demo-task-executor)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E4%BD%BF%E7%94%A8%E6%97%B6%E9%97%B4%E8%BD%AE%E5%92%8C%E7%BA%BF%E7%A8%8B%E6%B1%A0%E5%AE%9E%E7%8E%B0%E4%B8%80%E4%B8%AA%E4%BB%BB%E5%8A%A1%E6%89%A7%E8%A1%8C%E5%99%A8/  

