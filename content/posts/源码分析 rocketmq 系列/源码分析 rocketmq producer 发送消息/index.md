---
title: 源码分析 rocketmq producer 发送消息
date: 2023-10-20T08:00:00+08:00
draft: false
tags: [ rocketmq, source code, 源码分析 rocketmq 系列 ]
categories: [ 源码分析 rocketmq 系列 ]
---

> rocketmq 基于 5.1.4 版本

> 在 `rocketmq` 中，消息分为多个类型，比如**普通消息**、**批量消息**、**延迟消息**、**事务消息**等，这一节主要介绍**普通消息**的逻辑，后面的章节会继续介绍**其他消息**。

## producer 发送消息

源码位置: `org.apache.rocketmq.client.producer.DefaultMQProducer#send`

```java
// 发送消息
public SendResult send(Message msg) throws MQClientException, RemotingException, MQBrokerException, InterruptedException {
    msg.setTopic(withNamespace(msg.getTopic()));
    // autoBatch 默认 false
    if (this.getAutoBatch() && !(msg instanceof MessageBatch)) {
        // 通过累加器来实现批量消息，增大吞吐量
        return sendByAccumulator(msg, null, null);
    } else {
        // 直接发送, 最终会调用 DefaultMQProducerImpl#sendDefaultImpl
        return sendDirect(msg, null, null);
    }
}
```

源码位置: `org.apache.rocketmq.client.impl.producer.DefaultMQProducerImpl#sendDefaultImpl`

```java
// 发送消息
private SendResult sendDefaultImpl(
  Message msg,
  final CommunicationMode communicationMode,
  final SendCallback sendCallback,
  final long timeout
  ) throws MQClientException, RemotingException, MQBrokerException, InterruptedException {
  this.makeSureStateOK();
  // 校验消息
  Validators.checkMessage(msg, this.defaultMQProducer);
  final long invokeID = random.nextLong();
  long beginTimestampFirst = System.currentTimeMillis();
  long beginTimestampPrev = beginTimestampFirst;
  long endTimestamp = beginTimestampFirst;
  // 获取 topic，如果没有，会从 namesrv 中同步 topic
  TopicPublishInfo topicPublishInfo = this.tryToFindTopicPublishInfo(msg.getTopic());
  if (topicPublishInfo != null && topicPublishInfo.ok()) {
      boolean callTimeout = false;
      MessageQueue mq = null;
      Exception exception = null;
      SendResult sendResult = null;
      // 同步调用，设置重试次数
      int timesTotal = communicationMode == CommunicationMode.SYNC ? 1 + this.defaultMQProducer.getRetryTimesWhenSendFailed() : 1;
      int times = 0;
      String[] brokersSent = new String[timesTotal];
      boolean resetIndex = false;
      // 如果失败，重试
      for (; times < timesTotal; times++) {
          String lastBrokerName = null == mq ? null : mq.getBrokerName();
          if (times > 0) {
              resetIndex = true;
          }
          // 根据策略来选择 queue, 实现方式有随机、可用性、延迟
          MessageQueue mqSelected = this.selectOneMessageQueue(topicPublishInfo, lastBrokerName, resetIndex);
          if (mqSelected != null) {
              mq = mqSelected;
              // 记录每次选择的 queue
              brokersSent[times] = mq.getBrokerName();
              try {
                  ...
                  // 发送消息, 很重要
                  sendResult = this.sendKernelImpl(msg, mq, communicationMode, sendCallback, topicPublishInfo, timeout - costTime);
                  endTimestamp = System.currentTimeMillis();
                  // 更新延迟和可用性
                  this.updateFaultItem(mq.getBrokerName(), endTimestamp - beginTimestampPrev, false, true);
                  // 根据通信模式来返回结果
                  switch (communicationMode) {
                      case ASYNC:
                          return null;
                      case ONEWAY:
                          return null;
                      case SYNC:
                          if (sendResult.getSendStatus() != SendStatus.SEND_OK) {
                              if (this.defaultMQProducer.isRetryAnotherBrokerWhenNotStoreOK()) {
                                  continue;
                              }
                          }
                          return sendResult;
                      default:
                          break;
                  }
              } catch (MQClientException e) {
                  endTimestamp = System.currentTimeMillis();
                  // 更新延迟和可用性
                  this.updateFaultItem(mq.getBrokerName(), endTimestamp - beginTimestampPrev, false, true);
                  ...
                  continue;
              } catch (RemotingException e) {
                  endTimestamp = System.currentTimeMillis();
                  // 更新延迟和可用性
                  this.updateFaultItem(mq.getBrokerName(), endTimestamp - beginTimestampPrev, true, true);
                  ...
                  exception = e;
                  continue;
              } catch (MQBrokerException e) {
                  endTimestamp = System.currentTimeMillis();
                  // 更新延迟和可用性
                  this.updateFaultItem(mq.getBrokerName(), endTimestamp - beginTimestampPrev, true, false);
                  ...
                  exception = e;
              } catch (InterruptedException e) {
                  endTimestamp = System.currentTimeMillis();
                   // 更新延迟和可用性
                  this.updateFaultItem(mq.getBrokerName(), endTimestamp - beginTimestampPrev, false, true);
                  ...
                  throw e;
              }
          } else {
              break;
          }
      }
      if (sendResult != null) {
          return sendResult;
      }
      ...
      // 抛出异常
      throw mqClientException;
  }
  ...
}
```

