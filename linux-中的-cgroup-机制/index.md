# linux 中的 cgroup 机制


## 1. 检查 cgroup 的版本

```shell
# check if cgroup is supported 
cat /proc/filesystems | grep cgroup

# check cgroup version 
cat /proc/mounts | grep cgroup
```

## 2. cgroup v2 操作

```shell
# create new dir
cd /sys/fs/cgroup
mkdir test

# creat loop.sh for testing cpu quota
vim loop.sh
while :
do
        :
done

# lunch loop.sh, generate pid -&gt; 2584068
nohup sh loop.sh &amp;

# echo pid to cgroup.procs
echo 2584068 &gt; test/cgroup.procs

# set cpu, at lease 0.1
echo 1000 10000 &gt; test/cpu.max

# check 
top 

# recovery all
kill 2584068
rmdir test
```

参考：
&gt; 1. [博客](https://zorrozou.github.io/docs/%E8%AF%A6%E8%A7%A3Cgroup%20V2.html)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/linux-%E4%B8%AD%E7%9A%84-cgroup-%E6%9C%BA%E5%88%B6/  

