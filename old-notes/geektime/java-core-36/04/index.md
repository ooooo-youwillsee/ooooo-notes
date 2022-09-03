# 

## 1、kafka概念

​	Apache Kafka是一款开源的消息引擎系统，也是一个分布式流处理平台；消息引擎系统是一组规范，企业利用这组规范在不同系统之间传递语义准确的消息，实现松耦合的异步式数据传输。

## 2、kafka特点

- 使用纯二进制的字节序列
- 同时支持两种消息引擎模型（点对点、发布/订阅）

## 3、kafka的架构

- Topic：主题，承载消息的逻辑容器，用来区分业务；
- Producer：生产者，向主题发布新消息的应用程序；
- Consumer：消费者，向主题订阅新消息的应用程序；
- Partition：分区，每个Topic可以设置多个分区；
- Replica：副本，同一个消息以提供数据冗余可以有多个副本，分为领导者副本（可对外提供服务）和追随者副本（不可以对外提供服务）；对于分区实现高可用；
- Consumer Group：消费者组，多个消费者可组成一个消费者组，同时消费多个分区实现高吞吐；同一个消费者组内的消费者不可重复消费同一分区的消息；
- Rebalance：重平衡，消费者组内的某个消费者挂掉后，会重新分配订阅主题分区；
- Offset：位移，有分区位移和消费者位移两个概念；分区位移是消息的位置标记（从0开始），是固定的；消费者位移是消费者在订阅消息时的消费进度，是动态的；

图解partition和replication的概念

![](imgs/partition和replica.png)

## 4、多种Kafka对比

- Apache Kafka：社区版kafka；迭代速度快，社区响应快，但是仅提供核心功能，缺少高级特性；
- Confluent Kafka：Confluent公司提供的Kafka；集成了很多高级特性，分免费版和收费版，但是相关资料不全，普及率低；
- CDH/HDP Kafka：大数据平台内嵌的Apache Kafka，操作简单，节省运维成本，但是把控度低，演进速度慢；

## 5、Kafka版本演变

​	  kafka版本命名规范：例kafka_2.11-2.1.1.tgz（2.11表示scala版本，2.1.1表示kafka版本）

  	kafka版本号规范：大版本号 - 小版本号 - Patch 号（修订号）

- 0.7版本：只提供最基础的消息队列功能；
- 0.8版本：引入了副本机制， 成为了一个真正意义上完备的分布式高可靠消息队列解决方案；（但是生产和消费的客户端还是老版本的，应指定zk地址而不是broker地址）；
- 0.8.2.0版本：引入了新版本Producer API（但是bug还有点多，不建议使用）；
- 0.8.2.2版本：老版本的Consumer API比较稳定了；
- 0.9版本：增加了基础的安全认证/权限功能，同时使用java重写了Consumer API，还引入了Kafka Connect组件用于实现高性能的数据抽取；另外新版本的Producer API比较稳定了，不建议使用新版本的Consumer API；
- 0.10版本：引入了Kafka Streams，正式升级为分布式流处理平台；
- 0.10.2.2版本：新版本的Consumer API比较稳定了，该版本也修复了一个可能导致Producer性能降低的bug；
- 0.11版本：提供了幂等性Producer API（幂等性就是消息去重，默认不开启）和事务API（实现流处理结果正确性的基石），还对Kafka消息格式做了重构；（该版本也是主流版本）；
- 0.11.0.3版本：消息引擎功能非常完善了；
- 1.1版本：实现故障转移（即Failover）；
- 1.0版本和2.0版本：只要是是对Kafka Streams的改进；

## 6、Kafka的核心参数

### 1、配置文件参数

