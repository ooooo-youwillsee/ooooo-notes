# 源码分析 nacos 注销实例


> nacos 基于 2.2.4 版本

## 注销实例的 curl

```shell
curl --location --request DELETE 'http://localhost:8848/nacos/v2/ns/instance' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'serviceName=test' \
--data-urlencode 'ip=1.2.3.4' \
--data-urlencode 'port=80'
```

## 注销实例的主流程

源码位置: `com.alibaba.nacos.naming.controllers.v2.InstanceControllerV2#deregister`

```java
public Result<String> deregister(InstanceForm instanceForm) throws NacosException {
    // check param
    instanceForm.validate();
    checkWeight(instanceForm.getWeight());
    // build instance
    Instance instance = buildInstance(instanceForm);
    // 移除 instance
    instanceServiceV2.removeInstance(instanceForm.getNamespaceId(), buildCompositeServiceName(instanceForm), instance);
    // 发布 DeregisterInstanceTraceEvent 事件
    NotifyCenter.publishEvent(new DeregisterInstanceTraceEvent(System.currentTimeMillis(), "",
            false, DeregisterInstanceReason.REQUEST, instanceForm.getNamespaceId(), instanceForm.getGroupName(),
            instanceForm.getServiceName(), instance.getIp(), instance.getPort()));
    return Result.success("ok");
}
```

源码位置: `com.alibaba.nacos.naming.core.InstanceOperatorClientImpl#removeInstance`

```java
@Override
public void removeInstance(String namespaceId, String serviceName, Instance instance) {
    // 判断 instance 是否已经注册过, 如果没有，则不用处理
    boolean ephemeral = instance.isEphemeral();
    String clientId = IpPortBasedClient.getClientId(instance.toInetAddr(), ephemeral);
    if (!clientManager.contains(clientId)) {
        Loggers.SRV_LOG.warn("remove instance from non-exist client: {}", clientId);
        return;
    }
    Service service = getService(namespaceId, serviceName, ephemeral);
    // 注销实例，如果是临时实例，EphemeralClientOperationServiceImpl，如果是持久化实例，PersistentClientOperationServiceImpl
    clientOperationService.deregisterInstance(service, instance, clientId);
}
```

## 临时实例注销

源码位置: `com.alibaba.nacos.naming.core.v2.service.impl.EphemeralClientOperationServiceImpl#deregisterInstance`

```java
@Override
public void deregisterInstance(Service service, Instance instance, String clientId) {
    // 判断 service 是否存在
    if (!ServiceManager.getInstance().containSingleton(service)) {
        Loggers.SRV_LOG.warn("remove instance from non-exist service: {}", service);
        return;
    }
    Service singleton = ServiceManager.getInstance().getSingleton(service);
    Client client = clientManager.getClient(clientId);
    if (!clientIsLegal(client, clientId)) {
        return;
    }
    // 移除内存中的 instance 对象，这里会发布 ClientChangedEvent 事件，这个很重要
    InstancePublishInfo removedInstance = client.removeServiceInstance(singleton);
    client.setLastUpdatedTime();
    client.recalculateRevision();
    if (null != removedInstance) {
        // 发布 ClientDeregisterServiceEvent 事件
        NotifyCenter.publishEvent(new ClientOperationEvent.ClientDeregisterServiceEvent(singleton, clientId));
        // 发布 InstanceMetadataEvent 事件
        NotifyCenter.publishEvent(
                new MetadataEvent.InstanceMetadataEvent(singleton, removedInstance.getMetadataId(), true));
    }
}
```

源码位置: `com.alibaba.nacos.naming.consistency.ephemeral.distro.v2.DistroClientDataProcessor#syncToAllServer`

```java
// DistroClientDataProcessor 接受 ClientChangedEvent, 负责同步数据给其他节点
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
        distroProtocol.sync(distroKey, DataOperation.CHANGE);
    }
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.index.ClientServiceIndexesManager#handleClientOperation`

