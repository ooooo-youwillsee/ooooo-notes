# 源码分析 nacos 订阅服务


> nacos 基于 2.2.4 版本

nacos 订阅服务主要分为 `http+udp` 和 `grpc` 这两种方式，这两者的**内部调用方法**都是一样的，这里主要分析 `http+udp` 的方式。

## 订阅服务的 curl

```shell
curl --location 'localhost:8848/nacos/v2/ns/instance/list?serviceName=test'
```

## 订阅服务的主流程

源码位置: `com.alibaba.nacos.naming.controllers.v2.InstanceControllerV2#list`

```java
// 处理请求
public Result<ServiceInfo> list(@RequestParam(value = "namespaceId", defaultValue = Constants.DEFAULT_NAMESPACE_ID) String namespaceId,
        @RequestParam(value = "groupName", defaultValue = Constants.DEFAULT_GROUP) String groupName,
        @RequestParam("serviceName") String serviceName,
        @RequestParam(value = "clusterName", defaultValue = StringUtils.EMPTY) String clusterName,
        @RequestParam(value = "ip", defaultValue = StringUtils.EMPTY) String ip,
        @RequestParam(value = "port", defaultValue = "0") Integer port,
        @RequestParam(value = "healthyOnly", defaultValue = "false") Boolean healthyOnly,
        @RequestParam(value = "app", defaultValue = StringUtils.EMPTY) String app,
        @RequestHeader(value = HttpHeaderConsts.USER_AGENT_HEADER, required = false) String userAgent,
        @RequestHeader(value = HttpHeaderConsts.CLIENT_VERSION_HEADER, required = false) String clientVersion) {
    if (StringUtils.isEmpty(userAgent)) {
        userAgent = StringUtils.defaultIfEmpty(clientVersion, StringUtils.EMPTY);
    }
    String compositeServiceName = NamingUtils.getGroupedName(serviceName, groupName);
    // 根据 ip 和 port 来进行 udp 推送
    Subscriber subscriber = new Subscriber(ip + ":" + port, userAgent, app, ip, namespaceId, compositeServiceName,
            port, clusterName);
    // 获取所有的实例
    return Result.success(instanceServiceV2.listInstance(namespaceId, compositeServiceName, subscriber, clusterName, healthyOnly));
}
```

源码位置: `com.alibaba.nacos.naming.core.InstanceOperatorClientImpl#listInstance`

```java
// 获取所有的实例
@Override
public ServiceInfo listInstance(String namespaceId, String serviceName, Subscriber subscriber, String cluster,
        boolean healthOnly) {
    Service service = getService(namespaceId, serviceName, true);
    // For adapt 1.X subscribe logic
    if (subscriber.getPort() > 0 && pushService.canEnablePush(subscriber.getAgent())) {
        //  clientId = address + ID_DELIMITER + ephemeral, 这个很重要，用来判断是不是 udp push
        String clientId = IpPortBasedClient.getClientId(subscriber.getAddrStr(), true);
        // 根据 udp 的 ip 和 port 来创建 client
        createIpPortClientIfAbsent(clientId);
        // 添加订阅, 实现类只有一个，就是 EphemeralClientOperationServiceImpl，接下来分析这个
        clientOperationService.subscribeService(service, subscriber, clientId);
    }
    ServiceInfo serviceInfo = serviceStorage.getData(service);
    ServiceMetadata serviceMetadata = metadataManager.getServiceMetadata(service).orElse(null);
    // 根据条件来筛选最终的 instances
    ServiceInfo result = ServiceUtil
            .selectInstancesWithHealthyProtection(serviceInfo, serviceMetadata, cluster, healthOnly, true, subscriber.getIp());
    // adapt for v1.x sdk
    result.setName(NamingUtils.getGroupedName(result.getName(), result.getGroupName()));
    return result;
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.service.impl.EphemeralClientOperationServiceImpl#subscribeService`

```java
@Override
public void subscribeService(Service service, Subscriber subscriber, String clientId) {
    // 获取单例的 service
    Service singleton = ServiceManager.getInstance().getSingletonIfExist(service).orElse(service);
    Client client = clientManager.getClient(clientId);
    if (!clientIsLegal(client, clientId)) {
        return;
    }
    // client 添加 service 和 subscriber
    client.addServiceSubscriber(singleton, subscriber);
    // 设置更新时间，以防被过期定时任务清理了
    client.setLastUpdatedTime();
    // 发布 ClientSubscribeServiceEvent
    NotifyCenter.publishEvent(new ClientOperationEvent.ClientSubscribeServiceEvent(singleton, clientId));
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.index.ClientServiceIndexesManager#handleClientOperation`

