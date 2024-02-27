# 


## 1、RDB

### 1、触发机制

手动触发，分别有 `save` 和 `bgsave` 两个命令。
- `save`： 会阻塞当前 Redis 服务器，直到 RDB 过程完成为止，不建议使用。
- `bgsave`： Redis 进程会 **fork** 出子进程，子进程进行 RDB 持久化，阻塞只会发生在 **fork** 阶段。

自动触发的场景：
- `save m n` 配置，表示在 m 秒中存在 n 次数据改变，才会触发 `bgsave`。
- 从节点全量复制过程中，主节点会执行 `bgsave` 生成 RDB 文件，发送子节点。
- 默认关闭情况下，如果没有开启 AOF，也会执行 `bgsave`。

### 2、触发流程

`bgsave` 命令的运行流程如下图：
![bgsave 执行流程](./imgs/05_01.png)

说明；
1. 执行 `bgsave` 命令， 判断是否有 AOF/RDB 进程。
2. 执行 `info stats` 命令，选项 `latest_fork_usec` 表示最后一次 fork 使用的秒数。
3. `bgsave` 命令执行完成后，会出现 **Background saving started** 提示。 
4. 子进程创建 RDB 文件成功后，对原有的文件进行原子替换, 执行 `lastsave` 命令获取最后一次生成 RDB 文件的时间，对应 `info Persistence` 命令中的选项 `rdb_last_save_time`。

### 3、RDB 文件的处理

![RDB 配置](./imgs/05_02.png)

- RDB 文件通过配置文件参数 `dbfilename` 和 `dir`来配置，也可以通过命令 `config set dir {dir}` 和 `config set dbfilename {dbfilename}` 来动态配置。
- RDB 文件默认采用 **LZF** 压缩，通常建议开启，因为主从复制时，需要发送 RDB 文件到从节点，这样可以节省带宽。
- RDB 默认也开启校验，可以通过脚本 `redis-check-rdb` 来校验生成相应的错误报告。

### 4、RDB 的优缺点

优点：
- RDB 非常适合备份、全量复制等场景，比如每 6 小时定时执行 `bgsave`，可用于灾难恢复。
- RDB 的恢复数据远远快于 AOF 方式。

缺点：
- RDB 无法做到秒级持久化，fork 创建子进程也属于重量级操作。
- RDB 用特定的二进制格式保存，可能有版本不兼容问题。

## 2、AOF

&gt; 以独立的日志记录每次写命令，重启时再重新执行 AOF 文件中的命令达到恢复数据的目的。
&gt; AOF 解决了数据持久化的实时性。

### 1、AOF 工作流程

- 开启 AOF 需要设置参数 `appendonly yes`。
- 通过参数 `appendfilename` 来设置文件名。

![AOF 配置](./imgs/05_04.png)

工作流程如下图：
![AOF 工作流程](./imgs/05_03.png)

说明：
1. 所有的写入命令会追加到 aof_buf (缓冲区)中。
2. AOF 缓冲区会根据同步策略（参数默认设置 `appendfsync everysec`）来做同步操作。
3. 会定期对 AOF 文件进行 **rewrite**，达到压缩的目的，因为可能有些 key 过期了。
4. 机器重启时，如果开启了 AOF，则使用 AOF 加载数据。

### 2、命令写入

- AOF 采用文本协议格式，也就是说 AOF 文件中存储就是写入的命令，这样具有阅读性、便于修改。
- AOF 把命令先写入 aof_buf 中，根据不同的同步策略可以在性能和安全上做出平衡，没有特殊要求，就设置为 `everysec`。

&gt; 三种策略；
&gt; 1. no: don&#39;t fsync, just let the OS flush the data when it wants. Faster.
&gt; 2. always: fsync after every write to the append only log. Slow, Safest.
&gt; 3. everysec: fsync only one time every second. Compromise.

### 3、重写机制

