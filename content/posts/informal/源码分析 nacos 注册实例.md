---
title: 源码分析 nacos 注册实例
date: 2023-08-19T08:00:00+08:00
draft: false
tags: [nacos, source code, 源码分析 nacos]
categories: [随笔]
---

> nacos 基于 2.2.4 版本


## 注册实例的 curl

```shell
curl --location 'http://localhost:8848/nacos/v2/ns/instance' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'serviceName=test' \
--data-urlencode 'ip=1.2.3.4' \
--data-urlencode 'port=80'
```

## 注册实例的主流程

源码位置: `com.alibaba.nacos.naming.controllers.v2.InstanceControllerV2#register`
```java
public Result<String> register(InstanceForm instanceForm) throws NacosException {
    // check param
    instanceForm.validate();
    checkWeight(instanceForm.getWeight());
    // build instance
    Instance instance = buildInstance(instanceForm);
    // 注册实例
    instanceServiceV2.registerInstance(instanceForm.getNamespaceId(), buildCompositeServiceName(instanceForm), instance);
    // 发布 traceEvent
    NotifyCenter.publishEvent(new RegisterInstanceTraceEvent(System.currentTimeMillis(), "",
            false, instanceForm.getNamespaceId(), instanceForm.getGroupName(), instanceForm.getServiceName(),
            instance.getIp(), instance.getPort()));
    return Result.success("ok");
}
```

源码位置: `com.alibaba.nacos.naming.core.InstanceOperatorClientImpl#registerInstance`
```java
public void registerInstance(String namespaceId, String serviceName, Instance instance) throws NacosException {
    NamingUtils.checkInstanceIsLegal(instance);
    
    boolean ephemeral = instance.isEphemeral();
    String clientId = IpPortBasedClient.getClientId(instance.toInetAddr(), ephemeral);
    // 创建 client
    createIpPortClientIfAbsent(clientId);
    // 构建 service 对象，在 nacos2.0 中，临时属性在 service 上, instance 的临时属性已经没有了
    Service service = getService(namespaceId, serviceName, ephemeral);
    // 具体实现类负责注册，如果是临时实例，EphemeralClientOperationServiceImpl，如果是持久化实例，PersistentClientOperationServiceImpl
    clientOperationService.registerInstance(service, instance, clientId);
}
```

## 临时实例注册

源码位置: `com.alibaba.nacos.naming.core.v2.service.impl.EphemeralClientOperationServiceImpl#registerInstance`
```java
@Override
public void registerInstance(Service service, Instance instance, String clientId) throws NacosException {
    NamingUtils.checkInstanceIsLegal(instance);

    // 获得单例的 service，如果没有就会注册
    Service singleton = ServiceManager.getInstance().getSingleton(service);
    if (!singleton.isEphemeral()) {
        throw new NacosRuntimeException(NacosException.INVALID_PARAM,
                String.format("Current service %s is persistent service, can't register ephemeral instance.",
                        singleton.getGroupedServiceName()));
    }
    // 获取 client，并检查 client
    Client client = clientManager.getClient(clientId);
    if (!clientIsLegal(client, clientId)) {
        return;
    }
    // InstancePublishInfo 就是 nacos 内部实例
    InstancePublishInfo instanceInfo = getPublishInfo(instance);
    // 添加 service 和 instance，这里会发布 ClientChangedEvent 事件，非常重要
    client.addServiceInstance(singleton, instanceInfo);
    client.setLastUpdatedTime();
    client.recalculateRevision();
    // 发布 ClientRegisterServiceEvent 事件
    NotifyCenter.publishEvent(new ClientOperationEvent.ClientRegisterServiceEvent(singleton, clientId));
    // 发布 InstanceMetadataEvent 事件
    NotifyCenter
            .publishEvent(new MetadataEvent.InstanceMetadataEvent(singleton, instanceInfo.getMetadataId(), false));
}
```

源码位置: `com.alibaba.nacos.naming.consistency.ephemeral.distro.v2.DistroClientDataProcessor#syncToAllServer`
```java
// DistroClientDataProcessor 会监听 ClientChangedEvent 事件
private void syncToAllServer(ClientEvent event) {
    Client client = event.getClient();
    // Only ephemeral data sync by Distro, persist client should sync by raft.
    if (null == client || !client.isEphemeral() || !clientManager.isResponsibleClient(client)) {
        return;
    }
    if (event instanceof ClientEvent.ClientDisconnectEvent) {
        DistroKey distroKey = new DistroKey(client.getClientId(), TYPE);
        distroProtocol.sync(distroKey, DataOperation.DELETE);
    } else if (event instanceof ClientEvent.ClientChangedEvent) {
        DistroKey distroKey = new DistroKey(client.getClientId(), TYPE);
        // 同步到其他节点
        distroProtocol.sync(distroKey, DataOperation.CHANGE);
    }
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.index.ClientServiceIndexesManager#handleClientOperation`
```java
// ClientServiceIndexesManager 会监听 ClientRegisterServiceEvent 事件
private void handleClientOperation(ClientOperationEvent event) {
    Service service = event.getService();
    String clientId = event.getClientId();
    if (event instanceof ClientOperationEvent.ClientRegisterServiceEvent) {
        // 添加 client 的 publishIndex
        addPublisherIndexes(service, clientId);
    } else if (event instanceof ClientOperationEvent.ClientDeregisterServiceEvent) {
        removePublisherIndexes(service, clientId);
    } else if (event instanceof ClientOperationEvent.ClientSubscribeServiceEvent) {
        addSubscriberIndexes(service, clientId);
    } else if (event instanceof ClientOperationEvent.ClientUnsubscribeServiceEvent) {
        removeSubscriberIndexes(service, clientId);
    }
}
private void addPublisherIndexes(Service service, String clientId) {
    // service 和 clientId 是一对多的关系
    publisherIndexes.computeIfAbsent(service, key -> new ConcurrentHashSet<>());
    publisherIndexes.get(service).add(clientId);
    // 发布 ServiceChangedEvent 事件
    NotifyCenter.publishEvent(new ServiceEvent.ServiceChangedEvent(service, true));
}
```

