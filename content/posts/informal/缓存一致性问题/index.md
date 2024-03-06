---
title: 缓存一致性问题
date: 2024-01-07T08:00:00+08:00
draft: false
tags: [ cache ]
collections: [ 随笔 ]
---

> 当我们使用缓存时，必定会遇到**缓存一致性问题**，也就是在**读写请求**过程中**数据库**和**缓存**中的**数据不一致**。
> 下面将分析**为什么**会造成不一致, 所有的代码参考**末尾**。

## 先更新数据库，后更新缓存

* 数据库的值默认为 0

读操作：

```java
public String get(Long id) {
    // 从缓存中加载
    String userName = userCache.queryUserNameById(id);
    if (userName == null) {
        // 从数据库中加载
        userName = userDB.queryUserNameById(id);
        // 设置到缓存中
        TestUtil.sleep(200); // 表示 gc，请求延迟
        userCache.setUserNameById(id, userName);
    }
    return userName;
}
```

写操作：

```java
public void set(Long id, String username) {
    // 更新数据库
    TestUtil.sleep(100); // 表示 gc, 请求延迟
    userDB.setUserNameById(id, username);
    // 更新缓存
    userCache.setUserNameById(id, null);
}
```

实际执行过程:

1. 读操作（从缓存中读取数据，发现**为空**，所以查询数据库，得到 0）
2. 写操作（更新数据库值为 1，删除缓存值）
3. 读操作（更新缓存值为 0）
4. 不一致（数据库值为 1，缓存值为 0）

从上面可以分析，**更新数据库**和**更新缓存**的顺序，无论**谁先谁后**都会造成**数据不一致**。

## 同时更新数据

写操作（A）：

```java
// username = 1
public void set1(Long id, String username) {
    // 更新缓存
    TestUtil.sleep(100);
    userCache.setUserNameById(id, username);
    // 更新数据库
    userDB.setUserNameById(id, username);
}
```

写操作（B）：

```java
// username = 2
public void set2(Long id, String username) {
    // 更新缓存
    userCache.setUserNameById(id, username);
    // 更新数据库
    TestUtil.sleep(200);
    userDB.setUserNameById(id, username);
}
```

实际执行过程：

1. B（更新缓存值为 2）
2. A（更新缓存值为 1，更新数据库值为 1）
3. B（更新数据库值为 2）
4. 不一致（数据库值为 2，缓存值为 1）

从上面可以分析，**更新数据库**和**更新缓存**的顺序，无论**谁先谁后**都会造成**数据不一致**。

## 解决方法

1. 使用**分布式锁**来确保**更新数据库**和**更新缓存**是**原子性**。

## 代码

[demo-cache-consistency-question](https://github.com/ooooo-youwillsee/demo-cache-consistency-question)