# 12 LinkedBlockingQueue


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们经常会用到 `LinkedBlockingQueue`, 它是基于**链表**来实现的，是**并发安全**的。&lt;br/&gt;
&gt; 与 `ArrayBlockingQueue` 相比，`LinkedBlockingQueue` 的性能会更高，里面有两个锁来实现。

## 使用方式

```java
public class LinkedBlockingQueueTest {

    @Test
    void test() {
        BlockingQueue&lt;String&gt; queue = new LinkedBlockingQueue&lt;&gt;(10);
        queue.offer(&#34;1&#34;);
        assertThat(queue.poll()).isEqualTo(&#34;1&#34;);
    }
}
```

## offer

&gt; 添加元素，依赖锁来保证并发安全。

源码位置: `java.util.concurrent.LinkedBlockingQueue#offer(E)`

```java
public boolean offer(E e) {
    if (e == null) throw new NullPointerException();
    // 获取元素个数
    final AtomicInteger count = this.count;
    if (count.get() == capacity)
        return false;
    int c = -1;
    Node&lt;E&gt; node = new Node&lt;E&gt;(e);
    final ReentrantLock putLock = this.putLock;
    // 加锁
    putLock.lock();
    try {
        if (count.get() &lt; capacity) {
            // 添加到链表
            enqueue(node);
            c = count.getAndIncrement();
            if (c &#43; 1 &lt; capacity)
                // 通知元素不满, 其他线程可以添加元素
                notFull.signal();
        }
    } finally {
        // 解锁
        putLock.unlock();
    }
    if (c == 0)
        // 通知元素不空，其他线程可以移除元素
        signalNotEmpty();
    return c &gt;= 0;
}
```

## poll

&gt; 移除元素，依赖锁来保证并发安全。

源码位置: `java.util.concurrent.LinkedBlockingQueue#poll()`

```java
public E poll() {
    final AtomicInteger count = this.count;
    // 获取元素个数
    if (count.get() == 0)
        return null;
    E x = null;
    int c = -1;
    final ReentrantLock takeLock = this.takeLock;
    // 加锁
    takeLock.lock();
    try {
        if (count.get() &gt; 0) {
            // 移除链表
            x = dequeue();
            c = count.getAndDecrement();
            if (c &gt; 1)
                // 通知不空，其他线程可以移除元素
                notEmpty.signal();
        }
    } finally {
        // 解锁
        takeLock.unlock();
    }
    if (c == capacity)
        // 通知不满，其他线程可以添加元素
        signalNotFull();
    return x;
}
```


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/12-linkedblockingqueue/  

