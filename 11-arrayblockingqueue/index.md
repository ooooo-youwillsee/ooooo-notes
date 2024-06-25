# 11 ArrayBlockingQueue


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们可能会用到 `ArrayBlockingQueue`, 是**并发安全**的。

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



## poll

&gt; 移除元素，依赖锁来保证并发安全。

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/11-arrayblockingqueue/  

