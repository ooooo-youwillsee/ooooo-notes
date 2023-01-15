# 设置 docker 代理


## 1. 配置 docker 代理

```shell
# 创建配置目录
mkdir -p /etc/systemd/system/docker.service.d

# 创建配置文件
vim /etc/systemd/system/docker.service.d/http-proxy.conf

# 配置文件内容
[Service]
Environment="HTTP_PROXY=http://ooooo:10800"
Environment="HTTPS_PROXY=http://ooooo:10800"

# 重启 docker
systemctl daemon-reload && systemctl restart docker

# 查看配置是否生效
systemctl show --property=Environment docker

```