AOF 文件可以变小的原因：
- 超时的数据，可以不用再写入文件中。
- key 过期了，可能含有无效命令，如 `del key1`。
- 多个命令可以合并成一个，如 `lpush list a` 和 `lpush list b` 可以合并为 `lpush list a b`。

触发 AOF 重写方式：
- 手动执行命令 `bgrewriteaof`
- 自动触发，根据配置参数 `auto-aof-rewrite-percentage 100` 和 `auto-aof-rewrite-min-size 64mb`。

&gt; 参数说明：
&gt; 1. This is how it works: Redis remembers the size of the AOF file after the
&gt; latest rewrite (if no rewrite has happened since the restart, the size of
&gt; the AOF at startup is used).
&gt; 2. This base size is compared to the current size. If the current size is
&gt; bigger than the specified percentage, the rewrite is triggered. Also
&gt; you need to specify a minimal size for the AOF file to be rewritten, this
&gt; is useful to avoid rewriting the AOF file even if the percentage increase
&gt; is reached but it is still pretty small

**自动触发时机: aof_current_size &gt; auto-aof-rewrite-min-size &amp;&amp; (aof_current_size - aof_base_size) / aof_base_size &gt; auto-aof-rewrite-percentage**

AOF 重写流程图如下：
![AOF 重写流程](./imgs/05_05.png)

说明：
1. 执行 AOF 重写请求，如果有子进程在执行 `bgsave` 则等待完成之后再操作。
2. fork 子进程进行重写，父进程接受请求，修改命令写入 aof_buf 中根据策略同步到磁盘。
3. fork 操作运用写时复制技术，所以子进程只能共享操作 fork 时的内存，这时父进程可能还在响应请求，所以把重写后的新命令放入 `aof_rewrite_buf` 缓冲区中。
4. 把 `aof_rewrite_buf` 中数据写入新的 AOF 文件中，根据开启参数 `aof-rewrite-incremental-fsync yes`，每 32MB 同步到磁盘。

### 4、重启加载

重启加载图：
![重启加载图](./imgs/05_06.png)

### 5、文件校验

加载损坏的 AOF 文件会拒绝启动，可以先**备份文件**，然后再执行命令 `redis-check-aof [--fix] &lt;file.aof&gt;` 来进行修复。

## 3、问题定位与优化

### 1、fork 操作

Redis 做 RDB 或者 AOF 重写时，必不可少的操作就是 fork。fork 用的写时复制技术，会复制父进程的内存页表。

改善 fork操作的耗时：

1. 优先使用物理机或者高效支持 fork 操作的虚拟化技术。
2. fork 耗时和内存量成正比，单个 Redis 实例建议不超过 10G。
3. linux 内存分配策略，避免物理内存不足导致 fork 失败。
4. 降低 fork 操作频率，比如避免不必要的全量复制，适当放宽 AOF 自动触发时机。

### 2、子进程开销监控和优化

1. CPU，子进程负责把内存中的数据写入文件中，属于 IO 密集型操作，不要和其他 IO 密集型服务部署在一起。
2. 内存，写时复制技术，避免在大量写入时做子进程重写操作，导致父进程维护大量页副本，造成内存消耗，可以关闭 **THP**。
3. 磁盘，AOF 重写会消耗大量磁盘 IO，可以关闭，参数设置为 `no-appendfsync-on-rewrite yes`，默认是关闭的，但是开启后，可能丢失数据。

### 3、AOF 追加阻塞

AOF 持久化，常用的同步策略是 `everysec`，用于平衡性能和安全性，对于这种方式，Redis 使用另一个线程每秒执行 fsync 同步磁盘，当系统磁盘繁忙时，可能造成 Redis 主进程阻塞。

![AOF 追加阻塞](./imgs/05_07.png)

## 4、多实例部署

略


---

> 作者:   
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/old-notes/books/redis-development-and-operation-and-maintenance/05/  