源码位置: `org.apache.rocketmq.client.impl.producer.DefaultMQProducerImpl#sendKernelImpl`

```java
// 发送消息, 很重要
private SendResult sendKernelImpl(final Message msg,
  final MessageQueue mq,
  final CommunicationMode communicationMode,
  final SendCallback sendCallback,
  final TopicPublishInfo topicPublishInfo,
  final long timeout) throws MQClientException, RemotingException, MQBrokerException, InterruptedException {
  long beginStartTime = System.currentTimeMillis();
  // 获取 brokerName 和 brokerAddr
  String brokerName = this.mQClientFactory.getBrokerNameFromMessageQueue(mq);
  String brokerAddr = this.mQClientFactory.findBrokerAddressInPublish(brokerName);
  ...
  SendMessageContext context = null;
  if (brokerAddr != null) {
      // vip address 就是第二个地址，为了增加 mq 的吞吐量
      brokerAddr = MixAll.brokerVIPChannel(this.defaultMQProducer.isSendMessageWithVIPChannel(), brokerAddr);

      byte[] prevBody = msg.getBody();
      try {
          //for MessageBatch,ID has been set in the generating process
          if (!(msg instanceof MessageBatch)) {
              MessageClientIDSetter.setUniqID(msg);
          }

          int sysFlag = 0;
          boolean msgBodyCompressed = false;
          // 设置系统标记，压缩和压缩类型
          if (this.tryToCompressMessage(msg)) {
              sysFlag |= MessageSysFlag.COMPRESSED_FLAG;
              sysFlag |= compressType.getCompressionFlag();
              msgBodyCompressed = true;
          }

          final String tranMsg = msg.getProperty(MessageConst.PROPERTY_TRANSACTION_PREPARED);
          if (Boolean.parseBoolean(tranMsg)) {
              // 设置系统标记, 事务
              sysFlag |= MessageSysFlag.TRANSACTION_PREPARED_TYPE;
          }

          // 执行 forbidden hook
          if (hasCheckForbiddenHook()) {
            ... 
          }

          // 执行 message hook before
          if (this.hasSendMessageHook()) {
            ...
          }
          
          // 构建 SendMessageRequestHeader
          SendMessageRequestHeader requestHeader = new SendMessageRequestHeader();
          requestHeader.setProducerGroup(this.defaultMQProducer.getProducerGroup());
          requestHeader.setTopic(msg.getTopic());
          requestHeader.setDefaultTopic(this.defaultMQProducer.getCreateTopicKey());
          requestHeader.setDefaultTopicQueueNums(this.defaultMQProducer.getDefaultTopicQueueNums());
          requestHeader.setQueueId(mq.getQueueId());
          requestHeader.setSysFlag(sysFlag);
          requestHeader.setBornTimestamp(System.currentTimeMillis());
          requestHeader.setFlag(msg.getFlag());
          requestHeader.setProperties(MessageDecoder.messageProperties2String(msg.getProperties()));
          requestHeader.setReconsumeTimes(0);
          requestHeader.setUnitMode(this.isUnitMode());
          requestHeader.setBatch(msg instanceof MessageBatch);
          requestHeader.setBname(brokerName);
          // 处理重试消息
          if (requestHeader.getTopic().startsWith(MixAll.RETRY_GROUP_TOPIC_PREFIX)) {
              String reconsumeTimes = MessageAccessor.getReconsumeTime(msg);
              String maxReconsumeTimes = MessageAccessor.getMaxReconsumeTimes(msg);
              ...
          }

          SendResult sendResult = null;
          switch (communicationMode) {
              case ASYNC:
                  ...
                  // 异步发送消息，这里有 callback 参数
                  sendResult = this.mQClientFactory.getMQClientAPIImpl().sendMessage(
                      brokerAddr,
                      brokerName,
                      tmpMessage,
                      requestHeader,
                      timeout - costTimeAsync,
                      communicationMode,
                      sendCallback,
                      topicPublishInfo,
                      this.mQClientFactory,
                      this.defaultMQProducer.getRetryTimesWhenSendAsyncFailed(),
                      context,
                      this);
                  break;
              case ONEWAY:
              case SYNC:
                  ...
                  // 同步发送消息，这里没有 callback 参数
                  sendResult = this.mQClientFactory.getMQClientAPIImpl().sendMessage(
                      brokerAddr,
                      brokerName,
                      msg,
                      requestHeader,
                      timeout - costTimeSync,
                      communicationMode,
                      context,
                      this);
                  break;
              default:
                  assert false;
                  break;
          }

          // 执行 message hook after
          if (this.hasSendMessageHook()) {
            ...
          }
          return sendResult;
      } catch (RemotingException | InterruptedException | MQBrokerException e) {
        ...
      } finally {
        ...
      }
  }
  throw new MQClientException("The broker[" + brokerName + "] not exist", null);
}
```

