---
title: k8s 的小问题
date: 2023-03-21T08:00:00+08:00
draft: false
tags: [ k8s, cloud native ]
categories: [ 随笔 ]
---

## 1. 文件夹权限

* Volume 为 `hostPath`, 要注意文件夹权限， `chmod 777 /data`