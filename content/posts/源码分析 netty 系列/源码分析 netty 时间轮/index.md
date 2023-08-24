---
title: 源码分析 netty 时间轮
date: 2023-08-22T08:00:00+08:00
draft: false
tags: [ netty, source code, 源码分析 netty 系列 ]
categories: [ 源码分析 netty 系列 ]
---

## 时间轮的用法

```java
// 默认间隔时间为 100 毫秒
Timer timer = new HashedWheelTimer();
Timeout timeout = timer.newTimeout(new TimerTask() {
    @Override
    public void run(Timeout timeout) throws Exception {
        System.out.println("run");
    }
}, 10, TimeUnit.SECONDS);
timer.stop();
```

## 时间轮的原理

> 有一个**环形数组**，每个格子都是一个**队列**，每隔 `interval` 时间，指针就会移动到下一格，然后把**队列中的任务**拿出来**判断是否到期**并执行。

{{< image src="./timer.png" caption="timer" >}}

## netty 的时间轮

源码位置: `io.netty.util.HashedWheelTimer#HashedWheelTimer`

```java
// 先来看看构造函数
// threadFactory: 可以用来指定线程的名称
// tickDuration, unit : 间隔时间
// ticksPerWheel: 环形数组的大小, 也就是时间轮的大小
// leakDetection: 检查资源，默认开启
// maxPendingTimeouts: 定时任务上限个数
// taskExecutor: 任务执行器，默认是同步执行，可以自定义来异步执行
public HashedWheelTimer(
        ThreadFactory threadFactory,
        long tickDuration, TimeUnit unit, int ticksPerWheel, boolean leakDetection,
        long maxPendingTimeouts, Executor taskExecutor) {

    checkNotNull(threadFactory, "threadFactory");
    checkNotNull(unit, "unit");
    checkPositive(tickDuration, "tickDuration");
    checkPositive(ticksPerWheel, "ticksPerWheel");
    this.taskExecutor = checkNotNull(taskExecutor, "taskExecutor");

    // Normalize ticksPerWheel to power of two and initialize the wheel.
    // 创建时间轮, 其大小是 2 的倍数，最接近于 ticksPerWheel
    wheel = createWheel(ticksPerWheel);
    mask = wheel.length - 1;

    // Convert tickDuration to nanos.
    long duration = unit.toNanos(tickDuration);

    // Prevent overflow.
    if (duration >= Long.MAX_VALUE / wheel.length) {
        throw new IllegalArgumentException(String.format(
                "tickDuration: %d (expected: 0 < tickDuration in nanos < %d",
                tickDuration, Long.MAX_VALUE / wheel.length));
    }

    if (duration < MILLISECOND_NANOS) {
        logger.warn("Configured tickDuration {} smaller than {}, using 1ms.",
                    tickDuration, MILLISECOND_NANOS);
        this.tickDuration = MILLISECOND_NANOS;
    } else {
        this.tickDuration = duration;
    }

    // 创建 work 线程，来进行 sleep
    workerThread = threadFactory.newThread(worker);

    leak = leakDetection || !workerThread.isDaemon() ? leakDetector.track(this) : null;

    this.maxPendingTimeouts = maxPendingTimeouts;

    // 时间轮不能开启太多，因为每个时间轮都要 work 线程来轮询
    if (INSTANCE_COUNTER.incrementAndGet() > INSTANCE_COUNT_LIMIT &&
        WARNED_TOO_MANY_INSTANCES.compareAndSet(false, true)) {
        reportTooManyInstances();
    }
}

// 创建时间轮, 实际就是一个数组，然后通过 i++ % size 来达到环形数组
private static HashedWheelBucket[] createWheel(int ticksPerWheel) {
    //ticksPerWheel may not be greater than 2^30
    checkInRange(ticksPerWheel, 1, 1073741824, "ticksPerWheel");

    // ticksPerWheel 是 2 的倍数
    ticksPerWheel = normalizeTicksPerWheel(ticksPerWheel);
    HashedWheelBucket[] wheel = new HashedWheelBucket[ticksPerWheel];
    for (int i = 0; i < wheel.length; i ++) {
        wheel[i] = new HashedWheelBucket();
    }
    return wheel;
}
```

源码位置: `io.netty.util.HashedWheelTimer#newTimeout`