源码位置: `org.apache.rocketmq.client.impl.MQClientAPIImpl#sendMessage`

```java
// 发送消息
public SendResult sendMessage(
  final String addr,
  final String brokerName,
  final Message msg,
  final SendMessageRequestHeader requestHeader,
  final long timeoutMillis,
  final CommunicationMode communicationMode,
  final SendCallback sendCallback,
  final TopicPublishInfo topicPublishInfo,
  final MQClientInstance instance,
  final int retryTimesWhenSendFailed,
  final SendMessageContext context,
  final DefaultMQProducerImpl producer
) throws RemotingException, MQBrokerException, InterruptedException {
  long beginStartTime = System.currentTimeMillis();
  RemotingCommand request = null;
  // 获取消息类型
  String msgType = msg.getProperty(MessageConst.PROPERTY_MESSAGE_TYPE);
  boolean isReply = msgType != null && msgType.equals(MixAll.REPLY_MESSAGE_FLAG);
  // reply 消息
  if (isReply) {
      if (sendSmartMsg) {
          // sendSmartMsg 是一种优化，节约了字段长度，默认开启
          SendMessageRequestHeaderV2 requestHeaderV2 = SendMessageRequestHeaderV2.createSendMessageRequestHeaderV2(requestHeader);
          request = RemotingCommand.createRequestCommand(RequestCode.SEND_REPLY_MESSAGE_V2, requestHeaderV2);
      } else {
          request = RemotingCommand.createRequestCommand(RequestCode.SEND_REPLY_MESSAGE, requestHeader);
      }
  } else {
      // sendSmartMsg 是一种优化，节约了字段长度，默认开启
      if (sendSmartMsg || msg instanceof MessageBatch) {
          SendMessageRequestHeaderV2 requestHeaderV2 = SendMessageRequestHeaderV2.createSendMessageRequestHeaderV2(requestHeader);
          request = RemotingCommand.createRequestCommand(msg instanceof MessageBatch ? RequestCode.SEND_BATCH_MESSAGE : RequestCode.SEND_MESSAGE_V2, requestHeaderV2);
      } else {
          request = RemotingCommand.createRequestCommand(RequestCode.SEND_MESSAGE, requestHeader);
      }
  }
  // 对于普通消息是 RequestCode.SEND_MESSAGE_V2
  request.setBody(msg.getBody());

  // 发给 broker
  switch (communicationMode) {
      case ONEWAY:
          // 发送 oneway
          this.remotingClient.invokeOneway(addr, request, timeoutMillis);
          return null;
      case ASYNC:
          ...
          // 发送 异步
          this.sendMessageAsync(addr, brokerName, msg, timeoutMillis - costTimeAsync, request, sendCallback, topicPublishInfo, instance,
              retryTimesWhenSendFailed, times, context, producer);
          return null;
      case SYNC:
          ...
          // 发送 同步
          return this.sendMessageSync(addr, brokerName, msg, timeoutMillis - costTimeSync, request);
      default:
          assert false;
          break;
  }
  return null;
}
```

## broker 接受消息

源码位置: `org.apache.rocketmq.remoting.protocol.header.SendMessageRequestHeader#parseRequestHeader`

