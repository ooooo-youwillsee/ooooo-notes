---
title: 实现一个软引用缓存
date: 2024-03-20T08:00:00+08:00
draft: false
tags: [ jdk ]
collections: [ 随笔 ]
---

> 在 `java` 中有**四种**引用类型，分为**强引用**，**软引用**，**弱引用**，**虚引用**，这里介绍**如何使用软引用来实现一个缓存**。

## 实现代码

```java
public class SoftReferenceCache<K, V> implements Cache<K, V> {

    private Map<K, SoftValue<V>> map;

    private ReferenceQueue<V> referenceQueue;

    public SoftReferenceCache() {
        this.map = new HashMap<>();
        this.referenceQueue = new ReferenceQueue<>();
    }

    @Override
    public void put(K key, V value) {
        removeSoftValue();
        this.map.put(key, new SoftValue<>(key, value, referenceQueue));
    }

    @Override
    public V get(K key) {
        removeSoftValue();
        SoftValue<V> softValue = this.map.get(key);
        return softValue.getValue();
    }

    // 这里没有使用额外的线程来定时执行方法
    protected void removeSoftValue() {
        while (true) {
            SoftValue<V> softValue = (SoftValue<V>) referenceQueue.poll();
            if (softValue == null) {
                break;
            }
            System.out.println("remove unnecessary softValue: " + softValue);
            map.remove(softValue.getKey());
        }
    }

    private class SoftValue<V> extends SoftReference<V> {
        
        // 从引用队列中获取此对象，就能知道是哪个key和value要回收了。
        private K key;

        public SoftValue(K key, V value, ReferenceQueue<V> referenceQueue) {
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
            return "SoftValue{" +
                "key=" + key +
                '}';
        }
    }
}
```

## 测试代码

> 注意: 我在 `build.gradle` 文件中添加了 `test` 的 `jvm` 参数 **jvmArgs = \["-Xmx10m", "-Xms10m"\]**, 来模拟**内存不足**来触发**回收软引用**。

```java
@Test
void testSoftReferenceCache() {
    Cache<String, String> cache = new SoftReferenceCache<>();
    for (int i = 0; i < 1_000_000; i++) {
        System.gc();
        cache.put("key" + i, "value" + i);
    }
    for (int i = 0; i < 10; i++) {
        cache.get("key" + i);
    }
}
```

## 示例代码

[demo-java-soft-reference](https://github.com/ooooo-youwillsee/demo-java-soft-reference)
