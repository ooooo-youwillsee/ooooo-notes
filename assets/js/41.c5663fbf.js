(window.webpackJsonp=window.webpackJsonp||[]).push([[41],{391:function(t,a,s){"use strict";s.r(a);var e=s(18),n=Object(e.a)({},(function(){var t=this,a=t.$createElement,s=t._self._c||a;return s("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[s("h2",{attrs:{id:"_1、exception-和-error"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_1、exception-和-error"}},[t._v("#")]),t._v(" 1、Exception 和 Error")]),t._v(" "),s("ul",[s("li",[s("code",[t._v("Exception")]),t._v(" 和 "),s("code",[t._v("Error")]),t._v(" 都继承 "),s("code",[t._v("Throwable")]),t._v(" 类，只有 "),s("code",[t._v("Throwable")]),t._v(" 类的实例才可以抛出。")]),t._v(" "),s("li",[s("code",[t._v("Exception")]),t._v(" 是可以预料的意外情况，可以被捕获进行相应的处理。而 "),s("code",[t._v("Error")]),t._v(" 是不太可能出现的情况，可能会造成程序终止，如 "),s("code",[t._v("OutOfMemoryError")]),t._v("（内存溢出）。")]),t._v(" "),s("li",[s("code",[t._v("Exception")]),t._v(" 分为可检查（checked）异常和不检查（unchecked）异常，可检查异常必须显式捕获处理，不检查异常就是运行时异常。如 "),s("code",[t._v("NullPointerException")]),t._v(" 。")])]),t._v(" "),s("p",[s("strong",[t._v("常见的 Exception")])]),t._v(" "),s("ul",[s("li",[s("code",[t._v("NullPointerException")]),t._v(" （空指针异常）")]),t._v(" "),s("li",[s("code",[t._v("ArrayIndexOutOfBoundsException")]),t._v(" （数组越界异常）")]),t._v(" "),s("li",[s("code",[t._v("NoSuchFileException")]),t._v(" （文件没有找到异常）")]),t._v(" "),s("li",[s("code",[t._v("InterruptedException")]),t._v(" （线程被打断异常）")]),t._v(" "),s("li",[s("code",[t._v("ClassCastException")]),t._v(" （类型转换异常）")])]),t._v(" "),s("p",[s("strong",[t._v("常见的 Error")])]),t._v(" "),s("ul",[s("li",[s("code",[t._v("NoClassDefFoundError")]),t._v(" （类没有被找到错误）")]),t._v(" "),s("li",[s("code",[t._v("OutOfMemoryError")]),t._v(" （堆内存溢出错误）")]),t._v(" "),s("li",[s("code",[t._v("StackOverflowError")]),t._v(" （栈内存溢出错误）")])]),t._v(" "),s("h2",{attrs:{id:"_2、try-catch-finally"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_2、try-catch-finally"}},[t._v("#")]),t._v(" 2、try-catch-finally")]),t._v(" "),s("div",{staticClass:"language-java extra-class"},[s("pre",{pre:!0,attrs:{class:"language-java"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("try")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("BuferedReader")]),t._v(" br "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("new")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("BuferedReader")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("BuferedWriter")]),t._v(" writer "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("new")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("BuferedWriter")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// do something")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("catch")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("IOException")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("XEception")]),t._v(" e"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// Multiple catch")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// Handle it ")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("finally")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// do something")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),s("p",[s("strong",[t._v("注意")])]),t._v(" "),s("ol",[s("li",[t._v("尽量不要捕获 "),s("code",[t._v("Exception")]),t._v(" 类型的异常，具体异常具体处理。")]),t._v(" "),s("li",[t._v("不要生吞（swallow）异常，避免错误后出现难以诊断的情况，可以输出到日志中。")])]),t._v(" "),s("p",[s("strong",[t._v("Java 的异常处理机制会有额外的开销")])]),t._v(" "),s("ol",[s("li",[t._v("try-catch 的代码段会影响 JVM 的优化，尽量只捕获有必要的代码段。")]),t._v(" "),s("li",[t._v("Java 每实例化一个 "),s("code",[t._v("Exception")]),t._v("，就会对当前栈进行快照。")])])])}),[],!1,null,null,null);a.default=n.exports}}]);