---
title: tcpdump 常用命令
date: 2023-05-24T08:00:00+08:00
draft: false
tags: [ linux ]
categories: [ 随笔 ]
---

> -n 以数字显示
> -X 显示包体
> -i 指定网卡
> -w 写入文件
> -c 包的个数

## 1. 指定端口

```shell
tcpdump -n -X -i any port 1234 -w 1.cap
```

## 2. 指定主机

```shell
tcpdump -n -X -i any host 192.168.0.101 -w 1.cap
```
## 3. 其他
```shell
# 监视指定主机和端口的数据包
tcpdump -i ens33 port 8080 and host node1

# 监视指定网络的数据包，如本机与192.168网段通信的数据包，"-c 10"表示只抓取10个包
tcpdump -i ens33 -c 10 net 192.168

# 抓取ping包
tcpdump -c 5 -nn -i eth0 icmp and src 192.168.100.62
```


## 3.参考

> [tcpdump说明](https://www.jianshu.com/p/d9162722f189)