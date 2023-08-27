# 源码分析 nacos client 订阅服务


> nacos 基于 2.2.4 版本

> 这里的 `client` 是指 `nacos SDK`，也就是模块 `nacos-client`.

## 订阅服务的主流程

源码位置: `com.alibaba.nacos.client.naming.NacosNamingService#subscribe`

```java
// NacosNamingService 订阅服务
@Override
public void subscribe(String serviceName, String groupName, List<String> clusters, EventListener listener)
        throws NacosException {
    if (null == listener) {
        return;
    }
    String clusterString = StringUtils.join(clusters, ",");
    // 监听服务改变的回调函数，changeNotifier 订阅了 InstancesChangeEvent 事件
    changeNotifier.registerListener(groupName, serviceName, clusterString, listener);
    // clientProxy 的实现类为 NamingClientProxyDelegate
    clientProxy.subscribe(serviceName, groupName, clusterString);
}
```

源码位置: `com.alibaba.nacos.client.naming.remote.NamingClientProxyDelegate#subscribe`

```java
// NamingClientProxyDelegate 订阅服务
@Override
public ServiceInfo subscribe(String serviceName, String groupName, String clusters) throws NacosException {
    NAMING_LOGGER.info("[SUBSCRIBE-SERVICE] service:{}, group:{}, clusters:{} ", serviceName, groupName, clusters);
    String serviceNameWithGroup = NamingUtils.getGroupedName(serviceName, groupName);
    String serviceKey = ServiceInfo.getKey(serviceNameWithGroup, clusters);
    // 注册 UpdateTask, 发送 http 请求来全量更新, 这个后面说
    serviceInfoUpdateService.scheduleUpdateIfAbsent(serviceName, groupName, clusters);
    ServiceInfo result = serviceInfoHolder.getServiceInfoMap().get(serviceKey);
    if (null == result || !isSubscribed(serviceName, groupName, clusters)) {
        // grpc 订阅服务, 返回 serviceInfo
        result = grpcClientProxy.subscribe(serviceName, groupName, clusters);
    }
    // 处理 serviceInfo, 发布 InstancesChangeEvent 事件
    serviceInfoHolder.processServiceInfo(result);
    return result;
}
```

源码位置: `com.alibaba.nacos.client.naming.remote.gprc.NamingGrpcClientProxy#subscribe`

```java
// grpc 订阅服务
@Override
public ServiceInfo subscribe(String serviceName, String groupName, String clusters) throws NacosException {
    if (NAMING_LOGGER.isDebugEnabled()) {
        NAMING_LOGGER.debug("[GRPC-SUBSCRIBE] service:{}, group:{}, cluster:{} ", serviceName, groupName, clusters);
    }
    // 标记服务要订阅，在 redoService 的定时任务中重新订阅
    redoService.cacheSubscriberForRedo(serviceName, groupName, clusters);
    // 订阅服务
    return doSubscribe(serviceName, groupName, clusters);
}

// redoService.cacheSubscriberForRedo
public void cacheSubscriberForRedo(String serviceName, String groupName, String cluster) {
    String key = ServiceInfo.getKey(NamingUtils.getGroupedName(serviceName, groupName), cluster);
    SubscriberRedoData redoData = SubscriberRedoData.build(serviceName, groupName, cluster);
    synchronized (subscribes) {
        // 标记订阅
        subscribes.put(key, redoData);
    }
}

// 订阅服务
public ServiceInfo doSubscribe(String serviceName, String groupName, String clusters) throws NacosException {
    SubscribeServiceRequest request = new SubscribeServiceRequest(namespaceId, groupName, serviceName, clusters,
            true);
    // 发送 SubscribeServiceRequest 请求，会被 SubscribeServiceRequestHandler 处理
    SubscribeServiceResponse response = requestToServer(request, SubscribeServiceResponse.class);
    // 标记服务已订阅
    redoService.subscriberRegistered(serviceName, groupName, clusters);
    return response.getServiceInfo();
}
```

源码位置: `com.alibaba.nacos.naming.remote.rpc.handler.SubscribeServiceRequestHandler#handle`

```java
// SubscribeServiceRequestHandler 处理请求
@Override
@Secured(action = ActionTypes.READ)
public SubscribeServiceResponse handle(SubscribeServiceRequest request, RequestMeta meta) throws NacosException {
    String namespaceId = request.getNamespace();
    String serviceName = request.getServiceName();
    String groupName = request.getGroupName();
    String app = request.getHeader("app", "unknown");
    String groupedServiceName = NamingUtils.getGroupedName(serviceName, groupName);
    Service service = Service.newService(namespaceId, groupName, serviceName, true);
    // 把订阅的信息包装为 Subscriber 对象
    Subscriber subscriber = new Subscriber(meta.getClientIp(), meta.getClientVersion(), app, meta.getClientIp(),
            namespaceId, groupedServiceName, 0, request.getClusters());
    // 第一次订阅要返回对应的 serviceInfo
    ServiceInfo serviceInfo = ServiceUtil.selectInstancesWithHealthyProtection(serviceStorage.getData(service),
            metadataManager.getServiceMetadata(service).orElse(null), subscriber.getCluster(), false,
            true, subscriber.getIp());
    if (request.isSubscribe()) {
        // 订阅服务, 这个逻辑在【订阅服务】中分析过了
        clientOperationService.subscribeService(service, subscriber, meta.getConnectionId());
        NotifyCenter.publishEvent(new SubscribeServiceTraceEvent(System.currentTimeMillis(),
                meta.getClientIp(), service.getNamespace(), service.getGroup(), service.getName()));
    } else {
        // 取消订阅服务
        clientOperationService.unsubscribeService(service, subscriber, meta.getConnectionId());
        NotifyCenter.publishEvent(new UnsubscribeServiceTraceEvent(System.currentTimeMillis(),
                meta.getClientIp(), service.getNamespace(), service.getGroup(), service.getName()));
    }
    return new SubscribeServiceResponse(ResponseCode.SUCCESS.getCode(), "success", serviceInfo);
}
```

