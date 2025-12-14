---
title: openvpn 网络配置
date: 2025-12-14T08:00:00+08:00
draft: false
tags: [ openvpn ]
collections: [ 随笔 ]
---

## 问题描述

连接openvpn之后，无法访问外网。

## 解决方法

在`.ovpn`配置文件中添加以下内容

```shell
# 禁用默认路由
route-nopull
# route [需要走VPN的IP段] [子网掩码] vpn_gateway
route 10.0.0.0 255.255.0.0 vpn_gateway
```

## 参考

[openvpn](https://juejin.cn/post/7444895626218684466)