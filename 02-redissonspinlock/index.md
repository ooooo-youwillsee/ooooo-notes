# 02 RedissonSpinLock


&gt; `redisson` 基于 `org.redisson:redisson-spring-data-27:3.27.2` 版本

&gt; 在 `java` 中，操作 `redis` 一般都会选择 `redisson` 框架, 我们需要了解**常用功能的实现原理**, 这次来介绍 `RedissonSpinLock`。

## 使用方式

```java
@Test
void testSpinLock() {
    RLock lock = redissonClient.getSpinLock(&#34;lock&#34;);
    try {
        lock.lock();
        ThreadUtil.sleep(30, TimeUnit.SECONDS);
        System.out.println(&#34;xxx&#34;);
    } finally {
        lock.unlock();
    }
}
```

## lock

源码位置: `org.redisson.RedissonSpinLock#lock`

```java
@Override
public void lock() {
    try {
        lockInterruptibly(-1, null);
    } catch (InterruptedException e) {
        throw new IllegalStateException();
    }
}

@Override
public void lockInterruptibly(long leaseTime, TimeUnit unit) throws InterruptedException {
    long threadId = Thread.currentThread().getId();
    // 尝试获取锁, 和 RedissonLock 逻辑一样，不解析了
    Long ttl = tryAcquire(leaseTime, unit, threadId);
    // lock acquired
    if (ttl == null) {
        return;
    }
    // 使用指数级睡眠策略
    LockOptions.BackOffPolicy backOffPolicy = backOff.create();
    while (ttl != null) {
        long nextSleepPeriod = backOffPolicy.getNextSleepPeriod();
        // 睡眠一段时间
        Thread.sleep(nextSleepPeriod);
        // 然后再尝试获取锁
        ttl = tryAcquire(leaseTime, unit, threadId);
    }
}
```

## unlock

&gt; `RedissonSpinLock` 和 `RedissonLock` 的**解锁代码是一样**的，所以就不解析了。 


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/02-redissonspinlock/  

