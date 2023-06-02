# 安装 harbor



## 1. 在 docker 上安装 harbor

```shell
# 下载harbor
wget https://github.com/goharbor/harbor/releases/download/v2.8.1/harbor-offline-installer-v2.8.1.tgz

# 生成CA秘钥
openssl genrsa -out ca.key 4096

# 生成CA证书
openssl req -x509 -new -nodes -sha512 -days 3650 \
 -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=yourdomain.com" \
 -key ca.key \
 -out ca.crt
 
# 生成秘钥 
openssl genrsa -out yourdomain.com.key 4096

# 生成证书请求
openssl req -sha512 -new \
    -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=yourdomain.com" \
    -key yourdomain.com.key \
    -out yourdomain.com.csr

# 生成证书
cat > v3.ext <<-EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1=yourdomain.com
DNS.2=yourdomain
DNS.3=hostname
EOF

openssl x509 -req -sha512 -days 3650 \
    -extfile v3.ext \
    -CA ca.crt -CAkey ca.key -CAcreateserial \
    -in yourdomain.com.csr \
    -out yourdomain.com.crt
    
# 复制到harbor中， /data/cert/ 是harbor的证书目录
cp yourdomain.com.crt /data/cert/
cp yourdomain.com.key /data/cert/

# 转换为cert格式, 给docker使用
openssl x509 -inform PEM -in yourdomain.com.crt -out yourdomain.com.cert

# 复制到docker中，这里是双向tls
cp yourdomain.com.cert /etc/docker/certs.d/yourdomain.com/
cp yourdomain.com.key /etc/docker/certs.d/yourdomain.com/
cp ca.crt /etc/docker/certs.d/yourdomain.com/

# 重启docker,加载证书
systemctl restart docker

# 执行harbor脚本，启动harbor
./prepare

# 关闭 harbor
docker-compose down -v

# 启动 harbor
docker-compose up -d

# 验证docker
docker login yourdomain.com
```

> [harbor官方文档](https://goharbor.io/docs/2.8.0/install-config/configure-https/)