源码位置: `com.alibaba.nacos.naming.push.v2.NamingSubscriberServiceV2Impl#onEvent`
```java
// NamingSubscriberServiceV2Impl 监听 ServiceChangedEvent
public void onEvent(Event event) {
    if (event instanceof ServiceEvent.ServiceChangedEvent) {
        // If service changed, push to all subscribers.
        // service 下的 instance 改变之后，要推送给所有的订阅者
        ServiceEvent.ServiceChangedEvent serviceChangedEvent = (ServiceEvent.ServiceChangedEvent) event;
        Service service = serviceChangedEvent.getService();
        delayTaskEngine.addTask(service, new PushDelayTask(service, PushConfig.getInstance().getPushTaskDelay()));
        MetricsMonitor.incrementServiceChangeCount(service.getNamespace(), service.getGroup(), service.getName());
    } else if (event instanceof ServiceEvent.ServiceSubscribedEvent) {
        // If service is subscribed by one client, only push this client.
        ServiceEvent.ServiceSubscribedEvent subscribedEvent = (ServiceEvent.ServiceSubscribedEvent) event;
        Service service = subscribedEvent.getService();
        delayTaskEngine.addTask(service, new PushDelayTask(service, PushConfig.getInstance().getPushTaskDelay(),
                subscribedEvent.getClientId()));
    }
}
```

## 持久化实例注册

源码位置: `com.alibaba.nacos.naming.core.v2.service.impl.PersistentClientOperationServiceImpl#registerInstance`
```java
@Override
public void registerInstance(Service service, Instance instance, String clientId) {
    // 和临时实例注册一样，获取单例的  service
    Service singleton = ServiceManager.getInstance().getSingleton(service);
    if (singleton.isEphemeral()) {
        throw new NacosRuntimeException(NacosException.INVALID_PARAM,
                String.format("Current service %s is ephemeral service, can't register persistent instance.",
                        singleton.getGroupedServiceName()));
    }
    // 包装为 writeRequest 对象
    final InstanceStoreRequest request = new InstanceStoreRequest();
    request.setService(service);
    request.setInstance(instance);
    request.setClientId(clientId);
    // 这里设置了 group，在构造函数中会初始化 group 的 RequestProcessor 
    final WriteRequest writeRequest = WriteRequest.newBuilder().setGroup(group())
            .setData(ByteString.copyFrom(serializer.serialize(request))).setOperation(DataOperation.ADD.name())
            .build();
    
    try {
        // CPProtocol 负责写请求，同步到其他的节点，然后应用状态机
        protocol.write(writeRequest);
        Loggers.RAFT.info("Client registered. service={}, clientId={}, instance={}", service, instance, clientId);
    } catch (Exception e) {
        throw new NacosRuntimeException(NacosException.SERVER_ERROR, e);
    }
}

// 构造函数中，初始化话了 
public PersistentClientOperationServiceImpl(final PersistentIpPortClientManager clientManager) {
    this.clientManager = clientManager;
    this.protocol = ApplicationUtils.getBean(ProtocolManager.class).getCpProtocol();
    // 自己负责来处理 apply WriteRequest
    this.protocol.addRequestProcessors(Collections.singletonList(this));
}

// 应用 raft 的状态机
// protocol.write(writeRequest) 之后, 就会回调这个方法
@Override
public Response onApply(WriteRequest request) {
    final Lock lock = readLock;
    lock.lock();
    try {
        final InstanceStoreRequest instanceRequest = serializer.deserialize(request.getData().toByteArray());
        final DataOperation operation = DataOperation.valueOf(request.getOperation());
        switch (operation) {
            case ADD:
                // 处理实例注册
                onInstanceRegister(instanceRequest.service, instanceRequest.instance,
                        instanceRequest.getClientId());
                break;
            case DELETE:
                onInstanceDeregister(instanceRequest.service, instanceRequest.getClientId());
                break;
            case CHANGE:
                if (instanceAndServiceExist(instanceRequest)) {
                    onInstanceRegister(instanceRequest.service, instanceRequest.instance,
                            instanceRequest.getClientId());
                }
                break;
            default:
                return Response.newBuilder().setSuccess(false).setErrMsg("unsupport operation : " + operation)
                        .build();
        }
        return Response.newBuilder().setSuccess(true).build();
    } catch (Exception e) {
        Loggers.RAFT.warn("Persistent client operation failed. ", e);
        return Response.newBuilder().setSuccess(false)
                .setErrMsg("Persistent client operation failed. " + e.getMessage()).build();
    } finally {
        lock.unlock();
    }
}

// 处理实例注册, 基本和临时实例注册一样, 后面就不重复分析了
private void onInstanceRegister(Service service, Instance instance, String clientId) {
    // 获取 service 和 client
    Service singleton = ServiceManager.getInstance().getSingleton(service);
    if (!clientManager.contains(clientId)) {
        clientManager.clientConnected(clientId, new ClientAttributes());
    }
    Client client = clientManager.getClient(clientId);
    InstancePublishInfo instancePublishInfo = getPublishInfo(instance);
    // 添加 service 和 instance，发布 ClientChangedEvent 事件
    client.addServiceInstance(singleton, instancePublishInfo);
    client.setLastUpdatedTime();
    // 发布 ClientRegisterServiceEvent 事件
    NotifyCenter.publishEvent(new ClientOperationEvent.ClientRegisterServiceEvent(singleton, clientId));
}
```




