(window.webpackJsonp=window.webpackJsonp||[]).push([[34],{427:function(t,e,a){"use strict";a.r(e);var r=a(25),s=Object(r.a)({},(function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[a("h2",{attrs:{id:"待写"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#待写"}},[t._v("#")]),t._v(" 待写")]),t._v(" "),a("h2",{attrs:{id:"_1-tomcat-自定义错误页"}},[a("a",{staticClass:"header-anchor",attrs:{href:"#_1-tomcat-自定义错误页"}},[t._v("#")]),t._v(" 1. tomcat 自定义错误页")]),t._v(" "),a("p",[t._v("在 "),a("code",[t._v("conf/server.xml")]),t._v(" 中的 "),a("strong",[t._v("Host")]),t._v("标签添加")]),t._v(" "),a("div",{staticClass:"language- extra-class"},[a("pre",{pre:!0,attrs:{class:"language-text"}},[a("code",[t._v('<Host name="localhost"  appBase="webapps"\n      unpackWARs="true" autoDeploy="true">\n  <Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs"\n         prefix="localhost_access_log" suffix=".txt"\n         pattern="%h %l %u %t &quot;%r&quot; %s %b" />\n\n    // 这是新加的\n    <Valve className="org.apache.catalina.valves.ErrorReportValve"\n              errorCode.400="webapps/ROOT/error.jsp"\n              errorCode.0="webapps/ROOT/error.jsp"\n              showReport="false"\n              showServerInfo="false" />\n    // 这是新加的\n</Host>\n')])])]),a("p",[t._v("上面的 "),a("strong",[t._v("error.jsp")]),t._v(" 放在 "),a("code",[t._v("webapps/ROOT/")])]),t._v(" "),a("ul",[a("li",[t._v("参考 https://stackoverflow.com/questions/52814582/tomcat-is-not-redirecting-to-400-bad-request-custom-error-page")]),t._v(" "),a("li",[t._v("参考 https://tomcat.apache.org/tomcat-9.0-doc/config/valve.html#Error_Report_Valve")])])])}),[],!1,null,null,null);e.default=s.exports}}]);