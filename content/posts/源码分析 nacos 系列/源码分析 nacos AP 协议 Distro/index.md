---
title: 源码分析 nacos AP 协议 Distro
date: 2023-08-29T08:00:00+08:00
draft: false
tags: [ nacos, source code, 源码分析 nacos 系列 ]
categories: [ 源码分析 nacos 系列 ]
---

> nacos 基于 2.2.4 版本

> `nacos` 对于**临时实例**注册，采用的是 `AP` 协议，我们看看是怎么设计的。

## DistroProtocol 初始化

源码位置: `com.alibaba.nacos.core.distributed.distro.DistroProtocol#DistroProtocol`

```java
// DistroProtocol 构造函数
public DistroProtocol(ServerMemberManager memberManager, DistroComponentHolder distroComponentHolder,
        DistroTaskEngineHolder distroTaskEngineHolder) {
    this.memberManager = memberManager;
    this.distroComponentHolder = distroComponentHolder;
    this.distroTaskEngineHolder = distroTaskEngineHolder;
    // 开始定时任务
    startDistroTask();
}

// 开始定时任务
private void startDistroTask() {
    // standalone 表示单个节点，不用开启定时任务
    if (EnvUtil.getStandaloneMode()) {
        isInitialized = true;
        return;
    }
    // 定时任务，传递当前节点的数据给其他节点, 最终会执行 DistroVerifyTimedTask 
    startVerifyTask();
    // 定时任务，加载节点信息，最终会执行 DistroLoadDataTask 
    startLoadTask();
}
```

## DistroVerifyTimedTask 同步节点数据来续约

{{< image src="./DistroVerifyTimedTask.png" caption="DistroVerifyTimedTask" >}}

源码位置: `com.alibaba.nacos.core.distributed.distro.task.verify.DistroVerifyTimedTask`

```java
// 传递当前节点的数据给其他节点, 这个类很重要
// 在 distro 协议中，每个节点只会处理部分数据, 数据的版本要通过定时任务来发送给其他节点进行续约，
// 否则 client 下一次请求到其他节点，因为数据没有定时续约，会导致这个数据会过期删除. 
public class DistroVerifyTimedTask implements Runnable {
    
    ...
    
    @Override
    public void run() {
        try {
            // 获取其他节点列表
            List<Member> targetServer = serverMemberManager.allMembersWithoutSelf();
            if (Loggers.DISTRO.isDebugEnabled()) {
                Loggers.DISTRO.debug("server list is: {}", targetServer);
            }
            // 根据 type 来同步数据
            for (String each : distroComponentHolder.getDataStorageTypes()) {
                verifyForDataStorage(each, targetServer);
            }
        } catch (Exception e) {
            Loggers.DISTRO.error("[DISTRO-FAILED] verify task failed.", e);
        }
    }
    
    private void verifyForDataStorage(String type, List<Member> targetServer) {
        // DistroDataStorage 数据存储，目前只有一个实现类 DistroClientDataProcessor
        DistroDataStorage dataStorage = distroComponentHolder.findDataStorage(type);
        if (!dataStorage.isFinishInitial()) {
            Loggers.DISTRO.warn("data storage {} has not finished initial step, do not send verify data",
                    dataStorage.getClass().getSimpleName());
            return;
        }
        // 获取当前节点的数据，很重要
        List<DistroData> verifyData = dataStorage.getVerifyData();
        if (null == verifyData || verifyData.isEmpty()) {
            return;
        }
        // 同步给其他节点
        for (Member member : targetServer) {
            DistroTransportAgent agent = distroComponentHolder.findTransportAgent(type);
            if (null == agent) {
                continue;
            }
            // 同步数据, 执行 DistroVerifyExecuteTask
            executeTaskExecuteEngine.addTask(member.getAddress() + type,
                    new DistroVerifyExecuteTask(agent, verifyData, member.getAddress(), type));
        }
    }
}
```

源码位置: `com.alibaba.nacos.naming.consistency.ephemeral.distro.v2.DistroClientDataProcessor#getVerifyData`

```java
// 获取当前节点的数据
public List<DistroData> getVerifyData() {
    List<DistroData> result = null;
    for (String each : clientManager.allClientId()) {
        Client client = clientManager.getClient(each);
        if (null == client || !client.isEphemeral()) {
            continue;
        }
        // 是当前节点的数据
        if (clientManager.isResponsibleClient(client)) {
            // clientId 和 reversion 来校验数据，并进行续约 
            DistroClientVerifyInfo verifyData = new DistroClientVerifyInfo(client.getClientId(),
                    client.getRevision());
            DistroKey distroKey = new DistroKey(client.getClientId(), TYPE);
            DistroData data = new DistroData(distroKey,
                    ApplicationUtils.getBean(Serializer.class).serialize(verifyData));
            data.setType(DataOperation.VERIFY);
            if (result == null) {
                result = new LinkedList<>();
            }
            result.add(data);
        }
    }
    return result;
}
```

源码位置: `com.alibaba.nacos.core.distributed.distro.task.verify.DistroVerifyExecuteTask#run`

```java
// 同步数据
// 数据会包装为 DistroDataRequest, 会被 DistroDataRequestHandler 处理
@Override
public void run() {
    for (DistroData each : verifyData) {
        try {
            if (transportAgent.supportCallbackTransport()) {
                doSyncVerifyDataWithCallback(each);
            } else {
                doSyncVerifyData(each);
            }
        } catch (Exception e) {
            Loggers.DISTRO
                    .error("[DISTRO-FAILED] verify data for type {} to {} failed.", resourceType, targetServer, e);
        }
    }
}
```

