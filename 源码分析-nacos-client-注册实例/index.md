# 源码分析 nacos client 注册实例


> nacos 基于 2.2.4 版本

> 这里的 `client` 是指 `nacos SDK`，也就是模块 `nacos-client`.

## 注册实例的主流程

源码位置: `com.alibaba.nacos.client.naming.NacosNamingService`

```java
// NacosNamingService 注册实例，最后由 NamingClientProxyDelegate 来注册。
@Override
public void registerInstance(String serviceName, String groupName, Instance instance) throws NacosException {
    // 检查参数
    NamingUtils.checkInstanceIsLegal(instance);
    // 注册实例，clientProxy 实现类为 NamingClientProxyDelegate，具体分为 httpClientProxy 和 grpcClientProxy
    clientProxy.registerService(serviceName, groupName, instance);
}
```

源码位置: `com.alibaba.nacos.client.naming.remote.NamingClientProxyDelegate#registerService`

```java
// 根据是否为临时实例选择对应的实现来注册实例
@Override
public void registerService(String serviceName, String groupName, Instance instance) throws NacosException {
    getExecuteClientProxy(instance).registerService(serviceName, groupName, instance);
}

// 临时实例就是 grpcClientProxy, 因为 grpc 可以通过长连接来维持，连接断开，说明临时实例注销了
// 持久化实例就是 httpClientProxy, 因为持久化实例只需要一次请求就可以了，后续不需要维持
private NamingClientProxy getExecuteClientProxy(Instance instance) {
    return instance.isEphemeral() ? grpcClientProxy : httpClientProxy;
}
```

## 注册临时实例

源码位置: `com.alibaba.nacos.client.naming.remote.gprc.NamingGrpcClientProxy#registerService`

```java
@Override
public void registerService(String serviceName, String groupName, Instance instance) throws NacosException {
    NAMING_LOGGER.info("[REGISTER-SERVICE] {} registering service {} with instance {}", namespaceId, serviceName,
            instance);
    // 标记这个 instance 要注册，在连接断开之后通过 redoService 的定时任务重新注册
    redoService.cacheInstanceForRedo(serviceName, groupName, instance);
    // 注册实例
    doRegisterService(serviceName, groupName, instance);
}

// redoService.cacheInstanceForRedo 
public void cacheInstanceForRedo(String serviceName, String groupName, Instance instance) {
    String key = NamingUtils.getGroupedName(serviceName, groupName);
    InstanceRedoData redoData = InstanceRedoData.build(serviceName, groupName, instance);
    synchronized (registeredInstances) {
        registeredInstances.put(key, redoData);
    }
}

// 注册实例
public void doRegisterService(String serviceName, String groupName, Instance instance) throws NacosException {
    InstanceRequest request = new InstanceRequest(namespaceId, serviceName, groupName,
            NamingRemoteConstants.REGISTER_INSTANCE, instance);
    // 发送 InstanceRequest 请求，会被 InstanceRequestHandler 处理
    requestToServer(request, Response.class);
    // 标记 instance 已经注册过
    redoService.instanceRegistered(serviceName, groupName);
}
```

源码位置: `com.alibaba.nacos.naming.remote.rpc.handler.InstanceRequestHandler#handle`

```java
// InstanceRequestHandler 处理请求
@Override
@Secured(action = ActionTypes.WRITE)
public InstanceResponse handle(InstanceRequest request, RequestMeta meta) throws NacosException {
    Service service = Service
            .newService(request.getNamespace(), request.getGroupName(), request.getServiceName(), true);
    switch (request.getType()) {
        case NamingRemoteConstants.REGISTER_INSTANCE:
            return registerInstance(service, request, meta);
        ...
    }
}

private InstanceResponse registerInstance(Service service, InstanceRequest request, RequestMeta meta)
        throws NacosException {
    // 注册实例，这个逻辑在【注册实例】章节分析过了
    clientOperationService.registerInstance(service, request.getInstance(), meta.getConnectionId());
    NotifyCenter.publishEvent(new RegisterInstanceTraceEvent(System.currentTimeMillis(),
            meta.getClientIp(), true, service.getNamespace(), service.getGroup(), service.getName(),
            request.getInstance().getIp(), request.getInstance().getPort()));
    return new InstanceResponse(NamingRemoteConstants.REGISTER_INSTANCE);
}
```

