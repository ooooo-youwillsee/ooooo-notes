# 源码分析 nacos 发布配置


在 `nacos` 中，发布配置分为 `http` 和 `grpc` 两种方式，分别为 `ConfigControllerV2#publishConfig` 和 `ConfigPublishRequestHandler`。这两个方法的处理逻辑都是**一样的**，所以我就选择 `http` 的方式来分析代码。

## 发布配置

源码位置: `com.alibaba.nacos.config.server.controller.v2.ConfigControllerV2#publishConfig`

```java
// 接受 http 请求，发布配置
public Result<Boolean> publishConfig(ConfigForm configForm, HttpServletRequest request) throws NacosException {
    // check required field
    configForm.validate();
    // encrypted
    Pair<String, String> pair = EncryptionHandler.encryptHandler(configForm.getDataId(), configForm.getContent());
    configForm.setContent(pair.getSecond());
    //fix issue #9783
    configForm.setNamespaceId(NamespaceUtil.processNamespaceParameter(configForm.getNamespaceId()));
    // check param
    ParamUtils.checkTenantV2(configForm.getNamespaceId());
    ParamUtils.checkParam(configForm.getDataId(), configForm.getGroup(), "datumId", configForm.getContent());
    ParamUtils.checkParamV2(configForm.getTag());

    if (StringUtils.isBlank(configForm.getSrcUser())) {
        configForm.setSrcUser(RequestUtil.getSrcUserName(request));
    }
    if (!ConfigType.isValidType(configForm.getType())) {
        configForm.setType(ConfigType.getDefaultType().getType());
    }

    ConfigRequestInfo configRequestInfo = new ConfigRequestInfo();
    configRequestInfo.setSrcIp(RequestUtil.getRemoteIp(request));
    configRequestInfo.setRequestIpApp(RequestUtil.getAppName(request));
    configRequestInfo.setBetaIps(request.getHeader("betaIps"));

    String encryptedDataKey = pair.getFirst();

    // configOperationService 发布配置
    return Result.success(configOperationService.publishConfig(configForm, configRequestInfo, encryptedDataKey));
}
```

源码位置: `com.alibaba.nacos.config.server.service.ConfigOperationService#publishConfig`

```java
// configOperationService 发布配置
public Boolean publishConfig(ConfigForm configForm, ConfigRequestInfo configRequestInfo, String encryptedDataKey)
        throws NacosException {
    
    // 组装参数
    Map<String, Object> configAdvanceInfo = getConfigAdvanceInfo(configForm);
    // 检查参数
    ParamUtils.checkParam(configAdvanceInfo);
    
    // dataId 黑名单校验
    if (AggrWhitelist.isAggrDataId(configForm.getDataId())) {
        LOGGER.warn("[aggr-conflict] {} attempt to publish single data, {}, {}", configRequestInfo.getSrcIp(),
                configForm.getDataId(), configForm.getGroup());
        throw new NacosApiException(HttpStatus.FORBIDDEN.value(), ErrorCode.INVALID_DATA_ID,
                "dataId:" + configForm.getDataId() + " is aggr");
    }
    
    final Timestamp time = TimeUtils.getCurrentTime();
    // 封装为 configInfo 对象
    ConfigInfo configInfo = new ConfigInfo(configForm.getDataId(), configForm.getGroup(), configForm.getNamespaceId(),
            configForm.getAppName(), configForm.getContent());
    
    configInfo.setType(configForm.getType());
    configInfo.setEncryptedDataKey(encryptedDataKey);
    
    if (StringUtils.isBlank(configRequestInfo.getBetaIps())) {
        if (StringUtils.isBlank(configForm.getTag())) {
            // 没有 beta 和 tag，插入或者更新 config_info 表，这个也是最常用的
            configInfoPersistService.insertOrUpdate(configRequestInfo.getSrcIp(), configForm.getSrcUser(),
                    configInfo, time, configAdvanceInfo, false);
            // 发布 ConfigDataChangeEvent 事件
            ConfigChangePublisher.notifyConfigChange(
                    new ConfigDataChangeEvent(false, configForm.getDataId(), configForm.getGroup(),
                            configForm.getNamespaceId(), time.getTime()));
        } else {
            // 有 tag，插入或者更新 config_info_tag 表，注意控制台没有用到这个
            configInfoTagPersistService.insertOrUpdateTag(configInfo, configForm.getTag(),
                    configRequestInfo.getSrcIp(), configForm.getSrcUser(), time, false);
            // 发布 ConfigDataChangeEvent 事件
            ConfigChangePublisher.notifyConfigChange(
                    new ConfigDataChangeEvent(false, configForm.getDataId(), configForm.getGroup(),
                            configForm.getNamespaceId(), configForm.getTag(), time.getTime()));
        }
    } else {
        // beta publish
        // 有 beta, 插入或者更新 config_info_beta 表
        configInfoBetaPersistService.insertOrUpdateBeta(configInfo, configRequestInfo.getBetaIps(),
                configRequestInfo.getSrcIp(), configForm.getSrcUser(), time, false);
            // 发布 ConfigDataChangeEvent 事件
        ConfigChangePublisher.notifyConfigChange(
                new ConfigDataChangeEvent(true, configForm.getDataId(), configForm.getGroup(), configForm.getNamespaceId(),
                        time.getTime()));
    }
    // 记录日志
    ConfigTraceService.logPersistenceEvent(configForm.getDataId(), configForm.getGroup(), configForm.getNamespaceId(),
            configRequestInfo.getRequestIpApp(), time.getTime(), InetUtils.getSelfIP(),
            ConfigTraceService.PERSISTENCE_EVENT_PUB, configForm.getContent());
    
    return true;
}
```

