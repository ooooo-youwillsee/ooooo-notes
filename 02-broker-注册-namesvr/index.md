# 02 Broker 注册 Namesvr


&gt; rocketmq 基于 5.1.4 版本

## broker 发起注册请求

源码位置: `org.apache.rocketmq.broker.BrokerController#start`

```java
// 启动定时任务，发起 broker 注册
public void start() throws Exception {
    ...
    if (!isIsolated &amp;&amp; !this.messageStoreConfig.isEnableDLegerCommitLog() &amp;&amp; !this.messageStoreConfig.isDuplicationEnable()) {
        changeSpecialServiceStatus(this.brokerConfig.getBrokerId() == MixAll.MASTER_ID);
        // 注册 broker
        this.registerBrokerAll(true, false, true);
    }
  
    // 定时任务
    scheduledFutures.add(this.scheduledExecutorService.scheduleAtFixedRate(new AbstractBrokerRunnable(this.getBrokerIdentity()) {
        @Override
        public void run0() {
            try {
                if (System.currentTimeMillis() &lt; shouldStartTime) {
                    BrokerController.LOG.info(&#34;Register to namesrv after {}&#34;, shouldStartTime);
                    return;
                }
                if (isIsolated) {
                    BrokerController.LOG.info(&#34;Skip register for broker is isolated&#34;);
                    return;
                }
                // 注册 broker
                BrokerController.this.registerBrokerAll(true, false, brokerConfig.isForceRegister());
            } catch (Throwable e) {
                BrokerController.LOG.error(&#34;registerBrokerAll Exception&#34;, e);
            }
        }
    }, 1000 * 10, Math.max(10000, Math.min(brokerConfig.getRegisterNameServerPeriod(), 60000)), TimeUnit.MILLISECONDS));
  
    ...
}
```

源码位置: `org.apache.rocketmq.broker.BrokerController#registerBrokerAll`

```java
// 注册 broker, 需要把 broker 的 topic 配置推送到 namesrv 中
public synchronized void registerBrokerAll(final boolean checkOrderConfig, boolean oneway, boolean forceRegister) {
    ConcurrentMap&lt;String, TopicConfig&gt; topicConfigMap = this.getTopicConfigManager().getTopicConfigTable();
    ConcurrentHashMap&lt;String, TopicConfig&gt; topicConfigTable = new ConcurrentHashMap&lt;&gt;();

    // 遍历 topic
    for (TopicConfig topicConfig : topicConfigMap.values()) {
        // 设置权限
        if (!PermName.isWriteable(this.getBrokerConfig().getBrokerPermission())
            || !PermName.isReadable(this.getBrokerConfig().getBrokerPermission())) {
            topicConfigTable.put(topicConfig.getTopicName(),
                new TopicConfig(topicConfig.getTopicName(), topicConfig.getReadQueueNums(), topicConfig.getWriteQueueNums(),
                    topicConfig.getPerm() &amp; getBrokerConfig().getBrokerPermission()));
        } else {
            topicConfigTable.put(topicConfig.getTopicName(), topicConfig);
        }

        // topic 很多，分几个请求
        if (this.brokerConfig.isEnableSplitRegistration()
            &amp;&amp; topicConfigTable.size() &gt;= this.brokerConfig.getSplitRegistrationSize()) {
            TopicConfigAndMappingSerializeWrapper topicConfigWrapper = this.getTopicConfigManager().buildSerializeWrapper(topicConfigTable);
            doRegisterBrokerAll(checkOrderConfig, oneway, topicConfigWrapper);
            topicConfigTable.clear();
        }
    }

    // topic 的 TopicQueueMappingInfo, 暂时不用关心
    Map&lt;String, TopicQueueMappingInfo&gt; topicQueueMappingInfoMap = this.getTopicQueueMappingManager().getTopicQueueMappingTable().entrySet().stream()
        .map(entry -&gt; new AbstractMap.SimpleImmutableEntry&lt;&gt;(entry.getKey(), TopicQueueMappingDetail.cloneAsMappingInfo(entry.getValue())))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

    TopicConfigAndMappingSerializeWrapper topicConfigWrapper = this.getTopicConfigManager().
        buildSerializeWrapper(topicConfigTable, topicQueueMappingInfoMap);
    // 检查是否需要注册
    if (this.brokerConfig.isEnableSplitRegistration() || forceRegister || needRegister(this.brokerConfig.getBrokerClusterName(),
        this.getBrokerAddr(),
        this.brokerConfig.getBrokerName(),
        this.brokerConfig.getBrokerId(),
        this.brokerConfig.getRegisterBrokerTimeoutMills(),
        this.brokerConfig.isInBrokerContainer())) {
        // 注册 broker 到所有的 namesrv
        doRegisterBrokerAll(checkOrderConfig, oneway, topicConfigWrapper);
    }
}
```

