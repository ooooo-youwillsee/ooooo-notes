---
title: 在 java 中使用 CAS 来实现栈
date: 2022-11-09T08:00:00+08:00
draft: false
tags: [java]
categories: [微信文章]
---

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
public class ConcurrentStack<E> {

  private final AtomicReference<Node<E>> top = new AtomicReference<>();


  public void push(E e) {
    Node<E> newHead = new Node<>(e);
    Node<E> oldHead;
    do {
      oldHead = top.get();
      newHead.next = oldHead;
    } while (!top.compareAndSet(oldHead, newHead));
  }

  public E pop() {
    Node<E> oldHead;
    Node<E> newHead;
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

  private static class Node<E> {

    private final E e;

    private Node<E> next;

    public Node(E e) {
      this.e = e;
    }
  }
}

```

## 3. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/demo-java-concurrent)
