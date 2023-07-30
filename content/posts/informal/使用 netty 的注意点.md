---
title: 使用 netty 的注意点
date: 2023-07-30T08:00:00+08:00
draft: false
tags: [netty]
categories: [随笔]
---

## 1. `HttpHelloWorldServerHandler` 为啥需要使用 `SimpleChannelInboundHandler` ?

`HttpObject` 的子类有 `LastHttpContent`, `HttpContent`, `HttpData`， 它需要手动调用 `release()`。

![netty HttpObject类图](/images/use-netty-01.png)



