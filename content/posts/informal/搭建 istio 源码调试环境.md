---
title: 搭建 istio 源码调试环境
date: 2022-12-19T09:00:00+08:00
draft: false
tags: [istio, cloud native]
categories: [随笔]
---

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
export TAG=1.17-debug
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

## 5. bind dlv to pilot (optional)

Dockerfile.pilot

```dockerfile
# BASE_DISTRIBUTION is used to switch between the old base distribution and distroless base images
ARG BASE_DISTRIBUTION=debug

# Version is the base image version from the TLD Makefile
ARG BASE_VERSION=latest
ARG ISTIO_BASE_REGISTRY=gcr.io/istio-release

# The following section is used as base image if BASE_DISTRIBUTION=debug
FROM ${ISTIO_BASE_REGISTRY}/base:${BASE_VERSION} as debug

# The following section is used as base image if BASE_DISTRIBUTION=distroless
FROM ${ISTIO_BASE_REGISTRY}/distroless:${BASE_VERSION} as distroless

# Add dlv
FROM golang:1.20 AS build-dlv
ENV GOPROXY=https://goproxy.io,direct
RUN go install github.com/go-delve/delve/cmd/dlv@latest

# This will build the final image based on either debug or distroless from above
# hadolint ignore=DL3006
FROM ${BASE_DISTRIBUTION:-debug}

ARG TARGETARCH
COPY ${TARGETARCH:-amd64}/pilot-discovery /usr/local/bin/pilot-discovery

# Copy templates for bootstrap generation.
COPY envoy_bootstrap.json /var/lib/istio/envoy/envoy_bootstrap_tmpl.json
COPY gcp_envoy_bootstrap.json /var/lib/istio/envoy/gcp_envoy_bootstrap_tmpl.json
COPY --from=build-dlv /go/bin/dlv /

USER 1337:1337

ENTRYPOINT ["/dlv", "--listen=:1234", "--headless=true", "--api-version=2", "--accept-multiclient", "exec", "/usr/local/bin/pilot-discovery", "--"]

#ENTRYPOINT ["/usr/local/bin/pilot-discovery"]

```