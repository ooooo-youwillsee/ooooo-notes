---
title: 禁用win快捷键
date: 2025-11-18T08:00:00+08:00
draft: false
tags: [ windows ]
collections: [ 随笔 ]
---

## 操作

1. 按下 `Win+ R` 快捷键，运行 `regedit` 打开注册表。
2. 找到路径 `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Policies`。
3. 新建子项 `System`, 创建**DWORD(32位元)的**`DisableLockWorkstation`，值为1。

## 参考
[禁用win + L](https://www.koc.com.tw/archives/133813)