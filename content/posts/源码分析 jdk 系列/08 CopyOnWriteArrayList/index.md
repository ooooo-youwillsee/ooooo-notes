---
title: 08 CopyOnWriteArrayList
date: 2024-05-22T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们经常会用到 `CopyOnWriteArrayList`, 利用**写时复制**的机制来保证**并发安全**, 适合**多读少写**的场景。

## 使用方式

```java
public class CopyOnWriteArrayListTest {

    @Test
    public void test() {
        List<String> data = new CopyOnWriteArrayList<>();
        data.add("1");
        assertThat(data.get(0)).isEqualTo("1");
        data.remove("1");
        assertThat(data.isEmpty()).isEqualTo(true);
    }
}
```

## add

> 添加元素，**写时复制**。

源码位置: `java.util.concurrent.CopyOnWriteArrayList#add(E)`

```java
public boolean add(E e) {
    final ReentrantLock lock = this.lock;
    // 加锁
    lock.lock();
    try {
        // 获取数组
        Object[] elements = getArray();
        int len = elements.length;
        // 复制到新数组
        Object[] newElements = Arrays.copyOf(elements, len + 1);
        newElements[len] = e;
        // 修改数组
        setArray(newElements);
        return true;
    } finally {
        lock.unlock();
    }
}
```

## get

> 获取元素，不加锁。

源码位置: `java.util.concurrent.CopyOnWriteArrayList#get(int)`

```java
public E get(int index) {
    // 获取数据，这里不加锁
    return get(getArray(), index);
}
```

## remove

> 删除元素，**写时复制**。

源码位置: `java.util.concurrent.CopyOnWriteArrayList#remove(int)`

```java
public E remove(int index) {
    final ReentrantLock lock = this.lock;
    // 加锁
    lock.lock();
    try {
        // 获取数组
        Object[] elements = getArray();
        int len = elements.length;
        E oldValue = get(elements, index);
        int numMoved = len - index - 1;
        if (numMoved == 0)
            // 复制数组
            setArray(Arrays.copyOf(elements, len - 1));
        else {
            Object[] newElements = new Object[len - 1];
            // 复制数组
            System.arraycopy(elements, 0, newElements, 0, index);
            // 复制数组
            System.arraycopy(elements, index + 1, newElements, index,
                             numMoved);
            setArray(newElements);
        }
        return oldValue;
    } finally {
        lock.unlock();
    }
}
```