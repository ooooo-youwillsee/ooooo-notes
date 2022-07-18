(window.webpackJsonp=window.webpackJsonp||[]).push([[17],{446:function(t,a,s){t.exports=s.p+"assets/img/04_01.e31ff3b5.png"},447:function(t,a,s){t.exports=s.p+"assets/img/04_02.aa37b0f6.png"},532:function(t,a,s){"use strict";s.r(a);var n=s(33),e=Object(n.a)({},(function(){var t=this,a=t._self._c;return a("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[a("h2",{attrs:{id:"_1、索引的常见模型"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_1、索引的常见模型"}},[t._v("#")]),t._v(" 1、索引的常见模型")]),t._v(" "),a("h3",{attrs:{id:"_1、哈希表"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_1、哈希表"}},[t._v("#")]),t._v(" 1、哈希表")]),t._v(" "),a("p",[t._v("以键-值（key-value）存储数据的结构。只适用于等值查询的场景。")]),t._v(" "),a("h3",{attrs:{id:"_2、有序数组"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_2、有序数组"}},[t._v("#")]),t._v(" 2、有序数组")]),t._v(" "),a("p",[t._v("查询效率高，但更新数据，成本高。只适用静态存储引擎。")]),t._v(" "),a("p",[a("img",{attrs:{src:s(446),alt:"有序数组"}})]),t._v(" "),a("p",[t._v("上面数组的按照 "),a("code",[t._v("ID_card")]),t._v(" 升序排列，如果查询条件是 "),a("code",[t._v("where ID_card = '?'")]),t._v("，可以用二分法查询。")]),t._v(" "),a("h3",{attrs:{id:"_3、搜索树"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_3、搜索树"}},[t._v("#")]),t._v(" 3、搜索树")]),t._v(" "),a("p",[t._v("InnoDB 引擎中使用 "),a("code",[t._v("B+")]),t._v(" 树（ N 叉树）。可以减少磁盘 IO。")]),t._v(" "),a("h2",{attrs:{id:"_2、innodb的索引模型"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_2、innodb的索引模型"}},[t._v("#")]),t._v(" 2、InnoDB的索引模型")]),t._v(" "),a("p",[t._v("我们有一个主键列为 ID 的表，表中有字段 k，并且在 k 上有索引，建表语句如下：")]),t._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[t._v("mysql"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(">")]),t._v(" create table T"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("\n"),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("id")]),t._v(" int primary key, \nk int not null, \nname varchar"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),a("span",{pre:!0,attrs:{class:"token number"}},[t._v("16")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(",\nindex "),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("k"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("))")]),t._v("engine"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v("InnoDB"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n")])])]),a("p",[t._v("表中 R1 ~ R5 的 (ID,k) 值分别为 (100,1)、(200,2)、(300,3)、(500,5) 和 (600,6)。")]),t._v(" "),a("p",[t._v("在 InnoDB 引擎中，每个索引就是一颗 "),a("code",[t._v("B+")]),t._v(" 树。两颗索引树如下。")]),t._v(" "),a("p",[a("img",{attrs:{src:s(447),alt:"索引树"}})]),t._v(" "),a("p",[t._v("根据叶子节点的内容，索引类型分为主键索引和非主键索引。")]),t._v(" "),a("ul",[a("li",[t._v("主键索引的叶子节点存放的是整行数据。")]),t._v(" "),a("li",[t._v("非主键索引的叶子节点存放的是主键的值。")])]),t._v(" "),a("p",[t._v("基于主键索引和普通索引的查询有什么区别？")]),t._v(" "),a("ul",[a("li",[t._v("如果语句是 "),a("code",[t._v("select * from T where ID=500")]),t._v("，即主键查询方式，则只需要搜索 ID 这棵B+树；")]),t._v(" "),a("li",[t._v("如果语句是 "),a("code",[t._v("select * from T where k=5")]),t._v("，即普通索引查询方式，则需要先搜索 k 索引树，得到 ID 的值为 500，再到 ID 索引树搜索一次。这个过程称为回表。")])]),t._v(" "),a("h2",{attrs:{id:"_3、索引维护"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_3、索引维护"}},[t._v("#")]),t._v(" 3、索引维护")]),t._v(" "),a("p",[t._v("B+ 树为了维护索引有序性，在插入新值的时候需要做必要的维护。以上面这个图为例，如果插入新的行 ID 值为 700，则只需要在 R5 的记录后面插入一个新记录。如果新插入的 ID 值为 400，就相对麻烦了，需要逻辑上挪动后面的数据，空出位置。")]),t._v(" "),a("p",[t._v("而更糟的情况是，如果 R5 所在的数据页已经满了，根据 B+ 树的算法，这时候需要申请一个新的数据页，然后挪动部分数据过去。这个过程称为"),a("strong",[t._v("页分裂")]),t._v("。在这种情况下，性能自然会受影响。")]),t._v(" "),a("p",[t._v("除了性能外，页分裂操作还影响数据页的利用率。原本放在一个页的数据，现在分到两个页中，整体空间利用率降低大约50%。当相邻两个页由于删除了数据，利用率很低之后，会将数据页做合并。")]),t._v(" "),a("p",[t._v("总结：")]),t._v(" "),a("p",[a("strong",[t._v("如果主键是自增的，每次插入一条新的数据，就是追加操作，就不会触发页分裂。")]),t._v(" "),a("strong",[t._v("主键长度越小，普通索引的叶子节点就越小，占用的空间也就越小。")])]),t._v(" "),a("h2",{attrs:{id:"_4、问题"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_4、问题"}},[t._v("#")]),t._v(" 4、问题")]),t._v(" "),a("p",[t._v("对于上面例子中的 InnoDB 表 T，如果你要重建索引 k，你的两个 SQL 语句可以这么写：")]),t._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[t._v("alter table T drop index k"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\nalter table T "),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("add")]),t._v(" index"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("k"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n")])])]),a("p",[t._v("如果你要重建主键索引，也可以这么写：")]),t._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[t._v("alter table T drop primary key"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\nalter table T "),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("add")]),t._v(" primary key"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("id"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n")])])]),a("p",[t._v("可以执行 "),a("code",[t._v("alter table T engine=InnoDB;")]),t._v(" 来重建索引。")])])}),[],!1,null,null,null);a.default=e.exports}}]);