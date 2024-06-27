---
title: 12 LinkedBlockingQueue
date: 2024-06-26T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们经常会用到 `LinkedBlockingQueue`, 它是基于**链表**来实现的，是**并发安全**的。<br/>
> 与 `ArrayBlockingQueue` 相比，`LinkedBlockingQueue` 的性能会更高，里面有两个锁来实现。

## 使用方式

```java
public class LinkedBlockingQueueTest {

    @Test
    void test() {
        BlockingQueue<String> queue = new LinkedBlockingQueue<>(10);
        queue.offer("1");
        assertThat(queue.poll()).isEqualTo("1");
    }
}
```

## offer

> 添加元素，依赖锁来保证并发安全。

源码位置: `java.util.concurrent.LinkedBlockingQueue#offer(E)`

```java
public boolean offer(E e) {
    if (e == null) throw new NullPointerException();
    // 获取元素个数
    final AtomicInteger count = this.count;
    if (count.get() == capacity)
        return false;
    int c = -1;
    Node<E> node = new Node<E>(e);
    final ReentrantLock putLock = this.putLock;
    // 加锁
    putLock.lock();
    try {
        if (count.get() < capacity) {
            // 添加到链表
            enqueue(node);
            c = count.getAndIncrement();
            if (c + 1 < capacity)
                // 通知元素不满, 其他线程可以添加元素
                notFull.signal();
        }
    } finally {
        // 解锁
        putLock.unlock();
    }
    if (c == 0)
        // 通知元素不空，其他线程可以移除元素
        signalNotEmpty();
    return c >= 0;
}
```

## poll

> 移除元素，依赖锁来保证并发安全。

源码位置: `java.util.concurrent.LinkedBlockingQueue#poll()`

```java
public E poll() {
    final AtomicInteger count = this.count;
    // 获取元素个数
    if (count.get() == 0)
        return null;
    E x = null;
    int c = -1;
    final ReentrantLock takeLock = this.takeLock;
    // 加锁
    takeLock.lock();
    try {
        if (count.get() > 0) {
            // 移除链表
            x = dequeue();
            c = count.getAndDecrement();
            if (c > 1)
                // 通知不空，其他线程可以移除元素
                notEmpty.signal();
        }
    } finally {
        // 解锁
        takeLock.unlock();
    }
    if (c == capacity)
        // 通知不满，其他线程可以添加元素
        signalNotFull();
    return x;
}
```
