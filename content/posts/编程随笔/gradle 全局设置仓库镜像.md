---
title: gradle 全局设置仓库镜像
date: 2021-01-02T08:00:00+08:00
draft: false
tags: [resolution]
collections: [随笔]
---

在 `~\.gradle` 目录下新建文件 `init.gradle`, 内容如下

```
allprojects {
    repositories {
        mavenLocal()
			maven { name "Alibaba" ; url "https://maven.aliyun.com/repository/public" }
			maven { name "Bstek" ; url "http://nexus.bsdn.org/content/groups/public/" }
    }

	buildscript {
		repositories {
			maven { name "Alibaba" ; url 'https://maven.aliyun.com/repository/public' }
			maven { name "Bstek" ; url 'https://nexus.bsdn.org/content/groups/public/' }
			maven { name "M2" ; url 'https://plugins.gradle.org/m2/' }
		}
	}
}
```
