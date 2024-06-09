---
title: 06 ThreadLocal
date: 2024-05-19T08:00:00+08:00
draft: false
tags: [ jdk, source code, 源码分析 jdk 系列 ]
collections: [ 源码分析 jdk 系列 ]
---

> jdk 基于 8 版本

> 在平时的开发中，我们经常会用到 `ThreadLocal`，本质是一个 `Map<Thread, V>` 结构。

