---
title: 使用 ubuntu 来安装 kubernetes 1.24 版本
date: 2022-04-01T08:00:00+08:00
draft: false
tags: [k8s, cloud native]
collections: [随笔]
---

## 1. 机器初始化设置

### hostname 设置
```shell
hostnamectl ## 查看当前的hostname
hostnamectl set-hostname node1 ## 设置主机名为node1
```

### /etc/hosts 文件 和 DNS 配置 

```shell
# k8s master
192.168.130.131 node1 

# 更改dns配置
vim /etc/systemd/resolved.conf 
# 更改下面内容
[Resolve]
DNS=8.8.8.8 8.8.4.4
# 重启dns
systemctl restart systemd-resolved.service
```

refer:
1. [ubuntu dns resolver](https://askubuntu.com/questions/1012641/dns-set-to-systemds-127-0-0-53-how-to-change-permanently)

### 创建非 root 用户(可选)
```shell
# 添加用户
useradd ooooo -g ooooo 
# 修改用户密码
passwd ooooo
```

### 安装 containerd 和 runc 

安装 containerd
```shell
wget https://github.com/containerd/containerd/releases/download/v1.6.6/containerd-1.6.6-linux-amd64.tar.gz
tar Cxzvf /usr/local containerd-1.6.6-linux-amd64.tar.gz
mkdir -p /usr/local/lib/systemd/system/
```

通过 systemd 来启动 containerd

将下面的内容写入 `/usr/local/lib/systemd/system/containerd.service`

```shell
# Copyright The containerd Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/local/bin/containerd

Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=infinity
# Comment TasksMax if your systemd version does not supports it.
# Only systemd 226 and above support this version.
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
```

启动 containerd

```shell
systemctl daemon-reload
systemctl enable --now containerd
```

配置 containerd

```shell
mkdir -p /etc/containerd
# 生成默认配置文件
containerd config default | tee /etc/containerd/config.toml

# 修改 /etc/containerd/config.toml 配置
# image 使用阿里云的地址， SystemdCgroup 更改为 true

sandbox_image = "registry.aliyuncs.com/google_containers/pause:3.6"
...
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
            ...
            SystemdCgroup = true
# 修改完成后
systemctl restart containerd
```

安装 runc

```shell
wget https://github.com/opencontainers/runc/releases/download/v1.1.3/runc.amd64
install -m 755 runc.amd64 /usr/local/sbin/runc
```

安装 cni 插件

```shell
wget https://github.com/containernetworking/plugins/releases/download/v1.1.1/cni-plugins-linux-amd64-v1.1.1.tgz
mkdir -p /opt/cni/bin
tar Cxzvf /opt/cni/bin cni-plugins-linux-amd64-v1.1.1.tgz
```

## 2. k8s 安装

> [官方 k8s 安装文档](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/)

```shell
# 参考文档检查服务器的状态是否可以安装 k8s 服务

# 临时关闭 swap 分区
swapoff -a
# 查看 swap 分区是否关闭，显示 0 表示已关闭 
free -h 
# 永久关闭 swap 分区 
编辑 /etc/fstab 文件, 注释最后一行

# 检查 br_netfilter 是否被加载，没有任何输出，表示没有加载
lsmod | grep br_netfilter 
# 加载 br_netfilter 模块
sudo modprobe br_netfilter 

## 配置网络
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
br_netfilter
EOF

cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf 
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables  = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system

# 安装软件
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl
sudo curl -fsSLo /usr/share/keyrings/kubernetes-archive-keyring.gpg https://mirrors.aliyun.com/kubernetes/apt/doc/apt-key.gpg
echo "deb [signed-by=/usr/share/keyrings/kubernetes-archive-keyring.gpg] https://mirrors.aliyun.com/kubernetes/apt/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
# 默认安装最新版本
sudo apt-get install -y kubelet kubeadm kubectl
# 不自动更新
sudo apt-mark hold kubelet kubeadm kubectl 

# 查看镜像列表， 报错需要添加配置, crictl 是官方提供的
crictl images
# vim /etc/crictl.yaml 添加以下内容
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
debug: false

# 设置 kubelet 开机启动，并且现在启动
# 启动之后可能会报错，如果原因是 没有读取到 kubelet 的配置文件，这里可以不用管，稍后会重启这个服务
sudo systemctl enable --now kubelet
# 查看 kubelet 的状态
sudo systemctl status kubelet 
# 查看 kubelet 的日志
journalctl -xeu kubelet
```

## 3. 创建 k8s 集群

> [创建 k8s 集群官方文档](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
>
> [k8s pod network 插件文档](https://kubernetes.io/docs/concepts/cluster-administration/networking/##how-to-implement-the-kubernetes-networking-model)

```shell
# 执行 kubeadm init 命令， 在 k8s master 机器上执行，默认情况下， k8s 创建 pod 不会在 master 机器上
# 重点注意: --pod-network-cidr=10.244.0.0/16 这个参数必须要有，没有的话安装 cni 会报错
# 注意 preflight 的前置检查输出，如果有问题，百度自行解决
# 替换为你自己的 ip 和 hostname
sudo kubeadm init --image-repository registry.aliyuncs.com/google_containers --apiserver-advertise-address=192.168.130.128 --pod-network-cidr=10.244.0.0/16 --control-plane-endpoint=node1

# 执行命令之后，会有 kubeadm join 输出行
# （分为 master-token 和 worker-token）， 类似于下面的命令，可以在另一个节点上执行 worker-join-token 的命令
sudo kubeadm join 192.168.130.128:6443 --token 8auvt0.zfw0ayr45d80q8pb \
	--discovery-token-ca-cert-hash sha256:efe854739efef5fbaf3f6e28c899481c8d7797c1997fc8315b921a9ede400ca8

# 去掉污点，让单个节点也可以运行, (我这里只有一个节点)
kubectl taint nodes --all node-role.kubernetes.io/control-plane- node-role.kubernetes.io/master-
	
## 在机器上执行 kubeadm join 或者 kubeadm init 命令之后，重启 kubelet 服务	
sudo systemctl restart kubelet
sudo systemctl status kubelet

# 设置 kubectl 的配置文件， 为 $HOME/.kube/config
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# 安装 pod network 插件, 这里使用 calico 插件
curl -o calico-operator.yaml https://projectcalico.docs.tigera.io/manifests/tigera-operator.yaml
curl -o calico-custom-resources.yaml https://projectcalico.docs.tigera.io/manifests/custom-resources.yaml

# 重点
# 更改 calico-custom-resources.yaml 的 cidr 配置, 值为 --pod-network-cidr （在 kubeadm init 指定了）
# 多个网卡，也可以更改，否则可能会报错，搜索 interface 

kubectl create -f calico-operator.yaml
kubectl create -f calico-custom-resources.yaml

# 查看 calico 是否已经启动完成, cni 也启动成功
kubectl get pods -A
# 成功之后会有下面的服务， 都是 running 状态
calico-apiserver   calico-apiserver-78c5f69667-gbxbv          1/1     Running   0          88s
calico-apiserver   calico-apiserver-78c5f69667-h64wk          1/1     Running   0          88s
calico-system      calico-kube-controllers-68884f975d-q4l8s   1/1     Running   0          40m
calico-system      calico-node-4d7hs                          1/1     Running   0          40m
calico-system      calico-typha-854c6b9b4b-s8ls7              1/1     Running   0          40m
kube-system        coredns-74586cf9b6-4pkxf                   1/1     Running   0          76m
kube-system        coredns-74586cf9b6-9hxwl                   1/1     Running   0          76m
kube-system        etcd-node1                                 1/1     Running   0          76m
kube-system        kube-apiserver-node1                       1/1     Running   0          76m
kube-system        kube-controller-manager-node1              1/1     Running   0          76m
kube-system        kube-proxy-mn6fr                           1/1     Running   0          76m
kube-system        kube-scheduler-node1                       1/1     Running   0          76m
tigera-operator    tigera-operator-5fb55776df-gjs7s           1/1     Running   0          64m

```