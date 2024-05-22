# 08 CopyOnWriteArrayList


&gt; jdk 基于 8 版本

&gt; 在平时的开发中，我们经常会用到 `CopyOnWriteArrayList`, 利用**写时复制**的机制来保证**并发安全**, 适合**多读少写**的场景。

## 使用方式

```java
public class CopyOnWriteArrayListTest {

    @Test
    public void test() {
        List&lt;String&gt; data = new CopyOnWriteArrayList&lt;&gt;();
        data.add(&#34;1&#34;);
        assertThat(data.get(0)).isEqualTo(&#34;1&#34;);
        data.remove(&#34;1&#34;);
        assertThat(data.isEmpty()).isEqualTo(true);
    }
}
```

## add

&gt; 添加元素，**写时复制**。

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
        Object[] newElements = Arrays.copyOf(elements, len &#43; 1);
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

&gt; 获取元素，不加锁。

源码位置: `java.util.concurrent.CopyOnWriteArrayList#get(int)`

```java
public E get(int index) {
    // 获取数据，这里不加锁
    return get(getArray(), index);
}
```

## remove

&gt; 删除元素，**写时复制**。

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
            System.arraycopy(elements, index &#43; 1, newElements, index,
                             numMoved);
            setArray(newElements);
        }
        return oldValue;
    } finally {
        lock.unlock();
    }
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/08-copyonwritearraylist/  

