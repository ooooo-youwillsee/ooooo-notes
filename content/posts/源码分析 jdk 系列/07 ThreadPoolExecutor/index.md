---
title: 07 ThreadPoolExecutor
date: 2024-05-21T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们经常会用到 `ThreadPoolExecutor`, 需要了解**源码**。

## 使用方式

```java
public class ThreadPoolTest {

    @Test
    void test() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                2,
                10,
                60, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(),
                new CustomizableThreadFactory("test-"),
                new ThreadPoolExecutor.CallerRunsPolicy());
        executor.submit(() -> {
            System.out.println("xxxx");
        });
        executor.shutdown();
    }
}
```

## new

> 创建线程池。

源码位置: `java.util.concurrent.ThreadPoolExecutor#ThreadPoolExecutor`

```java
// 参数说明
// corePoolSize: 核心线程池大小
// maximumPoolSize: 最大线程池大小
// keepAliveTime: 非核心线程存活时间
// workQueue: 任务队列
// threadFactory: 线程工厂，可以给线程命名
// handler: 拒绝策略
public ThreadPoolExecutor(int corePoolSize,
                          int maximumPoolSize,
                          long keepAliveTime,
                          TimeUnit unit,
                          BlockingQueue<Runnable> workQueue,
                          ThreadFactory threadFactory,
                          RejectedExecutionHandler handler) {
    // 下面都是简单的赋值，没啥要说明的
    if (corePoolSize < 0 ||
        maximumPoolSize <= 0 ||
        maximumPoolSize < corePoolSize ||
        keepAliveTime < 0)
        throw new IllegalArgumentException();
    if (workQueue == null || threadFactory == null || handler == null)
        throw new NullPointerException();
    this.acc = System.getSecurityManager() == null ?
            null :
            AccessController.getContext();
    this.corePoolSize = corePoolSize;
    this.maximumPoolSize = maximumPoolSize;
    this.workQueue = workQueue;
    this.keepAliveTime = unit.toNanos(keepAliveTime);
    this.threadFactory = threadFactory;
    this.handler = handler;
}
```

> 参数说明： <br/>
> 新创建的线程池，线程池**不会预热**，所以**线程数为零**。 <br/>
> 当有**任务提交**了，判断**核心线程数**是否有剩余。 <br/>
> 如果**核心线程数**有，启动核心线程来执行任务，如果**核心线程数**没有，加入到**任务队列**。 <br/>
> 如果**任务队列**没有满，把任务放入到**任务队列**中，方法结束。如果**任务队列**满了，判断**非核心线程数**是否有剩余。 <br/>
> 如果**非核心线程数**有，启动非核心线程数来执行任务，如果**非核心线程数**没有，执行**拒绝策略**。 <br/>

## submit

> 提交任务

源码位置: `java.util.concurrent.AbstractExecutorService#submit(java.lang.Runnable)`

```java
public Future<?> submit(Runnable task) {
    if (task == null) throw new NullPointerException();
    // 创建 future,
    RunnableFuture<Void> ftask = newTaskFor(task, null);
    // 执行 task
    execute(ftask);
    return ftask;
}
```

源码位置: `java.util.concurrent.ThreadPoolExecutor#execute`

```java
public void execute(Runnable command) {
    ...
    int c = ctl.get();
    // 获取当前的线程数, 小于核心线程数
    if (workerCountOf(c) < corePoolSize) {
        // 尝试添加新线程来执行任务
        if (addWorker(command, true))
            return;
        // 添加失败，核心线程数满了
        c = ctl.get();
    }
    // 尝试加入任务队列
    if (isRunning(c) && workQueue.offer(command)) {
        int recheck = ctl.get();
        // 如果不是 running 状态，移除任务
        if (!isRunning(recheck) && remove(command))
            // 执行拒绝策略
            reject(command);
        else if (workerCountOf(recheck) == 0)
            // 添加非核心线程
            addWorker(null, false);
    }
    // 任务队列满了，尝试添加非核心线程来执行任务
    else if (!addWorker(command, false))
        // 非核心线程数满了，执行拒绝策略
        reject(command);
}
```