## 处理 ConfigDataChangeEvent 事件

源码位置: `com.alibaba.nacos.config.server.service.notify.AsyncNotifyService#AsyncNotifyService`

```java
// 处理 ConfigDataChangeEvent 事件
@Autowired
public AsyncNotifyService(ServerMemberManager memberManager) {
    this.memberManager = memberManager;
    
    // Register ConfigDataChangeEvent to NotifyCenter.
    // 分配事件的缓冲大小
    NotifyCenter.registerToPublisher(ConfigDataChangeEvent.class, NotifyCenter.ringBufferSize);
    
    // Register A Subscriber to subscribe ConfigDataChangeEvent.
    // 注册 ConfigDataChangeEvent 的订阅者
    NotifyCenter.registerSubscriber(new Subscriber() {
        
        @Override
        public void onEvent(Event event) {
            // Generate ConfigDataChangeEvent concurrently
            if (event instanceof ConfigDataChangeEvent) {
                ConfigDataChangeEvent evt = (ConfigDataChangeEvent) event;
                long dumpTs = evt.lastModifiedTs;
                String dataId = evt.dataId;
                String group = evt.group;
                String tenant = evt.tenant;
                String tag = evt.tag;
                
                MetricsMonitor.incrementConfigChangeCount(tenant, group, dataId);
                
                Collection<Member> ipList = memberManager.allMembers();
                
                // In fact, any type of queue here can be
                Queue<NotifySingleRpcTask> rpcQueue = new LinkedList<>();
                
                // 遍历集群成员列表, 添加到队列中
                // A 服务配置发生改变之后，必须推送给 B 服务，因为 B 服务可能有订阅者来监听这个配置。
                for (Member member : ipList) {
                    // grpc report data change only
                    rpcQueue.add(
                            new NotifySingleRpcTask(dataId, group, tenant, tag, dumpTs, evt.isBeta, member));
                }
                if (!rpcQueue.isEmpty()) {
                    // 线程池调度 AsyncRpcTask 
                    ConfigExecutor.executeAsyncNotify(new AsyncRpcTask(rpcQueue));
                }
                
            }
        }
        
        @Override
        public Class<? extends Event> subscribeType() {
            return ConfigDataChangeEvent.class;
        }
    });
}
```

源码位置: `com.alibaba.nacos.config.server.service.notify.AsyncNotifyService.AsyncRpcTask`

