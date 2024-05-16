# Tcpdump 常用命令


&gt; -n 以数字显示
&gt; -X 显示包体
&gt; -i 指定网卡
&gt; -w 写入文件
&gt; -c 包的个数

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

# 监视指定网络的数据包，如本机与192.168网段通信的数据包，&#34;-c 10&#34;表示只抓取10个包
tcpdump -i ens33 -c 10 net 192.168

# 抓取ping包
tcpdump -c 5 -nn -i eth0 icmp and src 192.168.100.62
```


## 3.参考

&gt; [tcpdump说明](https://www.jianshu.com/p/d9162722f189)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/tcpdump-%E5%B8%B8%E7%94%A8%E5%91%BD%E4%BB%A4/  

