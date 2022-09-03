# 

## 1、消息格式

Kafka 的消息格式目前有两种：V1 和 V2。

不论是哪个版本，Kafka 的消息层次都分为两层：**消息集合(message set)** 和 **消息(message)**。一个消息集合包含若干条**日志项(record item)**，日志项中包含多条消息。

在 V1 版本中，每条消息都要执行 CRC 校验，但有些情况下消息的 CRC 值是会发生变化的。比如在 Broker 端可能会对消息时间戳字段进行更新，或者在执行消息格式转换（兼容老版本客户端程序）。对于这些情况，每条消息都执行 CRC 校验就有点没必要了。在 V2 版本中，消息的 CRC 校验工作就被移到了消息集合这一层。

在 V1 版本中，保存压缩消息的方法是把多条消息进行压缩然后保存到外层消息的消息体字段中；而在 V2 版本中，是对整个消息集合进行压缩。显然后者应该比前者有更好的压缩效果。

在相同条件下，不论是否启用压缩，V2 版本都比 V1 版本节省磁盘空间。当启用压缩时，这种节省空间的效果更加明显。

![V! 和 V2 对比](./imgs/10_01.png)

## 2、何时压缩

在 Kafka 中，压缩可能发生在两个地方：生产者端和 Broker 端。
```java
  Properties props = new Properties();
  props.put("bootstrap.servers", "localhost:9092");
  props.put("compression.type", "gzip");
  Producer<String, String> producer = new KafkaProducer<>(props);
```

上述代码，表明该 Producer 的压缩算法使用的是 GZIP。

但有两种例外情况让 Broker 重新压缩消息：
- Broker 端指定了和 Producer 端不同的压缩算法。
- Broker 端发生了消息格式转换（兼容老的客户端程序）。

## 3、何时解压缩

一句话：**Producer 端压缩、Broker 端保持、Consumer 端解压缩**。

除了在 Consumer 端解压缩，Broker 端也会进行解压缩，目的是为了对消息执行各种验证。

## 4、压缩算法对比

在 Kafka 2.1.0 版本之前，Kafka 支持 3 种压缩算法：GZIP、Snappy 和 LZ4。从 2.1.0 开始，Kafka 正式支持 Zstandard 算法（zstd）。

压缩算法有两个重要指标：**压缩比**、**压缩/解压缩吞吐量**。

![压缩算法对比](./imgs/10_02.png)

- 吞吐量方面: LZ4 > Snappy > zstd 和 GZIP。
- 压缩比方面：zstd > LZ4 > GZIP > Snappy

总结：
- 机器的 CPU 资源不充足，不建议开启压缩，因为压缩需要消耗大量 CPU。
- 机器的 CPU 资源充足，强烈建议你开启 zstd 压缩，这样能极大地节省网络资源消耗。

