---
title: 09 ConcurrentHashMap
date: 2024-05-23T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们经常会用到 `ConcurrentHashMap`, 是**并发安全**的。

## 使用方式

```java
public class ConcurrentHashMapTest {

    @Test
    void test() {
        Map<String, String> map = new ConcurrentHashMap<>();
        map.put("1", "1");
        assertThat(map.get("1")).isEqualTo("1");
        map.remove("1");
        assertThat(map.size()).isEqualTo(0);
    }
}
```

## put

> 添加元素。

源码位置: `java.util.concurrent.ConcurrentHashMap#putVal`

```java
final V putVal(K key, V value, boolean onlyIfAbsent) {
    if (key == null || value == null) throw new NullPointerException();
    // 计算 hash 值
    int hash = spread(key.hashCode());
    int binCount = 0;
    for (Node<K,V>[] tab = table;;) {
        Node<K,V> f; int n, i, fh;
        if (tab == null || (n = tab.length) == 0)
            // 使用 CAS 来初始化 table
            tab = initTable();
        else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
            // f: 桶里的第一个元素，如果为空，使用 CAS 来初始化
            if (casTabAt(tab, i, null,
                         new Node<K,V>(hash, key, value, null)))
                break;                
        }
        else if ((fh = f.hash) == MOVED)
            // 扩容操作，太复杂了，不用关心
            tab = helpTransfer(tab, f);
        else {
            V oldVal = null;
            // 对首元素加锁
            synchronized (f) {
                if (tabAt(tab, i) == f) {
                    // fh >= 0 表示链表节点
                    if (fh >= 0) {
                        binCount = 1;
                        // 添加新节点，替换旧节点
                        for (Node<K,V> e = f;; ++binCount) {
                            K ek;
                            if (e.hash == hash &&
                                ((ek = e.key) == key ||
                                 (ek != null && key.equals(ek)))) {
                                oldVal = e.val;
                                if (!onlyIfAbsent)
                                    e.val = value;
                                break;
                            }
                            Node<K,V> pred = e;
                            if ((e = e.next) == null) {
                                pred.next = new Node<K,V>(hash, key,
                                                          value, null);
                                break;
                            }
                        }
                    }
                    // 红黑树节点
                    else if (f instanceof TreeBin) {
                        Node<K,V> p;
                        binCount = 2;
                        if ((p = ((TreeBin<K,V>)f).putTreeVal(hash, key,
                                                       value)) != null) {
                            oldVal = p.val;
                            if (!onlyIfAbsent)
                                p.val = value;
                        }
                    }
                }
            }
            if (binCount != 0) {
                // 链表节点大于8，将链表转为红黑树
                if (binCount >= TREEIFY_THRESHOLD)
                    treeifyBin(tab, i);
                if (oldVal != null)
                    return oldVal;
                break;
            }
        }
    }
    // 添加个数
    addCount(1L, binCount);
    return null;
}
```

## remove

> 删除元素。

源码位置: `java.util.concurrent.ConcurrentHashMap#replaceNode`

```java
// 参数 value = null, vc = null
final V replaceNode(Object key, V value, Object cv) {
    // 计算 hash 值
    int hash = spread(key.hashCode());
    for (Node<K,V>[] tab = table;;) {
        Node<K,V> f; int n, i, fh;
        // 桶里的首元素不存在
        if (tab == null || (n = tab.length) == 0 ||
            (f = tabAt(tab, i = (n - 1) & hash)) == null)
            break;
        else if ((fh = f.hash) == MOVED)
            // 扩容，太复杂，不用关心
            tab = helpTransfer(tab, f);
        else {
            V oldVal = null;
            boolean validated = false;
            // 对首元素加锁
            synchronized (f) {
                if (tabAt(tab, i) == f) {
                    // fh >= 0 表示链表节点
                    if (fh >= 0) {
                        validated = true;
                        // 删除节点
                        for (Node<K,V> e = f, pred = null;;) {
                            K ek;
                            if (e.hash == hash &&
                                ((ek = e.key) == key ||
                                 (ek != null && key.equals(ek)))) {
                                V ev = e.val;
                                if (cv == null || cv == ev ||
                                    (ev != null && cv.equals(ev))) {
                                    oldVal = ev;
                                    if (value != null)
                                        e.val = value;
                                    else if (pred != null)
                                        pred.next = e.next;
                                    else
                                        setTabAt(tab, i, e.next);
                                }
                                break;
                            }
                            pred = e;
                            if ((e = e.next) == null)
                                break;
                        }
                    }
                    // 红黑树节点
                    else if (f instanceof TreeBin) {
                        validated = true;
                        TreeBin<K,V> t = (TreeBin<K,V>)f;
                        TreeNode<K,V> r, p;
                        if ((r = t.root) != null &&
                            (p = r.findTreeNode(hash, key, null)) != null) {
                            V pv = p.val;
                            // 注意删除操作时，cv 和 value 都为 null
                            if (cv == null || cv == pv ||
                                (pv != null && cv.equals(pv))) {
                                oldVal = pv;
                                if (value != null)
                                    p.val = value;
                                else if (t.removeTreeNode(p))
                                    setTabAt(tab, i, untreeify(t.first));
                            }
                        }
                    }
                }
            }
            if (validated) {
                if (oldVal != null) {
                    if (value == null)
                        // 减少 count
                        addCount(-1L, -1);
                    return oldVal;
                }
                break;
            }
        }
    }
    return null;
}
```

## get

> 获取元素，无锁。

源码位置: `java.util.concurrent.ConcurrentHashMap#get`

```java
public V get(Object key) {
    Node<K,V>[] tab; Node<K,V> e, p; int n, eh; K ek;
    // 计算 hash 值
    int h = spread(key.hashCode());
    // e: 桶里第一个元素
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (e = tabAt(tab, (n - 1) & h)) != null) {
        // 是首元素，返回 val
        if ((eh = e.hash) == h) {
            if ((ek = e.key) == key || (ek != null && key.equals(ek)))
                return e.val;
        }
        // 表示为 TREEBIN (红黑树节点)
        else if (eh < 0)
            return (p = e.find(h, key)) != null ? p.val : null;
        // 遍历查找 (链表节点)
        while ((e = e.next) != null) {
            if (e.hash == h &&
                ((ek = e.key) == key || (ek != null && key.equals(ek))))
                return e.val;
        }
    }
    return null;
} 
```

## size

> 获取大小，无锁。

源码位置: `java.util.concurrent.ConcurrentHashMap#size`

```java
public int size() {
    long n = sumCount();
    return ((n < 0L) ? 0 :
            (n > (long)Integer.MAX_VALUE) ? Integer.MAX_VALUE :
            (int)n);
}

// 遍历每个桶的大小
final long sumCount() {
    CounterCell[] as = counterCells; CounterCell a;
    long sum = baseCount;
    if (as != null) {
        for (int i = 0; i < as.length; ++i) {
            if ((a = as[i]) != null)
                sum += a.value;
        }
    }
    return sum;
}
```