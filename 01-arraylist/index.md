# 01 ArrayList


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们会经常用到 `ArrayList`, 非常有必要了解**源码**。

## 使用方式

```java
public class ArrayListTest {

    @Test
    void test() {
        List&lt;String&gt; ids = new ArrayList&lt;&gt;();
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

&gt; 添加元素到 `ArrayList` 中，如果空间不够，则触发 `newCapacity = oldCapacity &#43; (oldCapacity &gt;&gt; 1)`。

源码位置: `java.util.ArrayList#add`

```java
public boolean add(E e) {
    // 确保有足够的空间
    ensureCapacityInternal(size &#43; 1);  // Increments modCount!!
    // 存入元素
    elementData[size&#43;&#43;] = e;
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
    modCount&#43;&#43;;

    // overflow-conscious code
    if (minCapacity - elementData.length &gt; 0)
        // 空间不够，需要扩容
        grow(minCapacity);
}

private void grow(int minCapacity) {
    // overflow-conscious code
    int oldCapacity = elementData.length;
    int newCapacity = oldCapacity &#43; (oldCapacity &gt;&gt; 1);
    // 处理溢出情况
    if (newCapacity - minCapacity &lt; 0)
        newCapacity = minCapacity;
    // 处理最大情况
    if (newCapacity - MAX_ARRAY_SIZE &gt; 0)
        newCapacity = hugeCapacity(minCapacity);
    // 复制元素到新数组中
    elementData = Arrays.copyOf(elementData, newCapacity);
}
```

## remove

&gt; 删除元素，有**两个**重载，一个是**根据元素来删除**，一个是**根据下标来删除**，下面以**根据下标来删除**说明


源码位置: `java.util.ArrayList#remove(int)`

```java
public E remove(int index) {
    // 下标检查
    rangeCheck(index);

    modCount&#43;&#43;;
    // 获取旧值
    E oldValue = elementData(index);

    int numMoved = size - index - 1;
    if (numMoved &gt; 0)
        // 把 index&#43;1 之后的元素移动到 index 位置
        System.arraycopy(elementData, index&#43;1, elementData, index,
                         numMoved);
    // gc
    elementData[--size] = null; // clear to let GC do its work
    return oldValue;
}
```

## set

&gt; 设置元素

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

&gt; 获取元素

源码位置: `java.util.ArrayList#get`

```java
public E get(int index) {
    // 下标检查
    rangeCheck(index);
    // 获取旧值
    return elementData(index);
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/01-arraylist/  

