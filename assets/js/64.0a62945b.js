(window.webpackJsonp=window.webpackJsonp||[]).push([[64],{476:function(s,t,n){"use strict";n.r(t);var e=n(25),a=Object(e.a)({},(function(){var s=this,t=s.$createElement,n=s._self._c||t;return n("ContentSlotsDistributor",{attrs:{"slot-key":s.$parent.slotKey}},[n("h2",{attrs:{id:"_1-机器初始化设置"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#_1-机器初始化设置"}},[s._v("#")]),s._v(" 1. 机器初始化设置")]),s._v(" "),n("p",[s._v("使用 ubuntu 来安装kubernetes 1.24 版本")]),s._v(" "),n("h3",{attrs:{id:"_1-1-hostname-设置"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#_1-1-hostname-设置"}},[s._v("#")]),s._v(" 1.1 hostname 设置")]),s._v(" "),n("div",{staticClass:"language-shell extra-class"},[n("pre",{pre:!0,attrs:{class:"language-shell"}},[n("code",[s._v("hostnamectl "),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看当前的hostname")]),s._v("\nhostnamectl set-hostname node1 "),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 设置主机名为node1")]),s._v("\n")])])]),n("h3",{attrs:{id:"_1-2-etc-hosts-文件"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#_1-2-etc-hosts-文件"}},[s._v("#")]),s._v(" 1.2 /etc/hosts 文件")]),s._v(" "),n("div",{staticClass:"language-shell extra-class"},[n("pre",{pre:!0,attrs:{class:"language-shell"}},[n("code",[n("span",{pre:!0,attrs:{class:"token number"}},[s._v("192.168")]),s._v(".130.131 node1 "),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## k8s master")]),s._v("\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# 更改dns配置, 以下两个文件都需要，实际上是link文件")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("vim")]),s._v(" /etc/resolv.conf\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("vim")]),s._v(" /run/systemd/resolve/stub-resolv.conf\nnameserver "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("114.114")]),s._v(".114.114\n")])])]),n("h3",{attrs:{id:"_1-3-创建非-root-用户-可选"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#_1-3-创建非-root-用户-可选"}},[s._v("#")]),s._v(" 1.3 创建非 root 用户(可选)")]),s._v(" "),n("div",{staticClass:"language-shell extra-class"},[n("pre",{pre:!0,attrs:{class:"language-shell"}},[n("code",[n("span",{pre:!0,attrs:{class:"token function"}},[s._v("useradd")]),s._v(" ooooo -g ooooo  "),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 添加用户")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("passwd")]),s._v(" ooooo "),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 修改用户密码")]),s._v("\n")])])]),n("h3",{attrs:{id:"_1-4-安装-containerd-和-runc"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#_1-4-安装-containerd-和-runc"}},[s._v("#")]),s._v(" 1.4 安装 containerd 和 runc")]),s._v(" "),n("p",[s._v("安装 containerd")]),s._v(" "),n("div",{staticClass:"language-shell extra-class"},[n("pre",{pre:!0,attrs:{class:"language-shell"}},[n("code",[n("span",{pre:!0,attrs:{class:"token function"}},[s._v("wget")]),s._v(" https://github.com/containerd/containerd/releases/download/v1.6.6/containerd-1.6.6-linux-amd64.tar.gz\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("tar")]),s._v(" Cxzvf /usr/local containerd-1.6.6-linux-amd64.tar.gz\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("mkdir")]),s._v(" -p /usr/local/lib/systemd/system/\n")])])]),n("p",[s._v("通过 systemd 来启动 containerd")]),s._v(" "),n("p",[s._v("将下面的内容写入 "),n("code",[s._v("/usr/local/lib/systemd/system/containerd.service")])]),s._v(" "),n("div",{staticClass:"language-shell extra-class"},[n("pre",{pre:!0,attrs:{class:"language-shell"}},[n("code",[n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# Copyright The containerd Authors.")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("#")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v('# Licensed under the Apache License, Version 2.0 (the "License");')]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# you may not use this file except in compliance with the License.")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# You may obtain a copy of the License at")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("#")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("#     http://www.apache.org/licenses/LICENSE-2.0")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("#")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# Unless required by applicable law or agreed to in writing, software")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v('# distributed under the License is distributed on an "AS IS" BASIS,')]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# See the License for the specific language governing permissions and")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# limitations under the License.")]),s._v("\n\n"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("[")]),s._v("Unit"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("]")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("Description")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("containerd container runtime\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("Documentation")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("https://containerd.io\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("After")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("network.target local-fs.target\n\n"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("[")]),s._v("Service"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("]")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("ExecStartPre")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("-/sbin/modprobe overlay\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("ExecStart")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("/usr/local/bin/containerd\n\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("Type")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("notify\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("Delegate")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("yes\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("KillMode")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("process\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("Restart")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("always\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("RestartSec")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("5")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# Having non-zero Limit*s causes performance problems due to accounting overhead")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# in the kernel. We recommend using cgroups to do container-local accounting.")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("LimitNPROC")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("infinity\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("LimitCORE")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("infinity\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("LimitNOFILE")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("infinity\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# Comment TasksMax if your systemd version does not supports it.")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# Only systemd 226 and above support this version.")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("TasksMax")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("infinity\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("OOMScoreAdjust")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("-999\n\n"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("[")]),s._v("Install"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("]")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("WantedBy")]),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("multi-user.target\n")])])]),n("p",[s._v("启动 containerd")]),s._v(" "),n("div",{staticClass:"language-shell extra-class"},[n("pre",{pre:!0,attrs:{class:"language-shell"}},[n("code",[s._v("systemctl daemon-reload\nsystemctl "),n("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("enable")]),s._v(" --now containerd\n")])])]),n("p",[s._v("配置 containerd")]),s._v(" "),n("div",{staticClass:"language-shell extra-class"},[n("pre",{pre:!0,attrs:{class:"language-shell"}},[n("code",[n("span",{pre:!0,attrs:{class:"token function"}},[s._v("mkdir")]),s._v(" -p /etc/containerd\ncontainerd config default "),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("|")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("tee")]),s._v(" /etc/containerd/config.toml\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# 修改 /etc/containerd/config.toml 配置")]),s._v("\n\nsandbox_image "),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token string"}},[s._v('"registry.aliyuncs.com/google_containers/pause:3.6"')]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("..")]),s._v(".\n"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("[")]),s._v("plugins."),n("span",{pre:!0,attrs:{class:"token string"}},[s._v('"io.containerd.grpc.v1.cri"')]),s._v(".containerd.runtimes.runc.options"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("]")]),s._v("\n            "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("..")]),s._v(".\n            SystemdCgroup "),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token boolean"}},[s._v("true")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# 修改完成后")]),s._v("\nsystemctl restart containerd\n")])])]),n("p",[s._v("安装 runc")]),s._v(" "),n("div",{staticClass:"language-shell extra-class"},[n("pre",{pre:!0,attrs:{class:"language-shell"}},[n("code",[n("span",{pre:!0,attrs:{class:"token function"}},[s._v("wget")]),s._v(" https://github.com/opencontainers/runc/releases/download/v1.1.3/runc.amd64\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("install")]),s._v(" -m "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("755")]),s._v(" runc.amd64 /usr/local/sbin/runc\n")])])]),n("p",[s._v("安装 cni 插件")]),s._v(" "),n("div",{staticClass:"language-shell extra-class"},[n("pre",{pre:!0,attrs:{class:"language-shell"}},[n("code",[n("span",{pre:!0,attrs:{class:"token function"}},[s._v("wget")]),s._v(" https://github.com/containernetworking/plugins/releases/download/v1.1.1/cni-plugins-linux-amd64-v1.1.1.tgz\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("mkdir")]),s._v(" -p /opt/cni/bin\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("tar")]),s._v(" Cxzvf /opt/cni/bin cni-plugins-linux-amd64-v1.1.1.tgz\n")])])]),n("h2",{attrs:{id:"_2-k8s-的-kubeadm-安装"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#_2-k8s-的-kubeadm-安装"}},[s._v("#")]),s._v(" 2. k8s 的 kubeadm 安装")]),s._v(" "),n("blockquote",[n("p",[n("a",{attrs:{href:"https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/",target:"_blank",rel:"noopener noreferrer"}},[s._v("官方 k8s 安装文档"),n("OutboundLink")],1)])]),s._v(" "),n("div",{staticClass:"language-shell extra-class"},[n("pre",{pre:!0,attrs:{class:"language-shell"}},[n("code",[s._v("参考文档检查服务器的状态是否可以安装 k8s 服务\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 关闭 swap 分区")]),s._v("\nswapoff -a\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("free")]),s._v(" -h "),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看 swap 分区是否关闭，显示 0 表示已关闭 ")]),s._v("\n编辑 /etc/fstab 文件, 注释最后一行\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 检查 br_netfilter 是否被加载，没有任何输出，表示没有加载")]),s._v("\nlsmod "),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("|")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("grep")]),s._v(" br_netfilter \n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" modprobe br_netfilter "),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 加载 br_netfilter 模块")]),s._v("\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 配置网络")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("cat")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("<<")]),n("span",{pre:!0,attrs:{class:"token string"}},[s._v("EOF"),n("span",{pre:!0,attrs:{class:"token bash punctuation"}},[s._v(" "),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("|")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("tee")]),s._v(" /etc/modules-load.d/k8s.conf")]),s._v("\nbr_netfilter\nEOF")]),s._v("\n\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("cat")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("<<")]),n("span",{pre:!0,attrs:{class:"token string"}},[s._v("EOF"),n("span",{pre:!0,attrs:{class:"token bash punctuation"}},[s._v(" "),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("|")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("tee")]),s._v(" /etc/sysctl.d/k8s.conf ")]),s._v("\nnet.bridge.bridge-nf-call-ip6tables = 1\nnet.bridge.bridge-nf-call-iptables = 1\nnet.ipv4.ip_forward                 = 1\nEOF")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" sysctl --system\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# 安装工具")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("apt-get")]),s._v(" update\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("apt-get")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("install")]),s._v(" -y apt-transport-https ca-certificates "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("curl")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("curl")]),s._v(" -fsSLo /usr/share/keyrings/kubernetes-archive-keyring.gpg https://mirrors.aliyun.com/kubernetes/apt/doc/apt-key.gpg\n"),n("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("echo")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token string"}},[s._v('"deb [signed-by=/usr/share/keyrings/kubernetes-archive-keyring.gpg] https://mirrors.aliyun.com/kubernetes/apt/ kubernetes-xenial main"')]),s._v(" "),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("|")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("tee")]),s._v(" /etc/apt/sources.list.d/kubernetes.list\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("apt-get")]),s._v(" update\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("apt-get")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("install")]),s._v(" -y kubelet kubeadm kubectl\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" apt-mark hold kubelet kubeadm kubectl "),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# 不自动更新")]),s._v("\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# 查看镜像列表， 报错需要添加配置")]),s._v("\ncrictl images\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# vim /etc/crictl.yaml 添加以下内容")]),s._v("\nruntime-endpoint: unix:///run/containerd/containerd.sock\nimage-endpoint: unix:///run/containerd/containerd.sock\ntimeout: "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("10")]),s._v("\ndebug: "),n("span",{pre:!0,attrs:{class:"token boolean"}},[s._v("false")]),s._v("\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 设置 kubelet 开机启动，并且现在启动")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 启动之后可能会报错，如果原因是 没有读取到 kubelet 的配置文件，这里可以不用管，稍后会重启这个服务")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" systemctl "),n("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("enable")]),s._v(" --now kubelet\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" systemctl status kubelet "),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看 kubelet 的状态")]),s._v("\njournalctl -xeu kubelet "),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看 kubelet 的日志")]),s._v("\n\n")])])]),n("h2",{attrs:{id:"_3-创建-k8s-集群-两台都需要"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#_3-创建-k8s-集群-两台都需要"}},[s._v("#")]),s._v(" 3. 创建 k8s 集群 (两台都需要)")]),s._v(" "),n("blockquote",[n("p",[n("a",{attrs:{href:"https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/",target:"_blank",rel:"noopener noreferrer"}},[s._v("创建 k8s 集群官方文档"),n("OutboundLink")],1)]),s._v(" "),n("p",[n("a",{attrs:{href:"https://kubernetes.io/docs/concepts/cluster-administration/networking/##how-to-implement-the-kubernetes-networking-model",target:"_blank",rel:"noopener noreferrer"}},[s._v("k8s pod network 插件文档"),n("OutboundLink")],1)])]),s._v(" "),n("div",{staticClass:"language-shell extra-class"},[n("pre",{pre:!0,attrs:{class:"language-shell"}},[n("code",[n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 执行 kubeadm init 命令， 在 k8s master 机器上执行，默认情况下， k8s 创建 pod 不会在 master 机器上")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 重点注意: --pod-network-cidr=10.244.0.0/16 这个参数必须要有，没有的话安装 cni 会报错")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 注意 preflight 的前置检查输出，可能需要添加 docker group，这个会输出有提示的命令")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" kubeadm init --image-repository registry.aliyuncs.com/google_containers --apiserver-advertise-address"),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("192.168")]),s._v(".130.128 --pod-network-cidr"),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("10.244")]),s._v(".0.0/16 --control-plane-endpoint"),n("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("node1\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 执行命令之后，会有 kubeadm join 输出行")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## （分为 master-token 和 worker-token）， 类似于下面的命令，在 centos2 上执行 worker-join-token 的命令")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" kubeadm "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("join")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("192.168")]),s._v(".130.131:6443 --token 8auvt0.zfw0ayr45d80q8pb "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("\\")]),s._v("\n\t--discovery-token-ca-cert-hash sha256:efe854739efef5fbaf3f6e28c899481c8d7797c1997fc8315b921a9ede400ca8\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# 去掉污点，让单个节点也可以运行")]),s._v("\nkubectl taint nodes --all node-role.kubernetes.io/control-plane- node-role.kubernetes.io/master-\n\t\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 在机器上执行 kubeadm join 或者 kubeadm init 命令之后，重启 kubelet 服务\t")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" systemctl restart kubelet\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" systemctl status kubelet\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 设置 kubectl 的配置文件， 为 $HOME/.kube/config")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("mkdir")]),s._v(" -p "),n("span",{pre:!0,attrs:{class:"token environment constant"}},[s._v("$HOME")]),s._v("/.kube\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("cp")]),s._v(" -i /etc/kubernetes/admin.conf "),n("span",{pre:!0,attrs:{class:"token environment constant"}},[s._v("$HOME")]),s._v("/.kube/config\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("chown")]),s._v(" "),n("span",{pre:!0,attrs:{class:"token variable"}},[n("span",{pre:!0,attrs:{class:"token variable"}},[s._v("$(")]),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("id")]),s._v(" -u"),n("span",{pre:!0,attrs:{class:"token variable"}},[s._v(")")])]),n("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v(":")]),n("span",{pre:!0,attrs:{class:"token variable"}},[n("span",{pre:!0,attrs:{class:"token variable"}},[s._v("$(")]),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("id")]),s._v(" -g"),n("span",{pre:!0,attrs:{class:"token variable"}},[s._v(")")])]),s._v(" "),n("span",{pre:!0,attrs:{class:"token environment constant"}},[s._v("$HOME")]),s._v("/.kube/config\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 安装 pod network 插件, 这里使用 calico 插件")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("curl")]),s._v(" -o calico-operator.yaml https://projectcalico.docs.tigera.io/manifests/tigera-operator.yaml\n"),n("span",{pre:!0,attrs:{class:"token function"}},[s._v("curl")]),s._v(" -o calico-custom-resources.yaml https://projectcalico.docs.tigera.io/manifests/custom-resources.yaml\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# 重点")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# 更改 calico-custom-resources.yaml 的 cidr 配置, 值为 --pod-network-cidr")]),s._v("\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("# 多个网卡，也可以更改，否则可能会报错，搜索 interface ")]),s._v("\n\nkubectl create -f calico-operator.yaml\nkubectl create -f calico-custom-resources.yaml\n\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看 flannel 是否已经启动完成, cni 也启动成功")]),s._v("\nkubectl get pods -A\n"),n("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 成功之后会有下面的服务， 都是 running 状态")]),s._v("\ncalico-apiserver   calico-apiserver-78c5f69667-gbxbv          "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          88s\ncalico-apiserver   calico-apiserver-78c5f69667-h64wk          "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          88s\ncalico-system      calico-kube-controllers-68884f975d-q4l8s   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          40m\ncalico-system      calico-node-4d7hs                          "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          40m\ncalico-system      calico-typha-854c6b9b4b-s8ls7              "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          40m\nkube-system        coredns-74586cf9b6-4pkxf                   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          76m\nkube-system        coredns-74586cf9b6-9hxwl                   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          76m\nkube-system        etcd-node1                                 "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          76m\nkube-system        kube-apiserver-node1                       "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          76m\nkube-system        kube-controller-manager-node1              "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          76m\nkube-system        kube-proxy-mn6fr                           "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          76m\nkube-system        kube-scheduler-node1                       "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          76m\ntigera-operator    tigera-operator-5fb55776df-gjs7s           "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),n("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v("          64m\n\n")])])])])}),[],!1,null,null,null);t.default=a.exports}}]);