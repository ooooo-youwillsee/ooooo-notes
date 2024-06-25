---
title: 11 ArrayBlockingQueue
date: 2024-06-25T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们可能会用到 `ArrayBlockingQueue`, 是**并发安全**的。

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



## poll

> 移除元素，依赖锁来保证并发安全。