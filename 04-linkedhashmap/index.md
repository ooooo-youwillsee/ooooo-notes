# 04 LinkedHashMap


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们会经常用到 `LinkedHashMap`, 非常有必要了解**源码**。 &lt;br/&gt;
&gt; `LinkedHashMap` 基于 `HashMap` 来实现, 内部借助**双向链表**来维持**访问顺序**，可以用来实现 `LRU` 算法。

## 使用方式

```java
public class LinkedHashMapTest {

    @Test
    void test() {
        Map&lt;String, String&gt; map = new LinkedHashMap&lt;&gt;();
        map.put(&#34;1&#34;, &#34;a&#34;);
        map.put(&#34;2&#34;, &#34;b&#34;);
        assertThat(map.remove(&#34;1&#34;)).isEqualTo(&#34;a&#34;);
        assertThat(map.put(&#34;2&#34;, &#34;c&#34;)).isEqualTo(&#34;b&#34;);
        assertThat(map.get(&#34;2&#34;)).isEqualTo(&#34;c&#34;);
    }
}
```

对于使用方式来说，`LinkedHashMap` 和 `HashMap` 是一样的，只不过 `LinkedHashMap` 在**遍历**过程中是**有序的**, 实现原理是**在添加元素时，需要把元素移动到双向链表的尾部，然后遍历时直接取双向链表**。

## put

&gt; 对于 put 方法，LinkedHashMap 实际上只实现了 `newNode`, `afterNodeAccess`, `afterNodeInsertion`。

源码位置: `java.util.LinkedHashMap#newNode`

```java
Node&lt;K,V&gt; newNode(int hash, K key, V value, Node&lt;K,V&gt; e) {
    LinkedHashMap.Entry&lt;K,V&gt; p =
        new LinkedHashMap.Entry&lt;K,V&gt;(hash, key, value, e);
    // 将新节点移动到 tail 位置，tail 节点是最新的节点
    linkNodeLast(p);
    return p;
}
```


源码位置: `java.util.LinkedHashMap#afterNodeAccess`

```java
// 把 e 节点移动到 tail 位置，tail 节点是最新的节点
void afterNodeAccess(Node&lt;K,V&gt; e) { // move node to last
    LinkedHashMap.Entry&lt;K,V&gt; last;
    // accessOrder 默认为 false
    if (accessOrder &amp;&amp; (last = tail) != e) {
        // 获取 p 节点，b 前驱节点，a 后继结点
        LinkedHashMap.Entry&lt;K,V&gt; p =
            (LinkedHashMap.Entry&lt;K,V&gt;)e, b = p.before, a = p.after;
        p.after = null;
        if (b == null)
            head = a;
        else
            b.after = a;
        if (a != null)
            a.before = b;
        else
            last = b;
        if (last == null)
            head = p;
        else {
            p.before = last;
            last.after = p;
        }
        tail = p;
        &#43;&#43;modCount;
    }
}
```

源码位置: `java.util.LinkedHashMap#afterNodeInsertion`

```java
// 判断是否要删除 head 节点, head 节点是最老的节点
void afterNodeInsertion(boolean evict) { // possibly remove eldest
    LinkedHashMap.Entry&lt;K,V&gt; first;
    // removeEldestEntry 由子类或者匿名内部类实现
    if (evict &amp;&amp; (first = head) != null &amp;&amp; removeEldestEntry(first)) {
        K key = first.key;
        // 删除指定节点
        removeNode(hash(key), key, null, false, true);
    }
}
```

## remove

&gt; 对于 remove 方法，LinkedHashMap 实际上只实现了 `afterNodeRemoval`。

源码位置: `java.util.LinkedHashMap#afterNodeRemoval`

```java
// 删除 e 节点
void afterNodeRemoval(Node&lt;K,V&gt; e) { // unlink
    LinkedHashMap.Entry&lt;K,V&gt; p =
        (LinkedHashMap.Entry&lt;K,V&gt;)e, b = p.before, a = p.after;
    p.before = p.after = null;
    if (b == null)
        head = a;
    else
        b.after = a;
    if (a == null)
        tail = b;
    else
        a.before = b;
}
```

## get

&gt; 对于 get 方法，LinkedHashMap 实际上只实现了 `afterNodeAccess`。

源码位置: `java.util.LinkedHashMap#get`

```java
public V get(Object key) {
    Node&lt;K,V&gt; e;
    if ((e = getNode(hash(key), key)) == null)
        return null;
    // 如果按照访问顺序排序，则需要把刚刚的节点移动到 tail 位置，tail 节点是最新的节点
    if (accessOrder)
        afterNodeAccess(e);
    return e.value;
}
```



---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/04-linkedhashmap/  