```java
// ClientServiceIndexesManager 会监听 ClientDeregisterServiceEvent 事件
private void handleClientOperation(ClientOperationEvent event) {
    Service service = event.getService();
    String clientId = event.getClientId();
    if (event instanceof ClientOperationEvent.ClientRegisterServiceEvent) {
        addPublisherIndexes(service, clientId);
    } else if (event instanceof ClientOperationEvent.ClientDeregisterServiceEvent) {
        // 移除 service 的 clientId
        removePublisherIndexes(service, clientId);
    } else if (event instanceof ClientOperationEvent.ClientSubscribeServiceEvent) {
        addSubscriberIndexes(service, clientId);
    } else if (event instanceof ClientOperationEvent.ClientUnsubscribeServiceEvent) {
        removeSubscriberIndexes(service, clientId);
    }
}

private void removePublisherIndexes(Service service, String clientId) {
    publisherIndexes.computeIfPresent(service, (s, ids) -> {
        ids.remove(clientId);
        // 发布 ServiceChangedEvent 事件
        NotifyCenter.publishEvent(new ServiceEvent.ServiceChangedEvent(service, true));
        return ids.isEmpty() ? null : ids;
    });
}
```

源码位置: `com.alibaba.nacos.naming.push.v2.NamingSubscriberServiceV2Impl#onEvent`
```java
// NamingSubscriberServiceV2Impl 会监听 ServiceChangedEvent 事件
@Override
public void onEvent(Event event) {
    if (event instanceof ServiceEvent.ServiceChangedEvent) {
        // If service changed, push to all subscribers.
        // 注销 instance， 必须推送给所有的订阅者
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

## 持久化实例注销

源码位置: `com.alibaba.nacos.naming.core.v2.service.impl.PersistentClientOperationServiceImpl#deregisterInstance`

```java
@Override
public void deregisterInstance(Service service, Instance instance, String clientId) {
    final InstanceStoreRequest request = new InstanceStoreRequest();
    request.setService(service);
    request.setInstance(instance);
    request.setClientId(clientId);
    // 注意这里的 group，在构造函数中进行注册对应的 processor
    final WriteRequest writeRequest = WriteRequest.newBuilder().setGroup(group())
            .setData(ByteString.copyFrom(serializer.serialize(request))).setOperation(DataOperation.DELETE.name())
            .build();
    
    try {
        // 由 CPProtcol 写入请求到本地，然后同步到其他节点，最后应用状态机
        protocol.write(writeRequest);
        Loggers.RAFT.info("Client unregistered. service={}, clientId={}, instance={}", service, instance, clientId);
    } catch (Exception e) {
        throw new NacosRuntimeException(NacosException.SERVER_ERROR, e);
    }
}


// 构造函数中注册 requestProcessor, 这个可以分组的
public PersistentClientOperationServiceImpl(final PersistentIpPortClientManager clientManager) {
    this.clientManager = clientManager;
    this.protocol = ApplicationUtils.getBean(ProtocolManager.class).getCpProtocol();
    this.protocol.addRequestProcessors(Collections.singletonList(this));
}

// 处理状态机
@Override
public Response onApply(WriteRequest request) {
    final Lock lock = readLock;
    lock.lock();
    try {
        final InstanceStoreRequest instanceRequest = serializer.deserialize(request.getData().toByteArray());
        final DataOperation operation = DataOperation.valueOf(request.getOperation());
        switch (operation) {
            case ADD:
                onInstanceRegister(instanceRequest.service, instanceRequest.instance,
                        instanceRequest.getClientId());
                break;
            case DELETE:
                // 注销实例
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

// 注销实例， 这里的逻辑和临时实例注销的逻辑是一样的，所以就不继续解析了
private void onInstanceDeregister(Service service, String clientId) {
    Service singleton = ServiceManager.getInstance().getSingleton(service);
    Client client = clientManager.getClient(clientId);
    if (client == null) {
        Loggers.RAFT.warn("client not exist onInstanceDeregister, clientId : {} ", clientId);
        return;
    }
    // 移除内存的 instance，发布 ClientChangedEvent 事件
    client.removeServiceInstance(singleton);
    client.setLastUpdatedTime();
    if (client.getAllPublishedService().isEmpty()) {
        clientManager.clientDisconnected(clientId);
    }
    // 发布 ClientDeregisterServiceEvent 事件       
    NotifyCenter.publishEvent(new ClientOperationEvent.ClientDeregisterServiceEvent(singleton, clientId));
}
```

## 测试类

`com.alibaba.nacos.test.naming.CPInstancesAPI_ITCase#registerInstance_ephemeral_true`

