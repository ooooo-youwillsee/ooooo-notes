# 01 分布式锁 RedissonLock


&gt; `redisson` 基于 `org.redisson:redisson-spring-data-27:3.27.2` 版本

&gt; 在 `java` 中，操作 `redis` 一般都会选择 `redisson` 框架, 我们需要了解**常用功能的实现原理**。

## 使用方式

```java
@Test
void testDistributedLock() {
    RLock lock = redissonClient.getLock(&#34;lock&#34;);
    try {
        lock.lock();
        ThreadUtil.sleep(30, TimeUnit.SECONDS);
        System.out.println(&#34;xxx&#34;);
    } finally {
        lock.unlock();
    }
}
```

上面是**最常见分布式锁**使用示例, `redisson` 的锁分为好几种，我们先以 `RedissonLock` 来说明。

{{&lt; image src=&#34;./分布式锁.png&#34; caption=&#34;分布式锁&#34; &gt;}}

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
    CompletableFuture&lt;RedissonLockEntry&gt; future = subscribe(threadId);
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
            if (ttl &gt;= 0) {
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
private RFuture&lt;Long&gt; tryAcquireAsync(long waitTime, long leaseTime, TimeUnit unit, long threadId) {
    RFuture&lt;Long&gt; ttlRemainingFuture;
    if (leaseTime &gt; 0) {
        // 执行 lua 脚本进行加锁
        ttlRemainingFuture = tryLockInnerAsync(waitTime, leaseTime, unit, threadId, RedisCommands.EVAL_LONG);
    } else {
        // 执行 lua 脚本进行加锁
        ttlRemainingFuture = tryLockInnerAsync(waitTime, internalLockLeaseTime,
                TimeUnit.MILLISECONDS, threadId, RedisCommands.EVAL_LONG);
    }
    // 处理异常情况，如果加锁失败，就释放锁
    CompletionStage&lt;Long&gt; s = handleNoSync(threadId, ttlRemainingFuture);
    ttlRemainingFuture = new CompletableFutureWrapper&lt;&gt;(s);

    CompletionStage&lt;Long&gt; f = ttlRemainingFuture.thenApply(ttlRemaining -&gt; {
        // ttlRemaining 为 null，加锁成功
        if (ttlRemaining == null) {
            if (leaseTime &gt; 0) {
                internalLockLeaseTime = unit.toMillis(leaseTime);
            } else {
                // 定期续约锁
                scheduleExpirationRenewal(threadId);
            }
        }
        return ttlRemaining;
    });
    return new CompletableFutureWrapper&lt;&gt;(f);
}
```

源码位置: `org.redisson.RedissonLock#tryLockInnerAsync`

```java
// 执行 lua 脚本进行加锁
&lt;T&gt; RFuture&lt;T&gt; tryLockInnerAsync(long waitTime, long leaseTime, TimeUnit unit, long threadId, RedisStrictCommand&lt;T&gt; command) {
    return evalWriteSyncedAsync(getRawName(), LongCodec.INSTANCE, command,
            // 不存在锁
            &#34;if ((redis.call(&#39;exists&#39;, KEYS[1]) == 0) &#34; &#43;
                        // 可重入锁
                        &#34;or (redis.call(&#39;hexists&#39;, KEYS[1], ARGV[2]) == 1)) then &#34; &#43;
                    // 加一
                    &#34;redis.call(&#39;hincrby&#39;, KEYS[1], ARGV[2], 1); &#34; &#43;
                    // 设置过期时间
                    &#34;redis.call(&#39;pexpire&#39;, KEYS[1], ARGV[1]); &#34; &#43;
                    // 返回 null，表示加锁成功
                    &#34;return nil; &#34; &#43;
                &#34;end; &#34; &#43;
                // 获取锁过期时间
                &#34;return redis.call(&#39;pttl&#39;, KEYS[1]);&#34;,
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
protected final RFuture&lt;Boolean&gt; unlockInnerAsync(long threadId) {
    String id = getServiceManager().generateId();
    MasterSlaveServersConfig config = getServiceManager().getConfig();
    int timeout = (config.getTimeout() &#43; config.getRetryInterval()) * config.getRetryAttempts();
    timeout = Math.max(timeout, 1);
    // 执行 lua 脚本进行解锁
    RFuture&lt;Boolean&gt; r = unlockInnerAsync(threadId, id, timeout);
    CompletionStage&lt;Boolean&gt; ff = r.thenApply(v -&gt; {
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
    return new CompletableFutureWrapper&lt;&gt;(ff);
}
```

源码位置: `org.redisson.RedissonLock#unlockInnerAsync`

```java
protected RFuture&lt;Boolean&gt; unlockInnerAsync(long threadId, String requestId, int timeout) {
    return evalWriteSyncedAsync(getRawName(), LongCodec.INSTANCE, RedisCommands.EVAL_BOOLEAN,
                   // 判断是否已经解锁过
                  &#34;local val = redis.call(&#39;get&#39;, KEYS[3]); &#34; &#43;
                        &#34;if val ~= false then &#34; &#43;
                            &#34;return tonumber(val);&#34; &#43;
                        &#34;end; &#34; &#43;
                        // 锁已经不存在，无需解锁
                        &#34;if (redis.call(&#39;hexists&#39;, KEYS[1], ARGV[3]) == 0) then &#34; &#43;
                            &#34;return nil;&#34; &#43;
                        &#34;end; &#34; &#43;
                        // 处理可重入锁
                        &#34;local counter = redis.call(&#39;hincrby&#39;, KEYS[1], ARGV[3], -1); &#34; &#43;
                        &#34;if (counter &gt; 0) then &#34; &#43;
                            &#34;redis.call(&#39;pexpire&#39;, KEYS[1], ARGV[2]); &#34; &#43;
                            &#34;redis.call(&#39;set&#39;, KEYS[3], 0, &#39;px&#39;, ARGV[5]); &#34; &#43;
                            &#34;return 0; &#34; &#43;
                        &#34;else &#34; &#43;
                            // 解锁
                            &#34;redis.call(&#39;del&#39;, KEYS[1]); &#34; &#43;
                            // 发布解锁消息
                            &#34;redis.call(ARGV[4], KEYS[2], ARGV[1]); &#34; &#43;
                            // 标记已经解锁
                            &#34;redis.call(&#39;set&#39;, KEYS[3], 1, &#39;px&#39;, ARGV[5]); &#34; &#43;
                            &#34;return 1; &#34; &#43;
                        &#34;end; &#34;,
                    Arrays.asList(getRawName(), getChannelName(), getUnlockLatchName(requestId)),
                    LockPubSub.UNLOCK_MESSAGE, internalLockLeaseTime,
                    getLockName(threadId), getSubscribeService().getPublishCommand(), timeout);
}
```



---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/01-%E5%88%86%E5%B8%83%E5%BC%8F%E9%94%81-redissonlock/  

