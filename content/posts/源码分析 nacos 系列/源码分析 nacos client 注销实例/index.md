---
title: 源码分析 nacos client 注销实例
date: 2023-08-26T08:00:00+08:00
draft: false
tags: [ nacos, source code, 源码分析 nacos 系列 ]
categories: [ 源码分析 nacos 系列 ]
---

> nacos 基于 2.2.4 版本

> 这里的 `client` 是指 `nacos SDK`，也就是模块 `nacos-client`.

## 注销实例的主流程

源码位置: `com.alibaba.nacos.client.naming.NacosNamingService#deregisterInstance`

```java
// 入口类: NacosNamingService 
@Override
public void deregisterInstance(String serviceName, String groupName, Instance instance) throws NacosException {
    // clientProxy 的实现类为 NamingClientProxyDelegate
    clientProxy.deregisterService(serviceName, groupName, instance);
}
```

源码位置: `com.alibaba.nacos.client.naming.remote.NamingClientProxyDelegate#deregisterService`

```java
// NamingClientProxyDelegate 注销实例
// 临时实例, grpcClientProxy 
// 持久化实例, httpClientProxy
@Override
public void deregisterService(String serviceName, String groupName, Instance instance) throws NacosException {
    getExecuteClientProxy(instance).deregisterService(serviceName, groupName, instance);
}

// 根据是否为临时实例来获取 clientProxy
private NamingClientProxy getExecuteClientProxy(Instance instance) {
    return instance.isEphemeral() ? grpcClientProxy : httpClientProxy;
}
```

## 注销临时实例

源码位置: `com.alibaba.nacos.client.naming.remote.gprc.NamingGrpcClientProxy#deregisterService`

```java
@Override
public void deregisterService(String serviceName, String groupName, Instance instance) throws NacosException {
    NAMING_LOGGER
            .info("[DEREGISTER-SERVICE] {} deregistering service {} with instance: {}", namespaceId, serviceName,
                    instance);
    // 标记 instance 要注销，可以在 redoService 定时任务重试
    redoService.instanceDeregister(serviceName, groupName);
    // 注销实例
    doDeregisterService(serviceName, groupName, instance);
}

// redoService.instanceDeregister
public void instanceDeregister(String serviceName, String groupName) {
    String key = NamingUtils.getGroupedName(serviceName, groupName);
    synchronized (registeredInstances) {
        InstanceRedoData redoData = registeredInstances.get(key);
        if (null != redoData) {
            // 设置注销中
            redoData.setUnregistering(true);
            // 设置最终状态
            redoData.setExpectedRegistered(false);
        }
    }
}

// 注销实例
public void doDeregisterService(String serviceName, String groupName, Instance instance) throws NacosException {
    InstanceRequest request = new InstanceRequest(namespaceId, serviceName, groupName,
            NamingRemoteConstants.DE_REGISTER_INSTANCE, instance);
    // 发送 InstanceRequest 请求，会被 InstanceRequestHandler 处理
    requestToServer(request, Response.class);
    // 标记 instance 已经注销
    redoService.instanceDeregistered(serviceName, groupName);
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
        ...
        case NamingRemoteConstants.DE_REGISTER_INSTANCE:
            return deregisterInstance(service, request, meta);
    }
}

// 注销实例
private InstanceResponse deregisterInstance(Service service, InstanceRequest request, RequestMeta meta) {
    // 这个逻辑在【注销实例】章节中分析过了
    clientOperationService.deregisterInstance(service, request.getInstance(), meta.getConnectionId());
    NotifyCenter.publishEvent(new DeregisterInstanceTraceEvent(System.currentTimeMillis(),
            meta.getClientIp(), true, DeregisterInstanceReason.REQUEST, service.getNamespace(),
            service.getGroup(), service.getName(), request.getInstance().getIp(), request.getInstance().getPort()));
    return new InstanceResponse(NamingRemoteConstants.DE_REGISTER_INSTANCE);
}
```

## 注销持久化实例

源码位置: `com.alibaba.nacos.client.naming.remote.http.NamingHttpClientProxy#deregisterService`

```java
// 发送一个 http 请求
@Override
public void deregisterService(String serviceName, String groupName, Instance instance) throws NacosException {
    NAMING_LOGGER
            .info("[DEREGISTER-SERVICE] {} deregistering service {} with instance: {}", namespaceId, serviceName,
                    instance);
    if (instance.isEphemeral()) {
        return;
    }
    final Map<String, String> params = new HashMap<>(16);
    params.put(CommonParams.NAMESPACE_ID, namespaceId);
    params.put(CommonParams.SERVICE_NAME, NamingUtils.getGroupedName(serviceName, groupName));
    params.put(CommonParams.CLUSTER_NAME, instance.getClusterName());
    params.put(IP_PARAM, instance.getIp());
    params.put(PORT_PARAM, String.valueOf(instance.getPort()));
    params.put(EPHEMERAL_PARAM, String.valueOf(instance.isEphemeral()));
    
    reqApi(UtilAndComs.nacosUrlInstance, params, HttpMethod.DELETE);
}
```