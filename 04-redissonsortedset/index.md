# 04 RedissonSortedSet


&gt; `redisson` 基于 `org.redisson:redisson-spring-data-27:3.27.2` 版本

&gt; 在 `java` 中，操作 `redis` 一般都会选择 `redisson` 框架, 我们需要了解**常用功能的实现原理**, 这次来介绍 `RedissonSortedSet`。

## 使用方式

```java
@Test
void testOrderedSet() {
    RSortedSet&lt;String&gt; set = redissonClient.getSortedSet(&#34;set&#34;);
    set.clear();
    set.add(&#34;3&#34;);
    set.add(&#34;2&#34;);
    set.add(&#34;1&#34;);
    for (String s : set.readAll()) {
        System.out.println(s);
    }
}
```

`RedissonSortedSet` 是通过 `list` 数据结构来实现的。但如果 `value` 是 `string` 类型的，可以使用 `RedissonLexSortedSet` 来优化操作。

## add

源码位置: `org.redisson.RedissonSortedSet#add`

```java
@Override
public boolean add(V value) {
    // 加分布式锁，防止并发
    lock.lock();
    try {
        // 通过二分法查找插入位置
        BinarySearchResult&lt;V&gt; res = binarySearch(value, codec);
        if (res.getIndex() &lt; 0) {
            int index = -(res.getIndex() &#43; 1);
            
            // 编码
            ByteBuf encodedValue = encode(value);
            // 执行 lua 脚本，插入元素
            commandExecutor.get(commandExecutor.evalWriteNoRetryAsync(list.getRawName(), codec, RedisCommands.EVAL_VOID,
               &#34;local len = redis.call(&#39;llen&#39;, KEYS[1]);&#34;
                &#43; &#34;if tonumber(ARGV[1]) &lt; len then &#34;
                    // 获取插入位置的元素值
                    &#43; &#34;local pivot = redis.call(&#39;lindex&#39;, KEYS[1], ARGV[1]);&#34;
                    // 插入值
                    &#43; &#34;redis.call(&#39;linsert&#39;, KEYS[1], &#39;before&#39;, pivot, ARGV[2]);&#34;
                    &#43; &#34;return;&#34;
                &#43; &#34;end;&#34;
                &#43; &#34;redis.call(&#39;rpush&#39;, KEYS[1], ARGV[2]);&#34;, Arrays.&lt;Object&gt;asList(list.getRawName()), index, encodedValue));
            return true;
        } else {
            return false;
        }
    } finally {
        lock.unlock();
    }
}
```





---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/04-redissonsortedset/  

