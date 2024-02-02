---
title: 21 client 订阅配置
date: 2023-09-16T08:00:00+08:00
draft: false
tags: [ nacos, source code, 源码分析 nacos 系列 ]
categories: [ 源码分析 nacos 系列 ]
---

> nacos 基于 2.2.4 版本

> 这里的 `client` 是指 `nacos SDK`，也就是模块 `nacos-client`.

## 添加订阅者

源码位置: `com.alibaba.nacos.client.config.NacosConfigService#addListener`

```java
// 添加监听器
@Override
public void addListener(String dataId, String group, Listener listener) throws NacosException {
    worker.addTenantListeners(dataId, group, Arrays.asList(listener));
}

// 添加监听器 
public void addTenantListeners(String dataId, String group, List<? extends Listener> listeners)
        throws NacosException {
    group = blank2defaultGroup(group);
    String tenant = agent.getTenant();
    // 添加到 CacheData 里面，对同一个 dataId, group, tenant 可能有多个 listener
    CacheData cache = addCacheDataIfAbsent(dataId, group, tenant);
    synchronized (cache) {
        for (Listener listener : listeners) {
            cache.addListener(listener);
        }
        // 不删除
        cache.setDiscard(false);
        // 和服务器不一致
        cache.setConsistentWithServer(false);
        // 通知监听配置
        agent.notifyListenConfig();
    }
    
}
```

## 通知监听配置

源码位置: `com.alibaba.nacos.client.config.impl.ClientWorker.ConfigRpcTransportClient#notifyListenConfig`

```java
// 通知监听配置
@Override
public void notifyListenConfig() {
    // 向队列 listenExecutebell 添加一个通知
    listenExecutebell.offer(bellItem);
}

// 客户端启动会调用这个方法
@Override
public void startInternal() {
    executor.schedule(() -> {
        while (!executor.isShutdown() && !executor.isTerminated()) {
            try {
                // 获取通知, 最大间隔时间为 5 秒
                listenExecutebell.poll(5L, TimeUnit.SECONDS);
                if (executor.isShutdown() || executor.isTerminated()) {
                    continue;
                }
                // 执行配置监听
                executeConfigListen();
            } catch (Throwable e) {
                LOGGER.error("[rpc listen execute] [rpc listen] exception", e);
                try {
                    Thread.sleep(50L);
                } catch (InterruptedException interruptedException) {
                    //ignore
                }
                notifyListenConfig();
            }
        }
    }, 0L, TimeUnit.MILLISECONDS);
    
}
```

源码位置: ``

```java
// 执行配置监听
@Override
public void executeConfigListen() {
    Map<String, List<CacheData>> listenCachesMap = new HashMap<>(16);
    Map<String, List<CacheData>> removeListenCachesMap = new HashMap<>(16);
    long now = System.currentTimeMillis();
    // 每隔一段时间都需要全同步配置
    boolean needAllSync = now - lastAllSyncTime >= ALL_SYNC_INTERNAL;
    // 遍历 cacheMap, 这个 map 都是要监听的配置
    for (CacheData cache : cacheMap.get().values()) {
        
        synchronized (cache) {
            
            //check local listeners consistent.
            // 判断是否和服务端一致，不一致，需要刷新配置
            if (cache.isConsistentWithServer()) {
                // 检查配置 md5 值, 不一致就推送给订阅者
                cache.checkListenerMd5();
                if (!needAllSync) {
                    continue;
                }
            }
            
            // 不是删除的配置，
            if (!cache.isDiscard()) {
                //get listen  config
                if (!cache.isUseLocalConfigInfo()) {
                    List<CacheData> cacheDatas = listenCachesMap.get(String.valueOf(cache.getTaskId()));
                    if (cacheDatas == null) {
                        cacheDatas = new LinkedList<>();
                        listenCachesMap.put(String.valueOf(cache.getTaskId()), cacheDatas);
                    }
                    // 添加要监听的配置
                    cacheDatas.add(cache);
                }
            } else if (cache.isDiscard() && CollectionUtils.isEmpty(cache.getListeners())) {
                // 是删除的配置，并且订阅者是空 
                if (!cache.isUseLocalConfigInfo()) {
                    List<CacheData> cacheDatas = removeListenCachesMap.get(String.valueOf(cache.getTaskId()));
                    if (cacheDatas == null) {
                        cacheDatas = new LinkedList<>();
                        removeListenCachesMap.put(String.valueOf(cache.getTaskId()), cacheDatas);
                    }
                    // 添加要删除的订阅者
                    cacheDatas.add(cache);
                }
            }
        }
        
    }
    
    //execute check listen ,return true if has change keys.
    // 拉取配置，检查是否改变
    boolean hasChangedKeys = checkListenCache(listenCachesMap);
    
    //execute check remove listen.
    // 删除监听
    checkRemoveListenCache(removeListenCachesMap);
    
    // 记录全同步的时间
    if (needAllSync) {
        lastAllSyncTime = now;
    }
    //If has changed keys,notify re sync md5.
    // 有配置改变，重新再运行一次, 推送配置给订阅者
    if (hasChangedKeys) {
        notifyListenConfig();
    }
    
}
```

