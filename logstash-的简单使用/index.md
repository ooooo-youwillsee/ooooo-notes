# Logstash 的简单使用



## 1. install logstash 

refer to [logstash document](https://www.elastic.co/guide/en/logstash/current/index.html)

### 2. logstash example config file

```
input { 
    tcp {
        port =&gt; 12345
        codec =&gt; &#34;json_lines&#34;
    }
}
filter{
    grok {
        match =&gt; [&#34;message&#34;, &#34;%{TIMESTAMP_ISO8601:logdate}&#34;]
    }

    date {
        match =&gt; [&#34;logdate&#34;, &#34;yyyy-MM-dd HH:mm:ss.SSS&#34;]
        target =&gt; &#34;@timestamp&#34;
    }

    mutate {  
        remove_field =&gt; [&#34;logdate&#34;]  
    } 

    ruby {   
        code =&gt; &#34;event.set(&#39;timestamp&#39;, event.get(&#39;@timestamp&#39;).time.localtime &#43; 8*60*60)&#34;   
    }  

    ruby {  
        code =&gt; &#34;event.set(&#39;@timestamp&#39;,event.get(&#39;timestamp&#39;))&#34;  
    } 

    mutate {  
        remove_field =&gt; [&#34;timestamp&#34;]  
    } 
}
output {
  stdout { codec =&gt; rubydebug { metadata =&gt; true } }
  file {
    path =&gt; &#34;./logs/%{&#43;YYYY-MM-dd-HH}.log&#34;
    codec =&gt; line { format =&gt; &#34;%{message}&#34;}
  }
}

```

notes:
1. it will serve **TCP** connection on **localhost:12345**.
2. uses codec named `json_lines`, json data format such as `{ &#34;message&#34; : &#34;xxxx&#34; }`.
3. matche **date** pattern in the log, then use it as its time.
4. reset the field `@timestamp`, output to the local file.


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/logstash-%E7%9A%84%E7%AE%80%E5%8D%95%E4%BD%BF%E7%94%A8/  

