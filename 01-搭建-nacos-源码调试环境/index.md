# 01 搭建 Nacos 源码调试环境


&gt; nacos 基于 2.2.4 版本

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

{{&lt; image src=&#34;./run.png&#34; caption=&#34;run&#34; &gt;}}

{{&lt; image src=&#34;./cluster-config.png&#34; caption=&#34;cluster-config&#34; &gt;}}

{{&lt; image src=&#34;./application-properties.png&#34; caption=&#34;application-properties&#34; &gt;}}

## 启动

{{&lt; image src=&#34;./log.png&#34; caption=&#34;log&#34; &gt;}}

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/01-%E6%90%AD%E5%BB%BA-nacos-%E6%BA%90%E7%A0%81%E8%B0%83%E8%AF%95%E7%8E%AF%E5%A2%83/  

