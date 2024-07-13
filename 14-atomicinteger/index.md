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

## incrementAndGet

&gt; 加 1 后获取值。

源码位置: `java.util.concurrent.atomic.AtomicInteger#incrementAndGet`

```java
// value 字段是 volatile 的，可以保证可见性。
public final int incrementAndGet() {
    // U 是 Unsafe 类型,  getAndAddInt 实际是 CAS 操作
    return U.getAndAddInt(this, VALUE, 1) &#43; 1;
}

@IntrinsicCandidate
public final int getAndAddInt(Object o, long offset, int delta) {
    int v;
    do {
        v = getIntVolatile(o, offset);
    } while (!weakCompareAndSetInt(o, offset, v, v &#43; delta));
    return v;
}
```

## compareAndSet

&gt; CAS 操作。

源码位置: `java.util.concurrent.atomic.AtomicInteger#compareAndSet`

```java
public final boolean compareAndSet(int expectedValue, int newValue) {
    return U.compareAndSetInt(this, VALUE, expectedValue, newValue);
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/14-atomicinteger/  

