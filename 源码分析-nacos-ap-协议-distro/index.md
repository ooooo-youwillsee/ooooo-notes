# 源码分析 nacos AP 协议 Distro


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
    // 定时任务，同步当前节点的数据给其他节点, 最终会执行 DistroVerifyTimedTask 
    startVerifyTask();
    // 定时任务，从其他节点加载数据，最终会执行 DistroLoadDataTask 
    startLoadTask();
}
```

## DistroVerifyTimedTask 同步节点数据来续约

{{< image src="./DistroVerifyTimedTask.png" caption="DistroVerifyTimedTask" >}}

源码位置: `com.alibaba.nacos.core.distributed.distro.task.verify.DistroVerifyTimedTask`

```java
// 同步当前节点的数据给其他节点, 这个类很重要
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

源码位置: `com.alibaba.nacos.naming.web.DistroFilter#doFilter`

```java
// DistroFilter 会拦截所有的请求 
@Override
public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
        throws IOException, ServletException {
    ReuseHttpServletRequest req = new ReuseHttpServletRequest((HttpServletRequest) servletRequest);
    HttpServletResponse resp = (HttpServletResponse) servletResponse;
    
    String urlString = req.getRequestURI();
    
    if (StringUtils.isNotBlank(req.getQueryString())) {
        urlString += "?" + req.getQueryString();
    }
    
    try {
        // 获取请求对应的方法
        Method method = controllerMethodsCache.getMethod(req);
        
        String path = new URI(req.getRequestURI()).getPath();
        if (method == null) {
            throw new NoSuchMethodException(req.getMethod() + " " + path);
        }
        
        // 方法是否有 @CanDistro 注解，没有就直接放行，不处理
        if (!method.isAnnotationPresent(CanDistro.class)) {
            filterChain.doFilter(req, resp);
            return;
        }
        // 获取请求参数中的 ip 和 port
        String distroTag = distroTagGenerator.getResponsibleTag(req);
        
        // 当前节点是否响应该请求，如果是，直接放行，这个很重要, 后面继续解析
        if (distroMapper.responsible(distroTag)) {
            filterChain.doFilter(req, resp);
            return;
        }
        
        // proxy request to other server if necessary:
        String userAgent = req.getHeader(HttpHeaderConsts.USER_AGENT_HEADER);
        
        // 判断必须是 client 的请求，不能是 server 之间的请求
        if (StringUtils.isNotBlank(userAgent) && userAgent.contains(UtilsAndCommons.NACOS_SERVER_HEADER)) {
            // This request is sent from peer server, should not be redirected again:
            Loggers.SRV_LOG.error("receive invalid redirect request from peer {}", req.getRemoteAddr());
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST,
                    "receive invalid redirect request from peer " + req.getRemoteAddr());
            return;
        }
        
        // 获取转发节点, 根据 ip:port 的 hash 值对 serverList.size() 取余来计算
        final String targetServer = distroMapper.mapSrv(distroTag);
        
        List<String> headerList = new ArrayList<>(16);
        Enumeration<String> headers = req.getHeaderNames();
        while (headers.hasMoreElements()) {
            String headerName = headers.nextElement();
            headerList.add(headerName);
            headerList.add(req.getHeader(headerName));
        }
        
        final String body = IoUtils.toString(req.getInputStream(), StandardCharsets.UTF_8.name());
        final Map<String, String> paramsValue = HttpClient.translateParameterMap(req.getParameterMap());
        
        // 用 HttpClient 来转发请求到对应的节点上
        RestResult<String> result = HttpClient
                .request(HTTP_PREFIX + targetServer + req.getRequestURI(), headerList, paramsValue, body,
                        PROXY_CONNECT_TIMEOUT, PROXY_READ_TIMEOUT, StandardCharsets.UTF_8.name(), req.getMethod());
        String data = result.ok() ? result.getData() : result.getMessage();
        try {
            // 响应客户端请求
            WebUtils.response(resp, data, result.getCode());
        } catch (Exception ignore) {
            Loggers.SRV_LOG.warn("[DISTRO-FILTER] request failed: " + distroMapper.mapSrv(distroTag) + urlString);
        }
    } catch (AccessControlException e) {
        resp.sendError(HttpServletResponse.SC_FORBIDDEN, "access denied: " + ExceptionUtil.getAllExceptionMsg(e));
    } catch (NoSuchMethodException e) {
        resp.sendError(HttpServletResponse.SC_NOT_IMPLEMENTED,
                "no such api:" + req.getMethod() + ":" + req.getRequestURI());
    } catch (Exception e) {
        Loggers.SRV_LOG.warn("[DISTRO-FILTER] Server failed: ", e);
        resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                "Server failed, " + ExceptionUtil.getAllExceptionMsg(e));
    }
    
}
```

源码位置: `com.alibaba.nacos.naming.core.DistroMapper#responsible`

```java
// 当前节点是否响应该请求
public boolean responsible(String responsibleTag) {
    final List<String> servers = healthyList;
    
    if (!switchDomain.isDistroEnabled() || EnvUtil.getStandaloneMode()) {
        return true;
    }
    
    if (CollectionUtils.isEmpty(servers)) {
        // means distro config is not ready yet
        return false;
    }
    
    // 当前节点地址找不到，不转发请求 
    String localAddress = EnvUtil.getLocalAddress();
    int index = servers.indexOf(localAddress);
    int lastIndex = servers.lastIndexOf(localAddress);
    if (lastIndex < 0 || index < 0) {
        return true;
    }
    
    // 获取 hash 值，然后取余
    int target = distroHash(responsibleTag) % servers.size();
    return target >= index && target <= lastIndex;
}
```

## 测试类

`com.alibaba.nacos.test.naming.CPInstancesAPI_ITCase#registerInstance_ephemeral_true`
