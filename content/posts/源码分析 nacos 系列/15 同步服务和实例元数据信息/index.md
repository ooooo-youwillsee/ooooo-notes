---
title: 15 同步服务和实例元数据信息
date: 2023-09-09T08:00:00+08:00
draft: false
tags: [ nacos, source code, 源码分析 nacos 系列 ]
categories: [ 源码分析 nacos 系列 ]
---

> nacos 基于 2.2.4 版本

在 `nacos` 中，手动创建 `service`，更新 `service`，删除 `service`，更新 `instance`，都是通过 `raft` 协议来实现的，所以来简单介绍下。

## service 元数据同步

源码位置: `com.alibaba.nacos.naming.core.ServiceOperatorV2Impl`

```java
// 下面这些方法最终都会调用 metadataOperateService 的 updateServiceMetadata 或者 deleteServiceMetadata
// 创建 service
public void create(Service service, ServiceMetadata metadata) throws NacosException {
    // 检查 service
    if (ServiceManager.getInstance().containSingleton(service)) {
        throw new NacosApiException(NacosException.INVALID_PARAM, ErrorCode.SERVICE_ALREADY_EXIST,
                String.format("specified service %s already exists!", service.getGroupedServiceName()));
    }
    // raft 协议更新服务元数据
    metadataOperateService.updateServiceMetadata(service, metadata);
}

// 更新 service
@Override
public void update(Service service, ServiceMetadata metadata) throws NacosException {
    // 检查 service
    if (!ServiceManager.getInstance().containSingleton(service)) {
        throw new NacosApiException(NacosException.INVALID_PARAM, ErrorCode.SERVICE_NOT_EXIST,
                String.format("service %s not found!", service.getGroupedServiceName()));
    }
    // raft 协议更新服务元数据
    metadataOperateService.updateServiceMetadata(service, metadata);
}

// 删除 service
@Override
public void delete(String namespaceId, String serviceName) throws NacosException {
    Service service = getServiceFromGroupedServiceName(namespaceId, serviceName, true);
    // raft 协议删除服务元数据
    delete(service);
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.metadata.NamingMetadataOperateService#updateServiceMetadata`

```java
// 更新服务元数据
public void updateServiceMetadata(Service service, ServiceMetadata serviceMetadata) {
    MetadataOperation<ServiceMetadata> operation = buildMetadataOperation(service);
    operation.setMetadata(serviceMetadata);
    // 构建 WriteRequest, 这里的 group 是 naming_service_metadata
    WriteRequest operationLog = WriteRequest.newBuilder().setGroup(Constants.SERVICE_METADATA)
            .setOperation(DataOperation.CHANGE.name()).setData(ByteString.copyFrom(serializer.serialize(operation)))
            .build();
    // 提交元数据
    submitMetadataOperation(operationLog);
}

// 删除服务元数据
public void delete(Service service) throws NacosException {
    // 检查 service
    if (!ServiceManager.getInstance().containSingleton(service)) {
        throw new NacosApiException(NacosException.INVALID_PARAM, ErrorCode.SERVICE_NOT_EXIST,
                String.format("service %s not found!", service.getGroupedServiceName()));
    }
    
    // 删除 service，必须先注销所有的 instance
    if (!serviceStorage.getPushData(service).getHosts().isEmpty()) {
        throw new NacosApiException(NacosException.INVALID_PARAM, ErrorCode.SERVICE_DELETE_FAILURE,
                "Service " + service.getGroupedServiceName()
                        + " is not empty, can't be delete. Please unregister instance first");
    }
    // 删除服务元数据
    metadataOperateService.deleteServiceMetadata(service);
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.metadata.NamingMetadataOperateService#submitMetadataOperation`

```java
// 提交元数据, 使用 raft 协议, 最后会被 ServiceMetadataProcessor#onApply 处理
private void submitMetadataOperation(WriteRequest operationLog) {
    try {
        Response response = cpProtocol.write(operationLog);
        if (!response.getSuccess()) {
            throw new NacosRuntimeException(NacosException.SERVER_ERROR,
                    "do metadata operation failed " + response.getErrMsg());
        }
    } catch (Exception e) {
        throw new NacosRuntimeException(NacosException.SERVER_ERROR, "do metadata operation failed", e);
    }
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.metadata.ServiceMetadataProcessor#onApply`