```java
// 处理 RequestCode.SEND_MESSAGE_V2
public static SendMessageRequestHeader parseRequestHeader(RemotingCommand request) throws RemotingCommandException {
  SendMessageRequestHeaderV2 requestHeaderV2 = null;
  SendMessageRequestHeader requestHeader = null;
  switch (request.getCode()) {
      case RequestCode.SEND_BATCH_MESSAGE:
      case RequestCode.SEND_MESSAGE_V2:
          // 获取 requestHeaderV2
          requestHeaderV2 =
              (SendMessageRequestHeaderV2) request
                  .decodeCommandCustomHeader(SendMessageRequestHeaderV2.class);
      case RequestCode.SEND_MESSAGE:
          if (null == requestHeaderV2) {
              requestHeader =
                  (SendMessageRequestHeader) request
                      .decodeCommandCustomHeader(SendMessageRequestHeader.class);
          } else {
              // requestHeaderV2 转为 requestHeader
              requestHeader = SendMessageRequestHeaderV2.createSendMessageRequestHeaderV1(requestHeaderV2);
          }
      default:
          break;
  }
  return requestHeader;
}
```

源码位置: `org.apache.rocketmq.broker.processor.SendMessageProcessor#processRequest`

```java
// 
public RemotingCommand processRequest(ChannelHandlerContext ctx,
  RemotingCommand request) throws RemotingCommandException {
  SendMessageContext sendMessageContext;
  switch (request.getCode()) {
    case RequestCode.CONSUMER_SEND_MSG_BACK:
      return this.consumerSendMsgBack(ctx, request);
    default:
      // 解析 requestHeader
      SendMessageRequestHeader requestHeader = parseRequestHeader(request);
      if (requestHeader == null) {
          return null;
      }
      TopicQueueMappingContext mappingContext = this.brokerController.getTopicQueueMappingManager().buildTopicQueueMappingContext(requestHeader, true);
      // 处理静态 topic
      RemotingCommand rewriteResult = this.brokerController.getTopicQueueMappingManager().rewriteRequestForStaticTopic(requestHeader, mappingContext);
      if (rewriteResult != null) {
          return rewriteResult;
      }
      ...
      RemotingCommand response;
      if (requestHeader.isBatch()) {
          // 处理批量消息
          response = this.sendBatchMessage(ctx, request, sendMessageContext, requestHeader, mappingContext,
              (ctx1, response1) -> executeSendMessageHookAfter(response1, ctx1));
      } else {
          // 处理消息
          response = this.sendMessage(ctx, request, sendMessageContext, requestHeader, mappingContext,
              (ctx12, response12) -> executeSendMessageHookAfter(response12, ctx12));
      }
      return response;
  }
}
```

源码位置: `org.apache.rocketmq.broker.processor.SendMessageProcessor#sendMessage`

