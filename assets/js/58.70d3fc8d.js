(window.webpackJsonp=window.webpackJsonp||[]).push([[58],{457:function(e,t,r){"use strict";r.r(t);var a=r(25),_=Object(a.a)({},(function(){var e=this,t=e.$createElement,r=e._self._c||t;return r("ContentSlotsDistributor",{attrs:{"slot-key":e.$parent.slotKey}},[r("h2",{attrs:{id:"_1、broker-端参数"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#_1、broker-端参数"}},[e._v("#")]),e._v(" 1、Broker 端参数")]),e._v(" "),r("h3",{attrs:{id:"_1、broker-存储信息"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#_1、broker-存储信息"}},[e._v("#")]),e._v(" 1、broker 存储信息")]),e._v(" "),r("ol",[r("li",[r("p",[r("code",[e._v("log.dirs")]),e._v(": 日志目录，例如 "),r("code",[e._v("/home/kafka1,/home/kafka2,/home/kafka3")]),e._v("。")])]),e._v(" "),r("li",[r("p",[r("code",[e._v("log.dir")]),e._v(": 只需要设置参数"),r("code",[e._v("log.dirs")]),e._v("，此参数不需要。")])])]),e._v(" "),r("h3",{attrs:{id:"_2、zk-信息"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#_2、zk-信息"}},[e._v("#")]),e._v(" 2、zk 信息")]),e._v(" "),r("ol",{attrs:{start:"3"}},[r("li",[r("code",[e._v("zookeeper.connect")]),e._v(": 连接 zk 的参数，例如 "),r("code",[e._v("zk1:2181,zk2:2181,zk3:2181")]),e._v("。")])]),e._v(" "),r("p",[e._v("如果让多个 Kafka 集群使用同一套 zk 集群，利用 zk 的 chroot 设置，例如 "),r("code",[e._v("zookeeper.connect")]),e._v(" 可以设置为 "),r("code",[e._v("zk1:2181,zk2:2181,zk3:2181/kafka1")]),e._v(" 和 "),r("code",[e._v("zk1:2181,zk2:2181,zk3:2181/kafka2")]),e._v("。")]),e._v(" "),r("h3",{attrs:{id:"_3、broker-连接信息"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#_3、broker-连接信息"}},[e._v("#")]),e._v(" 3、broker 连接信息")]),e._v(" "),r("ol",{attrs:{start:"4"}},[r("li",[r("p",[r("code",[e._v("listeners")]),e._v(": 监听器，也就是通过什么协议访问指定主机名和端口开放的 Kafka 服务。")])]),e._v(" "),r("li",[r("p",[r("code",[e._v("advertised.listeners")]),e._v(": Broker 用于对外发布的监听器。")])])]),e._v(" "),r("p",[e._v("监听器配置，由三元组 <协议名称，主机名，端口号> 构成，例如你自己定义的协议名字 "),r("code",[e._v("CONTROLLER://localhost:9092")]),e._v("。")]),e._v(" "),r("p",[e._v("一旦你自己定义了协议名称，你必须还要指定 "),r("code",[e._v("listener.security.protocol.map")]),e._v(" 参数告诉这个协议底层使用了哪种安全协议，比如指定 "),r("code",[e._v("listener.security.protocol.map=CONTROLLER:PLAINTEXT")]),e._v(" 表示 "),r("code",[e._v("CONTROLLER")]),e._v(" 这个自定义协议底层使用明文不加密传输数据。")]),e._v(" "),r("ol",{attrs:{start:"6"}},[r("li",[r("code",[e._v("host.name/port")]),e._v(": 过期。")])]),e._v(" "),r("h3",{attrs:{id:"_4、topic-管理"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#_4、topic-管理"}},[e._v("#")]),e._v(" 4、topic 管理")]),e._v(" "),r("ol",{attrs:{start:"7"}},[r("li",[r("p",[r("code",[e._v("auto.create.topics.enable")]),e._v(": 是否允许自动创建 Topic, 建议为 false。")])]),e._v(" "),r("li",[r("p",[r("code",[e._v("unclean.leader.election.enable")]),e._v("： 是否允许 Unclean Leader 选举， 建议为 false。")])])]),e._v(" "),r("p",[e._v("Unclean Leader 选举，指的是落后太多的副本参与选举，可能会使数据丢失。")]),e._v(" "),r("ol",{attrs:{start:"9"}},[r("li",[r("code",[e._v("auto.leader.rebalance.enable")]),e._v(": 是否允许定期进行 Leader 选举，建议为 false。")])]),e._v(" "),r("h3",{attrs:{id:"_5、数据留存"}},[r("a",{staticClass:"header-anchor",attrs:{href:"#_5、数据留存"}},[e._v("#")]),e._v(" 5、数据留存")]),e._v(" "),r("ol",{attrs:{start:"10"}},[r("li",[r("p",[r("code",[e._v("log.retention.{hour|minutes|ms}")]),e._v(": 日志保留时间。例如 "),r("code",[e._v("log.retention.hour=168")]),e._v(" 表示默认保存 7 天的数据。")])]),e._v(" "),r("li",[r("p",[r("code",[e._v("log.retention.bytes")]),e._v(": 消息保存的总磁盘容量大小。默认为 -1，表示容量无限制，在云上的多租户才用到此参数。")])]),e._v(" "),r("li",[r("p",[r("code",[e._v("message.max.bytes")]),e._v(": 最大消息大小。实际上，1MB 的消息很常见。")])])]),e._v(" "),r("br"),e._v(" "),r("p",[r("strong",[e._v("注意：上述的参数都不能使用默认值。")])])])}),[],!1,null,null,null);t.default=_.exports}}]);