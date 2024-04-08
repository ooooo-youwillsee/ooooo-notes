---
title: 01 分布式锁 RedissonLock
date: 2024-04-08T08:00:00+08:00
draft: false
tags: [ redisson, source code, 源码分析 redisson 系列 ]
collections: [ 源码分析 redisson 系列 ]
---

> `redisson` 基于 `org.redisson:redisson-spring-data-27:3.27.2` 版本

> 在 `java` 中，操作 `redis` 一般都会选择 `redisson` 框架, 我们需要了解**常用功能的实现原理**。

## 使用方式

```java
@Test
void testDistributedLock() {
    RLock lock = redissonClient.getLock("lock");
    try {
        lock.lock();
        ThreadUtil.sleep(30, TimeUnit.SECONDS);
        System.out.println("xxx");
    } finally {
        lock.unlock();
    }
}
```

上面是**最常见分布式锁**使用示例, `redisson` 的锁分为好几种，我们先以 `RedissonLock` 来说明。

{{< image src="./分布式锁.png" caption="分布式锁" >}}

## lock

源码位置: `org.redisson.RedissonLock#lock()`

```java
// leaseTime：续约时间, 默认为 30 秒
// interruptibly: 支持可打断
private void lock(long leaseTime, TimeUnit unit, boolean interruptibly) throws InterruptedException {
    // 获取当前线程 id
    long threadId = Thread.currentThread().getId();
    // 尝试获取锁
    Long ttl = tryAcquire(-1, leaseTime, unit, threadId);
    // ttl 为 null，表示获取锁成功
    if (ttl == null) {
        return;
    }

    // 订阅这个锁，一旦锁释放就会得到通知
    CompletableFuture<RedissonLockEntry> future = subscribe(threadId);
    pubSub.timeout(future);
    RedissonLockEntry entry;
    if (interruptibly) {
        entry = commandExecutor.getInterrupted(future);
    } else {
        entry = commandExecutor.get(future);
    }

    try {
        while (true) {
            // 尝试获取锁
            ttl = tryAcquire(-1, leaseTime, unit, threadId);
            // lock acquired
            if (ttl == null) {
                break;
            }

            // waiting for message
            if (ttl >= 0) {
                try {
                    // 等待锁释放
                    entry.getLatch().tryAcquire(ttl, TimeUnit.MILLISECONDS);
                } catch (InterruptedException e) {
                    if (interruptibly) {
                        throw e;
                    }
                    entry.getLatch().tryAcquire(ttl, TimeUnit.MILLISECONDS);
                }
            } else {
                if (interruptibly) {
                    entry.getLatch().acquire();
                } else {
                    entry.getLatch().acquireUninterruptibly();
                }
            }
        }
    } finally {
        // 取消订阅
        unsubscribe(entry, threadId);
    }
}
```

上面的逻辑可以结合图来理解。

源码位置: `org.redisson.RedissonLock#tryAcquireAsync`

```java
// leaseTime 为 -1，表示会一直持有锁，除非调用 unlock 解锁
private RFuture<Long> tryAcquireAsync(long waitTime, long leaseTime, TimeUnit unit, long threadId) {
    RFuture<Long> ttlRemainingFuture;
    if (leaseTime > 0) {
        // 执行 lua 脚本进行加锁
        ttlRemainingFuture = tryLockInnerAsync(waitTime, leaseTime, unit, threadId, RedisCommands.EVAL_LONG);
    } else {
        // 执行 lua 脚本进行加锁
        ttlRemainingFuture = tryLockInnerAsync(waitTime, internalLockLeaseTime,
                TimeUnit.MILLISECONDS, threadId, RedisCommands.EVAL_LONG);
    }
    // 处理异常情况，如果加锁失败，就释放锁
    CompletionStage<Long> s = handleNoSync(threadId, ttlRemainingFuture);
    ttlRemainingFuture = new CompletableFutureWrapper<>(s);

    CompletionStage<Long> f = ttlRemainingFuture.thenApply(ttlRemaining -> {
        // ttlRemaining 为 null，加锁成功
        if (ttlRemaining == null) {
            if (leaseTime > 0) {
                internalLockLeaseTime = unit.toMillis(leaseTime);
            } else {
                // 定期续约锁
                scheduleExpirationRenewal(threadId);
            }
        }
        return ttlRemaining;
    });
    return new CompletableFutureWrapper<>(f);
}
```

