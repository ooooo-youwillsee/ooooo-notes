# 在 java 中使用 CAS 来实现栈2


## 1. 使用数组来实现栈

代码：

* 用数组来实现
* 用 `CTL` 来控制
* 测试类，参考 `ConcurrentStackUsingArrayTest`

```java
public class ConcurrentStackUsingArray&lt;E&gt; {

  private final AtomicInteger CTL = new AtomicInteger(0);

  private final AtomicReference&lt;E[]&gt; arr = new AtomicReference&lt;&gt;((E[]) new Object[10]);

  private final AtomicInteger index = new AtomicInteger(0);

  public void push(E e) {
    while (!CTL.compareAndSet(0, 1)) {
      Thread.yield();
    }

    while (index.get() &gt;= arr.get().length) {
      E[] oldArr = arr.get();
      E[] newArr = (E[]) new Object[oldArr.length * 2];
      System.arraycopy(oldArr, 0, newArr, 0, oldArr.length);
      if (arr.compareAndSet(oldArr, newArr)) {
        break;
      }
    }

    arr.get()[index.getAndIncrement()] = e;
    CTL.lazySet(0);
  }

  public E pop() {
    while (!CTL.compareAndSet(0, 1)) {
      Thread.yield();
    }

    E e = arr.get()[index.decrementAndGet()];
    CTL.lazySet(0);
    return e;
  }

}

```


## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/demo-java-concurrent)


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-java-%E4%B8%AD%E4%BD%BF%E7%94%A8-cas-%E6%9D%A5%E5%AE%9E%E7%8E%B0%E6%A0%882/  

