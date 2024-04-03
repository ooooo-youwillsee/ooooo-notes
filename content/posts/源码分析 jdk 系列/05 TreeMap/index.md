---
title: 05 TreeMap
date: 2024-04-03T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们很少会用到 `TreeMap`, 但是还是需要了解**源码**。
> **TreeMap** 基于**红黑树**来实现**按照 key 排序**，关于这个算法，这里不做解释。

## 使用方式

```java
public class TreeMapTest {

    @Test
    void test() {
        Map<String, String> map = new TreeMap<>();
        map.put("1", "a");
        map.put("2", "b");
        assertThat(map.remove("1")).isEqualTo("a");
        assertThat(map.put("2", "c")).isEqualTo("b");
        assertThat(map.get("2")).isEqualTo("c");
    }
}
```

> 因为是 Map 接口的实现类 ，所以使用方式是差不多的。只不过在遍历过程中，是按照 key 值排序的。

## put

源码位置: `java.util.TreeMap#put`

```java
public V put(K key, V value) {
    Entry<K,V> t = root;
    if (t == null) {
        compare(key, key); // type (and possibly null) check

        root = new Entry<>(key, value, null);
        size = 1;
        modCount++;
        return null;
    }
    int cmp;
    Entry<K,V> parent;
    // split comparator and comparable paths
    // 通过 Comparator 来比较 key 值
    Comparator<? super K> cpr = comparator;
    if (cpr != null) {
        // 下面是排序二叉树的标准代码，不解释
        do {
            parent = t;
            cmp = cpr.compare(key, t.key);
            if (cmp < 0)
                t = t.left;
            else if (cmp > 0)
                t = t.right;
            else
                return t.setValue(value);
        } while (t != null);
    }
    else {
        // 通过 Comparable 来比较 key 值
        if (key == null)
            throw new NullPointerException();
        @SuppressWarnings("unchecked")
            Comparable<? super K> k = (Comparable<? super K>) key;
        // 下面是排序二叉树的标准代码，不解释
        do {
            parent = t;
            cmp = k.compareTo(t.key);
            if (cmp < 0)
                t = t.left;
            else if (cmp > 0)
                t = t.right;
            else
                return t.setValue(value);
        } while (t != null);
    }
    Entry<K,V> e = new Entry<>(key, value, parent);
    if (cmp < 0)
        parent.left = e;
    else
        parent.right = e;
    // 红黑树插入操作
    fixAfterInsertion(e);
    size++;
    modCount++;
    return null;
}
```

## remove

源码位置: `java.util.TreeMap#remove`

```java
public V remove(Object key) {
    // 按照排序二叉树的方式来查找 key 值
    Entry<K,V> p = getEntry(key);
    if (p == null)
        return null;

    V oldValue = p.value;
    // 红黑树删除操作
    deleteEntry(p);
    return oldValue;
}
```

## get

源码位置: `java.util.TreeMap#get`

```java
public V get(Object key) {
    // 按照排序二叉树的方式来查找 key 值
    Entry<K,V> p = getEntry(key);
    return (p==null ? null : p.value);
}
```