# 

## 1、覆盖索引

创建表 T :
```shell script
mysql> create table T (
ID int primary key,
k int NOT NULL DEFAULT 0, 
s varchar(16) NOT NULL DEFAULT '',
index k(k))
engine=InnoDB;

insert into T values(100,1, 'aa'),(200,2,'bb'),(300,3,'cc'),(500,5,'ee'),(600,6,'ff'),(700,7,'gg');
```

执行语句 `select ID from T where k between 3 and 5`，只需要扫描 k 索引树。因为结果只需要查询 ID，而 ID 在 k 索引树上，减少了**回表**操作。

索引树已经覆盖了查询结果，称之为**覆盖索引**。**覆盖索引可以减少树的搜索次数，显著提升查询性能。**

## 2、最左前缀匹配

B+ 树这种索引结构，可以利用索引的**最左前缀**，来定位记录。

创建表 tuser ：
```shell script
CREATE TABLE `tuser` (
  `id` int(11) NOT NULL,
  `id_card` varchar(32) DEFAULT NULL,
  `name` varchar(32) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `ismale` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_card` (`id_card`),
  KEY `name_age` (`name`,`age`)
) ENGINE=InnoDB
```

![name_age 索引树](./imgs/05_01.png)

当你的查询条件是 `where name like ‘张%’`，也是可以用到索引（name,age）的。

联合索引建立规则：
1. 通过调整顺序，可以少维护一个索引，这是优先考虑的。
2. 索引的空间。

## 3、索引下推

可以对索引中存在的字段先做判断，减少**回表**次数。

当查询条件是 `where name like '张%' and age=10 and ismale=1;`，也是可以用到索引树（name,age）的。


## 4、问题

有如下表：
```shell script
CREATE TABLE `geek` (
  `a` int(11) NOT NULL,
  `b` int(11) NOT NULL,
  `c` int(11) NOT NULL,
  `d` int(11) NOT NULL,
  PRIMARY KEY (`a`,`b`),
  KEY `c` (`c`),
  KEY `ca` (`c`,`a`),
  KEY `cb` (`c`,`b`)
) ENGINE=InnoDB;
```
由于历史原因，这个表需要a、b做联合主键。
查询语句如下：
```shell script
select * from geek where c=N order by a limit 1;
select * from geek where c=N order by b limit 1;
```

索引（c,a）、（c,b）是否都是必须的?


索引 (c,a) 不需要。








