---
title: openjdk build
date: 2023-02-01T08:00:00+08:00
draft: false
tags: [ jdk ]
collections: [随笔]
---

## 相关命令

```shell
sudo apt install build-essential manpages-dev software-properties-common
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
sudo apt update && sudo apt install gcc-11 g++-11

1. sudo apt update && sudo apt upgrade gcc libfontconfig1-dev systemtap-sdt-dev libx11-dev


sudo apt-get install libx11-dev libxext-dev libxrender-dev libxrandr-dev libxtst-dev libxt-dev

sudo apt-get install libcups2-dev

sudo apt-get install libasound2-dev


bash configure --build=x86_64-unknown-linux-gnu --enable-debug --with-jvm-variants=server --enable-dtrace

bash configure --enable-debug --with-jvm-variants=server 

bash configure --enable-debug --with-jvm-variants=server --with-toolchain-type=gcc --with-boot-jdk=C:/Users/ooooo/Development/Jdk/jdk17 
```


## 2. 参考

> [深入理解Java虚拟机（第3版）](https://book.douban.com/subject/34907497/)
> [jdk build](https://openjdk.org/groups/build/doc/building.html)
