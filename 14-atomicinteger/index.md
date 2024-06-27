# 14 AtomicInteger


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们经常会用到 `AtomicInteger`, 它是**原子计数**，与之类似的还有很多，比如 `AtomicBoolean`, `AtomicLong`, `AtomicReferenceFieldUpdater`。

## 使用方式

```java
public class AtomicIntegerTest {

    @Test
    void test() {
        AtomicInteger atomicInteger = new AtomicInteger();
        assertThat(atomicInteger.get()).isEqualTo(0);
        assertThat(atomicInteger.incrementAndGet()).isEqualTo(1);
    }
}
```

## get 

&gt; 获取值。

## incrementAndGet

&gt; 加 1 后获取值。

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/14-atomicinteger/  