```java
// 线程池调度 AsyncRpcTask 
class AsyncRpcTask implements Runnable {
    
    ...
    
    @Override
    public void run() {
        while (!queue.isEmpty()) {
            // 从队列中取出 task
            NotifySingleRpcTask task = queue.poll();
            
            ConfigChangeClusterSyncRequest syncRequest = new ConfigChangeClusterSyncRequest();
            syncRequest.setDataId(task.getDataId());
            syncRequest.setGroup(task.getGroup());
            syncRequest.setBeta(task.isBeta);
            syncRequest.setLastModified(task.getLastModified());
            syncRequest.setTag(task.tag);
            syncRequest.setTenant(task.getTenant());
            Member member = task.member;
            // 是当前服务
            if (memberManager.getSelf().equals(member)) {
                // 处理逻辑分为是不是 beta，调用的方法都是 dumpService#dump
                if (syncRequest.isBeta()) {
                    dumpService.dump(syncRequest.getDataId(), syncRequest.getGroup(), syncRequest.getTenant(),
                            syncRequest.getLastModified(), NetUtils.localIP(), true);
                } else {
                    dumpService.dump(syncRequest.getDataId(), syncRequest.getGroup(), syncRequest.getTenant(),
                            syncRequest.getTag(), syncRequest.getLastModified(), NetUtils.localIP());
                }
                continue;
            }
            
            // 地址是有效的
            if (memberManager.hasMember(member.getAddress())) {
                // start the health check and there are ips that are not monitored, put them directly in the notification queue, otherwise notify
                boolean unHealthNeedDelay = memberManager.isUnHealth(member.getAddress());
                if (unHealthNeedDelay) {
                    // target ip is unhealthy, then put it in the notification list
                    ConfigTraceService.logNotifyEvent(task.getDataId(), task.getGroup(), task.getTenant(), null,
                            task.getLastModified(), InetUtils.getSelfIP(), ConfigTraceService.NOTIFY_EVENT_UNHEALTH,
                            0, member.getAddress());
                    // get delay time and set fail count to the task
                    // 如果地址是不健康的，延时来执行 task
                    asyncTaskExecute(task);
                } else {

                    // grpc report data change only
                    try {
                        // 地址是健康的，用 grpc 来发送 ConfigChangeClusterSyncRequest 请求，
                        // 会被 ConfigChangeClusterSyncRequestHandler 来处理
                        configClusterRpcClientProxy
                                .syncConfigChange(member, syncRequest, new AsyncRpcNotifyCallBack(task));
                    } catch (Exception e) {
                        MetricsMonitor.getConfigNotifyException().increment();
                        // 发送异常，延时来重试
                        asyncTaskExecute(task);
                    }
                  
                }
            } else {
                //No nothig if  member has offline.
            }
            
        }
    }
}
```

源码位置: `com.alibaba.nacos.config.server.remote.ConfigChangeClusterSyncRequestHandler#handle`

```java
// 处理 ConfigChangeClusterSyncRequest 请求
@Override
public ConfigChangeClusterSyncResponse handle(ConfigChangeClusterSyncRequest configChangeSyncRequest,
        RequestMeta meta) throws NacosException {
    
    // 调用 dumpService#dump 方法
    if (configChangeSyncRequest.isBeta()) {
        dumpService.dump(configChangeSyncRequest.getDataId(), configChangeSyncRequest.getGroup(),
                configChangeSyncRequest.getTenant(), configChangeSyncRequest.getLastModified(), meta.getClientIp(),
                true);
    } else {
        dumpService.dump(configChangeSyncRequest.getDataId(), configChangeSyncRequest.getGroup(),
                configChangeSyncRequest.getTenant(), configChangeSyncRequest.getLastModified(), meta.getClientIp());
    }
    return new ConfigChangeClusterSyncResponse();
}
```

## dumpService#dump 方法

源码位置: `com.alibaba.nacos.config.server.service.dump.DumpService#dump`

```java
// dumpService#dump 方法
public void dump(String dataId, String group, String tenant, long lastModified, String handleIp, boolean isBeta) {
    String groupKey = GroupKey2.getKey(dataId, group, tenant);
    String taskKey = String.join("+", dataId, group, tenant, String.valueOf(isBeta));
    // 添加了 DumpTask，会被 DumpProcessor 来处理
    dumpTaskMgr.addTask(taskKey, new DumpTask(groupKey, lastModified, handleIp, isBeta));
    DUMP_LOG.info("[dump-task] add task. groupKey={}, taskKey={}", groupKey, taskKey);
}
```

源码位置: `com.alibaba.nacos.config.server.service.dump.processor.DumpProcessor#process`

