# k8s 拉取镜像慢


## 1. 检查 kubelet 的 cri

在 k8s 中，由 **kubelet** 来拉取节点，而 **kubelet** 又借用了 **cri** 来操作**容器**和**镜像**.

```shell
# 查看 kubelet 的启动参数, 其中的 --container-runtime-endpoint 就是 cri
ps aux | grep kubelet

# 我这里使用的是 containerd
```

## 2. 设置 containerd 代理

```shell
# 检查 containerd 服务的 unit 文件, 其中 Loaded 属性就是文件位置
systemctl status containerd

# 编辑 containerd.service 文件，我这里的文件位置是 /lib/systemd/system/containerd.service
vim /lib/systemd/system/containerd.service

# 在 [service] 下添加环境变量
[Service]
Environment=HTTP_PROXY=http://ooooo:10800
Environment=HTTPS_PROXY=http://ooooo:10800

# 重启 containerd
sudo systemctl daemon-reload
sudo systemctl restart containerd
```

## 3. 参考

> [cri proxy](https://github.com/containerd/cri/issues/834)
> [systemd environment](https://www.flatcar.org/docs/latest/setup/systemd/environment-variables/)


