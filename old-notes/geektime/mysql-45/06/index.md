# 

## 1、全局表

> 根据加锁的范围，MySQL 里面的锁大致可以分成全局锁、表级锁和行锁三类。

MySQL 加全局读锁的命令：`flush tables with read lock;`（FTWRL）, 解锁命令：`unlock tables;`。让整个库处于**只读状态**。任何增删改语句都会被阻塞。

全局锁的典型使用场景是，做全库逻辑备份，也就是 select 所有的数据。

对于 `MyISAM` 引擎来说，备份只能加全局锁。

对于 `Innodb` 引擎来说，可以使用脚本 `mysqldump`，参数为 `–-single-transaction`，来启动一个事务，确保拿到一致性视图来备份数据。**MyISAM 不支持事务，所以无法用此脚本。**

全库只读，为什么不使用 `set global readonly=true` 的方式，主要原因有两点：
- 在有些系统中，`readonly` 会被用来做其他逻辑，比如判断一个库是主库还是备库。
- 异常处理机制有差异。 执行 `FTWRL` 命令后，客户端发生异常断开，MySQL 会自动释放这个全局锁。如果整库处理 `readonly` 状态，客户端发生异常，数据库会一直处于 `readonly` 状态。

## 2、表级锁

> MySQL 里面表级别的锁有两种：一种是**表锁**，一种是**元数据锁**（meta data lock，MDL)。

例如：如果在某个线程 A 中执行 `lock tables t1 read, t2 write;` 这个语句，则其他线程写 t1 、读写 t2 的语句都会被阻塞。线程 A 执行 `unlock tables;` 语句来解锁。

MDL 不需要显式使用，在访问一个表的时候会被自动加上。MDL 的作用是，保证读写的正确性。

在 MySQL 5.5 版本中引入了 MDL，当对一个表做增删改查操作的时候，加**MDL读锁**；当要对表做结构变更操作的时候，加**MDL写锁**。


给一个小表加个字段，导致整个库挂了。
![MDL锁影响](./imgs/06_01.png)

- session A 和 session B 都会加上 **MDL读锁**。
- session C 要变更表结构，必要要加上 **MDL写锁**，此时只能阻塞。
- session D 申请 **MDL读锁** 就会被 session C 阻塞。

**MDL 锁必须要等整个事务提交后再释放。**

如何安全地给小表加字段？

- 首先要解决长事务，**事务不提交，就会一直占着 MDL锁**。在 MySQL 的 `information_schema`  库的 `innodb_trx` 表中，你可以查到当前执行中的事务。如果你要做 DDL 变更的表刚好有长事务在执行，要考虑先暂停 DDL，或者 kill 掉这个长事务。
- 如果要变更的表是一个热点表，虽然数据量不大，但是上面的请求很频繁，而你不得不加个字段, kill 可能未必管用，比较理想的机制是，在 `alter table` 语句里面设定等待时间，如果在这个等待时间里面能够拿到 **MDL写锁** 最好，拿不到也不要阻塞后面的业务语句，先放弃。之后再通过重试命令重复这个过程。

```shell script
ALTER TABLE tbl_name NOWAIT add column ...
ALTER TABLE tbl_name WAIT N add column ... 
```

## 3、问题

备份一般都会在备库上执行，你在用 `–-single-transaction` 方法做逻辑备份的过程中，如果主库上的一个小表做了一个DDL，比如给一个表上加了一列。这时候，从备库上会看到什么现象呢？


假设这个 DDL 是针对表 t1 的， 这里把备份过程中几个关键的语句列出来：
```shell script
Q1:SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
Q2:START TRANSACTION  WITH CONSISTENT SNAPSHOT;
/* other tables */
Q3:SAVEPOINT sp;
/* 时刻 1 */
Q4:show create table `t1`;
/* 时刻 2 */
Q5:SELECT * FROM `t1`;
/* 时刻 3 */
Q6:ROLLBACK TO SAVEPOINT sp;
/* 时刻 4 */
/* other tables */
```

- 在备份开始的时候，为了确保RR（可重复读）隔离级别，再设置一次RR隔离级别(Q1);
- 启动事务(Q2);
- 设置一个保存点，这个很重要(Q3);
- show create 是为了拿到表结构(Q4)，然后正式导数据 （Q5），回滚到`SAVEPOINT sp`，在这里的作用是释放 t1 的 MDL锁。

答案如下：
1. 如果在 Q4 语句执行之前到达，现象：没有影响，备份拿到的是DDL后的表结构。

2. 如果在"时刻 2"到达，则 Q5 执行的时候表结构被改过，报 Table definition has changed, please retry transaction，现象：mysqldump 终止；

3. 如果在"时刻2"和"时刻3"之间到达，mysqldump 占着 t1 的 MDL读锁，binlog 被阻塞，现象：主从延迟，直到 Q6 执行完成。

4. 从"时刻4"开始，mysqldump 释放了 MDL读锁，现象：没有影响，备份拿到的是 DDL 前的表结构。












