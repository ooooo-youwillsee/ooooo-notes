# 09 ConcurrentHashMap


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们经常会用到 `ConcurrentHashMap`, 是**并发安全**的。

## 使用方式

```java
public class ConcurrentHashMapTest {

    @Test
    void test() {
        Map&lt;String, String&gt; map = new ConcurrentHashMap&lt;&gt;();
        map.put(&#34;1&#34;, &#34;1&#34;);
        assertThat(map.get(&#34;1&#34;)).isEqualTo(&#34;1&#34;);
        map.remove(&#34;1&#34;);
        assertThat(map.size()).isEqualTo(0);
    }
}
```

## put

&gt; 添加元素。

源码位置: `java.util.concurrent.ConcurrentHashMap#putVal`

```java
final V putVal(K key, V value, boolean onlyIfAbsent) {
    if (key == null || value == null) throw new NullPointerException();
    // 计算 hash 值
    int hash = spread(key.hashCode());
    int binCount = 0;
    for (Node&lt;K,V&gt;[] tab = table;;) {
        Node&lt;K,V&gt; f; int n, i, fh;
        if (tab == null || (n = tab.length) == 0)
            // 使用 CAS 来初始化 table
            tab = initTable();
        else if ((f = tabAt(tab, i = (n - 1) &amp; hash)) == null) {
            // f: 桶里的第一个元素，如果为空，使用 CAS 来初始化
            if (casTabAt(tab, i, null,
                         new Node&lt;K,V&gt;(hash, key, value, null)))
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
                    // fh &gt;= 0 表示链表节点
                    if (fh &gt;= 0) {
                        binCount = 1;
                        // 添加新节点，替换旧节点
                        for (Node&lt;K,V&gt; e = f;; &#43;&#43;binCount) {
                            K ek;
                            if (e.hash == hash &amp;&amp;
                                ((ek = e.key) == key ||
                                 (ek != null &amp;&amp; key.equals(ek)))) {
                                oldVal = e.val;
                                if (!onlyIfAbsent)
                                    e.val = value;
                                break;
                            }
                            Node&lt;K,V&gt; pred = e;
                            if ((e = e.next) == null) {
                                pred.next = new Node&lt;K,V&gt;(hash, key,
                                                          value, null);
                                break;
                            }
                        }
                    }
                    // 红黑树节点
                    else if (f instanceof TreeBin) {
                        Node&lt;K,V&gt; p;
                        binCount = 2;
                        if ((p = ((TreeBin&lt;K,V&gt;)f).putTreeVal(hash, key,
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
                if (binCount &gt;= TREEIFY_THRESHOLD)
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

&gt; 删除元素。

源码位置: `java.util.concurrent.ConcurrentHashMap#replaceNode`

```java
// 参数 value = null, vc = null
final V replaceNode(Object key, V value, Object cv) {
    // 计算 hash 值
    int hash = spread(key.hashCode());
    for (Node&lt;K,V&gt;[] tab = table;;) {
        Node&lt;K,V&gt; f; int n, i, fh;
        // 桶里的首元素不存在
        if (tab == null || (n = tab.length) == 0 ||
            (f = tabAt(tab, i = (n - 1) &amp; hash)) == null)
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
                    // fh &gt;= 0 表示链表节点
                    if (fh &gt;= 0) {
                        validated = true;
                        // 删除节点
                        for (Node&lt;K,V&gt; e = f, pred = null;;) {
                            K ek;
                            if (e.hash == hash &amp;&amp;
                                ((ek = e.key) == key ||
                                 (ek != null &amp;&amp; key.equals(ek)))) {
                                V ev = e.val;
                                if (cv == null || cv == ev ||
                                    (ev != null &amp;&amp; cv.equals(ev))) {
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
                        TreeBin&lt;K,V&gt; t = (TreeBin&lt;K,V&gt;)f;
                        TreeNode&lt;K,V&gt; r, p;
                        if ((r = t.root) != null &amp;&amp;
                            (p = r.findTreeNode(hash, key, null)) != null) {
                            V pv = p.val;
                            // 注意删除操作时，cv 和 value 都为 null
                            if (cv == null || cv == pv ||
                                (pv != null &amp;&amp; cv.equals(pv))) {
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

&gt; 获取元素，无锁。

源码位置: `java.util.concurrent.ConcurrentHashMap#get`

```java
public V get(Object key) {
    Node&lt;K,V&gt;[] tab; Node&lt;K,V&gt; e, p; int n, eh; K ek;
    // 计算 hash 值
    int h = spread(key.hashCode());
    // e: 桶里第一个元素
    if ((tab = table) != null &amp;&amp; (n = tab.length) &gt; 0 &amp;&amp;
        (e = tabAt(tab, (n - 1) &amp; h)) != null) {
        // 是首元素，返回 val
        if ((eh = e.hash) == h) {
            if ((ek = e.key) == key || (ek != null &amp;&amp; key.equals(ek)))
                return e.val;
        }
        // 表示为 TREEBIN (红黑树节点)
        else if (eh &lt; 0)
            return (p = e.find(h, key)) != null ? p.val : null;
        // 遍历查找 (链表节点)
        while ((e = e.next) != null) {
            if (e.hash == h &amp;&amp;
                ((ek = e.key) == key || (ek != null &amp;&amp; key.equals(ek))))
                return e.val;
        }
    }
    return null;
} 
```

## size

&gt; 获取大小，无锁。

源码位置: `java.util.concurrent.ConcurrentHashMap#size`

```java
public int size() {
    long n = sumCount();
    return ((n &lt; 0L) ? 0 :
            (n &gt; (long)Integer.MAX_VALUE) ? Integer.MAX_VALUE :
            (int)n);
}

// 遍历每个桶的大小
final long sumCount() {
    CounterCell[] as = counterCells; CounterCell a;
    long sum = baseCount;
    if (as != null) {
        for (int i = 0; i &lt; as.length; &#43;&#43;i) {
            if ((a = as[i]) != null)
                sum &#43;= a.value;
        }
    }
    return sum;
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/09-concurrenthashmap/  

