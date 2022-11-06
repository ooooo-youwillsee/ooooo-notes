---
title: tomcat 自定义错误页
date: 2021-01-01T08:00:00+08:00
draft: false
tags: [resolution]
categories: [随笔]
---

在 `conf/server.xml` 中的 **Host**标签添加

```
<Host name="localhost"  appBase="webapps"
      unpackWARs="true" autoDeploy="true">
  <Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs"
         prefix="localhost_access_log" suffix=".txt"
         pattern="%h %l %u %t &quot;%r&quot; %s %b" />

    // 这是新加的
    <Valve className="org.apache.catalina.valves.ErrorReportValve"
              errorCode.400="webapps/ROOT/error.jsp"
              errorCode.0="webapps/ROOT/error.jsp"
              showReport="false"
              showServerInfo="false" />
    // 这是新加的
</Host>
```

上面的 **error.jsp** 放在 `webapps/ROOT/`

- 参考 https://stackoverflow.com/questions/52814582/tomcat-is-not-redirecting-to-400-bad-request-custom-error-page
- 参考 https://tomcat.apache.org/tomcat-9.0-doc/config/valve.html#Error_Report_Valve