源码位置: `com.alibaba.nacos.client.config.impl.ClientWorker.ConfigRpcTransportClient#checkListenCache`

```java
// 拉取配置，检查是否改变
private boolean checkListenCache(Map<String, List<CacheData>> listenCachesMap) {
    
    final AtomicBoolean hasChangedKeys = new AtomicBoolean(false);
    if (!listenCachesMap.isEmpty()) {
        List<Future> listenFutures = new ArrayList<>();
        // 遍历 listenCachesMap, 每一个 taskId, 有一个线程负责拉取配置
        for (Map.Entry<String, List<CacheData>> entry : listenCachesMap.entrySet()) {
            String taskId = entry.getKey();
            ExecutorService executorService = ensureSyncExecutor(taskId);
            Future future = executorService.submit(() -> {
                List<CacheData> listenCaches = entry.getValue();
                //reset notify change flag.
                // 重置
                for (CacheData cacheData : listenCaches) {
                    cacheData.getReceiveNotifyChanged().set(false);
                }
                // 构建 ConfigBatchListenRequest 请求，里面有 md5 值
                ConfigBatchListenRequest configChangeListenRequest = buildConfigRequest(listenCaches);
                configChangeListenRequest.setListen(true);
                try {
                    RpcClient rpcClient = ensureRpcClient(taskId);
                    // 请求服务端，如果 md5 值不一样，就会返回
                    ConfigChangeBatchListenResponse listenResponse = (ConfigChangeBatchListenResponse) requestProxy(
                            rpcClient, configChangeListenRequest);
                    if (listenResponse != null && listenResponse.isSuccess()) {
                        
                        // 表示是否拉取过配置
                        Set<String> changeKeys = new HashSet<String>();
                        
                        List<ConfigChangeBatchListenResponse.ConfigContext> changedConfigs = listenResponse.getChangedConfigs();
                        //handle changed keys,notify listener
                        if (!CollectionUtils.isEmpty(changedConfigs)) {
                            hasChangedKeys.set(true);
                            // 遍历改变的配置
                            for (ConfigChangeBatchListenResponse.ConfigContext changeConfig : changedConfigs) {
                                String changeKey = GroupKey.getKeyTenant(changeConfig.getDataId(),
                                        changeConfig.getGroup(), changeConfig.getTenant());
                                changeKeys.add(changeKey);
                                boolean isInitializing = cacheMap.get().get(changeKey).isInitializing();
                                // 刷新配置，通知订阅者
                                refreshContentAndCheck(changeKey, !isInitializing);
                            }
                            
                        }
                        
                        // 在刷新配置时，如果配置有变动，就会执行这个逻辑
                        for (CacheData cacheData : listenCaches) {
                            if (cacheData.getReceiveNotifyChanged().get()) {
                                String changeKey = GroupKey.getKeyTenant(cacheData.dataId, cacheData.group,
                                        cacheData.getTenant());
                                // 判断配置是否已经拉取了
                                if (!changeKeys.contains(changeKey)) {
                                    boolean isInitializing = cacheMap.get().get(changeKey).isInitializing();
                                    // 刷新配置，通知订阅者
                                    refreshContentAndCheck(changeKey, !isInitializing);
                                }
                            }
                        }
                        
                        //handler content configs
                        for (CacheData cacheData : listenCaches) {
                            cacheData.setInitializing(false);
                            String groupKey = GroupKey.getKeyTenant(cacheData.dataId, cacheData.group,
                                    cacheData.getTenant());
                            if (!changeKeys.contains(groupKey)) {
                                synchronized (cacheData) {
                                    // 设置和服务端一致
                                    if (!cacheData.getReceiveNotifyChanged().get()) {
                                        cacheData.setConsistentWithServer(true);
                                    }
                                }
                            }
                        }
                        
                    }
                } catch (Throwable e) {
                    LOGGER.error("Execute listen config change error ", e);
                    try {
                        Thread.sleep(50L);
                    } catch (InterruptedException interruptedException) {
                        //ignore
                    }
                    notifyListenConfig();
                }
            });
            listenFutures.add(future);
            
        }
        // 等待所有线程执行完毕
        for (Future future : listenFutures) {
            try {
                future.get();
            } catch (Throwable throwable) {
                LOGGER.error("Async listen config change error ", throwable);
            }
        }
        
    }
    return hasChangedKeys.get();
}
```

