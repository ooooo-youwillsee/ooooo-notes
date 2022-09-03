# 

## 1、Broker 端参数

### 1、broker 存储信息

1. `log.dirs`: 日志目录，例如 `/home/kafka1,/home/kafka2,/home/kafka3`。

2. `log.dir`: 只需要设置参数`log.dirs`，此参数不需要。

### 2、zk 信息

3. `zookeeper.connect`: 连接 zk 的参数，例如 `zk1:2181,zk2:2181,zk3:2181`。

如果让多个 Kafka 集群使用同一套 zk 集群，利用 zk 的 chroot 设置，例如 `zookeeper.connect` 可以设置为 `zk1:2181,zk2:2181,zk3:2181/kafka1` 和 `zk1:2181,zk2:2181,zk3:2181/kafka2`。

### 3、broker 连接信息

4. `listeners`: 监听器，也就是通过什么协议访问指定主机名和端口开放的 Kafka 服务。

5. `advertised.listeners`: Broker 用于对外发布的监听器。

监听器配置，由三元组 <协议名称，主机名，端口号> 构成，例如你自己定义的协议名字 `CONTROLLER://localhost:9092`。

一旦你自己定义了协议名称，你必须还要指定 `listener.security.protocol.map` 参数告诉这个协议底层使用了哪种安全协议，比如指定 `listener.security.protocol.map=CONTROLLER:PLAINTEXT` 表示 `CONTROLLER` 这个自定义协议底层使用明文不加密传输数据。

6. `host.name/port`: 过期。

### 4、topic 管理

7. `auto.create.topics.enable`: 是否允许自动创建 Topic, 建议为 false。

8. `unclean.leader.election.enable`： 是否允许 Unclean Leader 选举， 建议为 false。

Unclean Leader 选举，指的是落后太多的副本参与选举，可能会使数据丢失。

9. `auto.leader.rebalance.enable`: 是否允许定期进行 Leader 选举，建议为 false。

### 5、数据留存

10. `log.retention.{hour|minutes|ms}`: 日志保留时间。例如 `log.retention.hour=168` 表示默认保存 7 天的数据。

11. `log.retention.bytes`: 消息保存的总磁盘容量大小。默认为 -1，表示容量无限制，在云上的多租户才用到此参数。

12. `message.max.bytes`: 最大消息大小。实际上，1MB 的消息很常见。

<br/>

**注意：上述的参数都不能使用默认值。**

