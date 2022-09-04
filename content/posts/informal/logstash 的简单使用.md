---
title: logstash 的简单使用
date: 2021-06-01T18:32:22+08:00
draft: false
tags: [logstash]
categories: [随笔]
---


## logstash 


### 1. install logstash 

refer to [logstash document](https://www.elastic.co/guide/en/logstash/current/index.html)

### 2. logstash example config file

```
input { 
    tcp {
        port => 12345
        codec => "json_lines"
    }
}
filter{
    grok {
        match => ["message", "%{TIMESTAMP_ISO8601:logdate}"]
    }

    date {
        match => ["logdate", "yyyy-MM-dd HH:mm:ss.SSS"]
        target => "@timestamp"
    }

    mutate {  
        remove_field => ["logdate"]  
    } 

    ruby {   
        code => "event.set('timestamp', event.get('@timestamp').time.localtime + 8*60*60)"   
    }  

    ruby {  
        code => "event.set('@timestamp',event.get('timestamp'))"  
    } 

    mutate {  
        remove_field => ["timestamp"]  
    } 
}
output {
  stdout { codec => rubydebug { metadata => true } }
  file {
    path => "./logs/%{+YYYY-MM-dd-HH}.log"
    codec => line { format => "%{message}"}
  }
}

```

notes:
1. it will serve **TCP** connection on **localhost:12345**.
2. uses codec named `json_lines`, json data format such as `{ "message" : "xxxx" }`.
3. matche **date** pattern in the log, then use it as its time.
4. reset the field `@timestamp`, output to the local file.