源码位置: `org.apache.rocketmq.broker.BrokerController#doRegisterBrokerAll`

```java
// 注册 broker 到所有的 namesrv
protected void doRegisterBrokerAll(boolean checkOrderConfig, boolean oneway,
    TopicConfigSerializeWrapper topicConfigWrapper) {
  
    if (shutdown) {
        BrokerController.LOG.info(&#34;BrokerController#doResterBrokerAll: broker has shutdown, no need to register any more.&#34;);
        return;
    }
    // 发起 RegisterBrokerRequestHeader 请求, RequestCode.REGISTER_BROKER
    List&lt;RegisterBrokerResult&gt; registerBrokerResultList = this.brokerOuterAPI.registerBrokerAll(
        this.brokerConfig.getBrokerClusterName(),
        this.getBrokerAddr(),
        this.brokerConfig.getBrokerName(),
        this.brokerConfig.getBrokerId(),
        this.getHAServerAddr(),
        topicConfigWrapper,
        Lists.newArrayList(),
        oneway,
        this.brokerConfig.getRegisterBrokerTimeoutMills(),
        this.brokerConfig.isEnableSlaveActingMaster(),
        this.brokerConfig.isCompressedRegister(),
        this.brokerConfig.isEnableSlaveActingMaster() ? this.brokerConfig.getBrokerNotActiveTimeoutMillis() : null,
        this.getBrokerIdentity());
  
    // 处理注册结果，设置 master 和 HAMaster 地址
    handleRegisterBrokerResult(registerBrokerResultList, checkOrderConfig);
}
```

## namesrv 处理注册请求

源码位置: `org.apache.rocketmq.namesrv.processor.DefaultRequestProcessor#processRequest`

```java
public RemotingCommand processRequest(ChannelHandlerContext ctx,
    RemotingCommand request) throws RemotingCommandException {
        ...
        case RequestCode.REGISTER_BROKER:
            // 注册 broker
            return this.registerBroker(ctx, request);
        ...
}
```

源码位置: `org.apache.rocketmq.namesrv.processor.DefaultRequestProcessor#registerBroker`

```java
// 注册 broker
public RemotingCommand registerBroker(ChannelHandlerContext ctx,  RemotingCommand request) throws RemotingCommandException {
    // 解析出 RegisterBrokerResponseHeader
    final RemotingCommand response = RemotingCommand.createResponseCommand(RegisterBrokerResponseHeader.class);
    final RegisterBrokerResponseHeader responseHeader = (RegisterBrokerResponseHeader) response.readCustomHeader();
    final RegisterBrokerRequestHeader requestHeader =
        (RegisterBrokerRequestHeader) request.decodeCommandCustomHeader(RegisterBrokerRequestHeader.class);
  
    // 校验 crc32
    if (!checksum(ctx, request, requestHeader)) {
        response.setCode(ResponseCode.SYSTEM_ERROR);
        response.setRemark(&#34;crc32 not match&#34;);
        return response;
    }
  
    TopicConfigSerializeWrapper topicConfigWrapper = null;
    List&lt;String&gt; filterServerList = null;
  
    // 获取 topic 配置
    Version brokerVersion = MQVersion.value2Version(request.getVersion());
    if (brokerVersion.ordinal() &gt;= MQVersion.Version.V3_0_11.ordinal()) {
        final RegisterBrokerBody registerBrokerBody = extractRegisterBrokerBodyFromRequest(request, requestHeader);
        topicConfigWrapper = registerBrokerBody.getTopicConfigSerializeWrapper();
        filterServerList = registerBrokerBody.getFilterServerList();
    } else {
        // RegisterBrokerBody of old version only contains TopicConfig.
        topicConfigWrapper = extractRegisterTopicConfigFromRequest(request);
    }
  
    // 注册 broker 和 topic 信息
    RegisterBrokerResult result = this.namesrvController.getRouteInfoManager().registerBroker(
        requestHeader.getClusterName(),
        requestHeader.getBrokerAddr(),
        requestHeader.getBrokerName(),
        requestHeader.getBrokerId(),
        requestHeader.getHaServerAddr(),
        request.getExtFields().get(MixAll.ZONE_NAME),
        requestHeader.getHeartbeatTimeoutMillis(),
        requestHeader.getEnableActingMaster(),
        topicConfigWrapper,
        filterServerList,
        ctx.channel()
    );
  
    if (result == null) {
        // Register single topic route info should be after the broker completes the first registration.
        response.setCode(ResponseCode.SYSTEM_ERROR);
        response.setRemark(&#34;register broker failed&#34;);
        return response;
    }
  
    // 返回 master 和 HaMaster 地址
    responseHeader.setHaServerAddr(result.getHaServerAddr());
    responseHeader.setMasterAddr(result.getMasterAddr());
    ...
    return response;
}
```

