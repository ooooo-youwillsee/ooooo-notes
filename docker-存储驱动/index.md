# docker 存储驱动


## 1. aufs 存储驱动

&gt; Ubuntu 22.04 LTS 不支持 `aufs` 文件系统


参考：
&gt; [ubuntu官方文档](https://manpages.ubuntu.com/manpages/trusty/man5/aufs.5.html)

## 2. overlay2 存储驱动

```shell
# creat dir
mkdir lower upper work mnt

# mount lower upper work to mnt
mount -t overlay -o lowerdir=lower,upperdir=upper,workdir=work none mnt

# testing 
echo 1 &gt; lower/1
mkdir lower/2
mkdir upper/3
ll mnt 

# recovery all setting
umount mnt
rm -rf lower upper work mnt
```

参考：
&gt; [文档](https://linuxconfig.org/introduction-to-the-overlayfs)
&gt; [linux文档](https://docs.kernel.org/filesystems/overlayfs.html)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/docker-%E5%AD%98%E5%82%A8%E9%A9%B1%E5%8A%A8/  