- log.dirs：指定broker需要使用的若干个文件目录路径，无默认值；生产环境必须配置，CSV格式（例如：/home/kafka1,/home/kafka2）
- zookeeper.connect：指定zk的地址和端口（例hadoop01:2181,hadoop02:2181,hadoop03:2181），zk保存了topic、分区的信息等等，如果多个kafka集群共有一个zk集群，加上chroot即可，chroot是别名，则指定格式为hadoop01:2181,hadoop02:2181,hadoop03:2181/kafka1或hadoop01:2181,hadoop02:2181,hadoop03:2181/kafka2;
- listeners：监听器，指定协议、主机名、端口；
- advertised.listeners：指该监听器是broker对外发布的；
- host.name/port：过期参数，可以不指定；
- auto.create.topics.enable：是否允许自动创建topic；
- unclean.leader.election.enable：是否允许unclean leader选举，原本数据多的分区才有资格选举leader，该参数设置为true后，数据少的也可以参与选举，会造成数据丢失，建议设置为false；
- auto.leader.rebalance.enable：是否允许定期选举leader，不建议开启；
- log.retention.{hour|minutes|ms}：控制一条消息被保存多长时间，ms优先级最高；
- log.retention.bytes：指定broker为消息保存的总磁盘容量大小，默认值为-1，表示没有上限；
- message.max.bytes：控制broker能够接收的最大消息大小，默认值为1000012，太小，建议重设置；

### 2、Topic级别参数

- retention.ms：规定了该topic消息被保存的时长；

- retention.bytes：规定了要为该topic预留多大的磁盘空间（默认-1，表示没有上限）；

- max.message.bytes：Broker能够接收的该topic的最大消息大小；

  以上参数可以通过两种方式设置

  1. 创建topic时进行设置：例bin/kafka-topics.sh --zookeeper hadoop01:2181,hadoop02:2181,hadoop03:2181 --create --topic my-topic --partitions 1   --replication-factor 1 --config max.message.bytes=64000 --config flush.messages=1
  2. 修改topic时设置：例bin/kafka-topics.sh --zookeeper hadoop01:2181,hadoop02:2181,hadoop03:2181  --alter --topic my-topic  --config max.message.bytes=128000 

### 3、JVM参数

- KAFKA_HEAP_OPTS：指定堆大小；

- KAFKA_JVM_PERFORMANCE_OPTS：指定GC参数；

  在启动kafka前设置这两个环境变量。

### 4、操作系统参数

- ulimit -n：打开文件描述符最大值（例ulimit -n 100000）；
- 文件系统类型：建议选择XFS；
- swappniess：swap空间大小，建议设置略大于0的值；
- 提交时间：即flush落盘时间，kafka的数据会先写到操作系统的页缓存上，然后会根据LRU算法定期将页缓存的数据落盘到磁盘，默认为5秒，可适当增大时间间隔；

## 7、分区策略

### 1、生产者分区策略

- 轮询策略（Round-robin）：kafka生产者API默认的分区策略，最大限度负载均衡；
- 随机策略（Randomness）：可自定义实现该策略；
- 按消息键保存策略（Key-ordering）：key可以是业务上的字段信息，按业务场景自定义分区；

### 2、消费者分区策略

- 按范围分配：指定分区消费；

- 轮询分配：按顺序分配给消费者；

- 自定义：设置partition.assignment.strategy为自定义的类；

## 8、压缩

​	kafka的消息层次分为消息集合和消息。一个消息集合包含若干条日志项，日志项就是装消息的地方；kafka底层的消息日志由一系列消息集合日志项组成，kafka是在消息集合层面上进行写入操作；

### 1、kafka消息格式	

​	kafka有两大消息格式：V1和V2（0.11.0.0版本后引入的）；

​	V1中每条消息需要执行CRC校验，但是在某些情况下CRC值是会变化的，会浪费空间和耽误CPU时间；在保存压缩消息上，是把多条消息进行压缩然后保存到外层消息的消息体字段中。

​	V2对V1改进了很多，CRC校验工作移到了消息集合这一层，而且在保存压缩消息上，是对整个消息集合进行压缩。

### 2、何时压缩和解压缩

- 生产者端：生产消息时指定压缩方法。
- broker端：默认的压缩方式是producer，如果指定了跟producer不同的压缩方式时，会先解压缩再按新指定的方式压缩；或者broker端发生了消息格式转换也会重压缩。
- consumer端：解压缩。

