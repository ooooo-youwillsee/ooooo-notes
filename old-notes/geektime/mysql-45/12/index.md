# 

## 1、SQL语句为什么变"慢"了

在前面第 2 篇文章[《日志系统：一条SQL更新语句是如何执行的？》](./02.md)中，InnoDB 在处理更新语句时，只做了写日志这一个磁盘操作，这个日志叫作 redo log。更新内存写完 redo log 后，就返回给客户端，本次更新成功。。

**当内存数据页跟磁盘数据页内容不一致的时候，我们称这个内存页为"脏页"。内存数据写入到磁盘后，内存和磁盘上的数据页的内容就一致了，称为"干净页"。**

MySQL 偶尔"抖"一下的那个瞬间，可能就是在刷脏页（flush）。

引发数据库的 flush 过程的几种情况：
- 1. InnoDB 的 redo log 写满了。
- 2. 系统内存不足。当需要新的内存页，而内存不够用的时候，就要淘汰一些数据页，空出内存给别的数据页使用。如果淘汰的是"脏页"，就要先将脏页写到磁盘。
- 3. MySQL 认为系统"空闲"的时候。
- 4. MySQL 正常关闭。

上面四种场景对性能的影响：

第 3 种情况和第 4 种场景是 MySQL 正常情况，不用太关心性能。
 
- 第 1 种是 "redo log 写满了，要 flush 脏页"，出现这种情况了，整个系统就不能再接受更新，如果你从监控上看，这时候更新数会跌为 0。
- 第 2 种是"内存不够用了，要先将脏页写到磁盘"，这种情况其实是常态。**InnoDB用缓冲池（buffer pool）管理内存，缓冲池中的内存页有三种状态**：

<indent/> 第一种是，还没有使用的；

<indent/> 第二种是，使用了并且是干净页；

<indent/> 第三种是，使用了并且是脏页。

InnoDB 的策略是尽量使用内存，因此对于一个长时间运行的库来说，未被使用的页面很少。刷脏页虽然是常态，但是出现以下这两种情况，都是会明显影响性能的：
- 一个查询要淘汰的脏页个数太多，会导致查询的响应时间明显变长。
- 日志写满，更新全部堵住，写性能跌为 0，这种情况对敏感业务来说，是不能接受的。

## 2、InnoDB 刷脏页的控制策略

- `innodb_io_capacity` 参数：告诉 InnoDB 所在主机的 IO 能力。

可以使用 fio 这个工具来测试 IO 能力：
```shell script
 fio -filename=$filename -direct=1 -iodepth 1 -thread -rw=randrw -ioengine=psync -bs=16k -size=500M -numjobs=10 -runtime=10 -group_reporting -name=mytest
```

InnoDB 的刷盘速度就是要参考这两个因素：一个是**脏页比例**，一个是**redo log写盘速度**。

- 参数 `innodb_max_dirty_pages_pct` 是脏页比例上限，默认值是 **75%**。

脏页比例是通过 `Innodb_buffer_pool_pages_dirty/Innodb_buffer_pool_pages_total` 得到的，具体的命令如下：
```shell script
select VARIABLE_VALUE into @a from global_status where VARIABLE_NAME = 'Innodb_buffer_pool_pages_dirty';
select VARIABLE_VALUE into @b from global_status where VARIABLE_NAME = 'Innodb_buffer_pool_pages_total';
select @a/@b;
```

要尽量避免刷脏页这种情况，你就要合理地设置 `innodb_io_capacity` 的值，并且平时要多关注脏页比例，不要让它经常接近 75%。

一个有趣的策略：

一旦一个查询请求需要在执行过程中先 flush 掉一个脏页时，这个查询就可能要比平时慢了。而 MySQL中 的一个机制，可能让你的查询会更慢：在准备刷一个脏页的时候，如果这个数据页旁边的数据页刚好是脏页，就会把这个"邻居"也带着一起刷掉；而且这个把"邻居"拖下水的逻辑还可以继续蔓延，也就是对于每个邻居数据页，如果跟它相邻的数据页也还是脏页的话，也会被放到一起刷。

在 InnoDB 中，`innodb_flush_neighbors` 参数就是用来控制这个行为的，值为 **1** 的时候会有上述的"连坐"机制，值为 **0** 时表示不找邻居，自己刷自己的。

如果是 SSD 这种， 建议 **innodb_flush_neighbors = 0**。

### 3、问题

一个内存配置为 128GB、`innodb_io_capacity`设置为 20000 的大规格实例，正常会建议你将redo log 设置成 4 个 1GB 的文件。

但如果你在配置的时候不慎将 redo log 设置成了 1个 100M 的文件，会发生什么情况呢？又为什么会出现这样的情况呢？

答案：

redo log 太小，很快就会被写满，就必须要 flush，在这种情况下， change buffer 的优化也失效了，因为 flush 时，必须要进行 merge 操作。你看到的现象就是**磁盘压力很小，但是数据库出现间歇性的性能下跌**。






