(window.webpackJsonp=window.webpackJsonp||[]).push([[59],{458:function(a,e,s){"use strict";s.r(e);var t=s(25),r=Object(t.a)({},(function(){var a=this,e=a.$createElement,s=a._self._c||e;return s("ContentSlotsDistributor",{attrs:{"slot-key":a.$parent.slotKey}},[s("h2",{attrs:{id:"_1、topic-级别参数"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_1、topic-级别参数"}},[a._v("#")]),a._v(" 1、Topic 级别参数")]),a._v(" "),s("p",[a._v("如果同时设置了 Topic 级别参数和全局 Broker 参数，Topic 级别参数会覆盖全局 Broker 参数的值，而每个 Topic 都能设置自己的参数值，这就是所谓的 Topic 级别参数。")]),a._v(" "),s("ol",[s("li",[s("p",[s("code",[a._v("retention.ms")]),a._v(": 该 Topic 消息被保存的时长，会覆盖掉 Broker 端的全局参数值。")])]),a._v(" "),s("li",[s("p",[s("code",[a._v("retention.bytes")]),a._v(": 该 Topic 预留多大的磁盘空间，当前默认值是 -1，表示可以无限使用磁盘空间，在多租户的 Kafka 集群中用到。")])]),a._v(" "),s("li",[s("p",[s("code",[a._v("max.message.bytes")]),a._v(": Topic 的最大消息大小。")])])]),a._v(" "),s("p",[a._v("Topic 设置方式（🎉"),s("a",{attrs:{href:"http://kafka.apache.org/documentation/#topicconfigs",target:"_blank",rel:"noopener noreferrer"}},[a._v("Kafka官方文档"),s("OutboundLink")],1),a._v("🎉）：")]),a._v(" "),s("ul",[s("li",[a._v("创建 Topic 时设置")])]),a._v(" "),s("p",[a._v("--config 后面指定了想要设置的 Topic 级别参数。")]),a._v(" "),s("div",{staticClass:"language-shell script extra-class"},[s("pre",{pre:!0,attrs:{class:"language-shell"}},[s("code",[a._v("bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic my-topic --partitions "),s("span",{pre:!0,attrs:{class:"token number"}},[a._v("1")]),a._v(" --replication-factor "),s("span",{pre:!0,attrs:{class:"token number"}},[a._v("1")]),a._v(" --config retention.ms"),s("span",{pre:!0,attrs:{class:"token operator"}},[a._v("=")]),s("span",{pre:!0,attrs:{class:"token number"}},[a._v("15552000000")]),a._v(" --config max.message.bytes"),s("span",{pre:!0,attrs:{class:"token operator"}},[a._v("=")]),s("span",{pre:!0,attrs:{class:"token number"}},[a._v("5242880")]),a._v("\n")])])]),s("ul",[s("li",[a._v("修改 Topic 时设置")])]),a._v(" "),s("div",{staticClass:"language-shell script extra-class"},[s("pre",{pre:!0,attrs:{class:"language-shell"}},[s("code",[a._v(" bin/kafka-configs.sh --zookeeper localhost:2181 --entity-type topics --entity-name my-topic --alter --add-config max.message.bytes"),s("span",{pre:!0,attrs:{class:"token operator"}},[a._v("=")]),s("span",{pre:!0,attrs:{class:"token number"}},[a._v("10485760")]),a._v("\n")])])]),s("h2",{attrs:{id:"_2、jvm-参数"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_2、jvm-参数"}},[a._v("#")]),a._v(" 2、JVM 参数")]),a._v(" "),s("p",[a._v("Java7 中，如果 Broker 所在机器的 CPU 资源非常充裕，则建议开启 CMS 垃圾回收器, "),s("code",[a._v("-XX:+UseCurrentMarkSweepGC")]),a._v("。否则，使用吞吐量收集器。开启方法是指定"),s("code",[a._v("-XX:+UseParallelGC")]),a._v("。")]),a._v(" "),s("p",[a._v("Java8 中，建议使用 G1 垃圾回收器。")]),a._v(" "),s("p",[a._v("建议使用 Java8。")]),a._v(" "),s("ol",[s("li",[s("p",[s("code",[a._v("KAFKA_HEAP_OPTS")]),a._v(": 堆大小, 建议为 6GB，这是比较公认的合理值。")])]),a._v(" "),s("li",[s("p",[s("code",[a._v("KAFKA_JVM_PERFORMANCE_OPTS")]),a._v(": 指定 GC 参数。")])])]),a._v(" "),s("p",[a._v("比如你可以这样启动 Kafka：")]),a._v(" "),s("div",{staticClass:"language-shell script extra-class"},[s("pre",{pre:!0,attrs:{class:"language-shell"}},[s("code",[s("span",{pre:!0,attrs:{class:"token builtin class-name"}},[a._v("export")]),a._v(" "),s("span",{pre:!0,attrs:{class:"token assign-left variable"}},[a._v("KAFKA_HEAP_OPTS")]),s("span",{pre:!0,attrs:{class:"token operator"}},[a._v("=")]),a._v("--Xms6g  --Xmx6g\n"),s("span",{pre:!0,attrs:{class:"token builtin class-name"}},[a._v("export")]),a._v(" "),s("span",{pre:!0,attrs:{class:"token assign-left variable"}},[a._v("KAFKA_JVM_PERFORMANCE_OPTS")]),s("span",{pre:!0,attrs:{class:"token operator"}},[a._v("=")]),a._v(" -server -XX:+UseG1GC -XX:MaxGCPauseMillis"),s("span",{pre:!0,attrs:{class:"token operator"}},[a._v("=")]),s("span",{pre:!0,attrs:{class:"token number"}},[a._v("20")]),a._v(" -XX:InitiatingHeapOccupancyPercent"),s("span",{pre:!0,attrs:{class:"token operator"}},[a._v("=")]),s("span",{pre:!0,attrs:{class:"token number"}},[a._v("35")]),a._v(" -XX:+ExplicitGCInvokesConcurrent -Djava.awt.headless"),s("span",{pre:!0,attrs:{class:"token operator"}},[a._v("=")]),a._v("true\nbin/kafka-server-start.sh config/server.properties\n")])])]),s("h3",{attrs:{id:"_3、操作系统参数"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_3、操作系统参数"}},[a._v("#")]),a._v(" 3、操作系统参数")]),a._v(" "),s("p",[a._v("主要系统参数：")]),a._v(" "),s("ul",[s("li",[a._v("文件描述符限制")])]),a._v(" "),s("p",[a._v("执行命令 "),s("code",[a._v("ulimit -n 1000000")]),a._v(" 来设置。")]),a._v(" "),s("ul",[s("li",[a._v("文件系统类型")])]),a._v(" "),s("p",[a._v("XFS 的性能要强于 ext4。")]),a._v(" "),s("ul",[s("li",[a._v("Swappiness")])]),a._v(" "),s("p",[a._v("将 swap 交换内存配置成一个接近 0 但不为 0 的值，比如 1。")]),a._v(" "),s("ul",[s("li",[a._v("提交时间")])]),a._v(" "),s("p",[a._v('向 Kafka 发送数据并不是真要等数据被写入磁盘才会认为成功，而是只要数据被写入到操作系统的页缓存（Page Cache）上就可以了，随后操作系统根据 LRU 算法会定期将页缓存上的"脏"数据落盘到物理磁盘上。这个定期就是由提交时间来确定的，默认是 5 秒。由于 Kafka 的多副本的冗余机制，可以稍微拉大提交间隔来提高性能。')])])}),[],!1,null,null,null);e.default=r.exports}}]);