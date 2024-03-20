# 实现一个软引用缓存


&gt; 在 `java` 中有**四种**引用类型，分为**强引用**，**软引用**，**弱引用**，**虚引用**，这里介绍**如何使用软引用来实现一个缓存**。

## 实现代码

```java
public class SoftReferenceCache&lt;K, V&gt; implements Cache&lt;K, V&gt; {

    private Map&lt;K, SoftValue&lt;V&gt;&gt; map;

    private ReferenceQueue&lt;V&gt; referenceQueue;

    public SoftReferenceCache() {
        this.map = new HashMap&lt;&gt;();
        this.referenceQueue = new ReferenceQueue&lt;&gt;();
    }

    @Override
    public void put(K key, V value) {
        removeSoftValue();
        this.map.put(key, new SoftValue&lt;&gt;(key, value, referenceQueue));
    }

    @Override
    public V get(K key) {
        removeSoftValue();
        SoftValue&lt;V&gt; softValue = this.map.get(key);
        return softValue.getValue();
    }

    // 这里没有使用额外的线程来定时执行方法
    protected void removeSoftValue() {
        while (true) {
            SoftValue&lt;V&gt; softValue = (SoftValue&lt;V&gt;) referenceQueue.poll();
            if (softValue == null) {
                break;
            }
            System.out.println(&#34;remove unnecessary softValue: &#34; &#43; softValue);
            map.remove(softValue.getKey());
        }
    }

    private class SoftValue&lt;V&gt; extends SoftReference&lt;V&gt; {
        
        // 从引用队列中获取此对象，就能知道是哪个key和value要回收了。
        private K key;

        public SoftValue(K key, V value, ReferenceQueue&lt;V&gt; referenceQueue) {
            super(value, referenceQueue);
            this.key = key;
        }

        public K getKey() {
            return key;
        }

        public V getValue() {
            return super.get();
        }

        @Override
        public String toString() {
            return &#34;SoftValue{&#34; &#43;
                &#34;key=&#34; &#43; key &#43;
                &#39;}&#39;;
        }
    }
}
```

## 测试代码

&gt; 注意: 我在 `build.gradle` 文件中添加了 `test` 的 `jvm` 参数 **jvmArgs = \[&#34;-Xmx10m&#34;, &#34;-Xms10m&#34;\]**, 来模拟**内存不足**来触发**回收软引用**。

```java
@Test
void testSoftReferenceCache() {
    Cache&lt;String, String&gt; cache = new SoftReferenceCache&lt;&gt;();
    for (int i = 0; i &lt; 1_000_000; i&#43;&#43;) {
        System.gc();
        cache.put(&#34;key&#34; &#43; i, &#34;value&#34; &#43; i);
    }
    for (int i = 0; i &lt; 10; i&#43;&#43;) {
        cache.get(&#34;key&#34; &#43; i);
    }
}
```

## 示例代码

[demo-java-soft-reference](https://github.com/ooooo-youwillsee/demo-java-soft-reference)


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%AE%9E%E7%8E%B0%E4%B8%80%E4%B8%AA%E8%BD%AF%E5%BC%95%E7%94%A8%E7%BC%93%E5%AD%98/  

