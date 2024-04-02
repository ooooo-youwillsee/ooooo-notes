---
title: 03 HashMap
date: 2024-04-01T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们会经常用到 `HashMap`, 非常有必要了解**源码**。 <br/>
> `HashMap` 基于**拉链法**和**红黑树**来实现，关于这两个算法，这里不做解释。

## 使用方式

```java
public class HashMapTest {

    @Test
    void test() {
        Map<String, String> map = new HashMap<>();
        map.put("1", "a");
        map.put("2", "b");
        assertThat(map.remove("1")).isEqualTo("a");
        assertThat(map.put("2", "c")).isEqualTo("b");
        assertThat(map.get("2")).isEqualTo("c");
    }
}
```

## put

源码位置: `java.util.HashMap#put`

> 在 `HashMap` 中，先利用**拉链法**来添加节点(这里是**尾插法**)，当链表长度大于 **8** 了，就会将链表转为*红黑树*。

```java
public V put(K key, V value) {
    // 先计算 key 的 hash 值，然后再 putVal
    return putVal(hash(key), key, value, false, true);
}

// 调用 hashCode 
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

源码位置: `java.util.HashMap#putVal`

```java
final V putVal(int hash, K key, V value, boolean onlyIfAbsent,
               boolean evict) {
    Node<K,V>[] tab; Node<K,V> p; int n, i;
    // 计算 tab 的长度，默认为 16
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;
    if ((p = tab[i = (n - 1) & hash]) == null)
        // 说明当前桶没有节点，需要创建新节点
        tab[i] = newNode(hash, key, value, null);
    else {
        // 说明当前桶有节点, p 表示桶里第一个节点
        Node<K,V> e; K k;
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            // 找到节点了
            e = p;
        else if (p instanceof TreeNode)
            // 添加到红黑树中
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
        else {
            // 遍历链表
            for (int binCount = 0; ; ++binCount) {
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null);
                    // 链表长度达到8，会把链表转为红黑树 
                    if (binCount >= TREEIFY_THRESHOLD - 1) // -1 for 1st
                        treeifyBin(tab, hash);
                    break;
                }
                // 判断当前节点
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    break;
                // 进行下一次循环
                p = e;
            }
        }
        // e 表示旧值
        if (e != null) { // existing mapping for key
            V oldValue = e.value;
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            // LinkedHashMap 会使用这个方法 
            afterNodeAccess(e);
            return oldValue;
        }
    }
    // 标记修改
    ++modCount;
    // 动态扩容
    if (++size > threshold)
        resize();
    // LinkedHashMap 会使用这个方法
    afterNodeInsertion(evict);
    return null;
}
```

## remove

> remove 和 put 非常类似，都需要找到对应的节点

源码位置: `java.util.HashMap#remove(java.lang.Object)`

```java
public V remove(Object key) {
    Node<K,V> e;
    // 先计算 key 的 hash 值，然后 removeNode
    return (e = removeNode(hash(key), key, null, false, true)) == null ?
        null : e.value;
}
```

源码位置: `java.util.HashMap#removeNode`

```java
final Node<K,V> removeNode(int hash, Object key, Object value,
                           boolean matchValue, boolean movable) {
    Node<K,V>[] tab; Node<K,V> p; int n, index;
    // 判断桶里第一个节点是否存在, p 表示桶里第一个节点
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (p = tab[index = (n - 1) & hash]) != null) {
        Node<K,V> node = null, e; K k; V v;
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            // 找到了节点
            node = p;
        else if ((e = p.next) != null) {
            if (p instanceof TreeNode)
                // 从红黑色中获取节点
                node = ((TreeNode<K,V>)p).getTreeNode(hash, key);
            else {
                // 遍历链表获取节点
                do {
                    if (e.hash == hash &&
                        ((k = e.key) == key ||
                         (key != null && key.equals(k)))) {
                        node = e;
                        break;
                    }
                    p = e;
                } while ((e = e.next) != null);
            }
        }
        // node 表示找到的节点
        if (node != null && (!matchValue || (v = node.value) == value ||
                             (value != null && value.equals(v)))) {
            if (node instanceof TreeNode)
                // 删除红黑树节点
                ((TreeNode<K,V>)node).removeTreeNode(this, tab, movable);
            else if (node == p)
                // 删除头结点
                tab[index] = node.next;
            else
                // 删除链表节点
                p.next = node.next;
            // 标记修改
            ++modCount;
            --size;
            // LinkedHashMap 会使用这个方法 
            afterNodeRemoval(node);
            return node;
        }
    }
    return null;
}
```

## get

> get 和 put 非常类似，都需要找到对应的节点

源码位置: `java.util.HashMap#get`

```java
public V get(Object key) {
    Node<K,V> e;
    return (e = getNode(hash(key), key)) == null ? null : e.value;
}

final Node<K,V> getNode(int hash, Object key) {
    Node<K,V>[] tab; Node<K,V> first, e; int n; K k;
    // 判断桶里第一个节点是否存在，first 表示第一个节点
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (first = tab[(n - 1) & hash]) != null) {
        if (first.hash == hash && // always check first node
            ((k = first.key) == key || (key != null && key.equals(k))))
            // 找到节点了
            return first;
        if ((e = first.next) != null) {
            if (first instanceof TreeNode)
                // 从红黑树中获取节点
                return ((TreeNode<K,V>)first).getTreeNode(hash, key);
            // 遍历链表获取节点
            do {
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    return e;
            } while ((e = e.next) != null);
        }
    }
    return null;
}
```

