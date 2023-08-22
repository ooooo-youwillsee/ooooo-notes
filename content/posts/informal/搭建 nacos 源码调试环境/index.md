---
title: 搭建 nacos 源码调试环境
date: 2023-08-22T08:00:00+08:00
draft: false
tags: [ nacos, source code, 源码分析 nacos ]
categories: [ 随笔 ]
---

## 下载源码和编译

```shell
git clone git@github.com:alibaba/nacos.git

mvn clean install -U -DskipTests
```

## 配置环境

参考 `startup.sh` 文件，添加相应的 `jvm` 和 `program` 的参数。

1. 添加 `jvm` 参数，`-Dnacos.standalone=true`, 单机启动
2. 添加 `jvm` 参数，`-Dnacos.home=/Users/ooooo/Code/Demo/nacos/distribution`, 集群启动
3. 添加 `program` 参数，`--spring.config.additional-location=/Users/ooooo/Code/Demo/nacos/distribution/conf/application.properties`
4. 配置 `cluster.conf`，添加自己机器的 ip
5. 配置 `application.properties`, 添加数据库相关配置，脚本位置在 `/Users/ooooo/Code/Demo/nacos/distribution/conf/mysql-schema.sql`

相关截图如下：

{{< image src="./run.png" caption="run" >}}

{{< image src="./cluster-config.png" caption="cluster-config" >}}

{{< image src="./application-properties.png" caption="application-properties" >}}

## 启动

{{< image src="./log.png" caption="log" >}}