```java
// ClientServiceIndexesManager 监听 ClientSubscribeServiceEvent 事件
private void handleClientOperation(ClientOperationEvent event) {
    Service service = event.getService();
    String clientId = event.getClientId();
    if (event instanceof ClientOperationEvent.ClientRegisterServiceEvent) {
        addPublisherIndexes(service, clientId);
    } else if (event instanceof ClientOperationEvent.ClientDeregisterServiceEvent) {
        removePublisherIndexes(service, clientId);
    } else if (event instanceof ClientOperationEvent.ClientSubscribeServiceEvent) {
        // 添加 service 对应的 clientId， 表示这个 service 变动之后，需要推送给这个 clientId
        addSubscriberIndexes(service, clientId);
    } else if (event instanceof ClientOperationEvent.ClientUnsubscribeServiceEvent) {
        removeSubscriberIndexes(service, clientId);
    }
}

// 添加 service 对应的 clientId, 然后发布 ServiceSubscribedEvent 事件，这里传入了 clientId
private void addSubscriberIndexes(Service service, String clientId) {
    subscriberIndexes.computeIfAbsent(service, key -> new ConcurrentHashSet<>());
    // Fix #5404, Only first time add need notify event.
    if (subscriberIndexes.get(service).add(clientId)) {
        NotifyCenter.publishEvent(new ServiceEvent.ServiceSubscribedEvent(service, clientId));
    }
}
```

源码位置: `com.alibaba.nacos.naming.push.v2.NamingSubscriberServiceV2Impl#onEvent`

```java
// NamingSubscriberServiceV2Impl 监听 ServiceSubscribedEvent 事件
@Override
public void onEvent(Event event) {
    ...
    } else if (event instanceof ServiceEvent.ServiceSubscribedEvent) {
        // If service is subscribed by one client, only push this client.
        ServiceEvent.ServiceSubscribedEvent subscribedEvent = (ServiceEvent.ServiceSubscribedEvent) event;
        Service service = subscribedEvent.getService();
        // 添加延时任务来推送实例数据, 接下来看看 delayTaskEngine 是如何处理 task 
        delayTaskEngine.addTask(service, new PushDelayTask(service, PushConfig.getInstance().getPushTaskDelay(),
                subscribedEvent.getClientId()));
    }
}


```

## 延时任务推送

每个 `PushDelayTask` 到期之后，都会被 `PushDelayTaskProcessor` 来处理，重新包装为 `PushExecuteTask`.

源码位置: ``

```java
private static class PushDelayTaskProcessor implements NacosTaskProcessor {
    
    private final PushDelayTaskExecuteEngine executeEngine;
    
    public PushDelayTaskProcessor(PushDelayTaskExecuteEngine executeEngine) {
        this.executeEngine = executeEngine;
    }
    
    @Override
    public boolean process(NacosTask task) {
        PushDelayTask pushDelayTask = (PushDelayTask) task;
        Service service = pushDelayTask.getService();
        // 丢任务到线程池来执行
        NamingExecuteTaskDispatcher.getInstance()
                .dispatchAndExecuteTask(service, new PushExecuteTask(service, executeEngine, pushDelayTask));
        return true;
    }
}
```
源码位置: `com.alibaba.nacos.naming.push.v2.task.PushExecuteTask#run`

```java
// 执行 push 任务
public void run() {
    try {
        PushDataWrapper wrapper = generatePushData();
        ClientManager clientManager = delayTaskEngine.getClientManager();
        // 获取所有推送的 clientId
        for (String each : getTargetClientIds()) {
            Client client = clientManager.getClient(each);
            if (null == client) {
                // means this client has disconnect
                continue;
            }
            // 获取 service 对应的 subscriber
            Subscriber subscriber = client.getSubscriber(service);
            // skip if null
            if (subscriber == null) {
                continue;
            }
            // 执行具体的 push, 接下来看看是如何获取对应的 pushExecutor
            delayTaskEngine.getPushExecutor().doPushWithCallback(each, subscriber, wrapper,
                    new ServicePushCallback(each, subscriber, wrapper.getOriginalData(), delayTask.isPushToAll()));
        }
    } catch (Exception e) {
        Loggers.PUSH.error("Push task for service" + service.getGroupedServiceName() + " execute failed ", e);
        delayTaskEngine.addTask(service, new PushDelayTask(service, 1000L));
    }
}
```

源码位置: `com.alibaba.nacos.naming.push.v2.executor.PushExecutorDelegate#doPushWithCallback`

```java
@Override
public void doPushWithCallback(String clientId, Subscriber subscriber, PushDataWrapper data,
        NamingPushCallback callBack) {
    getPushExecuteService(clientId, subscriber).doPushWithCallback(clientId, subscriber, data, callBack);
}

private PushExecutor getPushExecuteService(String clientId, Subscriber subscriber) {
    Optional<SpiPushExecutor> result = SpiImplPushExecutorHolder.getInstance()
            .findPushExecutorSpiImpl(clientId, subscriber);
    if (result.isPresent()) {
        return result.get();
    }
    // 获取对应的 pushExecuteService, 之前的 clientId = address + ID_DELIMITER + ephemeral 
    // use nacos default push executor
    return clientId.contains(IpPortBasedClient.ID_DELIMITER) ? udpPushExecuteService : rpcPushExecuteService;
}

// udpPushExecuteService 的逻辑比较简单，就是发送一个 udp 的数据包，这里不继续分析了。
// rpcPushExecuteService 的逻辑就是发送一个 rpc 的数据包，后面的文章详说
```
