(window.webpackJsonp=window.webpackJsonp||[]).push([[16],{323:function(t,e,s){t.exports=s.p+"assets/img/04_01.64d55953.png"},383:function(t,e,s){"use strict";s.r(e);var a=s(18),_=Object(a.a)({},(function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[a("h2",{attrs:{id:"_1、客户端通信协议"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_1、客户端通信协议"}},[t._v("#")]),t._v(" 1、客户端通信协议")]),t._v(" "),a("p",[t._v("Redis 制定了 RESP（redis序列化协议）实现客户端和服务端的正常交互。")]),t._v(" "),a("h3",{attrs:{id:"_1、发送命令格式"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_1、发送命令格式"}},[t._v("#")]),t._v(" 1、发送命令格式")]),t._v(" "),a("p",[t._v("CRLF 为 '\\r\\n'")]),t._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[t._v("*"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("<")]),t._v("参数数量"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(">")]),t._v(" CRLF\n$"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("<")]),t._v("参数 "),a("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),t._v(" 的字节数量"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(">")]),t._v(" CRLF\n"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("<")]),t._v("参数 "),a("span",{pre:!0,attrs:{class:"token operator"}},[a("span",{pre:!0,attrs:{class:"token file-descriptor important"}},[t._v("1")]),t._v(">")]),t._v(" CRLF\n"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("..")]),t._v(".\n$"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("<")]),t._v("参数 N 的字节数量"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(">")]),t._v(" CRLF\n"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v("<")]),t._v("参数 N"),a("span",{pre:!0,attrs:{class:"token operator"}},[t._v(">")]),t._v(" CRLF\n")])])]),a("p",[t._v("以 "),a("code",[t._v("set hello world")]),t._v(" 命令为例：")]),t._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[t._v("*3\n"),a("span",{pre:!0,attrs:{class:"token variable"}},[t._v("$3")]),t._v(" \n"),a("span",{pre:!0,attrs:{class:"token builtin class-name"}},[t._v("set")]),t._v(" \n"),a("span",{pre:!0,attrs:{class:"token variable"}},[t._v("$5")]),t._v(" \nhello \n"),a("span",{pre:!0,attrs:{class:"token variable"}},[t._v("$5")]),t._v("\nworld\n")])])]),a("h3",{attrs:{id:"_2、返回结果格式"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_2、返回结果格式"}},[t._v("#")]),t._v(" 2、返回结果格式")]),t._v(" "),a("ul",[a("li",[t._v('状态回复，第一个字节为 "+"。如 '),a("code",[t._v("set")])]),t._v(" "),a("li",[t._v('错误回复，第一个字节为 "-"。如 '),a("code",[t._v("错误命令")])]),t._v(" "),a("li",[t._v('整数回复，第一个字节为 ":"。如 '),a("code",[t._v("incr")])]),t._v(" "),a("li",[t._v('字符串回复，第一个字节为 "$"。如 '),a("code",[t._v("get")])]),t._v(" "),a("li",[t._v('多条字符串回复，第一个字节为 "*"。如 '),a("code",[t._v("mget")])])]),t._v(" "),a("h2",{attrs:{id:"_2、java-客户端-jedis"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_2、java-客户端-jedis"}},[t._v("#")]),t._v(" 2、Java 客户端 Jedis")]),t._v(" "),a("p",[t._v("jedis 用的很少了，请参考 "),a("a",{attrs:{href:"https://lettuce.io/",target:"_blank",rel:"noopener noreferrer"}},[t._v("lettuce"),a("OutboundLink")],1),t._v("、"),a("a",{attrs:{href:"https://redisson.org/",target:"_blank",rel:"noopener noreferrer"}},[t._v("redisson"),a("OutboundLink")],1)]),t._v(" "),a("h2",{attrs:{id:"_3、python-客户端-redis-py"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_3、python-客户端-redis-py"}},[t._v("#")]),t._v(" 3、Python 客户端 redis-py")]),t._v(" "),a("p",[t._v("略")]),t._v(" "),a("h2",{attrs:{id:"_4、客户端管理"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_4、客户端管理"}},[t._v("#")]),t._v(" 4、客户端管理")]),t._v(" "),a("h3",{attrs:{id:"_1、客户端-api"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_1、客户端-api"}},[t._v("#")]),t._v(" 1、客户端 API")]),t._v(" "),a("h4",{attrs:{id:"_1、client-list"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_1、client-list"}},[t._v("#")]),t._v(" 1、"),a("code",[t._v("client list")])]),t._v(" "),a("p",[t._v("与 Redis 服务端相连的所有客户端连接信息")]),t._v(" "),a("p",[a("img",{attrs:{src:s(323),alt:"client list"}})]),t._v(" "),a("p",[t._v("说明：")]),t._v(" "),a("ul",[a("li",[t._v("id: 客户端连接唯一标识，递增，但 Redis 重启后重置为 0。")]),t._v(" "),a("li",[t._v("addr: 客户端 IP 和 PORT。")]),t._v(" "),a("li",[t._v("fd: socket 文件描述符，与 "),a("code",[t._v("lsof")]),t._v(" 命令中 fd 是同一个。")]),t._v(" "),a("li",[t._v("name: 客户端名字，与 "),a("code",[t._v("client setName")]),t._v(" 和 "),a("code",[t._v("client getName")]),t._v(" 有关")])]),t._v(" "),a("p",[t._v("Redis 为每个客户端分配了输入缓冲区，它的作用将客户端发送的命令临时保存，Redis 会从输入缓冲区中拉取命令并执行。不受 "),a("code",[t._v("maxmemory")]),t._v(" 参数影响。")]),t._v(" "),a("ul",[a("li",[t._v("qbuf: 客户端的输入缓冲区总容量")]),t._v(" "),a("li",[t._v("qbuf-free: 客户端的输入缓冲区剩余容量")])]),t._v(" "),a("p",[t._v("输入缓冲区过大的原因：")]),t._v(" "),a("ol",[a("li",[t._v("Redis 处理速度跟不上输入缓冲区的输入速度，可以存在 "),a("strong",[t._v("bigKey")]),t._v("。")]),t._v(" "),a("li",[t._v("Redis 发生了阻塞。")])]),t._v(" "),a("p",[t._v("Redis 为每个客户端分配了输出缓冲区，它的作用是保存命令执行的结果返回给客户端。通过配置文件中的 "),a("code",[t._v("client-output-buffer-limit <class> <hard limit> <soft limit> <soft seconds>")]),t._v(" 来配置。不受 "),a("code",[t._v("maxmemory")]),t._v(" 参数影响。")]),t._v(" "),a("ul",[a("li",[t._v("obl: 固定输出缓冲区大小")]),t._v(" "),a("li",[t._v("oll: 动态输出缓冲区大小，当固定缓冲区满了，就会使用动态缓冲区")]),t._v(" "),a("li",[t._v("omem: 输出缓冲区总计的字节数")])]),t._v(" "),a("p",[t._v("其他信息：")]),t._v(" "),a("ul",[a("li",[t._v("age: 已连接的时间")]),t._v(" "),a("li",[t._v("idle: 最近一次空闲时间")]),t._v(" "),a("li",[t._v("flag: S 表示 slave 客户端，N 表示普通客户端，O 表示执行 "),a("code",[t._v("monitor")]),t._v(" 命令的客户端")]),t._v(" "),a("li",[t._v("db: 数据库索引下标")]),t._v(" "),a("li",[t._v("sub/psub: 当前客户端订阅的频道")]),t._v(" "),a("li",[t._v("multi: 当前事务已执行命令个数")])]),t._v(" "),a("p",[t._v("客户端限制 "),a("code",[t._v("maxclients (默认为 1000)")]),t._v(" 和 "),a("code",[t._v("timeout")]),t._v("，通过 "),a("code",[t._v("config set maxclients 10000")]),t._v(" 命令和 "),a("code",[t._v("config set timeout 30")]),t._v(" 命令来设置。")]),t._v(" "),a("p",[t._v("监控缓冲区方法：")]),t._v(" "),a("ul",[a("li",[t._v("定期执行 "),a("code",[t._v("client list")]),t._v(" 命令，收集 qbuf 和 qbuf-free。")]),t._v(" "),a("li",[t._v("执行 "),a("code",[t._v("info clients")]),t._v(" 命令，找到最大的输入缓冲区 "),a("code",[t._v("client_recent_max_input_buffer")])])]),t._v(" "),a("h4",{attrs:{id:"_2、client-getname-setname"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_2、client-getname-setname"}},[t._v("#")]),t._v(" 2、"),a("code",[t._v("client getName / setName")])]),t._v(" "),a("p",[t._v("给当前客户端设置名字")]),t._v(" "),a("h4",{attrs:{id:"_3、client-kill"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_3、client-kill"}},[t._v("#")]),t._v(" 3、"),a("code",[t._v("client kill")])]),t._v(" "),a("p",[t._v("杀掉指定 ip 和 port 的客户端")]),t._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[t._v("  client "),a("span",{pre:!0,attrs:{class:"token function"}},[t._v("kill")]),t._v(" ip:port\n")])])]),a("h4",{attrs:{id:"_4、client-pause"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_4、client-pause"}},[t._v("#")]),t._v(" 4、"),a("code",[t._v("client pause")])]),t._v(" "),a("p",[t._v("阻塞客户端 timeout 毫秒")]),t._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[t._v("  client pause timeout"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("毫秒"),a("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n")])])]),a("h4",{attrs:{id:"_5、monitor"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_5、monitor"}},[t._v("#")]),t._v(" 5、"),a("code",[t._v("monitor")])]),t._v(" "),a("p",[t._v("监控 Redis 正在执行的命令，如果并发量过大，会造成输出缓冲区暴涨。")]),t._v(" "),a("div",{staticClass:"language-shell script extra-class"},[a("pre",{pre:!0,attrs:{class:"language-shell"}},[a("code",[t._v("  monitor\n")])])]),a("h3",{attrs:{id:"_2、客户端相关配置"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_2、客户端相关配置"}},[t._v("#")]),t._v(" 2、客户端相关配置")])])}),[],!1,null,null,null);e.default=_.exports}}]);