(window.webpackJsonp=window.webpackJsonp||[]).push([[23],{383:function(t,s,_){t.exports=_.p+"assets/img/06_01.11d8d009.png"},462:function(t,s,_){"use strict";_.r(s);var a=_(25),v=Object(a.a)({},(function(){var t=this,s=t.$createElement,a=t._self._c||s;return a("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[a("h2",{attrs:{id:"_1、全局表"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_1、全局表"}},[t._v("#")]),t._v(" 1、全局表")]),t._v(" "),a("blockquote",[a("p",[t._v("根据加锁的范围，MySQL 里面的锁大致可以分成全局锁、表级锁和行锁三类。")])]),t._v(" "),a("p",[t._v("MySQL 加全局读锁的命令："),a("code",[t._v("flush tables with read lock;")]),t._v("（FTWRL）, 解锁命令："),a("code",[t._v("unlock tables;")]),t._v("。让整个库处于"),a("strong",[t._v("只读状态")]),t._v("。任何增删改语句都会被阻塞。")]),t._v(" "),a("p",[t._v("全局锁的典型使用场景是，做全库逻辑备份，也就是 select 所有的数据。")]),t._v(" "),a("p",[t._v("对于 "),a("code",[t._v("MyISAM")]),t._v(" 引擎来说，备份只能加全局锁。")]),t._v(" "),a("p",[t._v("对于 "),a("code",[t._v("Innodb")]),t._v(" 引擎来说，可以使用脚本 "),a("code",[t._v("mysqldump")]),t._v("，参数为 "),a("code",[t._v("–-single-transaction")]),t._v("，来启动一个事务，确保拿到一致性视图来备份数据。"),a("strong",[t._v("MyISAM 不支持事务，所以无法用此脚本。")])]),t._v(" "),a("p",[t._v("全库只读，为什么不使用 "),a("code",[t._v("set global readonly=true")]),t._v(" 的方式，主要原因有两点：")]),t._v(" "),a("ul",[a("li",[t._v("在有些系统中，"),a("code",[t._v("readonly")]),t._v(" 会被用来做其他逻辑，比如判断一个库是主库还是备库。")]),t._v(" "),a("li",[t._v("异常处理机制有差异。 执行 "),a("code",[t._v("FTWRL")]),t._v(" 命令后，客户端发生异常断开，MySQL 会自动释放这个全局锁。如果整库处理 "),a("code",[t._v("readonly")]),t._v(" 状态，客户端发生异常，数据库会一直处于 "),a("code",[t._v("readonly")]),t._v(" 状态。")])]),t._v(" "),a("h2",{attrs:{id:"_2、表级锁"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_2、表级锁"}},[t._v("#")]),t._v(" 2、表级锁")]),t._v(" "),a("blockquote",[a("p",[t._v("MySQL 里面表级别的锁有两种：一种是"),a("strong",[t._v("表锁")]),t._v("，一种是"),a("strong",[t._v("元数据锁")]),t._v("（meta data lock，MDL)。")])]),t._v(" "),a("p",[t._v("例如：如果在某个线程 A 中执行 "),a("code",[t._v("lock tables t1 read, t2 write;")]),t._v(" 这个语句，则其他线程写 t1 、读写 t2 的语句都会被阻塞。线程 A 执行 "),a("code",[t._v("unlock tables;")]),t._v(" 语句来解锁。")]),t._v(" "),a("p",[t._v("MDL 不需要显式使用，在访问一个表的时候会被自动加上。MDL 的作用是，保证读写的正确性。")]),t._v(" "),a("p",[t._v("在 MySQL 5.5 版本中引入了 MDL，当对一个表做增删改查操作的时候，加"),a("strong",[t._v("MDL读锁")]),t._v("；当要对表做结构变更操作的时候，加"),a("strong",[t._v("MDL写锁")]),t._v("。")]),t._v(" "),a("p",[t._v("给一个小表加个字段，导致整个库挂了。\n"),a("img",{attrs:{src:_(383),alt:"MDL锁影响"}})]),t._v(" "),a("ul",[a("li",[t._v("session A 和 session B 都会加上 "),a("strong",[t._v("MDL读锁")]),t._v("。")]),t._v(" "),a("li",[t._v("session C 要变更表结构，必要要加上 "),a("strong",[t._v("MDL写锁")]),t._v("，此时只能阻塞。")]),t._v(" "),a("li",[t._v("session D 申请 "),a("strong",[t._v("MDL读锁")]),t._v(" 就会被 session C 阻塞。")])]),t._v(" "),a("p",[a("strong",[t._v("MDL 锁必须要等整个事务提交后再释放。")])]),t._v(" "),a("p",[t._v("如何安全地给小表加字段？")]),t._v(" "),a("ul",[a("li",[t._v("首先要解决长事务，"),a("strong",[t._v("事务不提交，就会一直占着 MDL锁")]),t._v("。在 MySQL 的 "),a("code",[t._v("information_schema")]),t._v("  库的 "),a("code",[t._v("innodb_trx")]),t._v(" 表中，你可以查到当前执行中的事务。如果你要做 DDL 变更的表刚好有长事务在执行，要考虑先暂停 DDL，或者 kill 掉这个长事务。")]),t._v(" "),a("li",[t._v("如果要变更的表是一个热点表，虽然数据量不大，但是上面的请求很频繁，而你不得不加个字段, kill 可能未必管用，比较理想的机制是，在 "),a("code",[t._v("alter table")]),t._v(" 语句里面设定等待时间，如果在这个等待时间里面能够拿到 "),a("strong",[t._v("MDL写锁")]),t._v(" 最好，拿不到也不要阻塞后面的业务语句，先放弃。之后再通过重试命令重复这个过程。")])]),t._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[t._v("ALTER TABLE tbl_name NOWAIT "),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("add")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("column")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("..")]),t._v(".\nALTER TABLE tbl_name WAIT N "),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("add")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("column")]),t._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("..")]),t._v(". \n")])])]),a("h2",{attrs:{id:"_3、问题"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_3、问题"}},[t._v("#")]),t._v(" 3、问题")]),t._v(" "),a("p",[t._v("备份一般都会在备库上执行，你在用 "),a("code",[t._v("–-single-transaction")]),t._v(" 方法做逻辑备份的过程中，如果主库上的一个小表做了一个DDL，比如给一个表上加了一列。这时候，从备库上会看到什么现象呢？")]),t._v(" "),a("p",[t._v("假设这个 DDL 是针对表 t1 的， 这里把备份过程中几个关键的语句列出来：")]),t._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[t._v("Q1:SET "),a("span",{pre:!0,attrs:{class:"token environment constant"}},[t._v("SESSION")]),t._v(" TRANSACTION ISOLATION LEVEL REPEATABLE READ"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\nQ2:START TRANSACTION  WITH CONSISTENT SNAPSHOT"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n/* other tables */\nQ3:SAVEPOINT sp"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n/* 时刻 "),a("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),t._v(" */\nQ4:show create table "),a("span",{pre:!0,attrs:{class:"token variable"}},[a("span",{pre:!0,attrs:{class:"token variable"}},[t._v("`")]),t._v("t1"),a("span",{pre:!0,attrs:{class:"token variable"}},[t._v("`")])]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n/* 时刻 "),a("span",{pre:!0,attrs:{class:"token number"}},[t._v("2")]),t._v(" */\nQ5:SELECT * FROM "),a("span",{pre:!0,attrs:{class:"token variable"}},[a("span",{pre:!0,attrs:{class:"token variable"}},[t._v("`")]),t._v("t1"),a("span",{pre:!0,attrs:{class:"token variable"}},[t._v("`")])]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n/* 时刻 "),a("span",{pre:!0,attrs:{class:"token number"}},[t._v("3")]),t._v(" */\nQ6:ROLLBACK TO SAVEPOINT sp"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n/* 时刻 "),a("span",{pre:!0,attrs:{class:"token number"}},[t._v("4")]),t._v(" */\n/* other tables */\n")])])]),a("ul",[a("li",[t._v("在备份开始的时候，为了确保RR（可重复读）隔离级别，再设置一次RR隔离级别(Q1);")]),t._v(" "),a("li",[t._v("启动事务(Q2);")]),t._v(" "),a("li",[t._v("设置一个保存点，这个很重要(Q3);")]),t._v(" "),a("li",[t._v("show create 是为了拿到表结构(Q4)，然后正式导数据 （Q5），回滚到"),a("code",[t._v("SAVEPOINT sp")]),t._v("，在这里的作用是释放 t1 的 MDL锁。")])]),t._v(" "),a("p",[t._v("答案如下：")]),t._v(" "),a("ol",[a("li",[a("p",[t._v("如果在 Q4 语句执行之前到达，现象：没有影响，备份拿到的是DDL后的表结构。")])]),t._v(" "),a("li",[a("p",[t._v('如果在"时刻 2"到达，则 Q5 执行的时候表结构被改过，报 Table definition has changed, please retry transaction，现象：mysqldump 终止；')])]),t._v(" "),a("li",[a("p",[t._v('如果在"时刻2"和"时刻3"之间到达，mysqldump 占着 t1 的 MDL读锁，binlog 被阻塞，现象：主从延迟，直到 Q6 执行完成。')])]),t._v(" "),a("li",[a("p",[t._v('从"时刻4"开始，mysqldump 释放了 MDL读锁，现象：没有影响，备份拿到的是 DDL 前的表结构。')])])])])}),[],!1,null,null,null);s.default=v.exports}}]);