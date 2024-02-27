# 11 连接管理


&gt; nacos 基于 2.2.4 版本

&gt; `nacos` 基于 `grpc` 的**长连接**来实现 `client` 和 `server` 的通信。
&gt; 在有多个 `server` 端时，最初开始 `client` 的连接会**均匀分布**在 `server` 端，当重新上线 `server` 时，这时候 `client` 的连接会偏移到其他 `server` 端，这样会造成 `server` 端请求**负载不均匀**。

{{&lt; image src=&#34;./connection.png&#34; caption=&#34;connection&#34; &gt;}}

## client 发起连接

源码位置: `com.alibaba.nacos.common.remote.client.grpc.GrpcClient#connectToServer`

```java
// GrpcClient 发送 ConnectionSetupRequest 请求，建立连接
@Override
public Connection connectToServer(ServerInfo serverInfo) {
    try {
        ...
        int port = serverInfo.getServerPort() &#43; rpcPortOffset();
        ManagedChannel managedChannel = createNewManagedChannel(serverInfo.getServerIp(), port);
        RequestGrpc.RequestFutureStub newChannelStubTemp = createNewChannelStub(managedChannel);
        if (newChannelStubTemp != null) {

            // 检查连接
            Response response = serverCheck(serverInfo.getServerIp(), port, newChannelStubTemp);
            if (response == null || !(response instanceof ServerCheckResponse)) {
                shuntDownChannel(managedChannel);
                return null;
            }

            BiRequestStreamGrpc.BiRequestStreamStub biRequestStreamStub = BiRequestStreamGrpc.newStub(
                    newChannelStubTemp.getChannel());
            GrpcConnection grpcConn = new GrpcConnection(serverInfo, grpcExecutor);
            grpcConn.setConnectionId(((ServerCheckResponse) response).getConnectionId());

            //create stream request and bind connection event to this connection.
            StreamObserver&lt;Payload&gt; payloadStreamObserver = bindRequestStream(biRequestStreamStub, grpcConn);

            // stream observer to send response to server
            grpcConn.setPayloadStreamObserver(payloadStreamObserver);
            grpcConn.setGrpcFutureServiceStub(newChannelStubTemp);
            grpcConn.setChannel(managedChannel);
            //send a  setup request.
            // 发送 ConnectionSetupRequest 请求，建立连接
            ConnectionSetupRequest conSetupRequest = new ConnectionSetupRequest();
            ...
            grpcConn.sendRequest(conSetupRequest);
            //wait to register connection setup
            Thread.sleep(100L);
            return grpcConn;
        }
        return null;
    } catch (Exception e) {
        LOGGER.error(&#34;[{}]Fail to connect to server!,error={}&#34;, GrpcClient.this.getName(), e);
    }
    return null;
}
```

## server 接受连接

源码位置: `com.alibaba.nacos.core.remote.grpc.GrpcBiStreamRequestAcceptor#requestBiStream`

```java
// GrpcBiStreamRequestAcceptor 处理 client 请求
@Override
public void onNext(Payload payload) {
    ...
    // 处理 ConnectionSetupRequest 请求
    if (parseObj instanceof ConnectionSetupRequest) {
        ConnectionSetupRequest setUpRequest = (ConnectionSetupRequest) parseObj;
        Map&lt;String, String&gt; labels = setUpRequest.getLabels();
        String appName = &#34;-&#34;;
        if (labels != null &amp;&amp; labels.containsKey(Constants.APPNAME)) {
            appName = labels.get(Constants.APPNAME);
        }
        
        ConnectionMeta metaInfo = new ConnectionMeta(connectionId, payload.getMetadata().getClientIp(),
                remoteIp, remotePort, localPort, ConnectionType.GRPC.getType(),
                setUpRequest.getClientVersion(), appName, setUpRequest.getLabels());
        metaInfo.setTenant(setUpRequest.getTenant());
        Connection connection = new GrpcConnection(metaInfo, responseObserver, GrpcServerConstants.CONTEXT_KEY_CHANNEL.get());
        connection.setAbilities(setUpRequest.getAbilities());
        boolean rejectSdkOnStarting = metaInfo.isSdkSource() &amp;&amp; !ApplicationUtils.isStarted();
        
        // 注册 connectionId 和 connection
        if (rejectSdkOnStarting || !connectionManager.register(connectionId, connection)) {
            //Not register to the connection manager if current server is over limit or server is starting.
            try {
                Loggers.REMOTE_DIGEST.warn(&#34;[{}]Connection register fail,reason:{}&#34;, connectionId,
                        rejectSdkOnStarting ? &#34; server is not started&#34; : &#34; server is over limited.&#34;);
                connection.request(new ConnectResetRequest(), 3000L);
                connection.close();
            } catch (Exception e) {
                //Do nothing.
                if (connectionManager.traced(clientIp)) {
                    Loggers.REMOTE_DIGEST
                            .warn(&#34;[{}]Send connect reset request error,error={}&#34;, connectionId, e);
                }
            }
        }
    ...
    }
}
```

源码位置: `com.alibaba.nacos.core.remote.ConnectionManager#register`

```java
// 注册 connectionId 和 connection
public synchronized boolean register(String connectionId, Connection connection) {
    // 判断是否连接
    if (connection.isConnected()) {
        String clientIp = connection.getMetaInfo().clientIp;
        if (connections.containsKey(connectionId)) {
            return true;
        }
        if (checkLimit(connection)) {
            return false;
        }
        if (traced(clientIp)) {
            connection.setTraced(true);
        }
        // 添加 connection
        connections.put(connectionId, connection);
        if (!connectionForClientIp.containsKey(clientIp)) {
            connectionForClientIp.put(clientIp, new AtomicInteger(0));
        }
        // 计算 clientIp 的连接数，这个数值可以供我们判断 是否需要 reloadClient (后面会介绍这个 http 请求)
        connectionForClientIp.get(clientIp).getAndIncrement();
        
        // connection 回调函数
        clientConnectionEventListenerRegistry.notifyClientConnected(connection);
        
        LOGGER.info(&#34;new connection registered successfully, connectionId = {},connection={} &#34;, connectionId,
                connection);
        return true;
        
    }
    return false;
}
```

源码位置: `com.alibaba.nacos.core.remote.ClientConnectionEventListenerRegistry#notifyClientConnected`

```java
// ClientConnectionEventListenerRegistry 通过 registerClientConnectionEventListener 方法来注册
// ClientConnectionEventListener 的实现类有 ConnectionBasedClientManager 和 RpcAckCallbackInitorOrCleaner, 它们都在父类中注册了
// connection 回调函数
public void notifyClientConnected(final Connection connection) {
    for (ClientConnectionEventListener clientConnectionEventListener : clientConnectionEventListeners) {
        try {
            clientConnectionEventListener.clientConnected(connection);
        } catch (Throwable throwable) {
            Loggers.REMOTE
                    .info(&#34;[NotifyClientConnected] failed for listener {}&#34;, clientConnectionEventListener.getName(),
                            throwable);
        }
    }
}
// connection 回调函数
public void notifyClientDisConnected(final Connection connection) {
    
    for (ClientConnectionEventListener clientConnectionEventListener : clientConnectionEventListeners) {
        try {
            clientConnectionEventListener.clientDisConnected(connection);
        } catch (Throwable throwable) {
            Loggers.REMOTE.info(&#34;[NotifyClientDisConnected] failed for listener {}&#34;,
                    clientConnectionEventListener.getName(), throwable);
        }
    }
}

// 注册 listener
public void registerClientConnectionEventListener(ClientConnectionEventListener listener) {
    Loggers.REMOTE.info(&#34;[ClientConnectionEventListenerRegistry] registry listener - &#34; &#43; listener.getClass()
            .getSimpleName());
    this.clientConnectionEventListeners.add(listener);
}
```

## reloadClient 重置连接

源码位置: `com.alibaba.nacos.core.controller.ServerLoaderController#reloadSingle`

```java
@Secured(resource = Commons.NACOS_CORE_CONTEXT_V2 &#43; &#34;/loader&#34;, action = ActionTypes.WRITE)
@GetMapping(&#34;/reloadClient&#34;)
public ResponseEntity&lt;String&gt; reloadSingle(@RequestParam String connectionId,
        @RequestParam(value = &#34;redirectAddress&#34;, required = false) String redirectAddress) {
    // 发送 ConnectResetRequest 请求，重置客户端
    connectionManager.loadSingle(connectionId, redirectAddress);
    return ResponseEntity.ok().body(&#34;success&#34;);
}
```

源码位置: `com.alibaba.nacos.core.remote.ConnectionManager#loadSingle`

```java
// 发送 ConnectResetRequest 请求，重置客户端
public void loadSingle(String connectionId, String redirectAddress) {
    Connection connection = getConnection(connectionId);
    
    if (connection != null) {
        // isSdkSource 表示是 nacos 客户端
        if (connection.getMetaInfo().isSdkSource()) {
            ConnectResetRequest connectResetRequest = new ConnectResetRequest();
            if (StringUtils.isNotBlank(redirectAddress) &amp;&amp; redirectAddress.contains(Constants.COLON)) {
                String[] split = redirectAddress.split(Constants.COLON);
                connectResetRequest.setServerIp(split[0]);
                connectResetRequest.setServerPort(split[1]);
            }
            try {
                // 发送 connectResetRequest 请求给客户端，会被 ConnectResetRequestHandler 处理
                connection.request(connectResetRequest, 3000L);
            } catch (ConnectionAlreadyClosedException e) {
                // 发送异常，说明这个连接已经断开了，所以注销 connectionId
                unregister(connectionId);
            } catch (Exception e) {
                LOGGER.error(&#34;error occurs when expel connection, connectionId: {} &#34;, connectionId, e);
            }
        }
    }
}
```

源码位置: `com.alibaba.nacos.common.remote.client.RpcClient.ConnectResetRequestHandler`

```java
// ConnectResetRequestHandler 处理 ConnectResetRequest 请求
// 在 RpcClient 的 start 方法中添加了 ServerRequestHandler
class ConnectResetRequestHandler implements ServerRequestHandler {
    
    @Override
    public Response requestReply(Request request) {
        
        if (request instanceof ConnectResetRequest) {
            try {
                synchronized (RpcClient.this) {
                    if (isRunning()) {
                        ConnectResetRequest connectResetRequest = (ConnectResetRequest) request;
                        if (StringUtils.isNotBlank(connectResetRequest.getServerIp())) {
                            ServerInfo serverInfo = resolveServerInfo(
                                    connectResetRequest.getServerIp() &#43; Constants.COLON
                                            &#43; connectResetRequest.getServerPort());
                            // 指定 serverInfo 变换 sever
                            switchServerAsync(serverInfo, false);
                        } else {
                            // 变换 sever
                            switchServerAsync();
                        }
                    }
                }
            } catch (Exception e) {
                LoggerUtils.printIfErrorEnabled(LOGGER, &#34;[{}] Switch server error, {}&#34;, rpcClientConfig.name(), e);
            }
            return new ConnectResetResponse();
        }
        return null;
    }
}
```

## server 断开连接检查

源码位置: `com.alibaba.nacos.core.remote.grpc.AddressTransportFilter#transportTerminated`

```java
// AddressTransportFilter 在 BaseGrpcServer 的 startServer 方法中注册
@Override
public void transportTerminated(Attributes transportAttrs) {
    // 获取 connectionId
    String connectionId = null;
    try {
        connectionId = transportAttrs.get(ATTR_TRANS_KEY_CONN_ID);
    } catch (Exception e) {
        // Ignore
    }
    if (StringUtils.isNotBlank(connectionId)) {
        Loggers.REMOTE_DIGEST
                .info(&#34;Connection transportTerminated,connectionId = {} &#34;, connectionId);
        // 注销 connectionId, 回调 clientConnectionEventListener 接口
        connectionManager.unregister(connectionId);
    }
}
```

## 测试类

`com.alibaba.nacos.core.remote.ConnectionManagerTest#testLoadSingle`


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/11-%E8%BF%9E%E6%8E%A5%E7%AE%A1%E7%90%86/  

