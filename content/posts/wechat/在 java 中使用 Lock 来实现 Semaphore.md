---
title: 在 java 中使用 Lock 来实现 Semaphore
date: 2022-11-14T08:00:00+08:00
draft: false
tags: [java]
categories: [微信文章]
---

## 1. 使用 Lock 来实现 Semaphore

代码：

* `Semaphore` 的功能就是**允许同时有几个线程操作**
* `acquire` 方法，`permit` 会减一，如果为 0，则线程需要等待
* `release` 方法，`permit` 会加一，唤醒等待的线程

```java
public class SemaphoreOnLock {

  private final ReentrantLock lock = new ReentrantLock();

  private final Condition condition = lock.newCondition();

  private int permit;

  public SemaphoreOnLock(int permit) {
    this.permit = permit;
  }

  /**
   * 获取锁
   */
  public void acquire() {
    lock.lock();
    try {
      while (permit <= 0) {
        condition.await();
      }
      permit--;
    } catch (InterruptedException ignored) {

    } finally {
      lock.unlock();
    }
  }

  public void release() {
    lock.lock();
    try {
      permit++;
      condition.signal();
    } finally {
      lock.unlock();
    }
  }

}
```


## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/demo-java-concurrent)
