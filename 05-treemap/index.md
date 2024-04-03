# 05 TreeMap


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们很少会用到 `TreeMap`, 但是还是需要了解**源码**。
&gt; **TreeMap** 基于**红黑树**来实现**按照 key 排序**，关于这个算法，这里不做解释。

## 使用方式

```java
public class TreeMapTest {

    @Test
    void test() {
        Map&lt;String, String&gt; map = new TreeMap&lt;&gt;();
        map.put(&#34;1&#34;, &#34;a&#34;);
        map.put(&#34;2&#34;, &#34;b&#34;);
        assertThat(map.remove(&#34;1&#34;)).isEqualTo(&#34;a&#34;);
        assertThat(map.put(&#34;2&#34;, &#34;c&#34;)).isEqualTo(&#34;b&#34;);
        assertThat(map.get(&#34;2&#34;)).isEqualTo(&#34;c&#34;);
    }
}
```

&gt; 因为是 Map 接口的实现类 ，所以使用方式是差不多的。只不过在遍历过程中，是按照 key 值排序的。

## put

源码位置: `java.util.TreeMap#put`

```java
public V put(K key, V value) {
    Entry&lt;K,V&gt; t = root;
    if (t == null) {
        compare(key, key); // type (and possibly null) check

        root = new Entry&lt;&gt;(key, value, null);
        size = 1;
        modCount&#43;&#43;;
        return null;
    }
    int cmp;
    Entry&lt;K,V&gt; parent;
    // split comparator and comparable paths
    // 通过 Comparator 来比较 key 值
    Comparator&lt;? super K&gt; cpr = comparator;
    if (cpr != null) {
        // 下面是排序二叉树的标准代码，不解释
        do {
            parent = t;
            cmp = cpr.compare(key, t.key);
            if (cmp &lt; 0)
                t = t.left;
            else if (cmp &gt; 0)
                t = t.right;
            else
                return t.setValue(value);
        } while (t != null);
    }
    else {
        // 通过 Comparable 来比较 key 值
        if (key == null)
            throw new NullPointerException();
        @SuppressWarnings(&#34;unchecked&#34;)
            Comparable&lt;? super K&gt; k = (Comparable&lt;? super K&gt;) key;
        // 下面是排序二叉树的标准代码，不解释
        do {
            parent = t;
            cmp = k.compareTo(t.key);
            if (cmp &lt; 0)
                t = t.left;
            else if (cmp &gt; 0)
                t = t.right;
            else
                return t.setValue(value);
        } while (t != null);
    }
    Entry&lt;K,V&gt; e = new Entry&lt;&gt;(key, value, parent);
    if (cmp &lt; 0)
        parent.left = e;
    else
        parent.right = e;
    // 红黑树插入操作
    fixAfterInsertion(e);
    size&#43;&#43;;
    modCount&#43;&#43;;
    return null;
}
```

## remove

源码位置: `java.util.TreeMap#remove`

```java
public V remove(Object key) {
    // 按照排序二叉树的方式来查找 key 值
    Entry&lt;K,V&gt; p = getEntry(key);
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
    Entry&lt;K,V&gt; p = getEntry(key);
    return (p==null ? null : p.value);
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/05-treemap/  

