# 03 RedissonMultiLock


&gt; `redisson` 基于 `org.redisson:redisson-spring-data-27:3.27.2` 版本

&gt; 在 `java` 中，操作 `redis` 一般都会选择 `redisson` 框架, 我们需要了解**常用功能的实现原理**, 这次来介绍 `RedissonMultiLock`。

## 使用方式

```java
@Test
void testMultiLock() {
    RLock lock1 = redissonClient.getLock(&#34;lock1&#34;);
    RLock lock2 = redissonClient.getLock(&#34;lock2&#34;);
    RLock lock = redissonClient.getMultiLock(lock1, lock2);
    try {
        lock.lock();
        ThreadUtil.sleep(30, TimeUnit.SECONDS);
        System.out.println(&#34;xxx&#34;);
    } finally {
        lock.unlock();
    }
} 
```

在实际使用过程中，可能**一次性**获取**多个**锁， 那么你应该使用 **RedissonMultiLock** 来简化你的操作。

## lock

源码位置: `org.redisson.RedissonMultiLock#tryLock`

```java
// lock 最终会调用 tryLock 方法
@Override
public boolean tryLock(long waitTime, long leaseTime, TimeUnit unit) throws InterruptedException {
    ...
    int failedLocksLimit = failedLocksLimit();
    List&lt;RLock&gt; acquiredLocks = new ArrayList&lt;&gt;(locks.size());
    // 遍历获取每个锁
    for (ListIterator&lt;RLock&gt; iterator = locks.listIterator(); iterator.hasNext();) {
        RLock lock = iterator.next();
        boolean lockAcquired;
        try {
            if (waitTime &lt;= 0 &amp;&amp; leaseTime &lt;= 0) {
                lockAcquired = lock.tryLock();
            } else {
                long awaitTime = Math.min(lockWaitTime, remainTime);
                // 尝试获取锁
                lockAcquired = lock.tryLock(awaitTime, newLeaseTime, TimeUnit.MILLISECONDS);
            }
        } catch (RedisResponseTimeoutException e) {
            unlockInner(Arrays.asList(lock));
            lockAcquired = false;
        } catch (Exception e) {
            lockAcquired = false;
        }
        
        if (lockAcquired) {
            // 获取锁成功
            acquiredLocks.add(lock);
        } else {
            // 判断容错次数, failedLocksLimit() 默认为 0
            if (locks.size() - acquiredLocks.size() == failedLocksLimit()) {
                break;
            }
            // 获取锁失败
            if (failedLocksLimit == 0) {
               // 释放之前的锁
                unlockInner(acquiredLocks);
                if (waitTime &lt;= 0) {
                    return false;
                }
                failedLocksLimit = failedLocksLimit();
                acquiredLocks.clear();
                // reset iterator
                while (iterator.hasPrevious()) {
                    iterator.previous();
                }
            } else {
                failedLocksLimit--;
            }
        }
        ...
    }
    return true;
}
```


## unlock

源码位置: `org.redisson.RedissonMultiLock#unlock`

```java
@Override
public void unlock() {
    // 遍历每个锁，然后解锁
    locks.forEach(Lock::unlock);
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/03-redissonmultilock/  

