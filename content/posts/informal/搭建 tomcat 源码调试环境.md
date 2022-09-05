---
title: 搭建 tomcat 源码调试环境
date: 2022-08-10T18:32:22+08:00
draft: false
tags: [tomcat, source code]
categories: [随笔]
---

# Tomcat 源码调试环境搭建

## 1. 下载代码

```shell
git clone  git@github.com:apache/tomcat.git
```

## 2. 安装ant

1. 我本地安装的是 `1.10.12` 版本, [ant 下载地址](https://ant.apache.org/bindownload.cgi)
2. 配置环境变量 `ANT_HOME`, 加入到 `PATH` 环境变量中
3. 执行命令验证 `ant -version`

## 3. 导入到 idea 中

```shell
# 进入 tomcat 根目前
cd tomcat 

# 复制配置文件 build.properties
cp build.properties.default build.properties

# 更改 build.properties 中的配置
base.path=第三方jar的下载目录

# 设置 idea
ant ide-intellij

# 执行编译命令, 会生成 output 目录
ant deploy
```

然后用 idea 打开项目，idea 会弹出让你配置**下面的变量**

```shell
ANT_HOME          = ${ant.home}
TOMCAT_BUILD_LIBS = ${base.path}
```

## 4. idea 中 配置

* 检查你的**项目依赖**有没有问题


![项目依赖配置](https://ooooo-notes.ooooo-youwillsee.com/static/images/tomcat-source-code-env-dependencies.png "项目依赖配置")

上面的**三个依赖**，其实就是 **ServletContainerInitializer** 的实现, 比如 `res/META-INF/jasper.jar/services/jakarta.servlet.ServletContainerInitializer`.

* 更改配置文件 conf/server.xml

```shell
# 改为编译输出目录
appBase="output/build/webapps"
```

* 运行程序 

`org.apache.catalina.startup.Bootstrap#main`