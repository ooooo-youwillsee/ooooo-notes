---
title: 在 java 中使用 CAS 来实现栈2
date: 2022-11-13T08:00:00+08:00
draft: false
tags: [java]
categories: [微信文章]
---

## 1. 使用数组来实现栈

代码：

* 用数组来实现
* 用 `CTL` 来控制
* 测试类，参考 `ConcurrentStackUsingArrayTest`

```java
public class ConcurrentStackUsingArray<E> {

  private final AtomicInteger CTL = new AtomicInteger(0);

  private final AtomicReference<E[]> arr = new AtomicReference<>((E[]) new Object[10]);

  private final AtomicInteger index = new AtomicInteger(0);

  public void push(E e) {
    while (!CTL.compareAndSet(0, 1)) {
      Thread.yield();
    }

    while (index.get() >= arr.get().length) {
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
