---
title: 04 RedissonSortedSet
date: 2024-04-11T08:00:00+08:00
draft: false
tags: [ redisson, source code, 源码分析 redisson 系列 ]
collections: [ 源码分析 redisson 系列 ]
---

> `redisson` 基于 `org.redisson:redisson-spring-data-27:3.27.2` 版本

> 在 `java` 中，操作 `redis` 一般都会选择 `redisson` 框架, 我们需要了解**常用功能的实现原理**, 这次来介绍 `RedissonSortedSet`。

## 使用方式

```java
@Test
void testOrderedSet() {
    RSortedSet<String> set = redissonClient.getSortedSet("set");
    set.clear();
    set.add("3");
    set.add("2");
    set.add("1");
    for (String s : set.readAll()) {
        System.out.println(s);
    }
}
```

`RedissonSortedSet` 是通过 `list` 数据结构来实现的。但如果 `value` 是 `string` 类型的，可以使用 `RedissonLexSortedSet` 来优化操作。

## add

源码位置: `org.redisson.RedissonSortedSet#add`

```java
@Override
public boolean add(V value) {
    // 加分布式锁，防止并发
    lock.lock();
    try {
        // 通过二分法查找插入位置
        BinarySearchResult<V> res = binarySearch(value, codec);
        if (res.getIndex() < 0) {
            int index = -(res.getIndex() + 1);
            
            // 编码
            ByteBuf encodedValue = encode(value);
            // 执行 lua 脚本，插入元素
            commandExecutor.get(commandExecutor.evalWriteNoRetryAsync(list.getRawName(), codec, RedisCommands.EVAL_VOID,
               "local len = redis.call('llen', KEYS[1]);"
                + "if tonumber(ARGV[1]) < len then "
                    // 获取插入位置的元素值
                    + "local pivot = redis.call('lindex', KEYS[1], ARGV[1]);"
                    // 插入值
                    + "redis.call('linsert', KEYS[1], 'before', pivot, ARGV[2]);"
                    + "return;"
                + "end;"
                + "redis.call('rpush', KEYS[1], ARGV[2]);", Arrays.<Object>asList(list.getRawName()), index, encodedValue));
            return true;
        } else {
            return false;
        }
    } finally {
        lock.unlock();
    }
}
```



