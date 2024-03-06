---
title: docker 设置镜像源
date: 2023-03-18T08:00:00+08:00
draft: false
tags: [docker]
collections: [随笔]
---

```shell
vim /etc/docker/daemon.json

# 添加以下配置
{
  "registry-mirrors": [
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}

# 重启docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```


