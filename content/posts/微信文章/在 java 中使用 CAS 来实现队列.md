---
title: 在 java 中使用 CAS 来实现队列
date: 2022-11-16T08:00:00+08:00
draft: false
tags: [java]
collections: [微信文章]
---

## 1. 实现队列

代码：

* 使用 `head` 和 `tail` 来实现单链表
* 单链表涉及到两个节点，每次都要判断中间状态
* 这里使用的是 `AtomicReference` 来实现的，也可以使用 `unsafe` 来实现，有兴趣的可以尝试下
* 这里使用 `curTail.next` 进行 `CAS` 来指定下一个节点, 很少这么使用，后面再详细说说

```java
public class LinkedQueue<E> {

  private final Node<E> dummy = new Node<>(null, null);

  private final AtomicReference<Node<E>> head = new AtomicReference<>(dummy);

  private final AtomicReference<Node<E>> tail = new AtomicReference<>(dummy);

  public boolean put(E item) {
    Node<E> newNode = new Node<>(item, null);
    while (true) {
      Node<E> curTail = tail.get();
      Node<E> tailNext = curTail.next.get();
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

      Node<E> oldHead = head.get();
      Node<E> newHead = oldHead.next.get();
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

  private static class Node<E> {

    private final E item;

    private AtomicReference<Node<E>> next;

    public Node(E item, Node<E> next) {
      this.item = item;
      this.next = new AtomicReference<>(next);
    }
  }
}
```


## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/demo-java-concurrent)
