# 

## 1、查询过程

主键索引 ID 和 普通索引 K:

![索引树](./imgs/09_01.png)

假设执行查询的语句是 `select id from T where k=5`, 使用**二分法**查询：
- 对于普通索引来说，查找到满足条件的第一个记录(5,500)后，需要查找下一个记录，直到碰到第一个不满足 k=5 条件的记录。
- 对于唯一索引来说，由于索引定义了唯一性，查找到第一个满足条件的记录后，就会停止继续检索。

**两个索引的性能差别，微乎其微。**

InnoDB 的数据是按数据页为单位来读写，也就是说，当找到 k=5 的记录的时候，它所在的数据页就都在内存里了，所以判断下一条记录是很快的。

## 2、更新过程

当需要更新一个数据页时，如果数据页在内存中就直接更新，如果这个数据页还没有在内存中，在不影响数据一致性的前提下，InooDB 会将这些更新操作缓存在 **change buffer** 中，这样就不需要从磁盘中读入这个数据页了。在下次查询需要访问这个数据页的时候，将数据页读入内存，然后执行 **change buffer** 中与这个页有关的操作。通过这种方式就能保证这个数据逻辑的正确性。

将 **change buffer** 中的操作应用到原数据页，得到最新结果的过程称为 **merge**。除了访问这个数据页会触发 **merge** 外，系统有后台线程会定期 **merge** 。在数据库正常关闭（shutdown）的过程中，也会执行 **merge** 操作。

对于**唯一索引**来说，所有的更新操作都要先判断这个操作是否违反唯一性约束，所以必须要将数据页读入内存才能判断，这时 **change buffer** 不能使用了。

**change buffer** 用的是 **buffer pool** 里的内存，因此不能无限增大。**change buffer** 的大小，可以通过参数 `innodb_change_buffer_max_size` 来动态设置。这个参数设置为 50 的时候，表示 **change buffer** 的大小最多只能占用 **buffer pool** 的 50%。

## 3、change buffer 的使用场景

**change buffer** 的主要目的就是将记录的变更动作缓存下来，所以在一个数据页做 merge 之前，**change buffer** 记录的变更越多（也就是这个页面上要更新的次数越多），收益就越大。

**对于写多读少的业务来说， change buffer 的使用效果最好。这种业务模型常见的就是账单类、日志类的系统。**

假设一个业务的更新模式是写入之后马上会做查询，那么即使满足了条件，将更新先记录在 **change buffer**，但之后由于马上要访问这个数据页，会立即触发 **merge** 过程。这样随机访问 IO 的次数不会减少，反而增加了 **change buffer** 的维护代价。

## 4、索引选择和实践

在不影响业务的情况下，建议你尽量选择普通索引。

普通索引和 **change buffer** 的配合使用，对于数据量大的表的更新优化还是很明显的。

## 5、change buffer 和 redo log

执行插入语句：
```shell script
mysql&gt; insert into t(id,k) values(id1,k1),(id2,k2);
```

我们假设当前 k 索引树的状态，查找到位置后，k1 所在的数据页在内存(InnoDB buffer pool)中，k2 所在的数据页不在内存中。下图是带 **change buffer** 的更新状态图。

![带change buffer的更新过程](./imgs/09_02.png)

这条插入语句做了如下的操作:
1. Page 1 在内存中，直接更新内存。
2. Page 2 没有在内存中，就在内存的 **change buffer** 区域，记录下&#34;我要往 Page 2 插入一行&#34;这个信息。
3. 将上述两个动作记入 redo log 中（图中3和4）。   
   
图中的两个虚线箭头，是后台操作，不影响更新的响应时间。

现在要执行语句 `select * from t where k in (k1, k2)`，这两个读请求的流程图：

![带change buffer的读过程](./imgs/09_03.png)

1. 读 Page 1 的时候，直接从内存返回。
2. 要读 Page 2 的时候，需要把 Page 2 从磁盘读入内存中，然后应用 **change buffer** 里面的操作日志，生成一个正确的版本并返回结果。

从上图可知，**redo log 主要节省的是随机写磁盘的 IO 消耗（转成顺序写），而 **change buffer** 主要节省的则是随机读磁盘的 IO 消耗。**

## 6、问题

change buffer 一开始是写内存的，那么如果这个时候机器掉电重启，会不会导致 change buffer 丢失呢？change buffer 丢失可不是小事儿，再从磁盘读入数据可就没有了 merge 过程，就等于是数据丢失了。会不会出现这种情况呢？

不会丢失。虽然是只更新内存，但是在事务提交的时候，我们把 change buffer 的操作也记录到 redo log 里了，所以崩溃恢复的时候，change buffer 也能找回来。

merge 的执行流程是这样的：
- 从磁盘读入数据页到内存（老版本的数据页）；
- 从 change buffer 里找出这个数据页的 change buffer 记录(可能有多个），依次应用，得到新版数据页；
- 写 redo log。这个 redo log 包含了数据的变更和 change buffer 的变更。


---

> 作者:   
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/old-notes/geektime/mysql-45/09/  

