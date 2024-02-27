# 在 java 中使用 Lock 来实现 Semaphore


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
      while (permit &lt;= 0) {
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
      permit&#43;&#43;;
      condition.signal();
    } finally {
      lock.unlock();
    }
  }

}
```


## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/demo-java-concurrent)


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-java-%E4%B8%AD%E4%BD%BF%E7%94%A8-lock-%E6%9D%A5%E5%AE%9E%E7%8E%B0-semaphore/  

