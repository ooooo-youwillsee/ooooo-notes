(window.webpackJsonp=window.webpackJsonp||[]).push([[40],{389:function(a,t,s){"use strict";s.r(t);var l=s(18),v=Object(l.a)({},(function(){var a=this,t=a.$createElement,s=a._self._c||t;return s("ContentSlotsDistributor",{attrs:{"slot-key":a.$parent.slotKey}},[s("h2",{attrs:{id:"_1、java本身有两个显著的特性"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_1、java本身有两个显著的特性"}},[a._v("#")]),a._v(" 1、Java本身有两个显著的特性")]),a._v(" "),s("blockquote",[s("p",[a._v("JRE 就是 Java 运行环境， JDK 就是 Java 开发工具包")])]),a._v(" "),s("ul",[s("li",[a._v("跨平台运行（一次编写，到处运行）")]),a._v(" "),s("li",[a._v("垃圾回收器（程序员不用手动回收内存，但仍然可能存在内存泄漏）")])]),a._v(" "),s("h2",{attrs:{id:"_2、java是解析执行？（不太正确）"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_2、java是解析执行？（不太正确）"}},[a._v("#")]),a._v(" 2、Java是解析执行？（不太正确）")]),a._v(" "),s("p",[a._v("我们开发的 java 源代码，经过 javac 编译成为字节码，在运行时，通过 JVM 内置的解析器将字节码装换为机器码。")]),a._v(" "),s("p",[a._v("常见的 JVM， 比如 Oracle 的 Hotspot JVM，提供了 JIT（Just-In-Time）动态编译器。")]),a._v(" "),s("p",[a._v("在主流的 Java 版本中，Java 8 采用混合模式"),s("code",[a._v("-Xmixed")]),a._v("进行。")]),a._v(" "),s("p",[a._v("Oracle Hotspot JVM 提供了两种不同的 JIT 编译器，C1 对应 client 模式，适用于启动敏感的应用，C2 对应 server 模式，适用于长时间运行的服务器。默认采用的是分层编译。")]),a._v(" "),s("p",[a._v("JVM 启动时，可以通过指定不同的参数对运行模式选择。")]),a._v(" "),s("ul",[s("li",[s("code",[a._v("-Xint")]),a._v("  JVM 只进行解释执行。")]),a._v(" "),s("li",[s("code",[a._v("-Xcomp")]),a._v(" JVM 只进行编译执行。")])]),a._v(" "),s("p",[a._v("除了上面的编译方式，还有一种新的编译方式（AOT），就是直接把字节码编译为机器码。")]),a._v(" "),s("p",[a._v("利用下面的命令把某个类或者某个模块编译成为AOT库")]),a._v(" "),s("div",{staticClass:"language-shell script extra-class"},[s("pre",{pre:!0,attrs:{class:"language-shell"}},[s("code",[a._v("jaotc --output libHelloWorld.so HelloWorld.class\njaotc --output libjava.base.so --module java.base\n")])])]),s("p",[a._v("然后在启动时直接指定")]),a._v(" "),s("div",{staticClass:"language-shell script extra-class"},[s("pre",{pre:!0,attrs:{class:"language-shell"}},[s("code",[a._v("java -XX:AOTLibrary"),s("span",{pre:!0,attrs:{class:"token operator"}},[a._v("=")]),a._v("./libHelloWorld.so,./libjava.base.so HelloWorld\n")])])])])}),[],!1,null,null,null);t.default=v.exports}}]);