源码位置: `org.apache.rocketmq.namesrv.routeinfo.RouteInfoManager#registerBroker`

```java
// 注册 broker 和 topic 信息
// 此方法的代码比较多，但处理逻辑比较清晰
public RegisterBrokerResult registerBroker(
    final String clusterName,
    final String brokerAddr,
    final String brokerName,
    final long brokerId,
    final String haServerAddr,
    final String zoneName,
    final Long timeoutMillis,
    final Boolean enableActingMaster,
    final TopicConfigSerializeWrapper topicConfigWrapper,
    final List&lt;String&gt; filterServerList,
    final Channel channel) {
    RegisterBrokerResult result = new RegisterBrokerResult();
    try {
        this.lock.writeLock().lockInterruptibly();
  
        //init or update the cluster info
        // 更新 cluster 信息
        Set&lt;String&gt; brokerNames = ConcurrentHashMapUtils.computeIfAbsent((ConcurrentHashMap&lt;String, Set&lt;String&gt;&gt;) this.clusterAddrTable, clusterName, k -&gt; new HashSet&lt;&gt;());
        brokerNames.add(brokerName);
  
        boolean registerFirst = false;
        // 添加 broker 信息
        BrokerData brokerData = this.brokerAddrTable.get(brokerName);
        if (null == brokerData) {
            registerFirst = true;
            brokerData = new BrokerData(clusterName, brokerName, new HashMap&lt;&gt;());
            this.brokerAddrTable.put(brokerName, brokerData);
        }
  
        boolean isOldVersionBroker = enableActingMaster == null;
        brokerData.setEnableActingMaster(!isOldVersionBroker &amp;&amp; enableActingMaster);
        brokerData.setZoneName(zoneName);
  
        Map&lt;Long, String&gt; brokerAddrsMap = brokerData.getBrokerAddrs();
  
        boolean isMinBrokerIdChanged = false;
        long prevMinBrokerId = 0;
        if (!brokerAddrsMap.isEmpty()) {
            prevMinBrokerId = Collections.min(brokerAddrsMap.keySet());
        }
  
        if (brokerId &lt; prevMinBrokerId) {
            isMinBrokerIdChanged = true;
        }
  
        //Switch slave to master: first remove &lt;1, IP:PORT&gt; in namesrv, then add &lt;0, IP:PORT&gt;
        //The same IP:PORT must only have one record in brokerAddrTable
        brokerAddrsMap.entrySet().removeIf(item -&gt; null != brokerAddr &amp;&amp; brokerAddr.equals(item.getValue()) &amp;&amp; brokerId != item.getKey());
  
        //If Local brokerId stateVersion bigger than the registering one,
        String oldBrokerAddr = brokerAddrsMap.get(brokerId);
        // 检查 brokerAddr
        if (null != oldBrokerAddr &amp;&amp; !oldBrokerAddr.equals(brokerAddr)) {
            BrokerLiveInfo oldBrokerInfo = brokerLiveTable.get(new BrokerAddrInfo(clusterName, oldBrokerAddr));
  
            if (null != oldBrokerInfo) {
                long oldStateVersion = oldBrokerInfo.getDataVersion().getStateVersion();
                long newStateVersion = topicConfigWrapper.getDataVersion().getStateVersion();
                if (oldStateVersion &gt; newStateVersion) {
                    log.warn(&#34;Registered Broker conflicts with the existed one, just ignore.: Cluster:{}, BrokerName:{}, BrokerId:{}, &#34; &#43;
                            &#34;Old BrokerAddr:{}, Old Version:{}, New BrokerAddr:{}, New Version:{}.&#34;,
                        clusterName, brokerName, brokerId, oldBrokerAddr, oldStateVersion, brokerAddr, newStateVersion);
                    //Remove the rejected brokerAddr from brokerLiveTable.
                    brokerLiveTable.remove(new BrokerAddrInfo(clusterName, brokerAddr));
                    return result;
                }
            }
        }
  
        if (!brokerAddrsMap.containsKey(brokerId) &amp;&amp; topicConfigWrapper.getTopicConfigTable().size() == 1) {
            log.warn(&#34;Can&#39;t register topicConfigWrapper={} because broker[{}]={} has not registered.&#34;,
                topicConfigWrapper.getTopicConfigTable(), brokerId, brokerAddr);
            return null;
        }
  
        String oldAddr = brokerAddrsMap.put(brokerId, brokerAddr);
        registerFirst = registerFirst || (StringUtils.isEmpty(oldAddr));
  
        boolean isMaster = MixAll.MASTER_ID == brokerId;
        boolean isPrimeSlave = !isOldVersionBroker &amp;&amp; !isMaster
            &amp;&amp; brokerId == Collections.min(brokerAddrsMap.keySet());
  
        // 判断是否为 master 或者 primeSlave (5.0之后引入的优化)
        if (null != topicConfigWrapper &amp;&amp; (isMaster || isPrimeSlave)) {
  
            ConcurrentMap&lt;String, TopicConfig&gt; tcTable =
                topicConfigWrapper.getTopicConfigTable();
  
            if (tcTable != null) {
  
                TopicConfigAndMappingSerializeWrapper mappingSerializeWrapper = TopicConfigAndMappingSerializeWrapper.from(topicConfigWrapper);
                Map&lt;String, TopicQueueMappingInfo&gt; topicQueueMappingInfoMap = mappingSerializeWrapper.getTopicQueueMappingInfoMap();
  
                // Delete the topics that don&#39;t exist in tcTable from the current broker
                // Static topic is not supported currently
                // 检查是否删除 topic，默认为 false
                if (namesrvConfig.isDeleteTopicWithBrokerRegistration() &amp;&amp; topicQueueMappingInfoMap.isEmpty()) {
                    final Set&lt;String&gt; oldTopicSet = topicSetOfBrokerName(brokerName);
                    final Set&lt;String&gt; newTopicSet = tcTable.keySet();
                    final Sets.SetView&lt;String&gt; toDeleteTopics = Sets.difference(oldTopicSet, newTopicSet);
                    for (final String toDeleteTopic : toDeleteTopics) {
                        Map&lt;String, QueueData&gt; queueDataMap = topicQueueTable.get(toDeleteTopic);
                        final QueueData removedQD = queueDataMap.remove(brokerName);
                        if (removedQD != null) {
                            log.info(&#34;deleteTopic, remove one broker&#39;s topic {} {} {}&#34;, brokerName, toDeleteTopic, removedQD);
                        }
  
                        if (queueDataMap.isEmpty()) {
                            log.info(&#34;deleteTopic, remove the topic all queue {}&#34;, toDeleteTopic);
                            topicQueueTable.remove(toDeleteTopic);
                        }
                    }
                }
  
                // 遍历 topic 配置
                for (Map.Entry&lt;String, TopicConfig&gt; entry : tcTable.entrySet()) {
                    // 检查 topic 配置是否改变
                    if (registerFirst || this.isTopicConfigChanged(clusterName, brokerAddr,
                        topicConfigWrapper.getDataVersion(), brokerName,
                        entry.getValue().getTopicName())) {
                        final TopicConfig topicConfig = entry.getValue();
                        if (isPrimeSlave) {
                            // Wipe write perm for prime slave
                            // 删除 write 权限
                            topicConfig.setPerm(topicConfig.getPerm() &amp; (~PermName.PERM_WRITE));
                        }
                        // 创建或者更新 queue
                        this.createAndUpdateQueueData(brokerName, topicConfig);
                    }
                }
  
                // 更新 topicQueueMappingInfoTable
                if (this.isBrokerTopicConfigChanged(clusterName, brokerAddr, topicConfigWrapper.getDataVersion()) || registerFirst) {
                    //the topicQueueMappingInfoMap should never be null, but can be empty
                    for (Map.Entry&lt;String, TopicQueueMappingInfo&gt; entry : topicQueueMappingInfoMap.entrySet()) {
                        if (!topicQueueMappingInfoTable.containsKey(entry.getKey())) {
                            topicQueueMappingInfoTable.put(entry.getKey(), new HashMap&lt;&gt;());
                        }
                        //Note asset brokerName equal entry.getValue().getBname()
                        //here use the mappingDetail.bname
                        topicQueueMappingInfoTable.get(entry.getKey()).put(entry.getValue().getBname(), entry.getValue());
                    }
                }
            }
        }
  
        // 添加 brokerAddr 信息，更新存活时间
        BrokerAddrInfo brokerAddrInfo = new BrokerAddrInfo(clusterName, brokerAddr);
        BrokerLiveInfo prevBrokerLiveInfo = this.brokerLiveTable.put(brokerAddrInfo,
            new BrokerLiveInfo(
                System.currentTimeMillis(),
                timeoutMillis == null ? DEFAULT_BROKER_CHANNEL_EXPIRED_TIME : timeoutMillis,
                topicConfigWrapper == null ? new DataVersion() : topicConfigWrapper.getDataVersion(),
                channel,
                haServerAddr));
        if (null == prevBrokerLiveInfo) {
            log.info(&#34;new broker registered, {} HAService: {}&#34;, brokerAddrInfo, haServerAddr);
        }
  
        ...
        // 说明是 slave，就设置 master 和 HaMaster 
        if (MixAll.MASTER_ID != brokerId) {
            String masterAddr = brokerData.getBrokerAddrs().get(MixAll.MASTER_ID);
            if (masterAddr != null) {
                BrokerAddrInfo masterAddrInfo = new BrokerAddrInfo(clusterName, masterAddr);
                BrokerLiveInfo masterLiveInfo = this.brokerLiveTable.get(masterAddrInfo);
                if (masterLiveInfo != null) {
                    result.setHaServerAddr(masterLiveInfo.getHaServerAddr());
                    result.setMasterAddr(masterAddr);
                }
            }
        }
        ...
    } catch (Exception e) {
        log.error(&#34;registerBroker Exception&#34;, e);
    } finally {
        this.lock.writeLock().unlock();
    }
    return result;
}
```

