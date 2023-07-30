---
title: 在 windows 上调试 redis
date: 2022-06-01T18:32:22+08:00
draft: false
tags: [redis]
categories: [随笔]
---

## 1. install wsl

open **Microsoft Store**, then search `ubuntu`  and click to install it.

open terminal

```shell
# list all linux subsystem
wsl --list
# set default linux subsystem, then you can input 'wsl' to inter system
wsl --set-default ubuntu
# enter default linux subsystem
wsl 
# install cmake, g++, gcc，gdb
cd /usr/local
wget https://cmake.org/files/v3.22/cmake-3.22.0-linux-x86_64.tar.gz
tar xf cmake-3.22.0-linux-x86_64.tar.gz
ln -s /usr/local/cmake-3.22.0-linux-x86_64/bin/cmake /usr/bin
sudo apt install build-essential
```

## 2. setting clion

1. open `File | Settings | Build, Execution, Deployment | Toolchains` menu.
2. add **new toolchains** and select **wsl**.

![clion toolchains](/ooooo-notes/images/debug-redis-with-windows-01.png "在 clion 中创建工具链")

3. setting wsl configuration, you maybe install **cmake, gcc, g++, gdb**.

4. you must execute command `git config core.autocrlf input` in your terminal, because windows is CRLF, then `git clone`
   .

5. select **wsl** in `File | Settings | Build, Execution, Deployment | Makefile`, because building redis by using
   makefile.

6. login wsl and enter redis directory, `for example: cd /mnt/c/Users/ooooo/Development/code/Demo/redis`

7. execute command `make`, you maybe need to execute `cd src && ls | grep .sh | xargs chmod a+x`

![makefile application](/ooooo-notes/images/debug-redis-with-windows-02.png "选择可执行文件")