### 3、压缩算法

（kafka2.1.0版本前支持的算法：GZIP、Snappy、LZ4；该版本开始后支持Zstandard算法）

压缩算法的优劣有两个指标：压缩比和压缩/解压缩吞吐量；

- 压缩比：zstd > LZ4 > GZIP > Snappy
- 吞吐量：LZ4 > Snappy > zstd / GZIP

## 9、无消息丢失配置

kafka只对已提交的消息做有限度的持久化保证。

- 不要使用producer.send(msg),而要使用producer.send(msg,callback);
- 设置acks = all；表明所有副本broker都要接收到消息，保证消息”已提交“；
- 设置retries为一个较大的值；
- 设置unclean.leader.election.enable = false；表示禁止落后的broker被选为leader。
- 设置replication.factor >= 3；
- 设置min.insync.replicas > 1；控制消息至少被写入多少个副本才算“已提交”；
- 确保replication.factor > min.insync.replicas；推荐replication.factor = min.insync.replicas + 1；
- 设置enable.auto.commit = false；确保消息消费完成再提交；

## 10、幂等性和事务性

​	幂等性：指某些操作执行一次或多次的结果是一样的，在kafka中是对重复消息去重。

​	引入事务的作用：1、 生产者多次发送消息可以封装成一个原子操作，要么都成功，要么失败；2、 consumer-transform-producer模式下，因为消费者提交偏移量出现问题，导致在重复消费消息时，生产者重复生产消息。需要将这个模式下消费者提交偏移量操作和生产者一系列生成消息的操作封装成一个原子操作。

​	kafka事务一般为两种：1、 只有Producer生产消息 ；2、生产消费并存（consumer-transform-producer）；3、只有Consumer消费消息。

- 幂等性Producer：只能保证单分区、单会话上的消息幂等性（设置幂等性：props.put("enable.idempotence", true)或props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true)）

  事务提供的ACID特性：原子性（Atomicity）、一致性（Consistency）、隔离性（Isolation）、持久性（Durability）

  隔离性：表示并发执行的事务彼此相互隔离，互不影响。

- 事务型Producer：能够保证跨分区、跨会话间的幂等性(设置事务型Producer：开启enable.idempotence = true，然后设置Producer端参数transctional.id,还要调用一些事务API，如下列代码；表示record1和record2要么全部写入成功要么失败。在consumer端要设置isolation.level，read_uncommitted是默认值，表示可以读取到kafka任何消息，不管事务型Producer是提交事务还是终止事务；建议使用read_committed，表示只读取事务型成功提交的消息以及非事务型Producer写入的消息。)

  ```java
  producer.initTransactions();
  try{
  	producer.beginTransaction();
  	producer.send(record1);
  	producer.send(record2);
  	producer.commitTransaction();
  }catch(KafkaException e){
      producer.abortTransaction();
  }
  ```

## 11、Consumer Group

### 1、特性

- 一个Consumer Group可以有一个或多个Consumer；

- Droup ID是一个字符串，标识这一个唯一的Consumer Group；

- 同一个Group中的Consumer不能重复订阅一个分区；

  （老版本的Consumer Group把消费者位移保存在zk中，由于频繁读写会导致zk集群性能降低，新版本把消费者位移保存在kafka的_consumer_offsets的topic中。）

### 2、rebalance的触发条件

- Consumer Group中的成员数变更；
- 订阅的topic数变更（比如订阅了用正则匹配的topic，新增了一个符合的topic）；
- 订阅的topic的分区数变更；

### 3、rebalance的弊端

- rebalance影响Consumer端TPS；（rebalance期间，consumer会停止工作）
- rebalance过程很慢；
- rebalance效率不高；

### 4、非必要rebalance

- consumer未能及时给coordinator发送心跳，导致consumer被踢出Consumer Group；需设置合理的session.timeout.ms（默认值是10s，表示coordinator在10s内没收到consumer的心跳消息，该consumer被判定为dead）和heartbeat.interval.ms（表示consumer发送心跳请求的频率）的值

  （推荐session.timeout.ms=2s，heartbeat.interval.ms=6s）

