# 16 CountDownLatch


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们经常会用到 `CountDownLatch`, 它是用于**线程通信**的工具类。 &lt;br/&gt;
&gt; 常用使用场景就是，**主线程等待子线程操作完成，然后继续执行**。

## 使用方式

```java
public class CountDownLatchTest {

    @Test
    @SneakyThrows
    void test() {
        CountDownLatch countDownLatch = new CountDownLatch(1);
        System.out.println(Thread.currentThread() &#43; &#34;: 1&#34;);

        new Thread(() -&gt; {
            System.out.println(Thread.currentThread() &#43; &#34;: 2&#34;);
            countDownLatch.countDown();
        }).start();

        System.out.println(Thread.currentThread() &#43; &#34;: 3&#34;);
        countDownLatch.await();
        System.out.println(Thread.currentThread() &#43; &#34;: 4&#34;);
    }
}
```

执行结果:

```shell
Thread[main,5,main]: 1
Thread[main,5,main]: 3
Thread[Thread-1,5,main]: 2
Thread[main,5,main]: 4
```

## await

&gt; 线程等待。一般是主线程来调用。

## countDown

&gt; 计数减一。一般是子线程调用。&lt;br/&gt;
&gt; 当计数为0时，主线程就会被唤醒，继续执行代码。

[//]: # (todo)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/16-countdownlatch/  

