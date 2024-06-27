---
title: 14 AtomicInteger
date: 2024-06-26T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们经常会用到 `AtomicInteger`, 它是**原子计数**，与之类似的还有很多，比如 `AtomicBoolean`, `AtomicLong`, `AtomicReferenceFieldUpdater`。

## 使用方式

```java
public class AtomicIntegerTest {

    @Test
    void test() {
        AtomicInteger atomicInteger = new AtomicInteger();
        assertThat(atomicInteger.get()).isEqualTo(0);
        assertThat(atomicInteger.incrementAndGet()).isEqualTo(1);
    }
}
```

## get 

> 获取值。

## incrementAndGet

> 加 1 后获取值。