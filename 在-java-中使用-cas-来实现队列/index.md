# 在 Java 中使用 CAS 来实现队列


## 1. 实现队列

代码：

* 使用 `head` 和 `tail` 来实现单链表
* 单链表涉及到两个节点，每次都要判断中间状态
* 这里使用的是 `AtomicReference` 来实现的，也可以使用 `unsafe` 来实现，有兴趣的可以尝试下
* 这里使用 `curTail.next` 进行 `CAS` 来指定下一个节点, 很少这么使用，后面再详细说说

```java
public class LinkedQueue&lt;E&gt; {

  private final Node&lt;E&gt; dummy = new Node&lt;&gt;(null, null);

  private final AtomicReference&lt;Node&lt;E&gt;&gt; head = new AtomicReference&lt;&gt;(dummy);

  private final AtomicReference&lt;Node&lt;E&gt;&gt; tail = new AtomicReference&lt;&gt;(dummy);

  public boolean put(E item) {
    Node&lt;E&gt; newNode = new Node&lt;&gt;(item, null);
    while (true) {
      Node&lt;E&gt; curTail = tail.get();
      Node&lt;E&gt; tailNext = curTail.next.get();
      if (curTail == tail.get()) {
        if (tailNext != null) {
          // 队列处于中间状态，推进尾节点
          tail.compareAndSet(curTail, tailNext);
        } else {
          // 处于稳定状态，尝试插入新节点
          if (curTail.next.compareAndSet(null, newNode)) {
            // 插入操作成功，尝试推进尾节点
            tail.compareAndSet(curTail, newNode);
            return true;
          }
        }
      }
    }
  }

  public E take() {
    while (true) {
      if (head.get() == tail.get()) {
        return null;
      }

      Node&lt;E&gt; oldHead = head.get();
      Node&lt;E&gt; newHead = oldHead.next.get();
      // 队列处于中间状态，可能另外一个线程已经 CAS 成功， 只剩下一个元素 dummy 了
      if (newHead == null) {
        return null;
      }
      if (head.compareAndSet(oldHead, newHead)) {
        oldHead.next = null;
        return oldHead.item;
      }
    }
  }

  private static class Node&lt;E&gt; {

    private final E item;

    private AtomicReference&lt;Node&lt;E&gt;&gt; next;

    public Node(E item, Node&lt;E&gt; next) {
      this.item = item;
      this.next = new AtomicReference&lt;&gt;(next);
    }
  }
}
```


## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/demo-java-concurrent)


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-java-%E4%B8%AD%E4%BD%BF%E7%94%A8-cas-%E6%9D%A5%E5%AE%9E%E7%8E%B0%E9%98%9F%E5%88%97/  

