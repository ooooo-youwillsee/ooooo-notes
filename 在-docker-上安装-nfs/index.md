# 在 docker 上安装 nfs


## install nfs in docker

### 1. create share directory used by nfs

```shell
mkdir -p /home/ooooo/shared/nfs
```

### 2. create exports.txt used by nfs

This the exports.txt mainly used to mount dir (path in the container ) and permission.

for example:

It indicates read only for all ip.

```shell
vim /home/ooooo/exports.txt
/home/ooooo/shared/nfs             *(ro,no_subtree_check)
```

### 3. execute docker command

```shell
docker run -d                                         \
  -v /home/ooooo/shared/nfs:/home/ooooo/shared/nfs    \
  -v /home/ooooo/exports.txt:/etc/exports:ro          \
  --cap-add SYS_ADMIN                                 \
  -p 2049:2049                                        \
  erichough/nfs-server
  
# check nfs server
netstat -nla | grep 2049

# mount nfs dir (check mount.nfs whether is exist )
# 172.17.0.2 is container ip
mount 172.17.0.2:/home/ooooo/shared/nfs /home/ooooo/nfs-mount
```


### 5. 参考

[docker images](https://hub.docker.com/r/erichough/nfs-server)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-docker-%E4%B8%8A%E5%AE%89%E8%A3%85-nfs/  

