---
title: 01 搭建 rocketmq 源码调试环境
date: 2023-10-14T08:00:00+08:00
draft: false
tags: [ rocketmq, source code, 源码分析 rocketmq 系列 ]
categories: [ 源码分析 rocketmq 系列 ]
---

> rocketmq 基于 5.1.4 版本

## 启动 namesrv

在 `org.apache.rocketmq.namesrv.NamesrvStartup` 中，配置环境变量 `ROCKETMQ_HOME`，如下图。

{{< image src="./启动 namesrv.png" caption="启动 namesrv" >}}

## 启动 broker

在 `org.apache.rocketmq.broker.BrokerController` 中，配置环境变量 `ROCKETMQ_HOME` 和**启动参数**，如下图。

```
# -n 指定 namesrv 的地址
# -c 指定 broker 配置文件
-n localhost:9876 -c C:\Users\ooooo\Development\Code\Demo\rocketmq\rocketmq-home\conf\broker.conf
```

{{< image src="./启动 broker.png" caption="启动 broker" >}}


## 测试类

在 `rocketmq` 中有很多的**测试类**，在看源码的时候，需要**调试**测试类，比如 `org.apache.rocketmq.test.client.consumer.topic.OneConsumerMulTopicIT#testSynSendMessage`