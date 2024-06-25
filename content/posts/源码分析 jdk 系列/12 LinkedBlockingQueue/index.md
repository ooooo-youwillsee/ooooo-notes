---
title: 12 LinkedBlockingQueue
date: 2024-06-26T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们经常会用到 `LinkedBlockingQueue`, 它是基于**链表**来实现的，是**并发安全**的。

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