```java
// 处理 DumpTask
@Override
public boolean process(NacosTask task) {
    DumpTask dumpTask = (DumpTask) task;
    String[] pair = GroupKey2.parseKey(dumpTask.getGroupKey());
    String dataId = pair[0];
    String group = pair[1];
    String tenant = pair[2];
    long lastModified = dumpTask.getLastModified();
    String handleIp = dumpTask.getHandleIp();
    boolean isBeta = dumpTask.isBeta();
    String tag = dumpTask.getTag();
    
    ConfigDumpEvent.ConfigDumpEventBuilder build = ConfigDumpEvent.builder().namespaceId(tenant).dataId(dataId)
            .group(group).isBeta(isBeta).tag(tag).lastModifiedTs(lastModified).handleIp(handleIp);
    
    // 下面的逻辑又分为 beta, tag 
    if (isBeta) {
        // if publish beta, then dump config, update beta cache
        ConfigInfo4Beta cf = configInfoBetaPersistService.findConfigInfo4Beta(dataId, group, tenant);
        
        // cf 为 null，说明之前删除了
        build.remove(Objects.isNull(cf));
        build.betaIps(Objects.isNull(cf) ? null : cf.getBetaIps());
        build.content(Objects.isNull(cf) ? null : cf.getContent());
        build.encryptedDataKey(Objects.isNull(cf) ? null : cf.getEncryptedDataKey());
        
        return DumpConfigHandler.configDump(build.build());
    }
    if (StringUtils.isBlank(tag)) {
        ConfigInfo cf = configInfoPersistService.findConfigInfo(dataId, group, tenant);
        
        build.remove(Objects.isNull(cf));
        build.content(Objects.isNull(cf) ? null : cf.getContent());
        build.type(Objects.isNull(cf) ? null : cf.getType());
        build.encryptedDataKey(Objects.isNull(cf) ? null : cf.getEncryptedDataKey());
    } else {
        ConfigInfo4Tag cf = configInfoTagPersistService.findConfigInfo4Tag(dataId, group, tenant, tag);
        
        build.remove(Objects.isNull(cf));
        build.content(Objects.isNull(cf) ? null : cf.getContent());
    }
    // 调用 DumpConfigHandler#configDump 方法
    return DumpConfigHandler.configDump(build.build());
}
```

源码位置: `com.alibaba.nacos.config.server.service.dump.DumpConfigHandler#configDump`

```java
// DumpConfigHandler#configDump 方法
public static boolean configDump(ConfigDumpEvent event) {
    ...
    // 处理逻辑又分为 beat， tag
    if (event.isBeta()) {
        boolean result;
        if (event.isRemove()) {
            // 删除配置
            result = ConfigCacheService.removeBeta(dataId, group, namespaceId);
            if (result) {
                // 记录日志
                ConfigTraceService.logDumpEvent(dataId, group, namespaceId, null, lastModified, event.getHandleIp(),
                        ConfigTraceService.DUMP_EVENT_REMOVE_OK, System.currentTimeMillis() - lastModified, 0);
            }
            return result;
        } else {
            // 更新配置
            result = ConfigCacheService
                    .dumpBeta(dataId, group, namespaceId, content, lastModified, event.getBetaIps(),
                            encryptedDataKey);
            if (result) {
                // 记录日志
                ConfigTraceService.logDumpEvent(dataId, group, namespaceId, null, lastModified, event.getHandleIp(),
                        ConfigTraceService.DUMP_EVENT_OK, System.currentTimeMillis() - lastModified,
                        content.length());
            }
        }
        
        return result;
    }
    if (StringUtils.isBlank(event.getTag())) {
        // dataId 黑名单加载
        if (dataId.equals(AggrWhitelist.AGGRIDS_METADATA)) {
            AggrWhitelist.load(content);
        }
        
        // clientIp 白名单
        if (dataId.equals(ClientIpWhiteList.CLIENT_IP_WHITELIST_METADATA)) {
            ClientIpWhiteList.load(content);
        }
        
        // switchMeta 元数据
        if (dataId.equals(SwitchService.SWITCH_META_DATAID)) {
            SwitchService.load(content);
        }
        
        boolean result;
        if (!event.isRemove()) {
            // 更新配置
            result = ConfigCacheService
                    .dump(dataId, group, namespaceId, content, lastModified, type, encryptedDataKey);
            ...
        } else {
            // 删除配置
            result = ConfigCacheService.remove(dataId, group, namespaceId);
            ...
        }
        return result;
    } else {
        //
        boolean result;
        if (!event.isRemove()) {
            // 更新配置
            result = ConfigCacheService
                    .dumpTag(dataId, group, namespaceId, event.getTag(), content, lastModified, encryptedDataKey);
            ...
        } else {
            // 删除配置
            result = ConfigCacheService.removeTag(dataId, group, namespaceId, event.getTag());
            ...
        }
        return result;
    }
}
```

源码位置: `com.alibaba.nacos.config.server.service.ConfigCacheService#removeBeta`

