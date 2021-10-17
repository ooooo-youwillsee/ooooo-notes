(window.webpackJsonp=window.webpackJsonp||[]).push([[34],{427:function(t,a,s){"use strict";s.r(a);var n=s(25),e=Object(n.a)({},(function(){var t=this,a=t.$createElement,s=t._self._c||a;return s("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[s("h2",{attrs:{id:"待写"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#待写"}},[t._v("#")]),t._v(" 待写")]),t._v(" "),s("h2",{attrs:{id:"_1-tomcat-自定义错误页"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_1-tomcat-自定义错误页"}},[t._v("#")]),t._v(" 1. tomcat 自定义错误页")]),t._v(" "),s("p",[t._v("在 "),s("code",[t._v("conf/server.xml")]),t._v(" 中的 "),s("strong",[t._v("Host")]),t._v("标签添加")]),t._v(" "),s("div",{staticClass:"language- extra-class"},[s("pre",{pre:!0,attrs:{class:"language-text"}},[s("code",[t._v('<Host name="localhost"  appBase="webapps"\n      unpackWARs="true" autoDeploy="true">\n  <Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs"\n         prefix="localhost_access_log" suffix=".txt"\n         pattern="%h %l %u %t &quot;%r&quot; %s %b" />\n\n    // 这是新加的\n    <Valve className="org.apache.catalina.valves.ErrorReportValve"\n              errorCode.400="webapps/ROOT/error.jsp"\n              errorCode.0="webapps/ROOT/error.jsp"\n              showReport="false"\n              showServerInfo="false" />\n    // 这是新加的\n</Host>\n')])])]),s("p",[t._v("上面的 "),s("strong",[t._v("error.jsp")]),t._v(" 放在 "),s("code",[t._v("webapps/ROOT/")])]),t._v(" "),s("ul",[s("li",[t._v("参考 https://stackoverflow.com/questions/52814582/tomcat-is-not-redirecting-to-400-bad-request-custom-error-page")]),t._v(" "),s("li",[t._v("参考 https://tomcat.apache.org/tomcat-9.0-doc/config/valve.html#Error_Report_Valve")])]),t._v(" "),s("h2",{attrs:{id:"_2-gradle-全局设置仓库镜像"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_2-gradle-全局设置仓库镜像"}},[t._v("#")]),t._v(" 2. gradle 全局设置仓库镜像")]),t._v(" "),s("p",[t._v("在 "),s("code",[t._v("~\\.gradle")]),t._v(" 目录下新建文件 "),s("code",[t._v("init.gradle")]),t._v(", 内容如下")]),t._v(" "),s("div",{staticClass:"language- extra-class"},[s("pre",{pre:!0,attrs:{class:"language-text"}},[s("code",[t._v('allprojects {\n    repositories {\n        mavenLocal()\n\t\t\tmaven { name "Alibaba" ; url "https://maven.aliyun.com/repository/public" }\n\t\t\tmaven { name "Bstek" ; url "http://nexus.bsdn.org/content/groups/public/" }\n    }\n\n\tbuildscript {\n\t\trepositories {\n\t\t\tmaven { name "Alibaba" ; url \'https://maven.aliyun.com/repository/public\' }\n\t\t\tmaven { name "Bstek" ; url \'http://nexus.bsdn.org/content/groups/public/\' }\n\t\t\tmaven { name "M2" ; url \'https://plugins.gradle.org/m2/\' }\n\t\t}\n\t}\n}\n')])])]),s("h2",{attrs:{id:"_3-apache-org-等网站无法访问"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_3-apache-org-等网站无法访问"}},[t._v("#")]),t._v(" 3. *.apache.org 等网站无法访问")]),t._v(" "),s("p",[t._v("运行命令 "),s("code",[t._v("ping apache.org")]),t._v(" 显示 IP 地址为 127.0.0.1")]),t._v(" "),s("p",[t._v("原因就是 DNS 出问题了，解决方法就是 "),s("strong",[t._v("配置网卡的 DNS 为 114.114.114.114")])]),t._v(" "),s("h2",{attrs:{id:"_4-inetaddress-gethostname-超时"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_4-inetaddress-gethostname-超时"}},[t._v("#")]),t._v(" 4. InetAddress#getHostName 超时")]),t._v(" "),s("p",[t._v("解决方法，设置 hosts 文件")]),t._v(" "),s("p",[t._v("比如 InetAddress 显示的是 "),s("strong",[t._v("192.168.130.1")]),t._v("， 所以就在 hosts 文件中添加一条记录 (反解析)")]),t._v(" "),s("div",{staticClass:"language- extra-class"},[s("pre",{pre:!0,attrs:{class:"language-text"}},[s("code",[t._v("192.168.130.1 192.168.130.1\n")])])]),s("h2",{attrs:{id:"_5-nacos-在-tomcat-中无法注册服务"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_5-nacos-在-tomcat-中无法注册服务"}},[t._v("#")]),t._v(" 5. nacos 在 tomcat 中无法注册服务")]),t._v(" "),s("div",{staticClass:"language-java extra-class"},[s("pre",{pre:!0,attrs:{class:"language-java"}},[s("code",[s("span",{pre:!0,attrs:{class:"token annotation punctuation"}},[t._v("@Component")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("public")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("class")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("NacosAutoServiceRegistrationWithTomcat")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("implements")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("ApplicationRunner")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n\n\t"),s("span",{pre:!0,attrs:{class:"token annotation punctuation"}},[t._v("@Autowired")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("required "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token boolean"}},[t._v("false")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n\t"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("private")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("NacosAutoServiceRegistration")]),t._v(" nacosAutoServiceRegistration"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n\n\t"),s("span",{pre:!0,attrs:{class:"token annotation punctuation"}},[t._v("@Autowired")]),t._v("\n\t"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("private")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("Environment")]),t._v(" environment"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n\n\t"),s("span",{pre:!0,attrs:{class:"token annotation punctuation"}},[t._v("@Override")]),t._v("\n\t"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("public")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("void")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token function"}},[t._v("run")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("ApplicationArguments")]),t._v(" args"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("throws")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("Exception")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n\t\t"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("if")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("nacosAutoServiceRegistration "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("!=")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("null")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n\t\t    "),s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// 重新设置端口")]),t._v("\n\t\t\tnacosAutoServiceRegistration"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{pre:!0,attrs:{class:"token function"}},[t._v("setPort")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("Integer")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{pre:!0,attrs:{class:"token function"}},[t._v("parseInt")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("environment"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{pre:!0,attrs:{class:"token function"}},[t._v("getProperty")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"server.port"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n\t\t    l"),s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("// 重新注册")]),t._v("\n\t\t\tnacosAutoServiceRegistration"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{pre:!0,attrs:{class:"token function"}},[t._v("start")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n\t\t"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n\t"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),s("h2",{attrs:{id:"_6-mysql8-0-第一次安装后-重置密码"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_6-mysql8-0-第一次安装后-重置密码"}},[t._v("#")]),t._v(" 6. mysql8.0 第一次安装后，重置密码")]),t._v(" "),s("ol",[s("li",[t._v("查看临时密码： "),s("code",[t._v("cat /var/log/mysqld.log | grep password")])]),t._v(" "),s("li",[t._v("登录 mysql, "),s("code",[t._v("mysql -uroot -p")]),t._v(", 输入临时密码")]),t._v(" "),s("li",[t._v("设置简单密码，执行下面的命令")])]),t._v(" "),s("div",{staticClass:"language-shell extra-class"},[s("pre",{pre:!0,attrs:{class:"language-shell"}},[s("code",[s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("# 设置密码长度")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token builtin class-name"}},[t._v("set")]),t._v(" global validate_password.length"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("4")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("# 设置可以和登录用户名一样")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token builtin class-name"}},[t._v("set")]),t._v(" global validate_password.check_user_name"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v("off"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("# 简单密码策略")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token builtin class-name"}},[t._v("set")]),t._v(" global validate_password.policy"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("0")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n")])])]),s("ol",{attrs:{start:"4"}},[s("li",[t._v("执行命令 "),s("code",[t._v("ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';")]),t._v(" 重置密码")]),t._v(" "),s("li",[t._v("创建用户， "),s("code",[t._v("CREATE USER 'root'@'%' IDENTIFIED BY 'root';")])]),t._v(" "),s("li",[t._v("授权，"),s("code",[t._v("GRANT ALL ON *.* TO 'root'@'%'")])])]),t._v(" "),s("h2",{attrs:{id:"_7-win10-默认没有创建软链接的权限"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_7-win10-默认没有创建软链接的权限"}},[t._v("#")]),t._v(" 7. win10，默认没有创建软链接的权限")]),t._v(" "),s("ol",[s("li",[t._v("在调试"),s("strong",[t._v("pulsar")]),t._v("，程序需要创建"),s("strong",[t._v("软链接")])]),t._v(" "),s("li",[t._v("系统必须要为"),s("strong",[t._v("专业版")]),t._v("，才会有"),s("strong",[t._v("策略组")]),t._v("权限设置")])]),t._v(" "),s("p",[t._v("参考")]),t._v(" "),s("ol",[s("li",[s("a",{attrs:{href:"https://jingyan.baidu.com/article/e52e361588a3b501c60c5184.html",target:"_blank",rel:"noopener noreferrer"}},[t._v("百度经验"),s("OutboundLink")],1)]),t._v(" "),s("li",[s("a",{attrs:{href:"https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-vista/cc766301(v=ws.10)",target:"_blank",rel:"noopener noreferrer"}},[t._v("win10 软连接权限设置"),s("OutboundLink")],1)])])])}),[],!1,null,null,null);a.default=e.exports}}]);