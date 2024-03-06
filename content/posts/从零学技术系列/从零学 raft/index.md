---
title: 从零学 raft
date: 2023-12-05T08:00:00+08:00
draft: false
tags: [ raft, 从零学技术系列 ]
collections: [ 从零学技术系列 ]
---

## 为什么学

现在很多分布式系统都会使用到**分布式一致性协议**，比如 `nacos`、`zookeeper`、`consul`、`etcd`、`tikv` 等等，而 `raft` 可以说是最简单的**分布式一致性协议**。


## 怎么学

1. [raft 协议动画演示](http://www.kailing.pub/raft/index.html)
2. [raft 协议论文](https://github.com/maemual/raft-zh_cn)
3. 找一个 `raft` 协议的**源码实现**，比如 [consul-raft](https://github.com/hashicorp/raft)
4. [动手实现 raft 协议 ~ MIT课程](https://pdos.csail.mit.edu/6.824/index.html)