## 刷新配置，通知订阅者

源码位置: `com.alibaba.nacos.client.config.impl.ClientWorker#refreshContentAndCheck`

```java
// 刷新配置，通知订阅者
private void refreshContentAndCheck(CacheData cacheData, boolean notify) {
    try {
        // 获取配置
        ConfigResponse response = getServerConfig(cacheData.dataId, cacheData.group, cacheData.tenant, 3000L,
                notify);
        cacheData.setEncryptedDataKey(response.getEncryptedDataKey());
        cacheData.setContent(response.getContent());
        if (null != response.getConfigType()) {
            cacheData.setType(response.getConfigType());
        }
        if (notify) {
            LOGGER.info("[{}] [data-received] dataId={}, group={}, tenant={}, md5={}, content={}, type={}",
                    agent.getName(), cacheData.dataId, cacheData.group, cacheData.tenant, cacheData.getMd5(),
                    ContentUtils.truncateContent(response.getContent()), response.getConfigType());
        }
        // 检查 md5 值
        cacheData.checkListenerMd5();
    } catch (Exception e) {
        LOGGER.error("refresh content and check md5 fail ,dataId={},group={},tenant={} ", cacheData.dataId,
                cacheData.group, cacheData.tenant, e);
    }
}

// 检查 md5 值
void checkListenerMd5() {
    for (ManagerListenerWrap wrap : listeners) {
        // 不一致，通知订阅者
        if (!md5.equals(wrap.lastCallMd5)) {
            safeNotifyListener(dataId, group, content, type, md5, encryptedDataKey, wrap);
        }
    }
}
```

## rpcClient 初始化

源码位置: `com.alibaba.nacos.client.config.impl.ClientWorker.ConfigRpcTransportClient#ensureRpcClient`

```java
private RpcClient ensureRpcClient(String taskId) throws NacosException {
    synchronized (ClientWorker.this) {
        Map<String, String> labels = getLabels();
        Map<String, String> newLabels = new HashMap<>(labels);
        newLabels.put("taskId", taskId);
        RpcClient rpcClient = RpcClientFactory.createClient(uuid + "_config-" + taskId, getConnectionType(),
                newLabels, RpcClientTlsConfig.properties(this.properties));
        if (rpcClient.isWaitInitiated()) {
            // 初始化 rpcClient
            initRpcClientHandler(rpcClient);
            rpcClient.setTenant(getTenant());
            rpcClient.clientAbilities(initAbilities());
            // 启动
            rpcClient.start();
        }
        
        return rpcClient;
    }
    
}
```

