# 在 Java 中使用 CAS 来实现栈


## 1. 实现简单的 CAS 例子

`CAS` 相信大家都听过，就是 `compareAndSet(V expectedValue, V newValue)`, 真正会用的人很少，这里的难点主要是**无阻塞算法**。

先实现一个简单 CAS 例子，只具有学习的意义。

* getValue: 获取值
* compareAndSet: 比较旧值，设置新值

```java
public class SimulatedCAS {

  private int value;

  public SimulatedCAS(int value) {
    this.value = value;
  }

  public synchronized int getValue() {
    return value;
  }

  public synchronized boolean compareAndSet(int expectedValue, int newValue) {
    if (expectedValue == value) {
      this.value = newValue;
      return true;
    }
    return false;
  }
}
```

重点：**真正用 `CAS` 的时候，都是 `while` 循环**


## 2. 用 CAS 来实现一个栈


代码：

* 用链表来实现，当然用数组实现也可以，比较麻烦一点，后面我再写一个示例
* 每次操作都是**先 get 来获取 top 对象，然后再 compareAndSet top**

```java
public class ConcurrentStack&lt;E&gt; {

  private final AtomicReference&lt;Node&lt;E&gt;&gt; top = new AtomicReference&lt;&gt;();


  public void push(E e) {
    Node&lt;E&gt; newHead = new Node&lt;&gt;(e);
    Node&lt;E&gt; oldHead;
    do {
      oldHead = top.get();
      newHead.next = oldHead;
    } while (!top.compareAndSet(oldHead, newHead));
  }

  public E pop() {
    Node&lt;E&gt; oldHead;
    Node&lt;E&gt; newHead;
    do {
      oldHead = top.get();
      if (oldHead == null) {
        return null;
      }

      newHead = oldHead.next;
    } while (!top.compareAndSet(oldHead, newHead));

    oldHead.next = null;
    return oldHead.e;
  }

  private static class Node&lt;E&gt; {

    private final E e;

    private Node&lt;E&gt; next;

    public Node(E e) {
      this.e = e;
    }
  }
}

```

## 3. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/demo-java-concurrent)


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-java-%E4%B8%AD%E4%BD%BF%E7%94%A8-cas-%E6%9D%A5%E5%AE%9E%E7%8E%B0%E6%A0%88/  

