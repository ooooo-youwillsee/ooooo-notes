# 01 搭建 Rocketmq 源码调试环境


&gt; rocketmq 基于 5.1.4 版本

## 启动 namesrv

在 `org.apache.rocketmq.namesrv.NamesrvStartup` 中，配置环境变量 `ROCKETMQ_HOME`，如下图。

{{&lt; image src=&#34;./启动 namesrv.png&#34; caption=&#34;启动 namesrv&#34; &gt;}}

## 启动 broker

在 `org.apache.rocketmq.broker.BrokerController` 中，配置环境变量 `ROCKETMQ_HOME` 和**启动参数**，如下图。

```
# -n 指定 namesrv 的地址
# -c 指定 broker 配置文件
-n localhost:9876 -c C:\Users\ooooo\Development\Code\Demo\rocketmq\rocketmq-home\conf\broker.conf
```

{{&lt; image src=&#34;./启动 broker.png&#34; caption=&#34;启动 broker&#34; &gt;}}


## 测试类

在 `rocketmq` 中有很多的**测试类**，在看源码的时候，需要**调试**测试类，比如 `org.apache.rocketmq.test.client.consumer.topic.OneConsumerMulTopicIT#testSynSendMessage`

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/01-%E6%90%AD%E5%BB%BA-rocketmq-%E6%BA%90%E7%A0%81%E8%B0%83%E8%AF%95%E7%8E%AF%E5%A2%83/  

