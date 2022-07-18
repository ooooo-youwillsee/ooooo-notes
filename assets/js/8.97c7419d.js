(window.webpackJsonp=window.webpackJsonp||[]).push([[8],{370:function(t,s,_){t.exports=_.p+"assets/img/01_01.2a326778.png"},441:function(t,s,_){t.exports=_.p+"assets/img/02_01.bc6cd9db.png"},442:function(t,s,_){t.exports=_.p+"assets/img/02_02.987957d0.png"},530:function(t,s,_){"use strict";_.r(s);var a=_(33),o=Object(a.a)({},(function(){var t=this,s=t._self._c;return s("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[s("h2",{attrs:{id:"_1、更新语句的执行流程"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_1、更新语句的执行流程"}},[t._v("#")]),t._v(" 1、更新语句的执行流程")]),t._v(" "),s("p",[t._v("创建表 T:")]),t._v(" "),s("div",{staticClass:"language-shell script extra-class"},[s("pre",{pre:!0,attrs:{class:"language-shell"}},[s("code",[t._v("mysql"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(">")]),t._v(" create table T"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("ID int primary key, c int"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n")])])]),s("p",[t._v("将 ID = 2 这一行的值加 1 的 SQL 语句:")]),t._v(" "),s("div",{staticClass:"language-shell script extra-class"},[s("pre",{pre:!0,attrs:{class:"language-shell"}},[s("code",[t._v("mysql"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(">")]),t._v(" update T "),s("span",{pre:!0,attrs:{class:"token builtin class-name"}},[t._v("set")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token assign-left variable"}},[t._v("c")]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v("c+1 where "),s("span",{pre:!0,attrs:{class:"token assign-left variable"}},[t._v("ID")]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("2")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n")])])]),s("p",[t._v("查询语句的那一套流程，更新语句也是同样会走一遍。")]),t._v(" "),s("p",[s("img",{attrs:{src:_(370),alt:"查询执行流程"}})]),t._v(" "),s("p",[t._v("经过"),s("strong",[t._v("连接器")]),t._v("和"),s("strong",[t._v("查询缓存")]),t._v("之后，"),s("strong",[t._v("分析器")]),t._v("通过词法和语法分析知道这是一条更新语句，"),s("strong",[t._v("优化器")]),t._v("决定要使用 ID 这个索引，"),s("strong",[t._v("执行器")]),t._v("负责具体执行，找到这一行，然后更新。")]),t._v(" "),s("p",[t._v("与查询流程不一样的是，更新流程还涉及两个重要的日志模块： **redo log（重做日志）**和 "),s("strong",[t._v("binlog（归档日志）")]),t._v("。")]),t._v(" "),s("h2",{attrs:{id:"_2、redo-log"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_2、redo-log"}},[t._v("#")]),t._v(" 2、redo log")]),t._v(" "),s("p",[t._v("redo log 是 InnoDB 引擎特有的日志模块。")]),t._v(" "),s("p",[t._v("在 MySQL 中，如果每一次的更新操作都需要写进磁盘，然后磁盘也要找到对应的那条记录，然后再更新，整个过程 IO 成本、查找成本都很高。为了提高更新效率，MySQL 使用 WAL（Write-Ahead Logging）技术，它的关键点就是先写日志，再写磁盘。")]),t._v(" "),s("p",[t._v("当有记录需要更新时，InnoDB 引擎就会先把记录写到 redo log 里面，并更新内存，这时更新就算完成了。同时，InnoDB引擎会在适当的时候（系统比较空闲），将这个记录更新到磁盘里面。")]),t._v(" "),s("p",[t._v("InnoDB的 redo log 是固定大小的，比如可以配置为一组 4 个文件，每个文件的大小是 1GB，那么总共可以记录 4GB 的操作。从头开始写，写到末尾又回到开头循环写。")]),t._v(" "),s("p",[s("img",{attrs:{src:_(441),alt:"redo log 写"}})]),t._v(" "),s("p",[t._v("write pos 是当前记录的位置，一边写一边后移。\ncheckpoint 是当前要擦除的位置，擦除记录前要把记录更新到数据文件。")]),t._v(" "),s("p",[t._v("有了 redo log，InnoDB 就可以保证即使数据库发生异常重启，之前提交的记录都不会丢失，这个能力称为 "),s("strong",[t._v("crash-safe")]),t._v("。")]),t._v(" "),s("h2",{attrs:{id:"_3、binlog"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_3、binlog"}},[t._v("#")]),t._v(" 3、binlog")]),t._v(" "),s("p",[t._v("binlog 是 Sever 层的日志模块，只能用于归档，比如主从复制。")]),t._v(" "),s("p",[t._v("两种日志不同：")]),t._v(" "),s("ol",[s("li",[t._v("redo log 是InnoDB引擎特有的；binlog是MySQL的Server层实现的，所有引擎都可以使用。")]),t._v(" "),s("li",[t._v("redo log 是物理日志，记录的是“在某个数据页上做了什么修改”；binlog 是逻辑日志，记录的是这个语句的原始逻辑，比如“给ID=2这一行的c字段加1”。")]),t._v(" "),s("li",[t._v("redo log 是循环写，写到末尾又回到开头写；binlog是追加写入，写到一定大小后会切换到下一个，并不会覆盖以前的日志。")])]),t._v(" "),s("h2",{attrs:{id:"_4、两阶段提交"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_4、两阶段提交"}},[t._v("#")]),t._v(" 4、两阶段提交")]),t._v(" "),s("p",[t._v("上面简单的 updata 语句的执行流程。")]),t._v(" "),s("p",[s("img",{attrs:{src:_(442),alt:"update 执行流程"}})]),t._v(" "),s("ol",[s("li",[s("p",[t._v("执行器先找引擎取 ID = 2 这一行。ID 是主键，引擎直接用树搜索找到这一行。如果ID=2 这一行所在的数据页本来就在内存中，就直接返回给执行器；否则，需要先从磁盘读入内存，然后再返回。")])]),t._v(" "),s("li",[s("p",[t._v("执行器拿到引擎给的行数据，把这个值加上1，比如原来是N，现在就是N+1，得到新的一行数据，再调用引擎接口写入这行新数据。")])]),t._v(" "),s("li",[s("p",[t._v("引擎将这行新数据更新到内存中，同时将这个更新操作记录到 redo log 里面，此时 redo log 处于 "),s("code",[t._v("prepare")]),t._v(" 状态。然后告知执行器执行完成了，随时可以提交事务。")])]),t._v(" "),s("li",[s("p",[t._v("执行器生成这个操作的 binlog，并把 binlog 写入磁盘。")])]),t._v(" "),s("li",[s("p",[t._v("执行器调用引擎的提交事务接口，引擎把刚刚写入的 redo log 改成 "),s("code",[t._v("commit")]),t._v(" 状态，更新完成。")])])]),t._v(" "),s("p",[t._v("如果不使用"),s("strong",[t._v("两阶段提交")]),t._v("，会有什么问题？")]),t._v(" "),s("ol",[s("li",[s("p",[t._v("先写 redo log 后写 binlog。假设在 redo log 写完，binlog 还没有写完的时候，MySQL进程异常重启，binlog 中没有更新的数据。")])]),t._v(" "),s("li",[s("p",[t._v("先写 binlog 后写 redo log。如果在 binlog 写完之后 crash，由于 redo log 没有写，崩溃恢复以后这个事务无效，所以这一行 c 的值是 0，但 binlog 中 c = 1 了。")])])]),t._v(" "),s("h2",{attrs:{id:"_5、配置"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_5、配置"}},[t._v("#")]),t._v(" 5、配置")]),t._v(" "),s("p",[t._v("双1设置：")]),t._v(" "),s("p",[s("code",[t._v("innodb_flush_log_at_trx_commit = 1")]),t._v(" 表示每次事务的 redo log 都直接持久化到磁盘。这样可以保证 MySQL 异常重启之后数据不丢失。")]),t._v(" "),s("p",[s("code",[t._v("sync_binlog = 1")]),t._v(" 表示每次事务的 binlog 都持久化到磁盘。这样可以保证 MySQL 异常重启之后 binlog 不丢失。")]),t._v(" "),s("h2",{attrs:{id:"_6、问题"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_6、问题"}},[t._v("#")]),t._v(" 6、问题")]),t._v(" "),s("p",[t._v("在什么场景下，一天一备会比一周一备更有优势呢？")]),t._v(" "),s("p",[t._v("好处是“最长恢复时间”更短。")]),t._v(" "),s("p",[t._v("在一天一备的模式里，最坏情况下需要应用一天的 binlog。比如，你每天 0 点做一次全量备份，而要恢复出一个到昨天晚上 23 点的备份。")]),t._v(" "),s("p",[t._v("一周一备最坏情况就要应用一周的 binlog 了。")])])}),[],!1,null,null,null);s.default=o.exports}}]);