源码位置: `java.util.concurrent.ThreadPoolExecutor#addWorker`

```java
private boolean addWorker(Runnable firstTask, boolean core) {
    // 使用 CAS 来增加当前线程数
    retry:
    for (;;) {
        ...
        for (;;) {
            int wc = workerCountOf(c);
            if (wc >= CAPACITY ||
                wc >= (core ? corePoolSize : maximumPoolSize))
                return false;
            if (compareAndIncrementWorkerCount(c))
                break retry;
            c = ctl.get();  // Re-read ctl
            if (runStateOf(c) != rs)
                continue retry;
        }
    }
    ...
    try {
        // 创建新的 worker
        w = new Worker(firstTask);
        final Thread t = w.thread;
        if (t != null) {
            final ReentrantLock mainLock = this.mainLock;
            mainLock.lock();
            try {
                int rs = runStateOf(ctl.get());
                // 添加到 workers 中
                if (rs < SHUTDOWN ||
                    (rs == SHUTDOWN && firstTask == null)) {
                    if (t.isAlive()) // precheck that t is startable
                        throw new IllegalThreadStateException();
                    workers.add(w);
                    int s = workers.size();
                    // 更新当前最大线程数
                    if (s > largestPoolSize)
                        largestPoolSize = s;
                    workerAdded = true;
                }
            } finally {
                mainLock.unlock();
            }
            // 添加成功，启动线程
            if (workerAdded) {
                t.start();
                workerStarted = true;
            }
        }
    } finally {
        ...
    }
    return workerStarted;
}
```

## runWorker

> 执行任务。

源码位置: `java.util.concurrent.ThreadPoolExecutor#runWorker`

```java
final void runWorker(Worker w) {
    ...
    try {
        // 从任务队列中获取任务, 如果 task 为 null，当前线程会终止
        while (task != null || (task = getTask()) != null) {
            w.lock();
            ...
            // 如果是 STOP 状态，打断当前线程，停止执行
            if ((runStateAtLeast(ctl.get(), STOP) ||
                 (Thread.interrupted() &&
                  runStateAtLeast(ctl.get(), STOP))) &&
                !wt.isInterrupted())
                wt.interrupt();
            try {
                // 空实现
                beforeExecute(wt, task);
                Throwable thrown = null;
                try {
                    // 执行任务
                    task.run();
                } catch (RuntimeException x) {
                    ...
                } finally {
                    // 空实现
                    afterExecute(task, thrown);
                }
            } finally {
                ...
            }
        }
        completedAbruptly = false;
    } finally {
        processWorkerExit(w, completedAbruptly);
    }
}
```

源码位置: `java.util.concurrent.ThreadPoolExecutor#getTask`

```java
// 获取任务，如果为 null，当前线程就要终止
private Runnable getTask() {
    boolean timedOut = false; // Did the last poll() time out?
    for (;;) {
        int c = ctl.get();
        int rs = runStateOf(c);

        // 如果 SHUTDOWN 状态，任务队列为空，应该减少 worker
        if (rs >= SHUTDOWN && (rs >= STOP || workQueue.isEmpty())) {
            decrementWorkerCount();
            return null;
        }
        int wc = workerCountOf(c);
        // 控制是否要结束线程
        boolean timed = allowCoreThreadTimeOut || wc > corePoolSize;
        
        // timedOut 为 true，表示没有任务了
        if ((wc > maximumPoolSize || (timed && timedOut))
            && (wc > 1 || workQueue.isEmpty())) {
            // CAS 减少 worker
            if (compareAndDecrementWorkerCount(c))
                return null;
            continue;
        }

        try {
            // 获取任务，对于非核心线程是 poll 方法, 对核心线程是 take 方法
            Runnable r = timed ?
                workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS) :
                workQueue.take();
            if (r != null)
                return r;
            timedOut = true;
        } catch (InterruptedException retry) {
            timedOut = false;
        }
    }
}
```

