# 07 grpc client 设计


&gt; nacos 基于 2.2.4 版本

&gt; `nacos` 的 `grpc client` 使用的是生成的代码，位置在 `com.alibaba.nacos.api.grpc.auto`

## client 的启动

源码位置: `com.alibaba.nacos.common.remote.client.RpcClient#start`

```java
// RpcClient 是父类，完成了基本功能，比如重试、连接事件
public final void start() throws NacosException {
    // 初始化状态变为启动中状态
    boolean success = rpcClientStatus.compareAndSet(RpcClientStatus.INITIALIZED, RpcClientStatus.STARTING);
    if (!success) {
        return;
    }
    
    // 初始化客户端事件线程池
    clientEventExecutor = new ScheduledThreadPoolExecutor(2, r -&gt; {
        ...
    });
    
    // connection event consumer.
    // 连接事件
    clientEventExecutor.submit(() -&gt; {
        while (!clientEventExecutor.isTerminated() &amp;&amp; !clientEventExecutor.isShutdown()) {
            ConnectionEvent take;
            try {
                take = eventLinkedBlockingQueue.take();
                if (take.isConnected()) {
                    notifyConnected();
                } else if (take.isDisConnected()) {
                    notifyDisConnected();
                }
            } catch (Throwable e) {
                // Do nothing
            }
        }
    });
    
    // 重连事件
    clientEventExecutor.submit(() -&gt; {
        while (true) {
            try {
                if (isShutdown()) {
                    break;
                }
                ReconnectContext reconnectContext = reconnectionSignal.poll(rpcClientConfig.connectionKeepAlive(),
                        TimeUnit.MILLISECONDS);
                if (reconnectContext == null) {
                    // check alive time.
                    // 进行健康检查，发送 HealthCheckRequest 请求
                    if (System.currentTimeMillis() - lastActiveTimeStamp &gt;= rpcClientConfig.connectionKeepAlive()) {
                        boolean isHealthy = healthCheck();
                        if (!isHealthy) {
                            // 判断当前连接
                            if (currentConnection == null) {
                                continue;
                            }
                            LoggerUtils.printIfInfoEnabled(LOGGER,
                                    &#34;[{}] Server healthy check fail, currentConnection = {}&#34;,
                                    rpcClientConfig.name(), currentConnection.getConnectionId());
                            
                            RpcClientStatus rpcClientStatus = RpcClient.this.rpcClientStatus.get();
                            // 已经关闭了，无需检查了
                            if (RpcClientStatus.SHUTDOWN.equals(rpcClientStatus)) {
                                break;
                            }
                            
                            boolean statusFLowSuccess = RpcClient.this.rpcClientStatus.compareAndSet(
                                    rpcClientStatus, RpcClientStatus.UNHEALTHY);
                            if (statusFLowSuccess) {
                                reconnectContext = new ReconnectContext(null, false);
                            } else {
                                continue;
                            }
                            
                        } else {
                            lastActiveTimeStamp = System.currentTimeMillis();
                            continue;
                        }
                    } else {
                        continue;
                    }
                    
                }
                
                // 检查服务是否已经删除
                if (reconnectContext.serverInfo != null) {
                    // clear recommend server if server is not in server list.
                    boolean serverExist = false;
                    for (String server : getServerListFactory().getServerList()) {
                        ServerInfo serverInfo = resolveServerInfo(server);
                        if (serverInfo.getServerIp().equals(reconnectContext.serverInfo.getServerIp())) {
                            serverExist = true;
                            reconnectContext.serverInfo.serverPort = serverInfo.serverPort;
                            break;
                        }
                    }
                    if (!serverExist) {
                        LoggerUtils.printIfInfoEnabled(LOGGER,
                                &#34;[{}] Recommend server is not in server list, ignore recommend server {}&#34;,
                                rpcClientConfig.name(), reconnectContext.serverInfo.getAddress());
                        // 赋值为 null，会挑选下一个服务来进行重连 
                        reconnectContext.serverInfo = null;
                        
                    }
                }
                // 进行重连
                reconnect(reconnectContext.serverInfo, reconnectContext.onRequestFail);
            } catch (Throwable throwable) {
                // Do nothing
            }
        }
    });
    
    // connect to server, try to connect to server sync retryTimes times, async starting if failed.
    Connection connectToServer = null;
    rpcClientStatus.set(RpcClientStatus.STARTING);
    
    // 重试
    int startUpRetryTimes = rpcClientConfig.retryTimes();
    while (startUpRetryTimes &gt; 0 &amp;&amp; connectToServer == null) {
        try {
            startUpRetryTimes--;
            // 获取下一个 serverInfo，因为 nacos 的地址可以配置多个，或者配置一个 http 地址来动态获取
            ServerInfo serverInfo = nextRpcServer();
            
            LoggerUtils.printIfInfoEnabled(LOGGER, &#34;[{}] Try to connect to server on start up, server: {}&#34;,
                    rpcClientConfig.name(), serverInfo);
            
            // 连接服务，由子类来实现，接下来继续看
            connectToServer = connectToServer(serverInfo);
        } catch (Throwable e) {
            LoggerUtils.printIfWarnEnabled(LOGGER,
                    &#34;[{}] Fail to connect to server on start up, error message = {}, start up retry times left: {}&#34;,
                    rpcClientConfig.name(), e.getMessage(), startUpRetryTimes, e);
        }
        
    }
    
    // 向 eventLinkedBlockingQueue 队列中添加 ConnectionEvent, 产生连接事件 
    if (connectToServer != null) {
        LoggerUtils.printIfInfoEnabled(LOGGER,
                &#34;[{}] Success to connect to server [{}] on start up, connectionId = {}&#34;, rpcClientConfig.name(),
                connectToServer.serverInfo.getAddress(), connectToServer.getConnectionId());
        // 设置当前连接       
        this.currentConnection = connectToServer;
        rpcClientStatus.set(RpcClientStatus.RUNNING);
        eventLinkedBlockingQueue.offer(new ConnectionEvent(ConnectionEvent.CONNECTED));
    } else {
        // 变更服务，发送 ReconnectContext 事件, 进行重连
        switchServerAsync();
    }
    
    registerServerRequestHandler(new ConnectResetRequestHandler());
    
    // register client detection request.
    registerServerRequestHandler(request -&gt; {
        if (request instanceof ClientDetectionRequest) {
            return new ClientDetectionResponse();
        }
        
        return null;
    });
}
```

