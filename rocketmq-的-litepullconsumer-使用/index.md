# Rocketmq 的 LitePullConsumer 使用


## 1. 代码

在自定义封装 MQ 时，要注意 **producer** 和 **consumer** 的初始化时机，否则会出现 **consumer** 占用 `consumerQueue` 的情况

```java
@Slf4j
public class RocketMQHandler extends AbstractMQHandler {

  private final RocketMQConfig config;

  private final Supplier&lt;DefaultMQProducer&gt; producer;

  private final Supplier&lt;DefaultLitePullConsumer&gt; consumer;

  public RocketMQHandler(RocketMQProperties properties, RocketMQConfig config) {
    this.config = config;
    // 这里要延迟初始化，否则启动 consumer 占用 consumerQueue
    this.producer = SingletonSupplier.of(() -&gt; createProducer(properties, config));
    this.consumer = SingletonSupplier.of(() -&gt; createConsumer(properties, config));
  }

  @SneakyThrows
  @Override
  public void send(String message) {
    Message m = new Message(config.getDestinationName(), message.getBytes(StandardCharsets.UTF_8));
    if (log.isTraceEnabled()) {
      log.trace(&#34;{} send message: {}&#34;, RocketMQHandler.this.getClass().getSimpleName(), message);
    }
    producer.get().send(m);
  }

  @Override
  public void receive(MQListener listener) {
    ConsumerTask task = new ConsumerTask(listener);
    executorService.schedule(task, PULL_PERIOD, TimeUnit.MILLISECONDS);
  }

  @AllArgsConstructor
  private class ConsumerTask implements Runnable {

    private MQListener listener;

    @Override
    public void run() {
      List&lt;MessageExt&gt; msgs = consumer.get().poll(PULL_PERIOD);
      if (CollectionUtils.isNotEmpty(msgs)) {
        msgs.forEach(m -&gt; {
          String message = new String(m.getBody(), StandardCharsets.UTF_8);
          if (log.isTraceEnabled()) {
            log.trace(&#34;{} receive message: {}&#34;, RocketMQHandler.this.getClass().getSimpleName(), message);
          }

          listener.onMessage(message);
        });
      }

      executorService.schedule(this, PULL_PERIOD, TimeUnit.MILLISECONDS);
    }
  }

  @SneakyThrows
  private DefaultMQProducer createProducer(RocketMQProperties properties, RocketMQConfig config) {
    DefaultMQProducer producer = new DefaultMQProducer(config.getProducerGroup());
    producer.setNamesrvAddr(properties.getNamesrvAddr());
    producer.start();
    return producer;
  }

  @SneakyThrows
  private DefaultLitePullConsumer createConsumer(RocketMQProperties properties, RocketMQConfig config) {
    DefaultLitePullConsumer consumer = new DefaultLitePullConsumer(config.getConsumerGroup());
    consumer.setNamesrvAddr(properties.getNamesrvAddr());
    switch (config.getConsumeMode()) {
      case P2P:
        consumer.setMessageModel(MessageModel.CLUSTERING);
        break;
      case BROADCAST:
        consumer.setMessageModel(MessageModel.BROADCASTING);
        break;
    }
    consumer.subscribe(config.getDestinationName(), &#34;*&#34;);
    consumer.start();
    return consumer;
  }

}

```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/rocketmq-%E7%9A%84-litepullconsumer-%E4%BD%BF%E7%94%A8/  