源码位置: `com.alibaba.nacos.naming.remote.rpc.handler.DistroDataRequestHandler#handle`

```java
// DistroDataRequestHandler 处理 DistroDataRequest
// 这些方法都是委托 DistroProtocol 类来完成具体的调用
@Override
public DistroDataResponse handle(DistroDataRequest request, RequestMeta meta) throws NacosException {
    try {
        switch (request.getDataOperation()) {
            case VERIFY:
                return handleVerify(request.getDistroData(), meta);
            case SNAPSHOT:
                return handleSnapshot();
            case ADD:
            case CHANGE:
            case DELETE:
                return handleSyncData(request.getDistroData());
            case QUERY:
                return handleQueryData(request.getDistroData());
            default:
                return new DistroDataResponse();
        }
    } catch (Exception e) {
        Loggers.DISTRO.error("[DISTRO-FAILED] distro handle with exception", e);
        DistroDataResponse result = new DistroDataResponse();
        result.setErrorCode(ResponseCode.FAIL.getCode());
        result.setMessage("handle distro request with exception");
        return result;
    }
}

// 处理 VERIFY 请求
private DistroDataResponse handleVerify(DistroData distroData, RequestMeta meta) {
    DistroDataResponse result = new DistroDataResponse();
    // 对于临时数据，最终会调用 EphemeralIpPortClientManager 的 verifyClient 方法
    if (!distroProtocol.onVerify(distroData, meta.getClientIp())) {
        // 验证不通过，返回错误码, 这个很重要
        result.setErrorInfo(ResponseCode.FAIL.getCode(), "[DISTRO-FAILED] distro data verify failed");
    }
    return result;
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.client.manager.impl.EphemeralIpPortClientManager#verifyClient`

```java
// 接收到 Verify 数据之后, 验证 client 的 revision, 并进行续约
@Override
public boolean verifyClient(DistroClientVerifyInfo verifyData) {
    String clientId = verifyData.getClientId();
    IpPortBasedClient client = clients.get(clientId);
    if (null != client) {
        // remote node of old version will always verify with zero revision
        if (0 == verifyData.getRevision() || client.getRevision() == verifyData.getRevision()) {
            // 更新心跳时间, 也就是续约
            NamingExecuteTaskDispatcher.getInstance()
                    .dispatchAndExecuteTask(clientId, new ClientBeatUpdateTask(client));
            return true;
        } else {
            Loggers.DISTRO.info("[DISTRO-VERIFY-FAILED] IpPortBasedClient[{}] revision local={}, remote={}",
                    client.getClientId(), client.getRevision(), verifyData.getRevision());
        }
    }
    // 验证不通过，返回 false, 最终会返回错误码
    return false;
}
```

源码位置: `com.alibaba.nacos.naming.consistency.ephemeral.distro.v2.DistroClientTransportAgent.DistroVerifyCallbackWrapper#onResponse`

```java
// 接受到 Verify 的响应
@Override
public void onResponse(Response response) {
    // 检查错误码
    if (checkResponse(response)) {
        // 正常响应
        NamingTpsMonitor.distroVerifySuccess(member.getAddress(), member.getIp());
        distroCallback.onSuccess();
    } else {
        // 错误响应，发送 ClientVerifyFailedEvent 事件, 会单独推送这个 clientId 的数据
        Loggers.DISTRO.info("Target {} verify client {} failed, sync new client", targetServer, clientId);
        NotifyCenter.publishEvent(new ClientEvent.ClientVerifyFailedEvent(clientId, targetServer));
        NamingTpsMonitor.distroVerifyFail(member.getAddress(), member.getIp());
        distroCallback.onFailed(null);
    }
}
```

## DistroLoadDataTask 加载数据

源码位置: `com.alibaba.nacos.core.distributed.distro.task.load.DistroLoadDataTask#run`

```java
@Override
public void run() {
    try {
        load();
        if (!checkCompleted()) {
            GlobalExecutor.submitLoadDataTask(this, distroConfig.getLoadDataRetryDelayMillis());
        } else {
            loadCallback.onSuccess();
            Loggers.DISTRO.info("[DISTRO-INIT] load snapshot data success");
        }
    } catch (Exception e) {
        loadCallback.onFailed(e);
        Loggers.DISTRO.error("[DISTRO-INIT] load snapshot data failed. ", e);
    }
}

// 加载节点数据
private void load() throws Exception {
    // 检查节点列表
    while (memberManager.allMembersWithoutSelf().isEmpty()) {
        Loggers.DISTRO.info("[DISTRO-INIT] waiting server list init...");
        TimeUnit.SECONDS.sleep(1);
    }
    while (distroComponentHolder.getDataStorageTypes().isEmpty()) {
        Loggers.DISTRO.info("[DISTRO-INIT] waiting distro data storage register...");
        TimeUnit.SECONDS.sleep(1);
    }
    // 从远端加载快照数据, 用于服务快速启动
    for (String each : distroComponentHolder.getDataStorageTypes()) {
        if (!loadCompletedMap.containsKey(each) || !loadCompletedMap.get(each)) {
            loadCompletedMap.put(each, loadAllDataSnapshotFromRemote(each));
        }
    }
}
```

## DistroFilter 拦截请求