```java
// 处理消息
// 代码非常多，沉下心来看
public RemotingCommand sendMessage(final ChannelHandlerContext ctx,
  final RemotingCommand request,
  final SendMessageContext sendMessageContext,
  final SendMessageRequestHeader requestHeader,
  final TopicQueueMappingContext mappingContext,
  final SendMessageCallback sendMessageCallback) throws RemotingCommandException {

  // 设置 response, 添加属性 PROPERTY_MSG_REGION，PROPERTY_TRACE_SWITCH
  final RemotingCommand response = preSend(ctx, request, requestHeader);
  if (response.getCode() != -1) {
      return response;
  }

  final SendMessageResponseHeader responseHeader = (SendMessageResponseHeader) response.readCustomHeader();

  final byte[] body = request.getBody();

  int queueIdInt = requestHeader.getQueueId();
  // 获取 topic 配置
  TopicConfig topicConfig = this.brokerController.getTopicConfigManager().selectTopicConfig(requestHeader.getTopic());

  // 随机选择一个 queue
  if (queueIdInt < 0) {
      queueIdInt = randomQueueId(topicConfig.getWriteQueueNums());
  }

  MessageExtBrokerInner msgInner = new MessageExtBrokerInner();
  msgInner.setTopic(requestHeader.getTopic());
  msgInner.setQueueId(queueIdInt);

  Map<String, String> oriProps = MessageDecoder.string2messageProperties(requestHeader.getProperties());
  // 处理重试和死信消息
  if (!handleRetryAndDLQ(requestHeader, response, request, msgInner, topicConfig, oriProps)) {
      return response;
  }

  msgInner.setBody(body);
  msgInner.setFlag(requestHeader.getFlag());

  // 生成消息唯一ID
  String uniqKey = oriProps.get(MessageConst.PROPERTY_UNIQ_CLIENT_MESSAGE_ID_KEYIDX);
  if (uniqKey == null || uniqKey.length() <= 0) {
      uniqKey = MessageClientIDSetter.createUniqID();
      oriProps.put(MessageConst.PROPERTY_UNIQ_CLIENT_MESSAGE_ID_KEYIDX, uniqKey);
  }
  ...
  // 设置 tag 的 hashcode
  msgInner.setTagsCode(MessageExtBrokerInner.tagsString2tagsCode(topicConfig.getTopicFilterType(), msgInner.getTags()));
  msgInner.setBornTimestamp(requestHeader.getBornTimestamp());
  msgInner.setBornHost(ctx.channel().remoteAddress());
  msgInner.setStoreHost(this.getStoreHost());
  msgInner.setReconsumeTimes(requestHeader.getReconsumeTimes() == null ? 0 : requestHeader.getReconsumeTimes());
  String clusterName = this.brokerController.getBrokerConfig().getBrokerClusterName();
  MessageAccessor.putProperty(msgInner, MessageConst.PROPERTY_CLUSTER, clusterName);

  msgInner.setPropertiesString(MessageDecoder.messageProperties2String(msgInner.getProperties()));

  // Map<String, String> oriProps = MessageDecoder.string2messageProperties(requestHeader.getProperties());
  String traFlag = oriProps.get(MessageConst.PROPERTY_TRANSACTION_PREPARED);
  boolean sendTransactionPrepareMessage = false;
  // 检查事务消息
  if (Boolean.parseBoolean(traFlag)
      && !(msgInner.getReconsumeTimes() > 0 && msgInner.getDelayTimeLevel() > 0)) { //For client under version 4.6.1
      if (this.brokerController.getBrokerConfig().isRejectTransactionMessage()) {
          response.setCode(ResponseCode.NO_PERMISSION);
          response.setRemark(
              "the broker[" + this.brokerController.getBrokerConfig().getBrokerIP1()
                  + "] sending transaction message is forbidden");
          return response;
      }
      sendTransactionPrepareMessage = true;
  }

  long beginTimeMillis = this.brokerController.getMessageStore().now();

  // 是否异步发送，无论是同步还是异步，处理逻辑都是一样的
  if (brokerController.getBrokerConfig().isAsyncSendEnable()) {
      CompletableFuture<PutMessageResult> asyncPutMessageFuture;
      if (sendTransactionPrepareMessage) {
          // 存储 prepare 事务消息
          asyncPutMessageFuture = this.brokerController.getTransactionalMessageService().asyncPrepareMessage(msgInner);
      } else {
          // 存储消息，后面的章节会继续分析
          asyncPutMessageFuture = this.brokerController.getMessageStore().asyncPutMessage(msgInner);
      }

      final int finalQueueIdInt = queueIdInt;
      final MessageExtBrokerInner finalMsgInner = msgInner;
      asyncPutMessageFuture.thenAcceptAsync(putMessageResult -> {
          RemotingCommand responseFuture =
              // 处理存储结果，这里设置相应的 code 和 remark, 记录 metric  
              handlePutMessageResult(putMessageResult, response, request, finalMsgInner, responseHeader, sendMessageContext,
                  ctx, finalQueueIdInt, beginTimeMillis, mappingContext, BrokerMetricsManager.getMessageType(requestHeader));
          if (responseFuture != null) {
              doResponse(ctx, request, responseFuture);
          }
          sendMessageCallback.onComplete(sendMessageContext, response);
      }, this.brokerController.getPutMessageFutureExecutor());
      // Returns null to release the send message thread
      return null;
  } else {
      // 同步存储消息
      PutMessageResult putMessageResult = null;
      if (sendTransactionPrepareMessage) {
          // 存储 prepare 事务消息
          putMessageResult = this.brokerController.getTransactionalMessageService().prepareMessage(msgInner);
      } else {
          // 存储消息， 后面的章节会继续分析
          putMessageResult = this.brokerController.getMessageStore().putMessage(msgInner);
      }
      // 处理存储结果，这里设置相应的 code 和 remark, 记录 metric  
      handlePutMessageResult(putMessageResult, response, request, msgInner, responseHeader, sendMessageContext, ctx, queueIdInt, beginTimeMillis, mappingContext, BrokerMetricsManager.getMessageType(requestHeader));
      sendMessageCallback.onComplete(sendMessageContext, response);
      return response;
  }
}
```

## 测试类

`org.apache.rocketmq.test.client.consumer.topic.OneConsumerMulTopicIT#testSynSendMessage`

