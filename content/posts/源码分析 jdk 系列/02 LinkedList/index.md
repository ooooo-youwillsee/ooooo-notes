---
title: 02 LinkedList
date: 2024-03-18T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们会经常用到 `LinkedList`, 非常有必要了解**源码**。

## 使用方式

```java
public class LinkedListTest {

    @Test
    void test() {
        List<String> ids = new LinkedList<>();
        assertThat(ids.add("1")).isEqualTo(true);
        assertThat(ids.add("2")).isEqualTo(true);
        assertThat(ids.add("3")).isEqualTo(true);
        assertThat(ids.remove("2")).isEqualTo(true);
        assertThat(ids.set(0, "4")).isEqualTo("1");
        assertThat(ids.get(0)).isEqualTo("4");
    }
}
```

## add

> 添加元素

源码位置: `java.util.LinkedList#add(E)`

```java
public boolean add(E e) {
    // 添加到链表末尾
    linkLast(e);
    return true;
}

void linkLast(E e) {
    final Node<E> l = last;
    // 新建节点
    final Node<E> newNode = new Node<>(l, e, null);
    // 尾结点为新节点
    last = newNode;
    if (l == null)
        first = newNode;
    else
        // 旧尾结点指向新节点
        l.next = newNode;
    size++;
    modCount++;
}
```

## remove

> 删除元素，有**两个**重载，一个是**根据元素来删除**，一个是**根据下标来删除**，下面以**根据下标来删除**说明


源码位置: `java.util.LinkedList#remove(int)`

```java
public E remove(int index) {
    // 下标检查
    checkElementIndex(index);
    // 先查找下标对应的节点，然后删除
    return unlink(node(index));
}
```

源码位置: `java.util.LinkedList#node`

```java
// 获取下标对应的节点
Node<E> node(int index) {
    // 判断是否从头结点开始查找
    if (index < (size >> 1)) {
        Node<E> x = first;
        for (int i = 0; i < index; i++)
            x = x.next;
        return x;
    } else {
        Node<E> x = last;
        for (int i = size - 1; i > index; i--)
            x = x.prev;
        return x;
    }
}
```

源码位置: `java.util.LinkedList#unlink`

```java
// 删除节点
E unlink(Node<E> x) {
    // assert x != null;
    final E element = x.item;
    // 获取后继节点
    final Node<E> next = x.next;
    // 获取前驱节点
    final Node<E> prev = x.prev;

    // 连接前驱节点和后继节点
    if (prev == null) {
        first = next;
    } else {
        prev.next = next;
        x.prev = null;
    }

    if (next == null) {
        last = prev;
    } else {
        next.prev = prev;
        x.next = null;
    }

    x.item = null;
    size--;
    modCount++;
    return element;
}
```

## set

> 设置元素

源码位置: `java.util.LinkedList#set`

```java
public E set(int index, E element) {
    // 下标检查
    checkElementIndex(index);
    // 找到对应下标的节点, 在 remove 方法中已解析
    Node<E> x = node(index);
    E oldVal = x.item;
    // 赋值
    x.item = element;
    return oldVal;
}
```

## get

源码位置: `java.util.LinkedList#get`

```java
public E get(int index) {
    // 下标检查
    checkElementIndex(index);
    // 找到对应下标的节点, 在 remove 方法中已解析
    return node(index).item;
}
```