- consumer消费时间过长；需设置max.poll.interval.ms的值，表示下游处理数据的时间；

## 12、位移主题（_consumer_offsets）

​	_consumer_offsets的主要作用就是保存Kafka消费者的位移消息。消息格式是KV对，Key保存的是<Group ID,主题名，分区号>；另外还有两种消息格式：1.用于保存Consumer Group信息的消息；2.用于删除Group过期位移甚至是删除Group的消息。

​	当有第一个Consumer消费数据时，Kafka就会自动创建_consumer_offsets这个主题，默认有50个分区，3个副本。

## 13、提交位移

​	从用户角度，分为自动提交和手动提交；从Consumer角度分为同步提交和异步提交。 *org.apache.kafka.common.serialization.String*Serializer 

- 自动提交

  设置为自动提交后，调用poll方法时，会提交上次poll返回的所有消息，poll方法的逻辑是先提交上一批消息的位移，再处理下一批消息，可以保证不出现消费丢失的情况，缺点是可能出现重复消费。

  ```java
  Properties props = new Properties();
  props.put("bootstrap.servers","localhost:9092");
  props.put("group.id","test");
  props.put("enable.auto.commit","true");
  props.put("auto.commit.interval.ms","2000");
  props.put("key.deserializer","org.apache.kafka.common.serialization.String*Serializer");
  props.put("value.deserializer","org.apache.kafka.common.serialization.String*Serializer");
  KafkaConsumer<String,String> consumer = new KafkaConsumer<>(props);
  consumer.subscribe(Arrays.asList("foo","bar"));
  while(true){
      ConsumerRecords<String,String> records = consumer.poll(100);
      for(ConsumerRecord<String,String> record : records){
          System.out.printf("offset = %d, key = %s, value = %s%n", record.offset(), record.key(), resord.value());
      }
  }
  ```

  

- 同步提交commitSync()

  手动提交在调用commitSync()时，Consumer会处于阻塞状态，直到Broker端返回结果，影响整个程序的TPS。

  

  ```java
  while(true){
      ConsumerRecords<String,String> records = consumer.poll(Duration.ofSeconds(1));
      process(records);	//处理消息
      try{
          consumer.commitSync();
      }catch (CommitFailedException e){
          handle(e);
      }
  }
  ```

  

- 异步提交commitAsync()

  在调用commitAsync()时，会立即返回结果，不会阻塞；缺点是出现问题时不能自动重试。

  ```java
  while(true){
      ConsumerRecords<String,String> records = consumer.poll(Duration.ofSeconds(1));
      process(records);	//处理消息
          consumer.commitAsync((offsets,exception) -> {
              if(exception != null)
                  handle(exception);
          });
  }
  ```

  

- 同步+异步提交

  手动提交中，commitSync()和commitAsync()结合使用会有很好的效果，利用commitSync()的自动重试避免瞬时错误，利用commitAsync()不会阻塞。

  ```java
  try {
   	while (true) {
   		ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
   		process(records); // 处理消息
   		commitAysnc(); // 使用异步提交规避阻塞
   	}
  } catch (Exception e) {
   	handle(e); // 处理异常
  } finally {
   	try {
   		consumer.commitSync(); // 最后一次提交使用同步阻塞式提交
  	} finally {
   		consumer.close();
  	}
  }
  ```

  - 同步/异步的细粒度提交

    通常poll的数据全部处理完后再提交位移，如果poll的总数很大，而处理过程中出现差错了，下一次会重复消费，就需要设置细粒度的提交位移。

    ```java
    private Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();
    int count = 0;
    ……
    while (true) {
     	ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
     	for (ConsumerRecord<String, String> record: records) {
     	process(record); // 处理消息
    	offsets.put(new TopicPartition(record.topic(), record.partition()), new OffsetAndMetadata(record.offset() + 1));
     	if（count % 100 == 0）
     	consumer.commitAsync(offsets, null); // 回调处理逻辑是
     	count++;
    	}
    }
    ```