```java
// 删除配置 ConfigCacheService#removeBeta
public static boolean removeBeta(String dataId, String group, String tenant) {
    final String groupKey = GroupKey2.getKey(dataId, group, tenant);
    // 获取锁
    final int lockResult = tryWriteLock(groupKey);
    
    // If data is non-existent.
    // 数据不存在, 直接返回 true
    if (0 == lockResult) {
        DUMP_LOG.info("[remove-ok] {} not exist.", groupKey);
        return true;
    }
    
    // try to lock failed
    // 获取失败
    if (lockResult < 0) {
        DUMP_LOG.warn("[remove-error] write lock failed. {}", groupKey);
        return false;
    }
    
    try {
        if (!PropertyUtil.isDirectRead()) {
            // 移除本地文件
            DiskUtil.removeConfigInfo4Beta(dataId, group, tenant);
        }
        // 发布 LocalDataChangeEvent 事件，会被 RpcConfigChangeNotifier 和 LongPollingService 处理
        NotifyCenter.publishEvent(new LocalDataChangeEvent(groupKey, true, CACHE.get(groupKey).getIps4Beta()));
        CACHE.get(groupKey).setBeta(false);
        CACHE.get(groupKey).setIps4Beta(null);
        CACHE.get(groupKey).setMd54Beta(Constants.NULL);
        return true;
    } finally {
        releaseWriteLock(groupKey);
    }
}
```

源码位置: `com.alibaba.nacos.config.server.service.ConfigCacheService#dumpBeta`

```java
// 更新配置 ConfigCacheService#dumpBeta
public static boolean dumpBeta(String dataId, String group, String tenant, String content, long lastModifiedTs,
        String betaIps, String encryptedDataKey) {
    final String groupKey = GroupKey2.getKey(dataId, group, tenant);

    makeSure(groupKey, encryptedDataKey, true);
    // 获取锁
    final int lockResult = tryWriteLock(groupKey);
    assert (lockResult != 0);
    
    // 获取锁失败
    if (lockResult < 0) {
        DUMP_LOG.warn("[dump-beta-error] write lock failed. {}", groupKey);
        return false;
    }
    
    try {
        // 计算新配置的 md5 值
        final String md5 = MD5Utils.md5Hex(content, Constants.ENCODE);
        // 修改时间小，说明事件处理已经过期
        if (lastModifiedTs < ConfigCacheService.getLastModifiedTs4Beta(groupKey)) {
            DUMP_LOG.warn("[dump-beta-ignore] the content is old. groupKey={}, md5={}, lastModifiedOld={}, "
                            + "lastModifiedNew={}", groupKey, md5,
                    ConfigCacheService.getLastModifiedTs4Beta(groupKey), lastModifiedTs);
            return true;
        }
        // md5 值是一样的，并且缓存文件是存在，说明不需要更新
        if (md5.equals(ConfigCacheService.getContentBetaMd5(groupKey)) && DiskUtil.targetBetaFile(dataId, group, tenant).exists()) {
            DUMP_LOG.warn("[dump-beta-ignore] ignore to save cache file. groupKey={}, md5={}, lastModifiedOld={}, "
                            + "lastModifiedNew={}", groupKey, md5, ConfigCacheService.getLastModifiedTs(groupKey),
                    lastModifiedTs);
        } else if (!PropertyUtil.isDirectRead()) {
            // 更新缓存文件
            DiskUtil.saveBetaToDisk(dataId, group, tenant, content);
        }
        String[] betaIpsArr = betaIps.split(",");
        
        // 更新 md5 值
        updateBetaMd5(groupKey, md5, Arrays.asList(betaIpsArr), lastModifiedTs, encryptedDataKey);
        return true;
    } catch (IOException ioe) {
        DUMP_LOG.error("[dump-beta-exception] save disk error. " + groupKey + ", " + ioe);
        return false;
    } finally {
        releaseWriteLock(groupKey);
    }
}
```

源码位置: `com.alibaba.nacos.config.server.service.ConfigCacheService#updateBetaMd5`

```java
// 更新 md5 值
public static void updateBetaMd5(String groupKey, String md5, List<String> ips4Beta, long lastModifiedTs,
        String encryptedDataKey) {
    CacheItem cache = makeSure(groupKey, encryptedDataKey, true);
    if (cache.md54Beta == null || !cache.md54Beta.equals(md5) || !ips4Beta.equals(cache.ips4Beta)) {
        cache.isBeta = true;
        cache.md54Beta = md5;
        cache.lastModifiedTs4Beta = lastModifiedTs;
        cache.ips4Beta = ips4Beta;
        // 发布 LocalDataChangeEvent 事件，会被 RpcConfigChangeNotifier 和 LongPollingService 处理
        NotifyCenter.publishEvent(new LocalDataChangeEvent(groupKey, true, ips4Beta));
    }
}
```

