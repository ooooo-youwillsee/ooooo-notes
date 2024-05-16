# Docker 单主机网络


这篇文章主要简述 docker 中的 bridge 网络驱动是如何工作的。

## 1. 测试一，veth1 (ns1) --- veth2 (ns2)

```shell
# create ns1, ns2
ip netns add ns1
ip netns add ns2

# create veth1, veth2
ip link add veth1 type veth peer name veth2

# set veth1 for ns1, set veth2 for ns2
ip link set dev veth1 netns ns1
ip link set dev veth2 netns ns2

# set veth1 ip, set veth2 ip
ip netns exec ns1 ip addr add 172.16.0.1/24 dev veth1
ip netns exec ns2 ip addr add 172.16.0.2/24 dev veth2

# set veth1 up, set veth2 up
ip netns exec ns1 ip link set dev veth1 up
ip netns exec ns2 ip link set dev veth2 up

# show ip address
ip netns exec ns1 ip addr
ip netns exec ns2 ip addr

# test for ping 
ip netns exec ns1 ping 172.16.0.2
ip netns exec ns2 ping 172.16.0.1

# recovery all setting 
ip netns delete ns1
ip netns delete ns2
```

## 2. 测试二，veth0 (bridge0) --- veth1 (ns1)

```shell
# create ns1
ip netns add ns1

# create veth0, veth1
ip link add veth0 type veth peer name veth1

# create bridge0
ip link add bridge0 type bridge

# set veth1 for ns1
ip link set dev veth1 netns ns1

# set veth0 for bridge0
ip link set dev veth0 master bridge0

# set veth0 ip address
ip addr add 172.16.0.1/24 dev veth0

# set bridge0 ip address
ip addr add 172.16.0.0/24 dev bridge0

# set veth1 ip address
ip netns exec ns1 ip addr add 172.16.0.2/24 dev veth1

# set veth0, veth1, bridge0 up
ip link set dev veth0 up
ip link set dev bridge0 up
ip netns exec ns1 ip link set dev veth1 up

# delete veth0 route
ip route del 172.16.0.0/24 dev veth0

# show ip address
ip addr
ip netns exec ns1 ip addr

# test for ping 
ping 172.16.0.2
ip netns exec ns1 ping 172.16.0.1

# recovery all setting 
ip netns del ns1
ip link del bridge0

```


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/docker-%E5%8D%95%E4%B8%BB%E6%9C%BA%E7%BD%91%E8%B7%AF/  