源码位置: `com.alibaba.nacos.client.config.impl.ClientWorker.ConfigRpcTransportClient#initRpcClientHandler`

```java
private void initRpcClientHandler(final RpcClient rpcClientInner) {
    /*
     * Register Config Change /Config ReSync Handler
     */
    // 注册配置通知的 requestHandler
    rpcClientInner.registerServerRequestHandler((request) -> {
        if (request instanceof ConfigChangeNotifyRequest) {
            ConfigChangeNotifyRequest configChangeNotifyRequest = (ConfigChangeNotifyRequest) request;
            LOGGER.info("[{}] [server-push] config changed. dataId={}, group={},tenant={}",
                    rpcClientInner.getName(), configChangeNotifyRequest.getDataId(),
                    configChangeNotifyRequest.getGroup(), configChangeNotifyRequest.getTenant());
            String groupKey = GroupKey.getKeyTenant(configChangeNotifyRequest.getDataId(),
                    configChangeNotifyRequest.getGroup(), configChangeNotifyRequest.getTenant());
            
            CacheData cacheData = cacheMap.get().get(groupKey);
            if (cacheData != null) {
                synchronized (cacheData) {
                    cacheData.getReceiveNotifyChanged().set(true);
                    cacheData.setConsistentWithServer(false);
                    notifyListenConfig();
                }
                
            }
            return new ConfigChangeNotifyResponse();
        }
        return null;
    });
    
    // ClientConfigMetricRequest
    rpcClientInner.registerServerRequestHandler((request) -> {
        if (request instanceof ClientConfigMetricRequest) {
            ClientConfigMetricResponse response = new ClientConfigMetricResponse();
            response.setMetrics(getMetrics(((ClientConfigMetricRequest) request).getMetricsKeys()));
            return response;
        }
        return null;
    });
    
    // 连接事件
    rpcClientInner.registerConnectionListener(new ConnectionEventListener() {
        
        @Override
        public void onConnected() {
            LOGGER.info("[{}] Connected,notify listen context...", rpcClientInner.getName());
            notifyListenConfig();
        }
        
        @Override
        public void onDisConnect() {
            String taskId = rpcClientInner.getLabels().get("taskId");
            LOGGER.info("[{}] DisConnected,clear listen context...", rpcClientInner.getName());
            Collection<CacheData> values = cacheMap.get().values();
            
            for (CacheData cacheData : values) {
                if (StringUtils.isNotBlank(taskId)) {
                    if (Integer.valueOf(taskId).equals(cacheData.getTaskId())) {
                        cacheData.setConsistentWithServer(false);
                    }
                } else {
                    cacheData.setConsistentWithServer(false);
                }
            }
        }
        
    });
    
    // 挑选下一个地址
    rpcClientInner.serverListFactory(new ServerListFactory() {
        @Override
        public String genNextServer() {
            return ConfigRpcTransportClient.super.serverListManager.getNextServerAddr();
            
        }
        
        @Override
        public String getCurrentServer() {
            return ConfigRpcTransportClient.super.serverListManager.getCurrentServerAddr();
            
        }
        
        @Override
        public List<String> getServerList() {
            return ConfigRpcTransportClient.super.serverListManager.getServerUrls();
            
        }
    });
    
    // 地址变动的监听器
    subscriber = new Subscriber() {
        @Override
        public void onEvent(Event event) {
            rpcClientInner.onServerListChange();
        }
        
        @Override
        public Class<? extends Event> subscribeType() {
            return ServerlistChangeEvent.class;
        }
    };
    NotifyCenter.registerSubscriber(subscriber);
}
```