## 处理 LocalDataChangeEvent 事件 

源码位置: ``

```java
// 处理 LocalDataChangeEvent 事件 
@Override
public void onEvent(LocalDataChangeEvent event) {
    ...   
    // 处理事件
    configDataChanged(groupKey, dataId, group, tenant, isBeta, betaIps, tag);
}

// 处理事件
public void configDataChanged(String groupKey, String dataId, String group, String tenant, boolean isBeta,
        List<String> betaIps, String tag) {
    Set<String> listeners = configChangeListenContext.getListeners(groupKey);
    if (CollectionUtils.isEmpty(listeners)) {
        return;
    }
    int notifyClientCount = 0;
    // 遍历所有订阅者
    for (final String client : listeners) {
        // 获取 Connection
        Connection connection = connectionManager.getConnection(client);
        if (connection == null) {
            continue;
        }
        
        ConnectionMeta metaInfo = connection.getMetaInfo();
        //beta ips check.
        String clientIp = metaInfo.getClientIp();
        String clientTag = metaInfo.getTag();
        // 判断是否要 beta 推送
        if (isBeta && betaIps != null && !betaIps.contains(clientIp)) {
            continue;
        }
        //tag check
        // 判断是否要 tag 推送
        if (StringUtils.isNotBlank(tag) && !tag.equals(clientTag)) {
            continue;
        }
        
        ConfigChangeNotifyRequest notifyRequest = ConfigChangeNotifyRequest.build(dataId, group, tenant);
        
        // 封装为 RpcPushTask，错误次数为 50 
        RpcPushTask rpcPushRetryTask = new RpcPushTask(notifyRequest, 50, client, clientIp, metaInfo.getAppName());
        // 异步推送配置数据
        push(rpcPushRetryTask);
        notifyClientCount++;
    }
    Loggers.REMOTE_PUSH.info("push [{}] clients ,groupKey=[{}]", notifyClientCount, groupKey);
}

// 异步推送配置数据
private void push(RpcPushTask retryTask) {
    ConfigChangeNotifyRequest notifyRequest = retryTask.notifyRequest;
    if (retryTask.isOverTimes()) {
        // 错误次数达到上限
        Loggers.REMOTE_PUSH
                .warn("push callback retry fail over times .dataId={},group={},tenant={},clientId={},will unregister client.",
                        notifyRequest.getDataId(), notifyRequest.getGroup(), notifyRequest.getTenant(),
                        retryTask.connectionId);
        // 注销连接
        connectionManager.unregister(retryTask.connectionId);
    } else if (connectionManager.getConnection(retryTask.connectionId) != null) {
        // first time:delay 0s; second time:delay 2s; third time:delay 4s
        // 线程池延迟调度
        ConfigExecutor.getClientConfigNotifierServiceExecutor()
                .schedule(retryTask, retryTask.tryTimes * 2, TimeUnit.SECONDS);
    } else {
        // client is already offline, ignore task.
    }
}
```

源码位置: `com.alibaba.nacos.config.server.remote.RpcConfigChangeNotifier.RpcPushTask#run`

```java
// RpcPushTask 执行
@Override
public void run() {
    tryTimes++;
    TpsCheckRequest tpsCheckRequest = new TpsCheckRequest();
   
    tpsCheckRequest.setPointName(POINT_CONFIG_PUSH);
    // 检查 tps，默认没有实现
    if (!tpsControlManager.check(tpsCheckRequest).isSuccess()) {
        push(this);
    } else {
        // 发送 notifyRequest 请求给客户端
        rpcPushService.pushWithCallback(connectionId, notifyRequest, new AbstractPushCallBack(3000L) {
            @Override
            public void onSuccess() {
                TpsCheckRequest tpsCheckRequest = new TpsCheckRequest();
                
                tpsCheckRequest.setPointName(POINT_CONFIG_PUSH_SUCCESS);
                tpsControlManager.check(tpsCheckRequest);
            }
            
            @Override
            public void onFail(Throwable e) {
                TpsCheckRequest tpsCheckRequest = new TpsCheckRequest();
                
                tpsCheckRequest.setPointName(POINT_CONFIG_PUSH_FAIL);
                tpsControlManager.check(tpsCheckRequest);
                Loggers.REMOTE_PUSH.warn("Push fail", e);
                push(RpcPushTask.this);
            }
            
        }, ConfigExecutor.getClientConfigNotifierServiceExecutor());
    }
}
```


