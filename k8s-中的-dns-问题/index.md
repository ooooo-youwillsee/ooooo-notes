# k8s 中的 dns 问题



## 1. 检查本机的 dns 配置

```shell
# 建议不要配置 search，除非你自己明确, 可用的 dns 域名，如 8.8.8.8
# 修改后，centos系统不需要重启 NetworkManager, 重启可能被覆盖
cat /etc/resolv.conf

# 重启 kubelet
systemctl restart kubelet

# 重启 k8s pod
kubectl rollout restart deploy
```

## 2. 检查 pod 的 dns 配置

```shell
# 进入容器中
kubectl debug -it some-pod --image=busybox -- sh

# 在容器中查看 dns 配置, 这里一定要是 coredns 的 clusterIP, 如果不对，检查 kubelet 的 dns 配置
cat /etc/resolv.conf

# 在容器中查看 hosts 配置
cat /etc/hosts
```

## 3. 检查并配置 coredns 配置
```shell
# 检查配置
kubectl get cm coredns -n kube-system -oyaml

# 自定义配置，如添加 hosts 配置
kubectl apply -f - <<EOF
apiVersion: v1
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        # 添加 hosts 配置
        hosts {
            172.16.1.36 git.abc.com
            fallthrough
        }
        # 不转发到 /etc/resolv.conf
        forward . 8.8.8.8
        cache 30
        loop
        reload
        loadbalance
    }
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
EOF
```

## 4. 问题现象

`tekton`的 `pod` `dns` 显示错误，重新设置主机的 `/etc/resolv.conf`, 重启 `kubelet`， 重启 `tekton`.

![k8s-dns-show-error-in-pod](/ooooo-notes/images/k8s-dns-show-error-in-pod.png)