## 连接 grpc server

源码位置: `com.alibaba.nacos.common.remote.client.grpc.GrpcClient#connectToServer`

```java
// 子类实现连接 grpc server
// 1. 发送 ServerCheckRequest 请求来检查服务, 会返回 connectionId
// 2. 发送 ConnectionSetupRequest 请求来注册 connection
// 3. 最后包装为 GrpcConnection
@Override
public Connection connectToServer(ServerInfo serverInfo) {
    try {
        if (grpcExecutor == null) {
            this.grpcExecutor = createGrpcExecutor(serverInfo.getServerIp());
        }
        // 计算端口偏移，对于 sdkClient 来说，就是 8848 &#43; 1000 = 9848
        // 如果用 nginx 来做代理，9848 端口也需要代理
        int port = serverInfo.getServerPort() &#43; rpcPortOffset();
        ManagedChannel managedChannel = createNewManagedChannel(serverInfo.getServerIp(), port);
        // 单一请求
        RequestGrpc.RequestFutureStub newChannelStubTemp = createNewChannelStub(managedChannel);
        if (newChannelStubTemp != null) {
            
            // 发送 ServerCheckRequest 请求，会被 GrpcRequestAcceptor#request 处理
            Response response = serverCheck(serverInfo.getServerIp(), port, newChannelStubTemp);
            if (response == null || !(response instanceof ServerCheckResponse)) {
                shuntDownChannel(managedChannel);
                return null;
            }

            // 流式请求
            BiRequestStreamGrpc.BiRequestStreamStub biRequestStreamStub = BiRequestStreamGrpc.newStub(
                    newChannelStubTemp.getChannel());
            GrpcConnection grpcConn = new GrpcConnection(serverInfo, grpcExecutor);
            grpcConn.setConnectionId(((ServerCheckResponse) response).getConnectionId());

            //create stream request and bind connection event to this connection.
            // client 流式处理请求
            StreamObserver&lt;Payload&gt; payloadStreamObserver = bindRequestStream(biRequestStreamStub, grpcConn);

            // stream observer to send response to server
            grpcConn.setPayloadStreamObserver(payloadStreamObserver);
            grpcConn.setGrpcFutureServiceStub(newChannelStubTemp);
            grpcConn.setChannel(managedChannel);
            //send a  setup request.
            // 发送 ConnectionSetupRequest 请求，会被 GrpcBiStreamRequestAcceptor#requestBiStream 处理，注册 connection
            ConnectionSetupRequest conSetupRequest = new ConnectionSetupRequest();
            conSetupRequest.setClientVersion(VersionUtils.getFullClientVersion());
            conSetupRequest.setLabels(super.getLabels());
            conSetupRequest.setAbilities(super.clientAbilities);
            conSetupRequest.setTenant(super.getTenant());
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

源码位置: `com.alibaba.nacos.common.remote.client.grpc.GrpcClient#bindRequestStream`

