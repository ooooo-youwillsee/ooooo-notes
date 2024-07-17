---
title: 16 CountDownLatch
date: 2024-07-13T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们经常会用到 `CountDownLatch`, 它是用于**线程通信**的工具类。 <br/>
> 常用使用场景就是，**主线程等待子线程操作完成，然后继续执行**。

## 使用方式

```java
public class CountDownLatchTest {

    @Test
    @SneakyThrows
    void test() {
        CountDownLatch countDownLatch = new CountDownLatch(1);
        System.out.println(Thread.currentThread() + ": 1");

        new Thread(() -> {
            System.out.println(Thread.currentThread() + ": 2");
            countDownLatch.countDown();
        }).start();

        System.out.println(Thread.currentThread() + ": 3");
        countDownLatch.await();
        System.out.println(Thread.currentThread() + ": 4");
    }
}
```

执行结果:

```shell
Thread[main,5,main]: 1
Thread[main,5,main]: 3
Thread[Thread-1,5,main]: 2
Thread[main,5,main]: 4
```

## await

> 线程等待。一般是主线程来调用。

## countDown

> 计数减一。一般是子线程调用。<br/>
> 当计数为0时，主线程就会被唤醒，继续执行代码。

[//]: # (todo)