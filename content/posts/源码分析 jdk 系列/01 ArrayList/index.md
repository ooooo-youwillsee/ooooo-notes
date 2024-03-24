---
title: 01 ArrayList
date: 2024-03-18T08:00:00+08:00
draft: false
tags: [ java, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们会经常用到 `ArrayList`, 非常有必要了解**源码**。

## 使用方式

```java
public class ArrayListTest {

    @Test
    void test() {
        List<String> ids = new ArrayList<>();
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

> 添加元素到 `ArrayList` 中，如果空间不够，则触发 `newCapacity = oldCapacity + (oldCapacity >> 1)`。

源码位置: `java.util.ArrayList#add`

```java
public boolean add(E e) {
    // 确保有足够的空间
    ensureCapacityInternal(size + 1);  // Increments modCount!!
    // 存入元素
    elementData[size++] = e;
    return true;
}
```

源码位置: `java.util.ArrayList#ensureCapacityInternal`

```java
private void ensureCapacityInternal(int minCapacity) {
    // 先计算容量，扩展容量
    ensureExplicitCapacity(calculateCapacity(elementData, minCapacity));
}

// 计算容量，最小为10 (DEFAULT_CAPACITY = 10)
private static int calculateCapacity(Object[] elementData, int minCapacity) {
    if (elementData == DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
        return Math.max(DEFAULT_CAPACITY, minCapacity);
    }
    return minCapacity;
}
```

源码位置: `java.util.ArrayList#ensureExplicitCapacity`

```java
// 确保容量足够
private void ensureExplicitCapacity(int minCapacity) {
    modCount++;

    // overflow-conscious code
    if (minCapacity - elementData.length > 0)
        // 空间不够，需要扩容
        grow(minCapacity);
}

private void grow(int minCapacity) {
    // overflow-conscious code
    int oldCapacity = elementData.length;
    int newCapacity = oldCapacity + (oldCapacity >> 1);
    // 处理溢出情况
    if (newCapacity - minCapacity < 0)
        newCapacity = minCapacity;
    // 处理最大情况
    if (newCapacity - MAX_ARRAY_SIZE > 0)
        newCapacity = hugeCapacity(minCapacity);
    // 复制元素到新数组中
    elementData = Arrays.copyOf(elementData, newCapacity);
}
```

## remove

> 删除元素，有**两个**重载，一个是**根据元素来删除**，一个是**根据下标来删除**，下面以**根据下标来删除**说明


源码位置: `java.util.ArrayList#remove(int)`

```java
public E remove(int index) {
    // 下标检查
    rangeCheck(index);

    modCount++;
    // 获取旧值
    E oldValue = elementData(index);

    int numMoved = size - index - 1;
    if (numMoved > 0)
        // 把 index+1 之后的元素移动到 index 位置
        System.arraycopy(elementData, index+1, elementData, index,
                         numMoved);
    // gc
    elementData[--size] = null; // clear to let GC do its work
    return oldValue;
}
```

## set

> 设置元素

源码位置: `java.util.ArrayList#set`

```java
public E set(int index, E element) {
    // 下标检查
    rangeCheck(index);

    // 获取旧值
    E oldValue = elementData(index);
    // 设置新值
    elementData[index] = element;
    return oldValue;
}
```

## get

> 获取元素

源码位置: `java.util.ArrayList#get`

```java
public E get(int index) {
    // 下标检查
    rangeCheck(index);
    // 获取旧值
    return elementData(index);
}
```