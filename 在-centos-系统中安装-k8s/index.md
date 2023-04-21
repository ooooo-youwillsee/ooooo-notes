# 在 centos 上安装 k8s


## 1. 两台机器初始化设置

### 1.1 hostname 设置

```shell
hostnamectl ## 查看当前的hostname
hostnamectl set-hostname centos1 ## 设置主机名为centos1, 在 192.168.130.131 上执行
hostnamectl set-hostname centos2 ## 设置主机名为centos1, 在 192.168.130.132 上执行
```

### 1.2 /etc/hosts 文件 (两个机器都需要)
```shell
192.168.1.8 ooooo
192.168.130.131 centos1 ## k8s master
192.168.130.132 centos2 ## k8s worker
```

### 1.3 创建非 root 用户 (两个机器都需要)
```shell
useradd ooooo -g ooooo  ## 添加用户，两个机器都执行
passwd ooooo ## 修改用户密码，两个机器都执行
```

### 1.4 添加 yum 代理 (两个机器都需要)
```shell
sudo vim /etc/yum.conf ## 编辑 yum 配置文件
proxy=http://ooooo:10800 ## 在文件中添加一行
```

### 1.5 安装 docker 服务 (两个机器都需要)

> [官方 docker 安装文档](https://docs.docker.com/engine/install/centos/)

```shell
参考文档安装 docker

sudo vim /etc/docker/daemon.json ## 编辑 docker 配置文件， 添加下面 json 配置，这是因为 k8s 默认使用的 cgroup driver 是 systemd
{
  "exec-opts": ["native.cgroupdriver=systemd"] 
}

sudo systemctl enable --now docker.service ## 设置 docker 服务开机启动，并且现在启动

sudo systemctl status docker ## 查看 docker 服务的状态， 失败了，使用下一条命令查看日志

journalctl -xeu docker ## 查看 docker 日志服务
```

## 2. k8s 的 kubeadm 安装 (两台都需要)

> [官方 k8s 安装文档](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/)

```shell
参考文档检查服务器的状态是否可以安装 k8s 服务

## 关闭 swap 分区
swapoff -a
sudo echo vm.swappiness=0 >> /etc/sysctl.con ## 永久关闭 swap 分区， k8s 不能运行在有 swap 分区的机器上
free -h ## 查看 swap 分区是否关闭，显示 0 表示已关闭 

## 检查 br_netfilter 是否被加载，没有任何输出，表示没有加载
lsmod | grep br_netfilter 
sudo modprobe br_netfilter ## 加载 br_netfilter 模块

## 配置网络
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
br_netfilter
EOF

cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf 
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF
sudo sysctl --system

安装容器运行时(runtime),k8s 高版本采用自动检查方式,不用做任何处理

## 添加 k8s 镜像仓库，在前面中，设置了 yum 代理
## 在官方文档中多了 exclude=kubelet kubeadm kubectl ，这里去掉, 直接安装最新版本的
cat <<EOF | sudo tee /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=http://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-\$basearch
enabled=1
gpgcheck=1
gpgkey=http://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF

## 关闭 selinux
sudo setenforce 0 
sudo sed -i 's/^SELINUX=enforcing$/SELINUX=permissive/' /etc/selinux/config

## 安装 k8s 服务, --disableexcludes=kubernetes 表示排除 kubernetes 之外的镜像源
sudo yum install -y kubelet kubeadm kubectl --disableexcludes=kubernetes

## 设置 kubelet 开机启动，并且现在启动
## 启动之后可能会报错，如果原因是 没有读取到 kubelet 的配置文件，这里可以不用管，稍后会重启这个服务
sudo systemctl enable --now kubelet
sudo systemctl status kubelet ## 查看 kubelet 的状态
journalctl -xeu kubelet ## 查看 kubelet 的日志
```

## 3. 创建 k8s 集群 (两台都需要)

> [创建 k8s 集群官方文档](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
>
> [k8s pod network 插件文档](https://kubernetes.io/docs/concepts/cluster-administration/networking/##how-to-implement-the-kubernetes-networking-model)

```shell
## 执行 kubeadm init 命令， 在 k8s master 机器上执行，默认情况下， k8s 创建 pod 不会在 master 机器上
## 重点注意: --pod-network-cidr=10.244.0.0/16 这个参数必须要有，没有的话安装 cni 会报错
## 注意 preflight 的前置检查输出，可能需要添加 docker group，这个会输出有提示的命令
sudo kubeadm init --image-repository registry.aliyuncs.com/google_containers --apiserver-advertise-address=192.168.130.131 --pod-network-cidr=10.244.0.0/16
## 执行命令之后，会有 kubeadm join 输出行
## （分为 master-token 和 worker-token）， 类似于下面的命令，在 centos2 上执行 worker-join-token 的命令
sudo kubeadm join 192.168.130.131:6443 --token 8auvt0.zfw0ayr45d80q8pb \
	--discovery-token-ca-cert-hash sha256:efe854739efef5fbaf3f6e28c899481c8d7797c1997fc8315b921a9ede400ca8
	
## 在机器上执行 kubeadm join 或者 kubeadm init 命令之后，重启 kubelet 服务	
sudo systemctl restart kubelet
sudo systemctl status kubelet

## 设置 kubectl 的配置文件， 为 $HOME/.kube/config
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

## 安装 pod network 插件, 这里使用 flannel 插件
kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml

## 查看 flannel 是否已经启动完成, cni 也启动成功
kubectl get pods -A
## 成功之后会有下面的服务， 都是 running 状态
kube-system   coredns-7f6cbbb7b8-5hqt5          1/1     Running   15 (76m ago)   26h
kube-system   coredns-7f6cbbb7b8-lwdrv          1/1     Running   15 (76m ago)   26h
kube-system   etcd-centos1                      1/1     Running   18 (76m ago)   26h
kube-system   kube-apiserver-centos1            1/1     Running   25 (76m ago)   26h
kube-system   kube-controller-manager-centos1   1/1     Running   12 (76m ago)   26h
kube-system   kube-flannel-ds-6lx7s             1/1     Running   6 (76m ago)    21h
kube-system   kube-flannel-ds-n5tfn             1/1     Running   6 (76m ago)    21h
kube-system   kube-proxy-78jrm                  1/1     Running   8 (76m ago)    26h
kube-system   kube-proxy-wl5jg                  1/1     Running   8 (76m ago)    26h
kube-system   kube-scheduler-centos1            1/1     Running   16 (76m ago)   26h

```
