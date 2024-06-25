---
title: 11 ArrayBlockingQueue
date: 2024-06-25T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们可能会用到 `ArrayBlockingQueue`, 它是基于**循环数组**来实现的，是**并发安全**的。

## 使用方式

```java
public class ArrayBlockingQueueTest {

    @Test
    void test() {
        BlockingQueue<String> queue = new ArrayBlockingQueue<>(10);
        queue.offer("1");
        assertThat(queue.poll()).isEqualTo("1");
    }
}
```

## offer

> 添加元素，依赖锁来保证并发安全。

源码位置: `java.util.concurrent.ArrayBlockingQueue#offer(E)`

```java
public boolean offer(E e) {
    checkNotNull(e);
    final ReentrantLock lock = this.lock;
    // 加锁
    lock.lock();
    try {
        if (count == items.length)
            return false;
        else {
            // 添加到队列尾部
            enqueue(e);
            return true;
        }
    } finally {
        // 解锁
        lock.unlock();
    }
}
```

## poll

> 移除元素，依赖锁来保证并发安全。

源码位置: `java.util.concurrent.ArrayBlockingQueue#poll()`

```java
public E poll() {
    final ReentrantLock lock = this.lock;
    // 加锁
    lock.lock();
    try {
        // 移除队列头部
        return (count == 0) ? null : dequeue();
    } finally {
        // 解锁
        lock.unlock();
    }
}
```