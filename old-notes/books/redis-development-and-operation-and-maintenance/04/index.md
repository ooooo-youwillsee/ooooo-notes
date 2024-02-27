# 


## 1、客户端通信协议

Redis 制定了 RESP（redis序列化协议）实现客户端和服务端的正常交互。

### 1、发送命令格式

CRLF 为 &#39;\r\n&#39;
```shell script
*&lt;参数数量&gt; CRLF
$&lt;参数 1 的字节数量&gt; CRLF
&lt;参数 1&gt; CRLF
...
$&lt;参数 N 的字节数量&gt; CRLF
&lt;参数 N&gt; CRLF
```

以 `set hello world` 命令为例：
```shell script
*3
$3 
set 
$5 
hello 
$5
world
```

### 2、返回结果格式

- 状态回复，第一个字节为 &#34;&#43;&#34;。如 `set`
- 错误回复，第一个字节为 &#34;-&#34;。如 `错误命令`
- 整数回复，第一个字节为 &#34;:&#34;。如 `incr`
- 字符串回复，第一个字节为 &#34;$&#34;。如 `get`
- 多条字符串回复，第一个字节为 &#34;*&#34;。如 `mget`

## 2、Java 客户端 Jedis

jedis 用的很少了，请参考 [lettuce](https://lettuce.io/)、[redisson](https://redisson.org/)

## 3、Python 客户端 redis-py

略

## 4、客户端管理

### 1、客户端 API

#### 1、`client list`

与 Redis 服务端相连的所有客户端连接信息

![client list](./imgs/04_01.png)

说明：

- id: 客户端连接唯一标识，递增，但 Redis 重启后重置为 0。
- addr: 客户端 IP 和 PORT。
- fd: socket 文件描述符，与 `lsof` 命令中 fd 是同一个。
- name: 客户端名字，与 `client setName` 和 `client getName` 有关

Redis 为每个客户端分配了输入缓冲区，它的作用将客户端发送的命令临时保存，Redis 会从输入缓冲区中拉取命令并执行。不受 `maxmemory` 参数影响。

- qbuf: 客户端的输入缓冲区总容量
- qbuf-free: 客户端的输入缓冲区剩余容量

输入缓冲区过大的原因：
1. Redis 处理速度跟不上输入缓冲区的输入速度，可能存在 **bigKey**。
2. Redis 发生了阻塞。

Redis 为每个客户端分配了输出缓冲区，它的作用是保存命令执行的结果返回给客户端。通过配置文件中的 `client-output-buffer-limit &lt;class&gt; &lt;hard limit&gt; &lt;soft limit&gt; &lt;soft seconds&gt;` 来配置。不受 `maxmemory` 参数影响。

- obl: 固定输出缓冲区大小
- oll: 动态输出缓冲区大小，当固定缓冲区满了，就会使用动态缓冲区
- omem: 输出缓冲区总计的字节数

其他信息：

- age: 已连接的时间
- idle: 最近一次空闲时间
- flag: S 表示 slave 客户端，N 表示普通客户端，O 表示执行 `monitor` 命令的客户端
- db: 数据库索引下标
- sub/psub: 当前客户端订阅的频道
- multi: 当前事务已执行命令个数

客户端限制 `maxclients (默认为 1000)` 和 `timeout`，通过 `config set maxclients 10000` 命令和 `config set timeout 30` 命令来设置。

监控缓冲区方法：
- 定期执行 `client list` 命令，收集 qbuf 和 qbuf-free。
- 执行 `info clients` 命令，找到最大的输入缓冲区 `client_recent_max_input_buffer`


#### 2、`client getName / setName`

给当前客户端设置名字

#### 3、`client kill`

杀掉指定 ip 和 port 的客户端
```shell script
  client kill ip:port
```

#### 4、`client pause`

阻塞客户端 timeout 毫秒
```shell script
  client pause timeout(毫秒)
```

#### 5、`monitor`

监控 Redis 正在执行的命令，如果并发量过大，会造成输出缓冲区暴涨。
```shell script
  monitor
```

### 2、客户端相关配置

客户端的配置如下：
![客户端的配置](./imgs/04_02.png)
- `timeout`： 空闲连接超时时间
- `tcp-keepalive`： 检查死的连接
- `tcp-backlog`:  TCP 连接过后，会将接受的连接放入队列中，`tcp-backlog` 就是这个队列的大小。

### 3、客户端统计信息

#### 1、`info clients`
运行命令如下：
![info clients](./imgs/04_03.png)


#### 2、`info stats`

运行命令如下：
![info stats](./imgs/04_04.png)

客户端相关的指标
- total_connections_received： 总共接受的连接数
- rejected_connections： 拒绝的连接数

## 5、客户端常见异常

### 1、无法从连接池中获取连接
可能的原因：
- 连接池设置过小。
- 没有正确使用连接池，用过后没有释放。
- 具体还是要看**选用的客户端**，没有连接了是怎么处理的？（是等待还是直接拒接抛出异常）

### 2、客户端读写超时
可能的原因：
- 读写超时时间设置短。
- 命令本身就很慢。
- 网络不正常。
- Redis 阻塞。

### 3、客户端连接超时
可能的原因：
- 连接超时时间设置短。
- 网络不正常。
- Redis 发生阻塞，导致 `tcp-backlog` 已满。

### 4、客户端缓冲区异常
可能的原因：
- 输出缓冲区满，比如用 `get` 命令来获取一个**bigKey**。
- 长时间空闲连接被服务端主动断开。
- 不正常的并发读写，Redis 对象被多个线程并发操作。

### 5、Lua 脚本执行
可能的原因：
- lua 脚本执行时间超过参数 `lua-time-limit`。

### 6、客户端连接数过大
客户端连接数超过 `maxclients`，新的连接就会被拒绝。

从两个方面来解决：
- 客户端：通过下线部分应用节点，使 Redis 的连接数降下来，从而继续找其根本原因，或者调整 `maxclients` 参数。
- 服务端：如果 Redis 是高可用模式，可以把**当前的节点故障转移**。

## 6、客户端案例分析

### 1、Redis 内存陡增

**现象**：
- 服务端：Redis 主节点内存陡增，从节点内存无变化。
- 客户端：产生 OOM 异常。

**可能的原因**：
- 确实有大量的写入，通过执行命令 `dbsize` 来获取主从节点的键个数。
- 排查是否由客户端缓冲区应引发的问题，通过执行命令 `info clients`来查看。

**处理方法**：
- 通过命令 `redis-cli info list | grep -v &#34;omemo=0&#34;`， 找到非零的客户端连接，然后 kill 掉。
- 可能就是运行命令 `monitor` 造成的，一般都建议在生厂环境中禁用 `monitor`。

### 2、客户端周期性超时
**现象**：
- 客户端：客户端周期性超时
- 服务端：无明显现象，只是一些慢查询。

**可能的原因**：
- 网络不正常。
- 执行命令造成慢查询导致的周期性超时。

**处理方法**：
- 运维层面，监控慢查询，一旦超多阈值，就发出报警。
- 避免不正确使用命令，如 `KEYS *`、`HGETALL key` 等。





---

> 作者:   
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/old-notes/books/redis-development-and-operation-and-maintenance/04/  

