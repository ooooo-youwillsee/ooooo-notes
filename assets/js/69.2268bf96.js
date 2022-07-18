(window.webpackJsonp=window.webpackJsonp||[]).push([[69],{548:function(s,t,n){"use strict";n.r(t);var e=n(33),a=Object(e.a)({},(function(){var s=this,t=s._self._c;return t("ContentSlotsDistributor",{attrs:{"slot-key":s.$parent.slotKey}},[t("h2",{attrs:{id:"_1-两台机器初始化设置"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#_1-两台机器初始化设置"}},[s._v("#")]),s._v(" 1. 两台机器初始化设置")]),s._v(" "),t("h3",{attrs:{id:"_1-1-hostname-设置"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#_1-1-hostname-设置"}},[s._v("#")]),s._v(" 1.1 hostname 设置")]),s._v(" "),t("div",{staticClass:"language-shell extra-class"},[t("pre",{pre:!0,attrs:{class:"language-shell"}},[t("code",[s._v("hostnamectl "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看当前的hostname")]),s._v("\nhostnamectl set-hostname centos1 "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 设置主机名为centos1, 在 192.168.130.131 上执行")]),s._v("\nhostnamectl set-hostname centos2 "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 设置主机名为centos1, 在 192.168.130.132 上执行")]),s._v("\n")])])]),t("h3",{attrs:{id:"_1-2-etc-hosts-文件-两个机器都需要"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#_1-2-etc-hosts-文件-两个机器都需要"}},[s._v("#")]),s._v(" 1.2 /etc/hosts 文件 (两个机器都需要)")]),s._v(" "),t("div",{staticClass:"language-shell extra-class"},[t("pre",{pre:!0,attrs:{class:"language-shell"}},[t("code",[t("span",{pre:!0,attrs:{class:"token number"}},[s._v("192.168")]),s._v(".1.8 ooooo\n"),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("192.168")]),s._v(".130.131 centos1 "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## k8s master")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("192.168")]),s._v(".130.132 centos2 "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## k8s worker")]),s._v("\n")])])]),t("h3",{attrs:{id:"_1-3-创建非-root-用户-两个机器都需要"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#_1-3-创建非-root-用户-两个机器都需要"}},[s._v("#")]),s._v(" 1.3 创建非 root 用户 (两个机器都需要)")]),s._v(" "),t("div",{staticClass:"language-shell extra-class"},[t("pre",{pre:!0,attrs:{class:"language-shell"}},[t("code",[t("span",{pre:!0,attrs:{class:"token function"}},[s._v("useradd")]),s._v(" ooooo -g ooooo  "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 添加用户，两个机器都执行")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("passwd")]),s._v(" ooooo "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 修改用户密码，两个机器都执行")]),s._v("\n")])])]),t("h3",{attrs:{id:"_1-4-添加-yum-代理-两个机器都需要"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#_1-4-添加-yum-代理-两个机器都需要"}},[s._v("#")]),s._v(" 1.4 添加 yum 代理 (两个机器都需要)")]),s._v(" "),t("div",{staticClass:"language-shell extra-class"},[t("pre",{pre:!0,attrs:{class:"language-shell"}},[t("code",[t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("vim")]),s._v(" /etc/yum.conf "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 编辑 yum 配置文件")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token assign-left variable"}},[s._v("proxy")]),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("http://ooooo:10800 "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 在文件中添加一行")]),s._v("\n")])])]),t("h3",{attrs:{id:"_1-5-安装-docker-服务-两个机器都需要"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#_1-5-安装-docker-服务-两个机器都需要"}},[s._v("#")]),s._v(" 1.5 安装 docker 服务 (两个机器都需要)")]),s._v(" "),t("blockquote",[t("p",[t("a",{attrs:{href:"https://docs.docker.com/engine/install/centos/",target:"_blank",rel:"noopener noreferrer"}},[s._v("官方 docker 安装文档"),t("OutboundLink")],1)])]),s._v(" "),t("div",{staticClass:"language-shell extra-class"},[t("pre",{pre:!0,attrs:{class:"language-shell"}},[t("code",[s._v("参考文档安装 "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("docker")]),s._v("\n\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("vim")]),s._v(" /etc/docker/daemon.json "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 编辑 docker 配置文件， 添加下面 json 配置，这是因为 k8s 默认使用的 cgroup driver 是 systemd")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("{")]),s._v("\n  "),t("span",{pre:!0,attrs:{class:"token string"}},[s._v('"exec-opts"')]),t("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v(":")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("[")]),t("span",{pre:!0,attrs:{class:"token string"}},[s._v('"native.cgroupdriver=systemd"')]),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("]")]),s._v(" \n"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("}")]),s._v("\n\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" systemctl "),t("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("enable")]),s._v(" --now docker.service "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 设置 docker 服务开机启动，并且现在启动")]),s._v("\n\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" systemctl status "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("docker")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看 docker 服务的状态， 失败了，使用下一条命令查看日志")]),s._v("\n\njournalctl -xeu "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("docker")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看 docker 日志服务")]),s._v("\n")])])]),t("h2",{attrs:{id:"_2-k8s-的-kubeadm-安装-两台都需要"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#_2-k8s-的-kubeadm-安装-两台都需要"}},[s._v("#")]),s._v(" 2. k8s 的 kubeadm 安装 (两台都需要)")]),s._v(" "),t("blockquote",[t("p",[t("a",{attrs:{href:"https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/",target:"_blank",rel:"noopener noreferrer"}},[s._v("官方 k8s 安装文档"),t("OutboundLink")],1)])]),s._v(" "),t("div",{staticClass:"language-shell extra-class"},[t("pre",{pre:!0,attrs:{class:"language-shell"}},[t("code",[s._v("参考文档检查服务器的状态是否可以安装 k8s 服务\n\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 关闭 swap 分区")]),s._v("\nswapoff -a\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("echo")]),s._v(" vm.swappiness"),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v(">>")]),s._v(" /etc/sysctl.con "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 永久关闭 swap 分区， k8s 不能运行在有 swap 分区的机器上")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("free")]),s._v(" -h "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看 swap 分区是否关闭，显示 0 表示已关闭 ")]),s._v("\n\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 检查 br_netfilter 是否被加载，没有任何输出，表示没有加载")]),s._v("\nlsmod "),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("|")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("grep")]),s._v(" br_netfilter \n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" modprobe br_netfilter "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 加载 br_netfilter 模块")]),s._v("\n\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 配置网络")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("cat")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("<<")]),t("span",{pre:!0,attrs:{class:"token string"}},[s._v("EOF"),t("span",{pre:!0,attrs:{class:"token bash punctuation"}},[s._v(" "),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("|")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("tee")]),s._v(" /etc/modules-load.d/k8s.conf")]),s._v("\nbr_netfilter\nEOF")]),s._v("\n\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("cat")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("<<")]),t("span",{pre:!0,attrs:{class:"token string"}},[s._v("EOF"),t("span",{pre:!0,attrs:{class:"token bash punctuation"}},[s._v(" "),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("|")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("tee")]),s._v(" /etc/sysctl.d/k8s.conf ")]),s._v("\nnet.bridge.bridge-nf-call-ip6tables = 1\nnet.bridge.bridge-nf-call-iptables = 1\nEOF")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" sysctl --system\n\n安装容器运行时"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("runtime"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v(",k8s 高版本采用自动检查方式,不用做任何处理\n\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 添加 k8s 镜像仓库，在前面中，设置了 yum 代理")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 在官方文档中多了 exclude=kubelet kubeadm kubectl ，这里去掉, 直接安装最新版本的")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("cat")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("<<")]),t("span",{pre:!0,attrs:{class:"token string"}},[s._v("EOF"),t("span",{pre:!0,attrs:{class:"token bash punctuation"}},[s._v(" "),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("|")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("tee")]),s._v(" /etc/yum.repos.d/kubernetes.repo  ")]),s._v("\n[kubernetes]\nname=Kubernetes\nbaseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el7-\\"),t("span",{pre:!0,attrs:{class:"token variable"}},[s._v("$basearch")]),s._v("\nenabled=1\ngpgcheck=1\nrepo_gpgcheck=1\ngpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg\nEOF")]),s._v("\n\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 关闭 selinux")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" setenforce "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("0")]),s._v(" \n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sed")]),s._v(" -i "),t("span",{pre:!0,attrs:{class:"token string"}},[s._v("'s/^SELINUX=enforcing$/SELINUX=permissive/'")]),s._v(" /etc/selinux/config\n\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 安装 k8s 服务, --disableexcludes=kubernetes 表示排除 kubernetes 之外的镜像源")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" yum "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("install")]),s._v(" -y kubelet kubeadm kubectl --disableexcludes"),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),s._v("kubernetes\n\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 设置 kubelet 开机启动，并且现在启动")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 启动之后可能会报错，如果原因是 没有读取到 kubelet 的配置文件，这里可以不用管，稍后会重启这个服务")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" systemctl "),t("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v("enable")]),s._v(" --now kubelet\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" systemctl status kubelet "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看 kubelet 的状态")]),s._v("\njournalctl -xeu kubelet "),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看 kubelet 的日志")]),s._v("\n")])])]),t("h2",{attrs:{id:"_3-创建-k8s-集群-两台都需要"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#_3-创建-k8s-集群-两台都需要"}},[s._v("#")]),s._v(" 3. 创建 k8s 集群 (两台都需要)")]),s._v(" "),t("blockquote",[t("p",[t("a",{attrs:{href:"https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/",target:"_blank",rel:"noopener noreferrer"}},[s._v("创建 k8s 集群官方文档"),t("OutboundLink")],1)]),s._v(" "),t("p",[t("a",{attrs:{href:"https://kubernetes.io/docs/concepts/cluster-administration/networking/##how-to-implement-the-kubernetes-networking-model",target:"_blank",rel:"noopener noreferrer"}},[s._v("k8s pod network 插件文档"),t("OutboundLink")],1)])]),s._v(" "),t("div",{staticClass:"language-shell extra-class"},[t("pre",{pre:!0,attrs:{class:"language-shell"}},[t("code",[t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 执行 kubeadm init 命令， 在 k8s master 机器上执行，默认情况下， k8s 创建 pod 不会在 master 机器上")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 重点注意: --pod-network-cidr=10.244.0.0/16 这个参数必须要有，没有的话安装 cni 会报错")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 注意 preflight 的前置检查输出，可能需要添加 docker group，这个会输出有提示的命令")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" kubeadm init --image-repository registry.aliyuncs.com/google_containers --apiserver-advertise-address"),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("192.168")]),s._v(".130.131 --pod-network-cidr"),t("span",{pre:!0,attrs:{class:"token operator"}},[s._v("=")]),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("10.244")]),s._v(".0.0/16\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 执行命令之后，会有 kubeadm join 输出行")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## （分为 master-token 和 worker-token）， 类似于下面的命令，在 centos2 上执行 worker-join-token 的命令")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" kubeadm "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("join")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("192.168")]),s._v(".130.131:6443 --token 8auvt0.zfw0ayr45d80q8pb "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("\\")]),s._v("\n\t--discovery-token-ca-cert-hash sha256:efe854739efef5fbaf3f6e28c899481c8d7797c1997fc8315b921a9ede400ca8\n\t\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 在机器上执行 kubeadm join 或者 kubeadm init 命令之后，重启 kubelet 服务\t")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" systemctl restart kubelet\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" systemctl status kubelet\n\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 设置 kubectl 的配置文件， 为 $HOME/.kube/config")]),s._v("\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("mkdir")]),s._v(" -p "),t("span",{pre:!0,attrs:{class:"token environment constant"}},[s._v("$HOME")]),s._v("/.kube\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("cp")]),s._v(" -i /etc/kubernetes/admin.conf "),t("span",{pre:!0,attrs:{class:"token environment constant"}},[s._v("$HOME")]),s._v("/.kube/config\n"),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("sudo")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("chown")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token variable"}},[t("span",{pre:!0,attrs:{class:"token variable"}},[s._v("$(")]),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("id")]),s._v(" -u"),t("span",{pre:!0,attrs:{class:"token variable"}},[s._v(")")])]),t("span",{pre:!0,attrs:{class:"token builtin class-name"}},[s._v(":")]),t("span",{pre:!0,attrs:{class:"token variable"}},[t("span",{pre:!0,attrs:{class:"token variable"}},[s._v("$(")]),t("span",{pre:!0,attrs:{class:"token function"}},[s._v("id")]),s._v(" -g"),t("span",{pre:!0,attrs:{class:"token variable"}},[s._v(")")])]),s._v(" "),t("span",{pre:!0,attrs:{class:"token environment constant"}},[s._v("$HOME")]),s._v("/.kube/config\n\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 安装 pod network 插件, 这里使用 flannel 插件")]),s._v("\nkubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml\n\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 查看 flannel 是否已经启动完成, cni 也启动成功")]),s._v("\nkubectl get pods -A\n"),t("span",{pre:!0,attrs:{class:"token comment"}},[s._v("## 成功之后会有下面的服务， 都是 running 状态")]),s._v("\nkube-system   coredns-7f6cbbb7b8-5hqt5          "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("15")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("76m ago"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("   26h\nkube-system   coredns-7f6cbbb7b8-lwdrv          "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("15")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("76m ago"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("   26h\nkube-system   etcd-centos1                      "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("18")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("76m ago"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("   26h\nkube-system   kube-apiserver-centos1            "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("25")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("76m ago"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("   26h\nkube-system   kube-controller-manager-centos1   "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("12")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("76m ago"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("   26h\nkube-system   kube-flannel-ds-6lx7s             "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("6")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("76m ago"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("    21h\nkube-system   kube-flannel-ds-n5tfn             "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("6")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("76m ago"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("    21h\nkube-system   kube-proxy-78jrm                  "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("8")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("76m ago"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("    26h\nkube-system   kube-proxy-wl5jg                  "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("8")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("76m ago"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("    26h\nkube-system   kube-scheduler-centos1            "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("1")]),s._v("/1     Running   "),t("span",{pre:!0,attrs:{class:"token number"}},[s._v("16")]),s._v(" "),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v("(")]),s._v("76m ago"),t("span",{pre:!0,attrs:{class:"token punctuation"}},[s._v(")")]),s._v("   26h\n\n")])])])])}),[],!1,null,null,null);t.default=a.exports}}]);