```java
// 添加一个定时任务
@Override
public Timeout newTimeout(TimerTask task, long delay, TimeUnit unit) {
    checkNotNull(task, "task");
    checkNotNull(unit, "unit");

    long pendingTimeoutsCount = pendingTimeouts.incrementAndGet();

    // 判断定时任务的个数
    if (maxPendingTimeouts > 0 && pendingTimeoutsCount > maxPendingTimeouts) {
        pendingTimeouts.decrementAndGet();
        throw new RejectedExecutionException("Number of pending timeouts ("
            + pendingTimeoutsCount + ") is greater than or equal to maximum allowed pending "
            + "timeouts (" + maxPendingTimeouts + ")");
    }

    // 启动 work 线程，这里是懒加载，一定是有定时任务添加，才会启动
    start();

    // Add the timeout to the timeout queue which will be processed on the next tick.
    // During processing all the queued HashedWheelTimeouts will be added to the correct HashedWheelBucket.
    // deadline 表示要等待的间隔时间
    long deadline = System.nanoTime() + unit.toNanos(delay) - startTime;

    // Guard against overflow.
    if (delay > 0 && deadline < 0) {
        deadline = Long.MAX_VALUE;
    }
    // 创建 timeout, 然后添加到 timeouts 队列中，之后 work 线程会从队列中获取
    HashedWheelTimeout timeout = new HashedWheelTimeout(this, task, deadline);
    timeouts.add(timeout);
    return timeout;
}
```

源码位置: `io.netty.util.HashedWheelTimer#start`

```java
// 启动 work 线程
public void start() {
    // 判断状态
    switch (WORKER_STATE_UPDATER.get(this)) {
        case WORKER_STATE_INIT:
            // 可能多线程启动，所以 cas 判断
            if (WORKER_STATE_UPDATER.compareAndSet(this, WORKER_STATE_INIT, WORKER_STATE_STARTED)) {
                // 启动 work 线程，执行 run 方法
                workerThread.start();
            }
            break;
        case WORKER_STATE_STARTED:
            break;
        case WORKER_STATE_SHUTDOWN:
            throw new IllegalStateException("cannot be started once stopped");
        default:
            throw new Error("Invalid WorkerState");
    }

    // Wait until the startTime is initialized by the worker.
    while (startTime == 0) {
        try {
            startTimeInitialized.await();
        } catch (InterruptedException ignore) {
            // Ignore - it will be ready very soon.
        }
    }
}


```

源码位置: `io.netty.util.HashedWheelTimer.Worker#run`