## grpc 订阅处理

源码位置: `com.alibaba.nacos.client.naming.remote.gprc.NamingGrpcClientProxy#start`

```java
// start 方法在 NamingGrpcClientProxy 构造函数中调用
private void start(ServerListFactory serverListFactory, ServiceInfoHolder serviceInfoHolder) throws NacosException {
    // serverListFactory 来选择服务
    rpcClient.serverListFactory(serverListFactory);
    // 监听 connectionEvent 事件
    rpcClient.registerConnectionListener(redoService);
    // client 处理 server 请求, 重点看 NamingPushRequestHandler
    rpcClient.registerServerRequestHandler(new NamingPushRequestHandler(serviceInfoHolder));
    rpcClient.start();
    // 注册事件订阅
    NotifyCenter.registerSubscriber(this);
}
```

源码位置: `com.alibaba.nacos.client.naming.remote.gprc.NamingPushRequestHandler#requestReply`

```java
// client 处理 server 请求
@Override
public Response requestReply(Request request) {
    if (request instanceof NotifySubscriberRequest) {
        // 服务实例变动了，服务端推送 serviceInfo
        NotifySubscriberRequest notifyRequest = (NotifySubscriberRequest) request;
        // 处理 serviceInfo, 发布 InstancesChangeEvent 事件
        serviceInfoHolder.processServiceInfo(notifyRequest.getServiceInfo());
        return new NotifySubscriberResponse();
    }
    return null;
}
```

源码位置: `com.alibaba.nacos.client.naming.event.InstancesChangeNotifier#onEvent`

```java
// InstancesChangeNotifier 监听 InstancesChangeEvent 事件
@Override
public void onEvent(InstancesChangeEvent event) {
    String key = ServiceInfo
            .getKey(NamingUtils.getGroupedName(event.getServiceName(), event.getGroupName()), event.getClusters());
    ConcurrentHashSet<EventListener> eventListeners = listenerMap.get(key);
    if (CollectionUtils.isEmpty(eventListeners)) {
        return;
    }
    for (final EventListener listener : eventListeners) {
        // 遍历回调函数
        final com.alibaba.nacos.api.naming.listener.Event namingEvent = transferToNamingEvent(event);
        if (listener instanceof AbstractEventListener && ((AbstractEventListener) listener).getExecutor() != null) {
            ((AbstractEventListener) listener).getExecutor().execute(() -> listener.onEvent(namingEvent));
        } else {
            listener.onEvent(namingEvent);
        }
    }
}
```

## UpdateTask 全量更新

源码位置: `com.alibaba.nacos.client.naming.core.ServiceInfoUpdateService.UpdateTask#run`

```java
// UpdateTask 定时拉取全量的 instances
@Override
public void run() {
    long delayTime = DEFAULT_DELAY;
    
    try {
        // 判断是否订阅服务
        if (!changeNotifier.isSubscribed(groupName, serviceName, clusters) && !futureMap.containsKey(
                serviceKey)) {
            NAMING_LOGGER.info("update task is stopped, service:{}, clusters:{}", groupedServiceName, clusters);
            isCancel = true;
            return;
        }
        
        ServiceInfo serviceObj = serviceInfoHolder.getServiceInfoMap().get(serviceKey);
        // 第一次拉取
        if (serviceObj == null) {
            serviceObj = namingClientProxy.queryInstancesOfService(serviceName, groupName, clusters, 0, false);
            serviceInfoHolder.processServiceInfo(serviceObj);
            lastRefTime = serviceObj.getLastRefTime();
            return;
        }
        
        // 判断过期时间，然后再拉取
        if (serviceObj.getLastRefTime() <= lastRefTime) {
            serviceObj = namingClientProxy.queryInstancesOfService(serviceName, groupName, clusters, 0, false);
            serviceInfoHolder.processServiceInfo(serviceObj);
        }
        lastRefTime = serviceObj.getLastRefTime();
        if (CollectionUtils.isEmpty(serviceObj.getHosts())) {
            incFailCount();
            return;
        }
        // TODO multiple time can be configured.
        // 更新延时时间
        delayTime = serviceObj.getCacheMillis() * DEFAULT_UPDATE_CACHE_TIME_MULTIPLE;
        resetFailCount();
    } catch (NacosException e) {
        handleNacosException(e);
    } catch (Throwable e) {
        handleUnknownException(e);
    } finally {
        if (!isCancel) {
            // 下一次拉取任务
            executor.schedule(this, Math.min(delayTime << failCount, DEFAULT_DELAY * 60),
                    TimeUnit.MILLISECONDS);
        }
    }
}
```