源码位置: `org.redisson.RedissonLock#tryLockInnerAsync`

```java
// 执行 lua 脚本进行加锁
<T> RFuture<T> tryLockInnerAsync(long waitTime, long leaseTime, TimeUnit unit, long threadId, RedisStrictCommand<T> command) {
    return evalWriteSyncedAsync(getRawName(), LongCodec.INSTANCE, command,
            // 不存在锁
            "if ((redis.call('exists', KEYS[1]) == 0) " +
                        // 可重入锁
                        "or (redis.call('hexists', KEYS[1], ARGV[2]) == 1)) then " +
                    // 加一
                    "redis.call('hincrby', KEYS[1], ARGV[2], 1); " +
                    // 设置过期时间
                    "redis.call('pexpire', KEYS[1], ARGV[1]); " +
                    // 返回 null，表示加锁成功
                    "return nil; " +
                "end; " +
                // 获取锁过期时间
                "return redis.call('pttl', KEYS[1]);",
            Collections.singletonList(getRawName()), unit.toMillis(leaseTime), getLockName(threadId));
}
```

## unlock

源码位置: `org.redisson.RedissonBaseLock#unlock`

```java
public void unlock() {
    try {
        // 获取当前线程 id, 然后解锁, 最终调用 unlockInnerAsync
        get(unlockAsync(Thread.currentThread().getId()));
    } catch (RedisException e) {
        if (e.getCause() instanceof IllegalMonitorStateException) {
            throw (IllegalMonitorStateException) e.getCause();
        } else {
            throw e;
        }
    }
}
```

源码位置: `org.redisson.RedissonBaseLock#unlockInnerAsync(long)`

```java
protected final RFuture<Boolean> unlockInnerAsync(long threadId) {
    String id = getServiceManager().generateId();
    MasterSlaveServersConfig config = getServiceManager().getConfig();
    int timeout = (config.getTimeout() + config.getRetryInterval()) * config.getRetryAttempts();
    timeout = Math.max(timeout, 1);
    // 执行 lua 脚本进行解锁
    RFuture<Boolean> r = unlockInnerAsync(threadId, id, timeout);
    CompletionStage<Boolean> ff = r.thenApply(v -> {
        CommandAsyncExecutor ce = commandExecutor;
        if (ce instanceof CommandBatchService) {
            ce = new CommandBatchService(commandExecutor);
        }
        // 删除标记 
        ce.writeAsync(getRawName(), LongCodec.INSTANCE, RedisCommands.DEL, getUnlockLatchName(id));
        if (ce instanceof CommandBatchService) {
            ((CommandBatchService) ce).executeAsync();
        }
        return v;
    });
    return new CompletableFutureWrapper<>(ff);
}
```

源码位置: `org.redisson.RedissonLock#unlockInnerAsync`

```java
protected RFuture<Boolean> unlockInnerAsync(long threadId, String requestId, int timeout) {
    return evalWriteSyncedAsync(getRawName(), LongCodec.INSTANCE, RedisCommands.EVAL_BOOLEAN,
                   // 判断是否已经解锁过
                  "local val = redis.call('get', KEYS[3]); " +
                        "if val ~= false then " +
                            "return tonumber(val);" +
                        "end; " +
                        // 锁已经不存在，无需解锁
                        "if (redis.call('hexists', KEYS[1], ARGV[3]) == 0) then " +
                            "return nil;" +
                        "end; " +
                        // 处理可重入锁
                        "local counter = redis.call('hincrby', KEYS[1], ARGV[3], -1); " +
                        "if (counter > 0) then " +
                            "redis.call('pexpire', KEYS[1], ARGV[2]); " +
                            "redis.call('set', KEYS[3], 0, 'px', ARGV[5]); " +
                            "return 0; " +
                        "else " +
                            // 解锁
                            "redis.call('del', KEYS[1]); " +
                            // 发布解锁消息
                            "redis.call(ARGV[4], KEYS[2], ARGV[1]); " +
                            // 标记已经解锁
                            "redis.call('set', KEYS[3], 1, 'px', ARGV[5]); " +
                            "return 1; " +
                        "end; ",
                    Arrays.asList(getRawName(), getChannelName(), getUnlockLatchName(requestId)),
                    LockPubSub.UNLOCK_MESSAGE, internalLockLeaseTime,
                    getLockName(threadId), getSubscribeService().getPublishCommand(), timeout);
}
```