```java
// client 流式处理请求
// onNext: 处理请求  
// onError 和 onCompleted 来变换 grpc server
private StreamObserver&lt;Payload&gt; bindRequestStream(final BiRequestStreamGrpc.BiRequestStreamStub streamStub,
                                                  final GrpcConnection grpcConn) {

    return streamStub.requestBiStream(new StreamObserver&lt;Payload&gt;() {

        @Override
        public void onNext(Payload payload) {

            LoggerUtils.printIfDebugEnabled(LOGGER, &#34;[{}]Stream server request receive, original info: {}&#34;,
                    grpcConn.getConnectionId(), payload.toString());
            try {
                Object parseBody = GrpcUtils.parse(payload);
                final Request request = (Request) parseBody;
                if (request != null) {

                    try {
                        // 处理服务端请求
                        Response response = handleServerRequest(request);
                        if (response != null) {
                            response.setRequestId(request.getRequestId());
                            // 响应
                            sendResponse(response);
                        } else {
                            LOGGER.warn(&#34;[{}]Fail to process server request, ackId-&gt;{}&#34;, grpcConn.getConnectionId(),
                                    request.getRequestId());
                        }

                    } catch (Exception e) {
                        LoggerUtils.printIfErrorEnabled(LOGGER, &#34;[{}]Handle server request exception: {}&#34;,
                                grpcConn.getConnectionId(), payload.toString(), e.getMessage());
                        Response errResponse = ErrorResponse.build(NacosException.CLIENT_ERROR,
                                &#34;Handle server request error&#34;);
                        errResponse.setRequestId(request.getRequestId());
                        sendResponse(errResponse);
                    }

                }

            } catch (Exception e) {

                LoggerUtils.printIfErrorEnabled(LOGGER, &#34;[{}]Error to process server push response: {}&#34;,
                        grpcConn.getConnectionId(), payload.getBody().getValue().toStringUtf8());
            }
        }

        @Override
        public void onError(Throwable throwable) {
            boolean isRunning = isRunning();
            boolean isAbandon = grpcConn.isAbandon();
            if (isRunning &amp;&amp; !isAbandon) {
                LoggerUtils.printIfErrorEnabled(LOGGER, &#34;[{}]Request stream error, switch server,error={}&#34;,
                        grpcConn.getConnectionId(), throwable);
                if (rpcClientStatus.compareAndSet(RpcClientStatus.RUNNING, RpcClientStatus.UNHEALTHY)) {
                    switchServerAsync();
                }

            } else {
                LoggerUtils.printIfWarnEnabled(LOGGER, &#34;[{}]Ignore error event,isRunning:{},isAbandon={}&#34;,
                        grpcConn.getConnectionId(), isRunning, isAbandon);
            }

        }

        @Override
        public void onCompleted() {
            boolean isRunning = isRunning();
            boolean isAbandon = grpcConn.isAbandon();
            if (isRunning &amp;&amp; !isAbandon) {
                LoggerUtils.printIfErrorEnabled(LOGGER, &#34;[{}]Request stream onCompleted, switch server&#34;,
                        grpcConn.getConnectionId());
                if (rpcClientStatus.compareAndSet(RpcClientStatus.RUNNING, RpcClientStatus.UNHEALTHY)) {
                    switchServerAsync();
                }

            } else {
                LoggerUtils.printIfInfoEnabled(LOGGER, &#34;[{}]Ignore complete event,isRunning:{},isAbandon={}&#34;,
                        grpcConn.getConnectionId(), isRunning, isAbandon);
            }

        }
    });
}
```

## 测试类

`com.alibaba.nacos.test.naming.CPInstancesAPI_ITCase#registerInstance_ephemeral_true`

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/07-grpc-client-%E8%AE%BE%E8%AE%A1/  