```java
// work 线程的 run 方法
@Override
public void run() {
    // 初始化启动时间
    // Initialize the startTime.
    startTime = System.nanoTime();
    if (startTime == 0) {
        // We use 0 as an indicator for the uninitialized value here, so make sure it's not 0 when initialized.
        startTime = 1;
    }

    
    // 通知已经启动了
    // Notify the other threads waiting for the initialization at start().
    startTimeInitialized.countDown();

    do {
        // 等待一个间隔时间，deadline 是等待的间隔时间，从开始时间到现在的时间
        final long deadline = waitForNextTick();
        if (deadline > 0) {
            // 相当于 tick % mask
            int idx = (int) (tick & mask);
            // 处理取消的任务
            processCancelledTasks();
            // 取指针对应的队列
            HashedWheelBucket bucket =
                    wheel[idx];
            // 把 timeouts 队列中的数据放入到时间轮中 
            transferTimeoutsToBuckets();
            // 执行过期的定时任务
            bucket.expireTimeouts(deadline);
            // 指针前进一个
            tick++;
        }
    } while (WORKER_STATE_UPDATER.get(HashedWheelTimer.this) == WORKER_STATE_STARTED);

    // Fill the unprocessedTimeouts so we can return them from stop() method.
    // 执行到这里，说明时间轮已经停止了，把未执行的任务移动到 unprocessedTimeouts 队列
    for (HashedWheelBucket bucket: wheel) {
        bucket.clearTimeouts(unprocessedTimeouts);
    }
    // 移动没处理的任务到 unprocessedTimeouts 队列 
    for (;;) {
        HashedWheelTimeout timeout = timeouts.poll();
        if (timeout == null) {
            break;
        }
        if (!timeout.isCancelled()) {
            unprocessedTimeouts.add(timeout);
        }
    }
    // 处理取消的任务
    processCancelledTasks();
}

// 等待一个间隔时间
private long waitForNextTick() {
    // 计算到下一个的时间间隔
    long deadline = tickDuration * (tick + 1);

    for (;;) {
        // currentTime 表示当前的时间间隔
        final long currentTime = System.nanoTime() - startTime;
        // 计算要睡眠的毫秒数
        long sleepTimeMs = (deadline - currentTime + 999999) / 1000000;

        if (sleepTimeMs <= 0) {
            if (currentTime == Long.MIN_VALUE) {
                return -Long.MAX_VALUE;
            } else {
                return currentTime;
            }
        }

        // Check if we run on windows, as if thats the case we will need
        // to round the sleepTime as workaround for a bug that only affect
        // the JVM if it runs on windows.
        //
        // See https://github.com/netty/netty/issues/356
        // window 系统
        if (PlatformDependent.isWindows()) {
            sleepTimeMs = sleepTimeMs / 10 * 10;
            if (sleepTimeMs == 0) {
                sleepTimeMs = 1;
            }
        }

        try {
            // sleep 
            Thread.sleep(sleepTimeMs);
        } catch (InterruptedException ignored) {
            if (WORKER_STATE_UPDATER.get(HashedWheelTimer.this) == WORKER_STATE_SHUTDOWN) {
                return Long.MIN_VALUE;
            }
        }
    }
}

// 处理取消的任务, 从 cancelledTimeouts 队列中移除
private void processCancelledTasks() {
    for (;;) {
        HashedWheelTimeout timeout = cancelledTimeouts.poll();
        if (timeout == null) {
            // all processed
            break;
        }
        try {
            timeout.remove();
        } catch (Throwable t) {
            if (logger.isWarnEnabled()) {
                logger.warn("An exception was thrown while process a cancellation task", t);
            }
        }
    }
}

// 把 timeouts 队列中的数据放入到时间轮中 
private void transferTimeoutsToBuckets() {
    // transfer only max. 100000 timeouts per tick to prevent a thread to stale the workerThread when it just
    // adds new timeouts in a loop.
    for (int i = 0; i < 100000; i++) {
        // 取出定时任务
        HashedWheelTimeout timeout = timeouts.poll();
        if (timeout == null) {
            // all processed
            break;
        }
        // 如果已经被取消了，处理下一个
        if (timeout.state() == HashedWheelTimeout.ST_CANCELLED) {
            // Was cancelled in the meantime.
            continue;
        }
        
        // 计算指针要走多少次
        long calculated = timeout.deadline / tickDuration;
        // tick 表示当前已走的次数，remainingRounds 表示剩余的圈数
        timeout.remainingRounds = (calculated - tick) / wheel.length;

        // 可能这个定时任务，现在已经过期, 这样的话 calculated < tick，ticks 就是当前的 tick, 会加入到当前的插槽中
        final long ticks = Math.max(calculated, tick); // Ensure we don't schedule for past.
        int stopIndex = (int) (ticks & mask);

        // 添加到时间轮的插槽中
        HashedWheelBucket bucket = wheel[stopIndex];
        bucket.addTimeout(timeout);
    }
}

// 执行过期的定时任务
public void expireTimeouts(long deadline) {
    // timeout 就是当前时间轮的插槽
    HashedWheelTimeout timeout = head;

    // process all timeouts
    while (timeout != null) {
        HashedWheelTimeout next = timeout.next;
        // 如果剩余的圈数为0，表示已经过期了，然后移除并执行
        if (timeout.remainingRounds <= 0) {
            next = remove(timeout);
            if (timeout.deadline <= deadline) {
                // 最终执行 taskExecutor#execute 方法
                timeout.expire();
            } else {
                // The timeout was placed into a wrong slot. This should never happen.
                throw new IllegalStateException(String.format(
                        "timeout.deadline (%d) > deadline (%d)", timeout.deadline, deadline));
            }
        } else if (timeout.isCancelled()) {
            // 定时任务被取消，直接移除
            next = remove(timeout);
        } else {
            // 定时任务没过期，剩余圈数减一
            timeout.remainingRounds --;
        }
        // 循环到下一个定时任务
        timeout = next;
    }
}
```