## 注册持久化实例

源码位置: `com.alibaba.nacos.client.naming.remote.http.NamingHttpClientProxy#registerService`

```java
// NamingHttpClientProxy 注册实例
// 发送 http 请求, 会被 com.alibaba.nacos.naming.controllers.InstanceController#register 处理, 这个逻辑在【注册实例】章节分析过了
public void registerService(String serviceName, String groupName, Instance instance) throws NacosException {
    NAMING_LOGGER.info("[REGISTER-SERVICE] {} registering service {} with instance: {}", namespaceId, serviceName,
            instance);
    String groupedServiceName = NamingUtils.getGroupedName(serviceName, groupName);
    if (instance.isEphemeral()) {
        throw new UnsupportedOperationException(
                "Do not support register ephemeral instances by HTTP, please use gRPC replaced.");
    }
    final Map<String, String> params = new HashMap<>(32);
    params.put(CommonParams.NAMESPACE_ID, namespaceId);
    params.put(CommonParams.SERVICE_NAME, groupedServiceName);
    params.put(CommonParams.GROUP_NAME, groupName);
    params.put(CommonParams.CLUSTER_NAME, instance.getClusterName());
    params.put(IP_PARAM, instance.getIp());
    params.put(PORT_PARAM, String.valueOf(instance.getPort()));
    params.put(WEIGHT_PARAM, String.valueOf(instance.getWeight()));
    params.put(REGISTER_ENABLE_PARAM, String.valueOf(instance.isEnabled()));
    params.put(HEALTHY_PARAM, String.valueOf(instance.isHealthy()));
    params.put(EPHEMERAL_PARAM, String.valueOf(instance.isEphemeral()));
    params.put(META_PARAM, JacksonUtils.toJson(instance.getMetadata()));
    reqApi(UtilAndComs.nacosUrlInstance, params, HttpMethod.POST);
}
```

## redoService 定时任务

源码位置: `com.alibaba.nacos.client.naming.remote.gprc.redo.NamingGrpcRedoService`

```java
// NamingGrpcRedoService 构造函数
public NamingGrpcRedoService(NamingGrpcClientProxy clientProxy) {
    this.redoExecutor = new ScheduledThreadPoolExecutor(REDO_THREAD, new NameThreadFactory(REDO_THREAD_NAME));
    // 定时调度 RedoScheduledTask
    this.redoExecutor.scheduleWithFixedDelay(new RedoScheduledTask(clientProxy, this), DEFAULT_REDO_DELAY,
            DEFAULT_REDO_DELAY, TimeUnit.MILLISECONDS);
}
```

源码位置: `com.alibaba.nacos.client.naming.remote.gprc.redo.RedoScheduledTask#run`

```java
// RedoScheduledTask 定时任务
@Override
public void run() {
    // 判断是否已连接，通过 NamingGrpcRedoService#onConnected 来改变状态
    if (!redoService.isConnected()) {
        LogUtils.NAMING_LOGGER.warn("Grpc Connection is disconnect, skip current redo task");
        return;
    }
    // 因为 grpc 连接可能会断，所以需要重新注册实例和订阅服务
    try {
        // 重新注册实例
        redoForInstances();
        // 重新订阅服务
        redoForSubscribes();
    } catch (Exception e) {
        LogUtils.NAMING_LOGGER.warn("Redo task run with unexpected exception: ", e);
    }
}
```

## 测试类

`com.alibaba.nacos.test.naming.CPInstancesAPI_ITCase#registerInstance_ephemeral_true`
