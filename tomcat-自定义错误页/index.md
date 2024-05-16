# Tomcat 自定义错误页


在 `conf/server.xml` 中的 **Host**标签添加

```
&lt;Host name=&#34;localhost&#34;  appBase=&#34;webapps&#34;
      unpackWARs=&#34;true&#34; autoDeploy=&#34;true&#34;&gt;
  &lt;Valve className=&#34;org.apache.catalina.valves.AccessLogValve&#34; directory=&#34;logs&#34;
         prefix=&#34;localhost_access_log&#34; suffix=&#34;.txt&#34;
         pattern=&#34;%h %l %u %t &amp;quot;%r&amp;quot; %s %b&#34; /&gt;

    // 这是新加的
    &lt;Valve className=&#34;org.apache.catalina.valves.ErrorReportValve&#34;
              errorCode.400=&#34;webapps/ROOT/error.jsp&#34;
              errorCode.0=&#34;webapps/ROOT/error.jsp&#34;
              showReport=&#34;false&#34;
              showServerInfo=&#34;false&#34; /&gt;
    // 这是新加的
&lt;/Host&gt;
```

上面的 **error.jsp** 放在 `webapps/ROOT/`

- 参考 https://stackoverflow.com/questions/52814582/tomcat-is-not-redirecting-to-400-bad-request-custom-error-page
- 参考 https://tomcat.apache.org/tomcat-9.0-doc/config/valve.html#Error_Report_Valve


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/tomcat-%E8%87%AA%E5%AE%9A%E4%B9%89%E9%94%99%E8%AF%AF%E9%A1%B5/  

