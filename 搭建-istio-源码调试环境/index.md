# 搭建 istio 源码调试环境


## 1. 前置条件

* 安装 `docker`，必须配置 `docker` 代理，否则 `build` 失败。 [参考]({{< ref "设置 docker 代理.md" >}})
* 下载 `istio` 源码。
* 安装 `go` 和 `dlv` 工具。[参考](https://github.com/go-delve/delve/tree/master/Documentation/installation)

## 2. 设置环境变量

```shell
# docker 地址
export HUB="docker.io/youwillsee"

# istio 的源码目录
export ISTIO=/root/code/istio

# docker 的 tag
export TAG=1.16.0-debug
```

## 3. build istio 

```shell
# 构建 debug 的版本，会输出在 out 目录下
make DEBUG=1 build

# 构建 debug 的版本，推到本地的 docker 中
make DEBUG=1 docker

# 推送到远端的 docker 中
make docker.push

# 清理
make clean

```

参考

> 1. [istio-devlopment](https://github.com/istio/istio/wiki/Preparing-for-Development)
> 2. [istio-code-base](https://github.com/istio/istio/wiki/Using-the-Code-Base)

## 4. dlv 连接

```shell
# 找到 pid
ps -ef | grep pilot-discovery

# attach pid
dlv --listen=:2345 --headless=true --api-version=2 --accept-multiclient attach 172965

# 使用 IDE 远程连接
GOland -> go remote
```
