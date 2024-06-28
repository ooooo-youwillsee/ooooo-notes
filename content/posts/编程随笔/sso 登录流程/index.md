---
title: sso 登录流程
date: 2024-06-28T08:00:00+08:00
draft: false
tags: [ sso ]
collections: [ 随笔 ]
---

> 先介绍 `OAuth2` 的授权码，然后再介绍 `SSO` 的流程。这里的代码来自 [Sa-Token](https://github.com/dromara/Sa-Token)。

## OAuth2 授权码模式

> 授权码模式，涉及到两个接口，**获取 code**和**获取 accessToken**。

### 获取 code

接口 `/oauth2/authorize`，会校验 `client_id`, `redirect_uri`, `scope` 参数，然后生成一个**随机**的 `code`, 将 `code` 附加在 `redirect_uri` 上，最后返回 `302` 状态码。

### 获取 accessToken

接口 `/oauth2/token`，会校验 `code`, `client_id`, `client_secret`, `redirect_uri` 参数， 然后生成一个**随机**的 `accessToken`, 最后返回。

## SSO 流程

> 下面分为 sso-client 和 sso-server 两个系统。

1. 在 `sso-client` 检查没有登录，然后跳转` sso-server` 的 `login` 页面，携带 `redirect_uri=sso-client-uri`。
2. 在 `sso-server` 的 `login` 页面，输入**用户名**和**密码**，然后登录成功, 这时会有 `sso-server` 的 `cookie`, 里面有 `token`。
3. 请求 `sso-server` 的 `/oauth2/authorize?redirect_uri=sso-client-uri`, 最后返回 `code` 并跳转到 `redirect_uri` 页面。
4. 请求 `sso-client` 的 `/oauth2/token` (需要自己实现)，接受 `code` 参数， 在 `sso-client` 中请求 `sso-server` 的 `/oauth2/token` 接口，返回 `accessToken`。

{{< image src="./sso.png" caption="SSO 登录流程" >}}

## 示例代码

[//]: # (todo 示例代码)
