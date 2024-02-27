# 


## 1、慢查询

### 1、慢查询配置

- `slowlog-log-slower-than`: 10000 (默认值，单位微秒)，超过 10 毫秒的语句就会被记录下来。
- `slowlog-max-len`: 128（默认值），Redis 内部使用列表来保存慢查询日志。

`lowlog-log-slower-than` = 0, 会记录所有命令。

`lowlog-log-slower-than` &lt; 0, 不会记录任何命令。

配置方式：
1. 修改配置文件 redis.conf。
2. 动态修改
```shell script
  config set lowlog-log-slower-than 20000 # 设置慢查询时间
  config set slowlog-max-len 1000 # 设置慢查询日志大小
  config rewrite  # 持久化到配置文件
```

- 慢查询命令
```shell script
  SLOWLOG GET 10 # 获取最近 10 条日志
  SLOWLOG LEN  # 获取日志条数
  SLOWLOG RESET # 慢查询日志重置
```

### 2、最佳实践

参数 `slowlog-max-len`，建议调大日志列表，比如 1000以上；参数 `slowlog-log-slower-than`，默认超过 10ms 就判断为慢查询，如果每条命令执行时间在 1ms 以上，则 1s 的并发量不足 1000，所以对于高 OPS 场景设置为 1ms。

**慢查询只记录命令执行时间，不包括命令排队和网络传输时间。**

