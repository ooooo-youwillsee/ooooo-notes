# 11 ArrayBlockingQueue


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们可能会用到 `ArrayBlockingQueue`, 它是基于**循环数组**来实现的，是**并发安全**的。

## 使用方式

```java
public class ArrayBlockingQueueTest {

    @Test
    void test() {
        BlockingQueue&lt;String&gt; queue = new ArrayBlockingQueue&lt;&gt;(10);
        queue.offer(&#34;1&#34;);
        assertThat(queue.poll()).isEqualTo(&#34;1&#34;);
    }
}
```

## offer

&gt; 添加元素，依赖锁来保证并发安全。

源码位置: `java.util.concurrent.ArrayBlockingQueue#offer(E)`

```java
public boolean offer(E e) {
    checkNotNull(e);
    final ReentrantLock lock = this.lock;
    // 加锁
    lock.lock();
    try {
        if (count == items.length)
            return false;
        else {
            // 添加到队列尾部
            enqueue(e);
            return true;
        }
    } finally {
        // 解锁
        lock.unlock();
    }
}
```

## poll

&gt; 移除元素，依赖锁来保证并发安全。

源码位置: `java.util.concurrent.ArrayBlockingQueue#poll()`

```java
public E poll() {
    final ReentrantLock lock = this.lock;
    // 加锁
    lock.lock();
    try {
        // 移除队列头部
        return (count == 0) ? null : dequeue();
    } finally {
        // 解锁
        lock.unlock();
    }
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/11-arrayblockingqueue/  

