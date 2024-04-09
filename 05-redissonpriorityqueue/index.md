# 05 RedissonPriorityQueue


&gt; `redisson` 基于 `org.redisson:redisson-spring-data-27:3.27.2` 版本

&gt; 在 `java` 中，操作 `redis` 一般都会选择 `redisson` 框架, 我们需要了解**常用功能的实现原理**, 这次来介绍 `RedissonPriorityQueue`。

## 使用方式

```java
@Test
void testPriorityQueue() {
    RPriorityQueue&lt;String&gt; queue = redissonClient.getPriorityQueue(&#34;queue&#34;);
    queue.clear();
    queue.add(&#34;3&#34;);
    queue.add(&#34;2&#34;);
    queue.add(&#34;1&#34;);
    for (String s : queue.readAll()) {
        System.out.println(s);
    }
}
```

`RedissonPriorityQueue` 是通过 `list` 数据结构来实现的。

## add

源码位置: `org.redisson.RedissonPriorityQueue#add`

```java
@Override
public boolean add(V value) {
    // 分布式锁，防止并发
    lock.lock();
    
    try {
        // 通过二分查找插入位置
        BinarySearchResult&lt;V&gt; res = binarySearch(value);
        int index = 0;
        if (res.getIndex() &lt; 0) {
            index = -(res.getIndex() &#43; 1);
        } else {
            index = res.getIndex() &#43; 1;
        }
            
        get(commandExecutor.evalWriteNoRetryAsync(getRawName(), codec, RedisCommands.EVAL_VOID,
           &#34;local len = redis.call(&#39;llen&#39;, KEYS[1]);&#34;
            &#43; &#34;if tonumber(ARGV[1]) &lt; len then &#34;
                // 获取插入位置的值
                &#43; &#34;local pivot = redis.call(&#39;lindex&#39;, KEYS[1], ARGV[1]);&#34;
                // 插入值
                &#43; &#34;redis.call(&#39;linsert&#39;, KEYS[1], &#39;before&#39;, pivot, ARGV[2]);&#34;
                &#43; &#34;return;&#34;
            &#43; &#34;end;&#34;
            &#43; &#34;redis.call(&#39;rpush&#39;, KEYS[1], ARGV[2]);&#34;, 
                Arrays.asList(getRawName()),
                index, encode(value)));
        return true;
    } finally {
        lock.unlock();
    }
}
```

`RedissonPriorityQueue` 和 `RedissonSortedSet` 的内部实现基本是**一样**的。

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/05-redissonpriorityqueue/  