慢查询日志只是一个先进先出的队列，如果查询较多，可能会丢失日志数据，可以利用 `SLOWLOG GET` 命令将日志存入 mysql 中，也可以利用开源工具 [CacheCloud](https://github.com/sohutv/cachecloud)。

## 2、Redis shell

### 1、redis-cli 命令

- -x 参数
```shell script
echo &#34;world&#34; | redis-cli -x set hello # 设置key为 hello， value为 world
```

- -c 参数

集群参数，防止 moved 和 asked 异常。

- --rdb 参数

请求 Redis 实例生成 RDB 文件，保存在本地。

- --bigkeys 参数

选出大 key，这些 key 可能是系统瓶颈。

- --eval 参数

运行 lua 脚本。

- latency 参数 

1. --latency: 客户端与主机延迟 。
2. --latency-history: 分时段展示延迟，用 `-i` 参数来指定，默认为 15s。
3. --latency-dist: 统计图表形式展示延迟。

- --stat 参数

实时获取 Redis 重要统计信息，信息比 `info` 命令少。

### 2、redis-server 命令

- --test-memory 参数
```shell script
  redis-server --test-memory 1024 # 检测是否可以给 Redis 分配 1G 内存
```

### 3、redis-benchmark 命令

用来做基准性能测试。
```shell script
  redis-benchmark -c 100 -n 20000 -q -r 10000 -t get,set --csv
  # -c 客户端并发数
  # -n 客户端请求总数
  # -q 仅仅显示 requests per second 信息
  # -r 随机键的范围（0-9999），不是个数
  # -t 指定命令
  # --csv 结果按照 csv 格式输出
```

## 3、Pipeline

### 1、pipeline 概念

redis 执行一条命令可以分为四个过程：
1. 发送命令
2. 命令排队
3. 执行命令
4. 返回结果

其中 1. 和 4. 称为 RTT (往返时间)。

pipeline 可以将一组 redis 命令通过一次 RTT 发给 Redis，再按照执行结果返回给客户端。

redis-cli 脚本的 --pipe 选项就是使用 pipeline 机制。

### 2、性能测试

pipeline 执行速度一般比逐条执行快，客户端与服务端网路延时越大，效果越明显。

### 3、原生批量和 pipeline 

- 原生批量命令是原子的，pipeline 不是原子的（中间可以执行其他命令）。
- 原生批量命令是一个命令对应多个 key, pipeline 支持多个命令。
- 原生批零命令是 Redis 服务端实现的，pipeline 是客户端和服务端共同实现的。

### 4、最佳实践

- pipeline 封装的数据不能过多，即大数据可以拆分为批量的小 pipeline 命令。
- pipeline 只能操作一个 Redis 实例。

## 4、事务与Lua

&gt; 为了保证多个命令组合的原子性，Redis 提供了简单事务功能和 lua 脚本。

### 1、事务

```shell script
  MULTI # 开启事务
  set a 1 # 执行命令，实际上把命令放到队列中
  set b 1 # 执行命令，实际上把命令放到队列中
  EXEC # 真正的执行命令 
```

1. 命令错误，会导致事务执行失败，比如 `set a 1 `写成了 `sett a 1`。
2. 运行时错误，redis 不支持回滚，比如 `sadd a 1` 写成了 `zadd a 1 b`，假设 a 这个 key 已经存在，就会抛出错误。 

事务简单主要原因就是，**redis 不支持回滚**。

### 2、Lua 

在 Redis 中使用 Lua，有两种方式 `eval` 和 `evalsha`。

- eval
```shell script
  EVAL script numkeys key [key ...] arg [arg ...]
  eval &#39;return &#34;hello &#34; .. KEYS[1] .. ARGV[1]&#39; 1 world redis  # 例子
  # 输出 &#34;hello worldredis&#34;
```
如果 Lua 脚本较长，可以使用 redis-cli --eval 选项来执行。

- evalsha

使用 eval 命令，每次都需要将脚本发送到服务端，使用 `evalsha` 命令就避免了开销。
```shell script
  redis-cli script load hello.lua # 加载 lua 脚本到服务端，会返回 sha1 值。
  EVALSHA sha1 numkeys key [key ...] arg [arg ...] # 执行 lua 脚本，参数 sha1 就是返回的 sha1 值，其他参数同 eval 命令。
```

- lua 中使用 redis API
```shell script
  redis.call(&#34;set&#34;, &#34;a&#34; , 1)
  redis.call(&#34;get&#34;, &#34;a&#34; )
```

也可以使用 `redis.pcall` 命令，两者差别在于 pcall 命令会忽略错误继续执行，call 遇到错误停止。

**lua 脚本执行是原子性的，中间不会插入别的命令。**

- 管理 lua 脚本命令
```shell script
  SCRIPT LOAD [script] # 加载 lua 脚本，返回 sha1 值
  SCRIPT EXISTS sha1 [sha1] # 是否存在 sha1 的脚本
  SCRIPT FLUSH # 清空 lua 脚本
  SCRIPT KILL # 杀掉 lua 脚本
```

## 5、Bitmaps

### 1、数据结构模型

Bitmaps 不是一种数据结构，实际上它是字符串，但它可以对字符串的位进行操作，你可以想象一个以位为单位的数组，每个单元只能存储 0 和1。

### 2、命令

- 设置值
```shell script
  SETBIT key offset value # offset 从 0 开始
```

- 获取值
```shell script
  GETBIT key offset # 结果只有 0 或者 1
  BITCOUNT key [start end]  # 对[start, end]范围获取值为 1 的个数  
```

- Bitmaps 间的运算
```shell script
  BITOP operation destkey key [key ...] # operation 可以是 and(交集)、or(并集)、not(非)、xor(异或)
```

- 获取第一个为 bit 的 offset 值
```shell script
  BITPOS key bit [start] [end] # [start,end]范围中第一个出现 bit 的 offset 
```

### 3、分析

利用 Bitmaps 来统计网站访问用户：
```shell script
  SETBIT users:2020-03-22 1 1  # 2020-03-22 这一天 1 号访问了。
  SETBIT users:2020-03-23 2 1  # 2020-03-23 这一天 2 号访问了。  
  BITCOUNT users:2020-03-23  # 2020-03-23 这一天 访问用户量
  BITOP and users:2020-03-22_23 users:2020-03-23 users:2020-03-22 # 两天都访问的用户量
```

set 和 bitmaps 对比：

| 数据类型   | 每个用户 id 占用空间 | 需要存储用户量  | 全部内存量 |
|:---------:|:------------------:|:------------:|:----------:|
| set      |      64 位         |     5 千万     | 64 位 * 5 千万 = 400 MB |
| bitmaps  |      1 位          |      1 亿      | 1 位 * 1 亿 = 12.5 MB |

从表格可以看出 bitmaps 节省内存。

但如果每天的活跃用户很少，set 可能比 bitmaps 好，因为 set 需要内存 64 位 * 10 万 = 800 KB，而 bitmap 还是需要 12.5 MB 内存。

## 6、HyperLogLog

HyperLoglog 不是一种新的数据结构，而是一种基数算法，可以利用极小的内存空间完成独立总数统计，数据集可以 ID、Email、IP。

- 命令
```shell script
  PFADD key element [element ...] # 添加元素
  PFCOUNT key [key ...] # 计数
  PFMERGE destkey sourcekey [sourcekey ...] # merge
```

注意：
- 只是计算独立总数，不需要获取单条数据
- HyperLogLog 有误差

## 7、发布订阅

Redis 提供**发布/订阅**模式的消息机制。

- 命令
```shell script
  PUBLISH channel message # 向指定的 channel 发布消息
  SUBSCRIBE channel [channel ...] # 向指定的 channel 订阅消息
  PSUBSCRIBE pattern [pattern ...] # 模式订阅消息
  UNSUBSCRIBE [channel [channel ...]] # 取消订阅           
  PUNSUBSCRIBE [pattern [pattern ...]] # 模式取消订阅
  PUBSUB subcommand [argument [argument ...]] # 查看订阅
  # PUBSUB channels [pattern] # 频道
  # PUBSUB numsub [channel ...] # channel 订阅数
  # PUBSUB numpat # 模式订阅数
```

注意：
- Redis 提供的消息机制，无法实现消息堆积、回溯
- 消息队列的优点：**异步**、**解耦**、**削峰**，缺点：**复杂度提高**。

## 8、GEO

Redis 提供了 GEO（地址位置）功能，支持存储地理位置信息。

- 添加位置信息
```shell script
  GEOADD key longitude latitude member [longitude latitude member ...]
```

- 获取位置信息
```shell script
  GEOPOS key member [member ...]
```

- 获取两个地理位置的距离
```shell script
  GEODIST key member1 member2 [unit]
 # unit: m(米)；（km）公里；（mi）英里；（fl）尺
```

- 获取指定范围内的地理位置集合
```shell script
  GEORADIUS key longitude latitude radius m|km|ft|mi [WITHCOORD] [WITHDIST] [WITHHASH] [COUNT count] [ASC|DESC] [STORE key] [STOREDIST key]
  # 根据具体的经纬度来获取
  GEORADIUSBYMEMBER key member radius m|km|ft|mi [WITHCOORD] [WITHDIST] [WITHHASH] [COUNT count] [ASC|DESC] [STORE key] [STOREDIST key]
  # 根据某一个成员来获取
```

- 获取 geohash
```shell script
  GEOHASH key member [member ...]
  # Redis 将二维的经纬度转化为一维字符串
```

- 删除地理位置
```shell script
  ZREM key member [member ...]
  # Redis 没有提供专门的删除命令，可以借助 ZREM 命令来删除
  # GEO 的数据类型为 zset
```




---

> 作者:   
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/old-notes/books/redis-development-and-operation-and-maintenance/03/  

