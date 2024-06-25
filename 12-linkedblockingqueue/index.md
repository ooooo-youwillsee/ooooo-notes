# 12 LinkedBlockingQueue


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们经常会用到 `LinkedBlockingQueue`, 它是基于**链表**来实现的，是**并发安全**的。

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

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/12-linkedblockingqueue/  

