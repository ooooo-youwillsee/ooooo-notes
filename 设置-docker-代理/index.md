# 设置 Docker 代理


## 1. 配置 docker 代理

```shell
# 创建配置目录
mkdir -p /etc/systemd/system/docker.service.d

# 创建配置文件
vim /etc/systemd/system/docker.service.d/http-proxy.conf

# 配置文件内容
[Service]
Environment=&#34;HTTP_PROXY=http://ooooo:10800&#34;
Environment=&#34;HTTPS_PROXY=http://ooooo:10800&#34;

# 重启 docker
systemctl daemon-reload &amp;&amp; systemctl restart docker

# 查看配置是否生效
systemctl show --property=Environment docker

```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E8%AE%BE%E7%BD%AE-docker-%E4%BB%A3%E7%90%86/  