## 14、CommitFailedException

​		CommitFailedException是指Consumer客户端在提交位移时出现了错误或异常，而且不可恢复。

### 1、场景一

​	当消息处理的总时间超过预设的 max.poll.interval.ms 参数值时，Kafka Consumer 端会抛出 CommitFailedException 异常。

解决方法如代码：

```java
…
Properties props = new Properties();
…
props.put("max.poll.interval.ms", 5000);
consumer.subscribe(Arrays.asList("test-topic"));
while (true) {
 	ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
 	// 使用 Thread.sleep 模拟真实的消息处理逻辑
	Thread.sleep(6000L);
 	consumer.commitSync();
}
```

防止出现该异常的办法：

- 缩短单条消息处理时间；
- 增加Comsumer端允许下游系统消费一批消息的最大时长（设置max.poll.interval.ms的值，在0.10.1.0版本后才有该参数）；
- 减少下游系统一次性消费的消息总数（设置max.poll.records的值）；
- 下游系统使用多线程加速消费；

### 2、场景二

​	Standalone Consumer在消费时也需要指定groud.id，如果出现了一个相同group.id的Consumer Group，kafka也会抛出异常；这种情况很少见，目前没有解决办法，要尽量去避免。

## 15、多线程

​	kafka 0.10.1.0版本开始，KafkaConsumer就是双线程设计，即用户主线程和心跳线程；用户主线程就是启动Consumer应用程序main方法的那个程序，心跳线程只负责定期给对应的的Broker机器发送心跳请求，以标识消费者应用的存活性。所以在消费层面上，Consumer依然是单线程设计。

多线程方案：

方案一：

​	消费者程序启动多个线程，每个线程维护专属的KafkaConsumer实例，负责完整的消息获取和消息处理流程；

优点：

- 实现起来简单；
- 线程之间没有交互，省去保障线程安全的开销；
- 由于每个线程使用专属的Consumer实例执行消息获取和消息处理，可以保证分区内的消费顺序；

缺点：

- 由于每个线程要维护自己的Consumer实例，会占用很多系统资源；

- 线程数受限于Consumer订阅主题的总分区数；

- 如有某个线程处理较慢，会造成rebalance；

  实现代码如下：

  ```java
  public class KafkaConsumerRunner implements Runnable {
   	private final AtomicBoolean closed = new AtomicBoolean(false);
   	private final KafkaConsumer consumer;
   	public void run() {
   		try {
   			consumer.subscribe(Arrays.asList("topic"));
   			while (!closed.get()) {
  				ConsumerRecords records = consumer.poll(Duration.ofMillis(10000));
   				// 执行消息处理逻辑
                   ...
   			}
   		} catch (WakeupException e) {
   			// Ignore exception if closing
   			if (!closed.get()) throw e;
   		} finally {
   			consumer.close();
   		}
   	}
   	// Shutdown hook which can be called from a separate thread
   	public void shutdown() {
  		closed.set(true);
   		consumer.wakeup();
   	}
  }
  ```

  

方案二：

​	消费者程序使用单或多线程获取消息，同时创建多个消费线程执行消息处理逻辑；

优点：

- 高伸缩性，自由调节消息获取和消息处理的线程数；

缺点：

- 实现难度大；

- 由于消息获取和消息处理解耦，会破坏消息在分区中的顺序；

- 会使得整个消息消费链路被拉长，位移提交可能会出错，导致重复消费；

  ```java
  private final KafkaConsumer<String, String> consumer;
  private ExecutorService executors;
  ...
  private int workerNum = ...;
  executors = new ThreadPoolExecutor(
  	workerNum, 
      workerNum, 
      0L, 
      TimeUnit.MILLISECONDS,
  	new ArrayBlockingQueue<>(1000), 
  	new ThreadPoolExecutor.CallerRunsPolicy()
  );
  ...
  while (true) {
  	ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(1));
  	for (final ConsumerRecord record : records) {
  		executors.submit(new Worker(record)); 
      } 
  }
  ..
  ```

  