## namesrv 检查失效的 broker

源码位置: `org.apache.rocketmq.namesrv.NamesrvController#startScheduleService`

```java
private void startScheduleService() {
    // 扫描失效的 broker 
    this.scanExecutorService.scheduleAtFixedRate(NamesrvController.this.routeInfoManager::scanNotActiveBroker,
        5, this.namesrvConfig.getScanNotActiveBrokerInterval(), TimeUnit.MILLISECONDS);
    ...
}
```

源码位置: `org.apache.rocketmq.namesrv.routeinfo.RouteInfoManager#scanNotActiveBroker`

```java
// 扫描失效的 broker 
public void scanNotActiveBroker() {
    try {
        log.info(&#34;start scanNotActiveBroker&#34;);
        // 遍历 brokerLiveTable
        for (Entry&lt;BrokerAddrInfo, BrokerLiveInfo&gt; next : this.brokerLiveTable.entrySet()) {
            long last = next.getValue().getLastUpdateTimestamp();
            long timeoutMillis = next.getValue().getHeartbeatTimeoutMillis();
            // 检查时间
            if ((last &#43; timeoutMillis) &lt; System.currentTimeMillis()) {
                RemotingHelper.closeChannel(next.getValue().getChannel());
                log.warn(&#34;The broker channel expired, {} {}ms&#34;, next.getKey(), timeoutMillis);
                this.onChannelDestroy(next.getKey());
            }
        }
    } catch (Exception e) {
        log.error(&#34;scanNotActiveBroker exception&#34;, e);
    }
}
```

## 测试类

`org.apache.rocketmq.test.client.consumer.topic.OneConsumerMulTopicIT#testSynSendMessage`


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/02-broker-%E6%B3%A8%E5%86%8C-namesvr/  

