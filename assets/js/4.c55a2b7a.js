(window.webpackJsonp=window.webpackJsonp||[]).push([[4],{464:function(s,a,t){s.exports=t.p+"assets/img/10_01.4eeae466.png"},465:function(s,a,t){s.exports=t.p+"assets/img/10_02.aaa9748e.png"},466:function(s,a,t){s.exports=t.p+"assets/img/10_03.c1fb2cd8.png"},467:function(s,a,t){s.exports=t.p+"assets/img/10_04.7c58b9c7.png"},468:function(s,a,t){s.exports=t.p+"assets/img/10_05.16dbf812.png"},469:function(s,a,t){s.exports=t.p+"assets/img/10_06.483bcb1e.png"},470:function(s,a,t){s.exports=t.p+"assets/img/10_07.14cd598e.png"},471:function(s,a,t){s.exports=t.p+"assets/img/10_08.b1a2ad43.png"},472:function(s,a,t){s.exports=t.p+"assets/img/10_09.e0e4c838.png"},538:function(s,a,t){"use strict";t.r(a);var e=t(33),n=Object(e.a)({},(function(){var s=this,a=s._self._c;return a("ContentSlotsDistributor",{attrs:{"slot-key":s.$parent.slotKey}},[a("h2",{attrs:{id:"_1、选错索引"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_1、选错索引"}},[s._v("#")]),s._v(" 1、选错索引")]),s._v(" "),a("p",[s._v("一个例子，建表语句如下：")]),s._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[s._v("CREATE TABLE "),a("span",{pre:!0,attrs:{class:"token variable"}},[a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")]),s._v("x"),a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")])]),s._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("\n  "),a("span",{pre:!0,attrs:{class:"token variable"}},[a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")]),a("span",{pre:!0,attrs:{class:"token function"}},[s._v("id")]),a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")])]),s._v(" int"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("11")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v(" NOT NULL,\n  "),a("span",{pre:!0,attrs:{class:"token variable"}},[a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")]),s._v("a"),a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")])]),s._v(" int"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("11")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v(" DEFAULT NULL,\n  "),a("span",{pre:!0,attrs:{class:"token variable"}},[a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")]),s._v("b"),a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")])]),s._v(" int"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("11")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v(" DEFAULT NULL,\n  PRIMARY KEY "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),a("span",{pre:!0,attrs:{class:"token variable"}},[a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")]),a("span",{pre:!0,attrs:{class:"token function"}},[s._v("id")]),a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")])]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v(",\n  KEY "),a("span",{pre:!0,attrs:{class:"token variable"}},[a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")]),s._v("a"),a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")])]),s._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),a("span",{pre:!0,attrs:{class:"token variable"}},[a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")]),s._v("a"),a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")])]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v(",\n  KEY "),a("span",{pre:!0,attrs:{class:"token variable"}},[a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")]),s._v("b"),a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")])]),s._v(" "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),a("span",{pre:!0,attrs:{class:"token variable"}},[a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")]),s._v("b"),a("span",{pre:!0,attrs:{class:"token variable"}},[s._v("`")])]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("\n"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v(" "),a("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("ENGINE")]),a("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("InnoDB"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\n")])])]),a("p",[s._v("往表 x 中插入 10 万行记录，取值按整数递增，即：(1,1,1)，(2,2,2)，(3,3,3) 直到(100000,100000,100000)，存储过程如下：")]),s._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[s._v("delimiter "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\ncreate procedure idata"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("\nbegin\n  "),a("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("declare")]),s._v(" i int"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\n  "),a("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("set")]),s._v(" "),a("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("i")]),a("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\n  while"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("i"),a("span",{pre:!0,attrs:{class:"token operator"}},[s._v("<=")]),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("100000")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("do\n    insert into x values"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("i, i, i"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\n    "),a("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("set")]),s._v(" "),a("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("i")]),a("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("i+1"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\n  end "),a("span",{pre:!0,attrs:{class:"token keyword"}},[s._v("while")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\nend"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\ndelimiter "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\ncall idata"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\n")])])]),a("p",[s._v("分析一条 SQL 语句 "),a("code",[s._v("select * from x where a between 10000 and 20000;")])]),s._v(" "),a("p",[a("img",{attrs:{src:t(464),alt:"explain语句"}})]),s._v(" "),a("p",[s._v("我们再做如下操作。")]),s._v(" "),a("p",[a("img",{attrs:{src:t(465),alt:"额外操作"}})]),s._v(" "),a("p",[s._v("这时候，session B 的查询语句 "),a("code",[s._v("select * from t where a between 10000 and 20000")]),s._v(" 就不会再选择索引 a 了。")]),s._v(" "),a("p",[s._v("查看慢查询：")]),s._v(" "),a("p",[a("img",{attrs:{src:t(466),alt:"查看慢查询"}})]),s._v(" "),a("p",[s._v("临时开启慢查询：")]),s._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[a("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("set")]),s._v(" global "),a("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("slow_query_log")]),a("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),a("span",{pre:!0,attrs:{class:"token string"}},[s._v("'ON'")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\n"),a("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("set")]),s._v(" global "),a("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("slow_query_log_file")]),a("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),a("span",{pre:!0,attrs:{class:"token string"}},[s._v("'/var/lib/mysql/instance-1-slow.log'")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\n")])])]),a("p",[s._v("实验过程就是这三个语句：")]),s._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[a("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("set")]),s._v(" "),a("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("long_query_time")]),a("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v(" "),a("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# 记录所有的查询到慢查询日志中")]),s._v("\n"),a("span",{pre:!0,attrs:{class:"token keyword"}},[s._v("select")]),s._v(" * from x where a between "),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("10000")]),s._v(" and "),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("20000")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v(" "),a("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# Q1 查询")]),s._v("\n"),a("span",{pre:!0,attrs:{class:"token keyword"}},[s._v("select")]),s._v(" * from x force index"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("a"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v(" where a between "),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("10000")]),s._v(" and "),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("20000")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v(" "),a("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# Q2 强制使用索引 a")]),s._v("\n")])])]),a("p",[s._v("这三条 SQL 语句执行完成后的慢查询日志:")]),s._v(" "),a("p",[a("img",{attrs:{src:t(467),alt:"慢查询"}})]),s._v(" "),a("p",[s._v("Q1 扫描了 10 万行，显然是走了全表扫描，执行时间是 40 毫秒。Q2 扫描了 10001 行，执行了21毫秒，很显然 mysql 选错了索引。")]),s._v(" "),a("h2",{attrs:{id:"_2、优化器的逻辑"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_2、优化器的逻辑"}},[s._v("#")]),s._v(" 2、优化器的逻辑")]),s._v(" "),a("p",[s._v("在"),a("RouterLink",{attrs:{to:"/pages/notes/geektime/mysql-45/01.html"}},[s._v("第一篇")]),s._v("文章中，我们就提到过，选择索引是优化器的工作。")],1),s._v(" "),a("p",[s._v("优化器选择索引会根据"),a("strong",[s._v("扫描行数")]),s._v("、"),a("strong",[s._v("是否使用临时表")]),s._v("、"),a("strong",[s._v("是否排序")]),s._v("等因素进行综合判断。")]),s._v(" "),a("p",[s._v("当然，这个例子中只有"),a("strong",[s._v("扫描行数")]),s._v("这个因素，对于"),a("strong",[s._v("扫描行数")]),s._v("，MySQL 根据统计信息来估算记录数，抽样来得到索引的基数信息（区别度），如下图。")]),s._v(" "),a("p",[a("img",{attrs:{src:t(468),alt:"索引信息表"}})]),s._v(" "),a("p",[s._v("采样统计的时候，InnoDB 默认会选择 N 个数据页，统计这些页面上的不同值，得到一个平均值，然后乘以这个索引的页面数，就得到了这个索引的基数。")]),s._v(" "),a("p",[s._v("在 MySQL 中，有两种存储索引统计的方式，可以通过设置参数 "),a("code",[s._v("innodb_stats_persistent")]),s._v(" 的值来选择：")]),s._v(" "),a("ul",[a("li",[s._v("设置为 on，表示统计信息会持久化存储。这时，默认的 N 是 20，M 是 10。")]),s._v(" "),a("li",[s._v("设置为 off，表示统计信息只存储在内存中。这时，默认的 N是 8，M 是 16。")])]),s._v(" "),a("p",[s._v("MySQL 选错索引，是因为索引统计信息不准确，修正统计信息，执行 "),a("code",[s._v("analyze table x;")]),s._v(" 命令。")]),s._v(" "),a("p",[s._v("另外一个语句：")]),s._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[s._v("mysql"),a("span",{pre:!0,attrs:{class:"token operator"}},[s._v(">")]),s._v(" "),a("span",{pre:!0,attrs:{class:"token keyword"}},[s._v("select")]),s._v(" * from t where "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("a between "),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v(" and "),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("1000")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("  and "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("b between "),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("50000")]),s._v(" and "),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("100000")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v(" order by b limit "),a("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(";")]),s._v("\n")])])]),a("p",[s._v("从条件上看，这个查询没有符合条件的记录，因此会返回空集合。")]),s._v(" "),a("p",[s._v("如果优化器使用索引 a 的话，执行速度明显会快很多，执行 "),a("code",[s._v("explain")]),s._v("命令后：")]),s._v(" "),a("p",[a("img",{attrs:{src:t(469),alt:"expalin命令"}})]),s._v(" "),a("p",[s._v("返回结果中 key 字段显示，这次优化器选择了索引 b。")]),s._v(" "),a("p",[s._v("从这个结果中，你可以得到两个结论：")]),s._v(" "),a("ul",[a("li",[s._v("扫描行数的估计值依然不准确。")]),s._v(" "),a("li",[s._v("这个例子里 MySQL 又选错了索引。")])]),s._v(" "),a("h2",{attrs:{id:"_3、索引选择异常和处理"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_3、索引选择异常和处理"}},[s._v("#")]),s._v(" 3、索引选择异常和处理")]),s._v(" "),a("ul",[a("li",[s._v("一种方法是，采用 "),a("code",[s._v("force index")]),s._v(" 强行选择一个索引。")]),s._v(" "),a("li",[s._v("另一种方法是，我们可以考虑修改语句，引导 MySQL 使用我们期望的索引。")])]),s._v(" "),a("p",[s._v("修改语句后：")]),s._v(" "),a("p",[a("img",{attrs:{src:t(470),alt:"修改语句后"}})]),s._v(" "),a("p",[s._v("之前优化器选择使用索引 b，是因为它认为使用索引 b 可以避免排序（ b 本身是索引，已经是有序的了，如果选择索引 b 的话，不需要再做排序，只需要遍历），所以即使扫描行数多，也判定为代价更小。")]),s._v(" "),a("p",[s._v("现在 "),a("code",[s._v("order by b,a")]),s._v(" 这种写法，要求按照 b,a 排序，就意味着使用这两个索引都需要排序。因此，"),a("strong",[s._v("扫描行数")]),s._v("成了影响决策的主要条件，于是此时优化器选了只需要扫描 1000 行的索引 a。")]),s._v(" "),a("p",[a("strong",[s._v("这种修改并不是通用的优化手段，只是刚好在这个语句里面有 limit 1,order by b limit 1 和 order by b,a limit 1 都会返回b 是最小的那一行，逻辑上一致，才可以这么做。")])]),s._v(" "),a("p",[s._v("另一种修改语句：")]),s._v(" "),a("p",[a("img",{attrs:{src:t(471),alt:"另一种修改"}})]),s._v(" "),a("p",[s._v("在这个例子里，我们用 limit 100 让优化器意识到，使用 b 索引代价是很高的。其实是我们根据数据特征诱导了一下优化器，也不具备通用性。")]),s._v(" "),a("ul",[a("li",[s._v("第三种方法是，有些场景下，我们可以新建一个更合适的索引，来提供给优化器做选择，或删掉误用的索引。")]),s._v(" "),a("li",[s._v("第四种方法是，删掉索引 b。")])]),s._v(" "),a("h2",{attrs:{id:"_4、问题"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_4、问题"}},[s._v("#")]),s._v(" 4、问题")]),s._v(" "),a("p",[s._v("前面我们在构造第一个例子的过程中，通过 session A 的配合，让 session B 删除数据后又重新插入了一遍数据，然后就发现 explain 结果中，rows 字段从 10001 变成 37000 多。")]),s._v(" "),a("p",[s._v("而如果没有 session A 的配合，只是单独执行 delete from t 、call idata()、explain 这三句话，会看到 rows 字段其实还是10000左右。")]),s._v(" "),a("p",[s._v("答案：")]),s._v(" "),a("p",[s._v("delete 语句删掉了所有的数据，然后再通过 call idata() 插入了 10 万行数据，看上去是覆盖了原来的 10 万行。")]),s._v(" "),a("p",[s._v("但是，session A 开启了事务并没有提交，所以之前插入的 10 万行数据是不能删除的。这样，之前的数据每一行数据都有两个版本，旧版本是 delete 之前的数据，新版本是标记为 deleted 的数据。")]),s._v(" "),a("p",[s._v("这样，索引 a 上的数据其实就有两份。")]),s._v(" "),a("p",[s._v("表的行数，优化器直接用的是 "),a("code",[s._v("show table status")]),s._v(" 的值。")]),s._v(" "),a("p",[a("img",{attrs:{src:t(472),alt:"执行命令"}})])])}),[],!1,null,null,null);a.default=n.exports}}]);