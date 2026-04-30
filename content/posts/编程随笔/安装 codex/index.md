---
title: 安装 codex
date: 2026-04-30T08:00:00+08:00
draft: false
tags: [ ai, codex ]
collections: [ 随笔 ]
---

1. [下载 codex](https://chatgpt.com/codex/cloud)
2. 安装 codex
3. 设置 codex 代理，**解决 codex 反应慢的问题**

创建文件 `~/.codex/.env`

```shell
https_proxy="http://127.0.0.1:7890" 
http_proxy="http://127.0.0.1:7890"
```

[参考链接](https://github.com/openai/codex/issues/6060#issuecomment-4186045653)