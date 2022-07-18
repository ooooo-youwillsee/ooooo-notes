(window.webpackJsonp=window.webpackJsonp||[]).push([[5],{425:function(_,e,v){_.exports=v.p+"assets/img/05_01.8af5c142.png"},426:function(_,e,v){_.exports=v.p+"assets/img/05_02.22c52c3e.png"},427:function(_,e,v){_.exports=v.p+"assets/img/05_04.67faeb21.png"},428:function(_,e,v){_.exports=v.p+"assets/img/05_03.a62cbfe1.png"},429:function(_,e,v){_.exports=v.p+"assets/img/05_05.51f3b984.png"},430:function(_,e,v){_.exports=v.p+"assets/img/05_06.71d7585a.png"},431:function(_,e,v){_.exports=v.p+"assets/img/05_07.7fd14057.png"},505:function(_,e,v){"use strict";v.r(e);var t=v(33),s=Object(t.a)({},(function(){var _=this,e=_._self._c;return e("ContentSlotsDistributor",{attrs:{"slot-key":_.$parent.slotKey}},[e("h2",{attrs:{id:"_1、rdb"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_1、rdb"}},[_._v("#")]),_._v(" 1、RDB")]),_._v(" "),e("h3",{attrs:{id:"_1、触发机制"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_1、触发机制"}},[_._v("#")]),_._v(" 1、触发机制")]),_._v(" "),e("p",[_._v("手动触发，分别有 "),e("code",[_._v("save")]),_._v(" 和 "),e("code",[_._v("bgsave")]),_._v(" 两个命令。")]),_._v(" "),e("ul",[e("li",[e("code",[_._v("save")]),_._v("： 会阻塞当前 Redis 服务器，直到 RDB 过程完成为止，不建议使用。")]),_._v(" "),e("li",[e("code",[_._v("bgsave")]),_._v("： Redis 进程会 "),e("strong",[_._v("fork")]),_._v(" 出子进程，子进程进行 RDB 持久化，阻塞只会发生在 "),e("strong",[_._v("fork")]),_._v(" 阶段。")])]),_._v(" "),e("p",[_._v("自动触发的场景：")]),_._v(" "),e("ul",[e("li",[e("code",[_._v("save m n")]),_._v(" 配置，表示在 m 秒中存在 n 次数据改变，才会触发 "),e("code",[_._v("bgsave")]),_._v("。")]),_._v(" "),e("li",[_._v("从节点全量复制过程中，主节点会执行 "),e("code",[_._v("bgsave")]),_._v(" 生成 RDB 文件，发送子节点。")]),_._v(" "),e("li",[_._v("默认关闭情况下，如果没有开启 AOF，也会执行 "),e("code",[_._v("bgsave")]),_._v("。")])]),_._v(" "),e("h3",{attrs:{id:"_2、触发流程"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_2、触发流程"}},[_._v("#")]),_._v(" 2、触发流程")]),_._v(" "),e("p",[e("code",[_._v("bgsave")]),_._v(" 命令的运行流程如下图：\n"),e("img",{attrs:{src:v(425),alt:"bgsave 执行流程"}})]),_._v(" "),e("p",[_._v("说明；")]),_._v(" "),e("ol",[e("li",[_._v("执行 "),e("code",[_._v("bgsave")]),_._v(" 命令， 判断是否有 AOF/RDB 进程。")]),_._v(" "),e("li",[_._v("执行 "),e("code",[_._v("info stats")]),_._v(" 命令，选项 "),e("code",[_._v("latest_fork_usec")]),_._v(" 表示最后一次 fork 使用的秒数。")]),_._v(" "),e("li",[e("code",[_._v("bgsave")]),_._v(" 命令执行完成后，会出现 "),e("strong",[_._v("Background saving started")]),_._v(" 提示。")]),_._v(" "),e("li",[_._v("子进程创建 RDB 文件成功后，对原有的文件进行原子替换, 执行 "),e("code",[_._v("lastsave")]),_._v(" 命令获取最后一次生成 RDB 文件的时间，对应 "),e("code",[_._v("info Persistence")]),_._v(" 命令中的选项 "),e("code",[_._v("rdb_last_save_time")]),_._v("。")])]),_._v(" "),e("h3",{attrs:{id:"_3、rdb-文件的处理"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_3、rdb-文件的处理"}},[_._v("#")]),_._v(" 3、RDB 文件的处理")]),_._v(" "),e("p",[e("img",{attrs:{src:v(426),alt:"RDB 配置"}})]),_._v(" "),e("ul",[e("li",[_._v("RDB 文件通过配置文件参数 "),e("code",[_._v("dbfilename")]),_._v(" 和 "),e("code",[_._v("dir")]),_._v("来配置，也可以通过命令 "),e("code",[_._v("config set dir {dir}")]),_._v(" 和 "),e("code",[_._v("config set dbfilename {dbfilename}")]),_._v(" 来动态配置。")]),_._v(" "),e("li",[_._v("RDB 文件默认采用 "),e("strong",[_._v("LZF")]),_._v(" 压缩，通常建议开启，因为主从复制时，需要发送 RDB 文件到从节点，这样可以节省带宽。")]),_._v(" "),e("li",[_._v("RDB 默认也开启校验，可以通过脚本 "),e("code",[_._v("redis-check-rdb")]),_._v(" 来校验生成相应的错误报告。")])]),_._v(" "),e("h3",{attrs:{id:"_4、rdb-的优缺点"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_4、rdb-的优缺点"}},[_._v("#")]),_._v(" 4、RDB 的优缺点")]),_._v(" "),e("p",[_._v("优点：")]),_._v(" "),e("ul",[e("li",[_._v("RDB 非常适合备份、全量复制等场景，比如每 6 小时定时执行 "),e("code",[_._v("bgsave")]),_._v("，可用于灾难恢复。")]),_._v(" "),e("li",[_._v("RDB 的恢复数据远远快于 AOF 方式。")])]),_._v(" "),e("p",[_._v("缺点：")]),_._v(" "),e("ul",[e("li",[_._v("RDB 无法做到秒级持久化，fork 创建子进程也属于重量级操作。")]),_._v(" "),e("li",[_._v("RDB 用特定的二进制格式保存，可能有版本不兼容问题。")])]),_._v(" "),e("h2",{attrs:{id:"_2、aof"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_2、aof"}},[_._v("#")]),_._v(" 2、AOF")]),_._v(" "),e("blockquote",[e("p",[_._v("以独立的日志记录每次写命令，重启时再重新执行 AOF 文件中的命令达到恢复数据的目的。\nAOF 解决了数据持久化的实时性。")])]),_._v(" "),e("h3",{attrs:{id:"_1、aof-工作流程"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_1、aof-工作流程"}},[_._v("#")]),_._v(" 1、AOF 工作流程")]),_._v(" "),e("ul",[e("li",[_._v("开启 AOF 需要设置参数 "),e("code",[_._v("appendonly yes")]),_._v("。")]),_._v(" "),e("li",[_._v("通过参数 "),e("code",[_._v("appendfilename")]),_._v(" 来设置文件名。")])]),_._v(" "),e("p",[e("img",{attrs:{src:v(427),alt:"AOF 配置"}})]),_._v(" "),e("p",[_._v("工作流程如下图：\n"),e("img",{attrs:{src:v(428),alt:"AOF 工作流程"}})]),_._v(" "),e("p",[_._v("说明：")]),_._v(" "),e("ol",[e("li",[_._v("所有的写入命令会追加到 aof_buf (缓冲区)中。")]),_._v(" "),e("li",[_._v("AOF 缓冲区会根据同步策略（参数默认设置 "),e("code",[_._v("appendfsync everysec")]),_._v("）来做同步操作。")]),_._v(" "),e("li",[_._v("会定期对 AOF 文件进行 "),e("strong",[_._v("rewrite")]),_._v("，达到压缩的目的，因为可能有些 key 过期了。")]),_._v(" "),e("li",[_._v("机器重启时，如果开启了 AOF，则使用 AOF 加载数据。")])]),_._v(" "),e("h3",{attrs:{id:"_2、命令写入"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_2、命令写入"}},[_._v("#")]),_._v(" 2、命令写入")]),_._v(" "),e("ul",[e("li",[_._v("AOF 采用文本协议格式，也就是说 AOF 文件中存储就是写入的命令，这样具有阅读性、便于修改。")]),_._v(" "),e("li",[_._v("AOF 把命令先写入 aof_buf 中，根据不同的同步策略可以在性能和安全上做出平衡，没有特殊要求，就设置为 "),e("code",[_._v("everysec")]),_._v("。")])]),_._v(" "),e("blockquote",[e("p",[_._v("三种策略；")]),_._v(" "),e("ol",[e("li",[_._v("no: don't fsync, just let the OS flush the data when it wants. Faster.")]),_._v(" "),e("li",[_._v("always: fsync after every write to the append only log. Slow, Safest.")]),_._v(" "),e("li",[_._v("everysec: fsync only one time every second. Compromise.")])])]),_._v(" "),e("h3",{attrs:{id:"_3、重写机制"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_3、重写机制"}},[_._v("#")]),_._v(" 3、重写机制")]),_._v(" "),e("p",[_._v("AOF 文件可以变小的原因：")]),_._v(" "),e("ul",[e("li",[_._v("超时的数据，可以不用再写入文件中。")]),_._v(" "),e("li",[_._v("key 过期了，可能含有无效命令，如 "),e("code",[_._v("del key1")]),_._v("。")]),_._v(" "),e("li",[_._v("多个命令可以合并成一个，如 "),e("code",[_._v("lpush list a")]),_._v(" 和 "),e("code",[_._v("lpush list b")]),_._v(" 可以合并为 "),e("code",[_._v("lpush list a b")]),_._v("。")])]),_._v(" "),e("p",[_._v("触发 AOF 重写方式：")]),_._v(" "),e("ul",[e("li",[_._v("手动执行命令 "),e("code",[_._v("bgrewriteaof")])]),_._v(" "),e("li",[_._v("自动触发，根据配置参数 "),e("code",[_._v("auto-aof-rewrite-percentage 100")]),_._v(" 和 "),e("code",[_._v("auto-aof-rewrite-min-size 64mb")]),_._v("。")])]),_._v(" "),e("blockquote",[e("p",[_._v("参数说明：")]),_._v(" "),e("ol",[e("li",[_._v("This is how it works: Redis remembers the size of the AOF file after the\nlatest rewrite (if no rewrite has happened since the restart, the size of\nthe AOF at startup is used).")]),_._v(" "),e("li",[_._v("This base size is compared to the current size. If the current size is\nbigger than the specified percentage, the rewrite is triggered. Also\nyou need to specify a minimal size for the AOF file to be rewritten, this\nis useful to avoid rewriting the AOF file even if the percentage increase\nis reached but it is still pretty small")])])]),_._v(" "),e("p",[e("strong",[_._v("自动触发时机: aof_current_size > auto-aof-rewrite-min-size && (aof_current_size - aof_base_size) / aof_base_size > auto-aof-rewrite-percentage")])]),_._v(" "),e("p",[_._v("AOF 重写流程图如下：\n"),e("img",{attrs:{src:v(429),alt:"AOF 重写流程"}})]),_._v(" "),e("p",[_._v("说明：")]),_._v(" "),e("ol",[e("li",[_._v("执行 AOF 重写请求，如果有子进程在执行 "),e("code",[_._v("bgsave")]),_._v(" 则等待完成之后再操作。")]),_._v(" "),e("li",[_._v("fork 子进程进行重写，父进程接受请求，修改命令写入 aof_buf 中根据策略同步到磁盘。")]),_._v(" "),e("li",[_._v("fork 操作运用写时复制技术，所以子进程只能共享操作 fork 时的内存，这时父进程可能还在响应请求，所以把重写后的新命令放入 "),e("code",[_._v("aof_rewrite_buf")]),_._v(" 缓冲区中。")]),_._v(" "),e("li",[_._v("把 "),e("code",[_._v("aof_rewrite_buf")]),_._v(" 中数据写入新的 AOF 文件中，根据开启参数 "),e("code",[_._v("aof-rewrite-incremental-fsync yes")]),_._v("，每 32MB 同步到磁盘。")])]),_._v(" "),e("h3",{attrs:{id:"_4、重启加载"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_4、重启加载"}},[_._v("#")]),_._v(" 4、重启加载")]),_._v(" "),e("p",[_._v("重启加载图：\n"),e("img",{attrs:{src:v(430),alt:"重启加载图"}})]),_._v(" "),e("h3",{attrs:{id:"_5、文件校验"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_5、文件校验"}},[_._v("#")]),_._v(" 5、文件校验")]),_._v(" "),e("p",[_._v("加载损坏的 AOF 文件会拒绝启动，可以先"),e("strong",[_._v("备份文件")]),_._v("，然后再执行命令 "),e("code",[_._v("redis-check-aof [--fix] <file.aof>")]),_._v(" 来进行修复。")]),_._v(" "),e("h2",{attrs:{id:"_3、问题定位与优化"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_3、问题定位与优化"}},[_._v("#")]),_._v(" 3、问题定位与优化")]),_._v(" "),e("h3",{attrs:{id:"_1、fork-操作"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_1、fork-操作"}},[_._v("#")]),_._v(" 1、fork 操作")]),_._v(" "),e("p",[_._v("Redis 做 RDB 或者 AOF 重写时，必不可少的操作就是 fork。fork 用的写时复制技术，会复制父进程的内存页表。")]),_._v(" "),e("p",[_._v("改善 fork操作的耗时：")]),_._v(" "),e("ol",[e("li",[_._v("优先使用物理机或者高效支持 fork 操作的虚拟化技术。")]),_._v(" "),e("li",[_._v("fork 耗时和内存量成正比，单个 Redis 实例建议不超过 10G。")]),_._v(" "),e("li",[_._v("linux 内存分配策略，避免物理内存不足导致 fork 失败。")]),_._v(" "),e("li",[_._v("降低 fork 操作频率，比如避免不必要的全量复制，适当放宽 AOF 自动触发时机。")])]),_._v(" "),e("h3",{attrs:{id:"_2、子进程开销监控和优化"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_2、子进程开销监控和优化"}},[_._v("#")]),_._v(" 2、子进程开销监控和优化")]),_._v(" "),e("ol",[e("li",[_._v("CPU，子进程负责把内存中的数据写入文件中，属于 IO 密集型操作，不要和其他 IO 密集型服务部署在一起。")]),_._v(" "),e("li",[_._v("内存，写时复制技术，避免在大量写入时做子进程重写操作，导致父进程维护大量页副本，造成内存消耗，可以关闭 "),e("strong",[_._v("THP")]),_._v("。")]),_._v(" "),e("li",[_._v("磁盘，AOF 重写会消耗大量磁盘 IO，可以关闭，参数设置为 "),e("code",[_._v("no-appendfsync-on-rewrite yes")]),_._v("，默认是关闭的，但是开启后，可能丢失数据。")])]),_._v(" "),e("h3",{attrs:{id:"_3、aof-追加阻塞"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_3、aof-追加阻塞"}},[_._v("#")]),_._v(" 3、AOF 追加阻塞")]),_._v(" "),e("p",[_._v("AOF 持久化，常用的同步策略是 "),e("code",[_._v("everysec")]),_._v("，用于平衡性能和安全性，对于这种方式，Redis 使用另一个线程每秒执行 fsync 同步磁盘，当系统磁盘繁忙时，可能造成 Redis 主进程阻塞。")]),_._v(" "),e("p",[e("img",{attrs:{src:v(431),alt:"AOF 追加阻塞"}})]),_._v(" "),e("h2",{attrs:{id:"_4、多实例部署"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_4、多实例部署"}},[_._v("#")]),_._v(" 4、多实例部署")]),_._v(" "),e("p",[_._v("略")])])}),[],!1,null,null,null);e.default=s.exports}}]);