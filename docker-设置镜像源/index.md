# Docker 设置镜像源


```shell
vim /etc/docker/daemon.json

# 添加以下配置
{
  &#34;registry-mirrors&#34;: [
    &#34;https://hub-mirror.c.163.com&#34;,
    &#34;https://mirror.baidubce.com&#34;
  ]
}

# 重启docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```




---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/docker-%E8%AE%BE%E7%BD%AE%E9%95%9C%E5%83%8F%E6%BA%90/  

