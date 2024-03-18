# 02 LinkedList


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们会经常用到 `LinkedList`, 非常有必要了解**源码**。

## 使用方式

```java
public class LinkedListTest {

    @Test
    void test() {
        List&lt;String&gt; ids = new LinkedList&lt;&gt;();
        assertThat(ids.add(&#34;1&#34;)).isEqualTo(true);
        assertThat(ids.add(&#34;2&#34;)).isEqualTo(true);
        assertThat(ids.add(&#34;3&#34;)).isEqualTo(true);
        assertThat(ids.remove(&#34;2&#34;)).isEqualTo(true);
        assertThat(ids.set(0, &#34;4&#34;)).isEqualTo(&#34;1&#34;);
        assertThat(ids.get(0)).isEqualTo(&#34;4&#34;);
    }
}
```

## add

&gt; 添加元素

源码位置: `java.util.LinkedList#add(E)`

```java
public boolean add(E e) {
    // 添加到链表末尾
    linkLast(e);
    return true;
}

void linkLast(E e) {
    final Node&lt;E&gt; l = last;
    // 新建节点
    final Node&lt;E&gt; newNode = new Node&lt;&gt;(l, e, null);
    // 尾结点为新节点
    last = newNode;
    if (l == null)
        first = newNode;
    else
        // 旧尾结点指向新节点
        l.next = newNode;
    size&#43;&#43;;
    modCount&#43;&#43;;
}
```

## remove

&gt; 删除元素，有**两个**重载，一个是**根据元素来删除**，一个是**根据下标来删除**，下面以**根据下标来删除**说明


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
Node&lt;E&gt; node(int index) {
    // 判断是否从头结点开始查找
    if (index &lt; (size &gt;&gt; 1)) {
        Node&lt;E&gt; x = first;
        for (int i = 0; i &lt; index; i&#43;&#43;)
            x = x.next;
        return x;
    } else {
        Node&lt;E&gt; x = last;
        for (int i = size - 1; i &gt; index; i--)
            x = x.prev;
        return x;
    }
}
```

源码位置: `java.util.LinkedList#unlink`

```java
// 删除节点
E unlink(Node&lt;E&gt; x) {
    // assert x != null;
    final E element = x.item;
    // 获取后继节点
    final Node&lt;E&gt; next = x.next;
    // 获取前驱节点
    final Node&lt;E&gt; prev = x.prev;

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
    modCount&#43;&#43;;
    return element;
}
```

## set

&gt; 设置元素

源码位置: `java.util.LinkedList#set`

```java
public E set(int index, E element) {
    // 下标检查
    checkElementIndex(index);
    // 找到对应下标的节点, 在 remove 方法中已解析
    Node&lt;E&gt; x = node(index);
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







---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/02-linkedlist/  

