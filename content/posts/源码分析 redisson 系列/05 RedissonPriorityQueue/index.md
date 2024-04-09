---
title: 05 RedissonPriorityQueue
date: 2024-04-11T08:00:00+08:00
draft: false
tags: [ redisson, source code, 源码分析 redisson 系列 ]
collections: [ 源码分析 redisson 系列 ]
---

> `redisson` 基于 `org.redisson:redisson-spring-data-27:3.27.2` 版本

> 在 `java` 中，操作 `redis` 一般都会选择 `redisson` 框架, 我们需要了解**常用功能的实现原理**, 这次来介绍 `RedissonPriorityQueue`。

## 使用方式

```java
@Test
void testPriorityQueue() {
    RPriorityQueue<String> queue = redissonClient.getPriorityQueue("queue");
    queue.clear();
    queue.add("3");
    queue.add("2");
    queue.add("1");
    for (String s : queue.readAll()) {
        System.out.println(s);
    }
}
```

`RedissonPriorityQueue` 是通过 `list` 数据结构来实现的。

## add

源码位置: `org.redisson.RedissonPriorityQueue#add`

```java
@Override
public boolean add(V value) {
    // 分布式锁，防止并发
    lock.lock();
    
    try {
        // 通过二分查找插入位置
        BinarySearchResult<V> res = binarySearch(value);
        int index = 0;
        if (res.getIndex() < 0) {
            index = -(res.getIndex() + 1);
        } else {
            index = res.getIndex() + 1;
        }
            
        get(commandExecutor.evalWriteNoRetryAsync(getRawName(), codec, RedisCommands.EVAL_VOID,
           "local len = redis.call('llen', KEYS[1]);"
            + "if tonumber(ARGV[1]) < len then "
                // 获取插入位置的值
                + "local pivot = redis.call('lindex', KEYS[1], ARGV[1]);"
                // 插入值
                + "redis.call('linsert', KEYS[1], 'before', pivot, ARGV[2]);"
                + "return;"
            + "end;"
            + "redis.call('rpush', KEYS[1], ARGV[2]);", 
                Arrays.asList(getRawName()),
                index, encode(value)));
        return true;
    } finally {
        lock.unlock();
    }
}
```

`RedissonPriorityQueue` 和 `RedissonSortedSet` 的内部实现基本是**一样**的。