```java
@Override
public Response onApply(WriteRequest request) {
    readLock.lock();
    try {
        MetadataOperation<ServiceMetadata> op = serializer.deserialize(request.getData().toByteArray(), processType);
        switch (DataOperation.valueOf(request.getOperation())) {
            case ADD:
                addClusterMetadataToService(op);
                break;
            case CHANGE:
                updateServiceMetadata(op);
                break;
            case DELETE:
                deleteServiceMetadata(op);
                break;
            default:
                return Response.newBuilder().setSuccess(false)
                        .setErrMsg("Unsupported operation " + request.getOperation()).build();
        }
        return Response.newBuilder().setSuccess(true).build();
    } catch (Exception e) {
        Loggers.RAFT.error("onApply {} service metadata operation failed. ", request.getOperation(), e);
        String errorMessage = null == e.getMessage() ? e.getClass().getName() : e.getMessage();
        return Response.newBuilder().setSuccess(false).setErrMsg(errorMessage).build();
    } finally {
        readLock.unlock();
    }
}
```

## instance 元数据同步

源码位置: `com.alibaba.nacos.naming.core.InstanceOperatorClientImpl#updateInstance`

```java
// 更新实例元数据
@Override
public void updateInstance(String namespaceId, String serviceName, Instance instance) throws NacosException {
    NamingUtils.checkInstanceIsLegal(instance);
    
    Service service = getService(namespaceId, serviceName, instance.isEphemeral());
    // 检查 service
    if (!ServiceManager.getInstance().containSingleton(service)) {
        throw new NacosApiException(NacosException.INVALID_PARAM, ErrorCode.INSTANCE_ERROR,
                "service not found, namespace: " + namespaceId + ", service: " + service);
    }
    String metadataId = InstancePublishInfo
            .genMetadataId(instance.getIp(), instance.getPort(), instance.getClusterName());
    // 更新实例元数据 
    metadataOperateService.updateInstanceMetadata(service, metadataId, buildMetadata(instance));
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.metadata.NamingMetadataOperateService#updateInstanceMetadata`

```java
// 更新实例元数据 
public void updateInstanceMetadata(Service service, String metadataId, InstanceMetadata instanceMetadata) {
    MetadataOperation<InstanceMetadata> operation = buildMetadataOperation(service);
    operation.setTag(metadataId);
    operation.setMetadata(instanceMetadata);
    // 构造 WriteRequest 请求，注意这里的 group 为 naming_instance_metadata
    WriteRequest operationLog = WriteRequest.newBuilder().setGroup(Constants.INSTANCE_METADATA)
            .setOperation(DataOperation.CHANGE.name()).setData(ByteString.copyFrom(serializer.serialize(operation)))
            .build();
    // 提交元数据请求
    submitMetadataOperation(operationLog);
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.metadata.NamingMetadataOperateService#submitMetadataOperation`

```java
// 提交元数据请求
private void submitMetadataOperation(WriteRequest operationLog) {
    try {
        // raft 提交请求，会被 InstanceMetadataProcessor#onApply 来处理
        Response response = cpProtocol.write(operationLog);
        if (!response.getSuccess()) {
            throw new NacosRuntimeException(NacosException.SERVER_ERROR,
                    "do metadata operation failed " + response.getErrMsg());
        }
    } catch (Exception e) {
        throw new NacosRuntimeException(NacosException.SERVER_ERROR, "do metadata operation failed", e);
    }
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.metadata.InstanceMetadataProcessor#onApply`

```java
@Override
public Response onApply(WriteRequest request) {
    readLock.lock();
    try {
        MetadataOperation<InstanceMetadata> op = serializer.deserialize(request.getData().toByteArray(), processType);
        switch (DataOperation.valueOf(request.getOperation())) {
            case ADD:
            case CHANGE:
                updateInstanceMetadata(op);
                break;
            case DELETE:
                deleteInstanceMetadata(op);
                break;
            default:
                return Response.newBuilder().setSuccess(false)
                        .setErrMsg("Unsupported operation " + request.getOperation()).build();
        }
        return Response.newBuilder().setSuccess(true).build();
    } catch (Exception e) {
        Loggers.RAFT.error("onApply {} instance metadata operation failed. ", request.getOperation(), e);
        String errorMessage = null == e.getMessage() ? e.getClass().getName() : e.getMessage();
        return Response.newBuilder().setSuccess(false).setErrMsg(errorMessage).build();
    } finally {
        readLock.unlock();
    }
}
```

## 测试类

`com.alibaba.nacos.test.naming.CPInstancesAPI_ITCase#createService`