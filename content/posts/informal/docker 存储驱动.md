---
title: docker 存储驱动
date: 2023-01-24T08:00:00+08:00
draft: false
tags: [docker, storage]
collections: [随笔]
---

## 1. aufs 存储驱动

> Ubuntu 22.04 LTS 不支持 `aufs` 文件系统


参考：
> [ubuntu官方文档](https://manpages.ubuntu.com/manpages/trusty/man5/aufs.5.html)

## 2. overlay2 存储驱动

```shell
# creat dir
mkdir lower upper work mnt

# mount lower upper work to mnt
mount -t overlay -o lowerdir=lower,upperdir=upper,workdir=work none mnt

# testing 
echo 1 > lower/1
mkdir lower/2
mkdir upper/3
ll mnt 

# recovery all setting
umount mnt
rm -rf lower upper work mnt
```

参考：
> [文档](https://linuxconfig.org/introduction-to-the-overlayfs)
> [linux文档](https://docs.kernel.org/filesystems/overlayfs.html)