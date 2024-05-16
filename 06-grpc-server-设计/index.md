# 06 Grpc Server 设计


&gt; nacos 基于 2.2.4 版本

&gt; `nacos` 在 `2.0` 版本中引入了 `grpc`，用来处理**http连接数过多**的问题，所以有必要看看**nacos 是怎么使用 grpc**的，这样方便我们理清整个请求流程。
&gt; 
&gt; 在 `nacos` 中只定义了**两个通用的请求模型**，一个是 `request-response`, 另外一个就是**基于双向流**的 `request-response`.

## grpc server 的启动 

所有的 `grpc` 服务都基于这个 `BaseGrpcServer` ，子类通过**不同配置**来定制服务，比如**端口**、**超时时间**

源码位置: `com.alibaba.nacos.core.remote.grpc.BaseGrpcServer`

```java
// 在父类中调用 start 方法，来执行 startServer 方法
@Override
public void startServer() throws Exception {
    final MutableHandlerRegistry handlerRegistry = new MutableHandlerRegistry();
    // 添加 rpc 请求
    addServices(handlerRegistry, new GrpcConnectionInterceptor());
    NettyServerBuilder builder = NettyServerBuilder.forPort(getServicePort()).executor(getRpcExecutor());

    // 配置 tls
    if (grpcServerConfig.getEnableTls()) {
        if (grpcServerConfig.getCompatibility()) {
            builder.protocolNegotiator(new OptionalTlsProtocolNegotiator(getSslContextBuilder()));
        } else {
            builder.sslContext(getSslContextBuilder());
        }
    }

    // 配置 grpc server 的参数
    server = builder.maxInboundMessageSize(getMaxInboundMessageSize()).fallbackHandlerRegistry(handlerRegistry)
            .compressorRegistry(CompressorRegistry.getDefaultInstance())
            .decompressorRegistry(DecompressorRegistry.getDefaultInstance())
             // 连接的过滤器，设置了一些属性，比如 ATTR_TRANS_KEY_CONN_ID
            .addTransportFilter(new AddressTransportFilter(connectionManager))
            .keepAliveTime(getKeepAliveTime(), TimeUnit.MILLISECONDS)
            .keepAliveTimeout(getKeepAliveTimeout(), TimeUnit.MILLISECONDS)
            .permitKeepAliveTime(getPermitKeepAliveTime(), TimeUnit.MILLISECONDS)
            .build();

    // 启动 grpc server
    server.start();
}

// 添加 rpc 请求
// 这里添加了两个通用的请求模型，payload -&gt; payload , stream payload &lt;-&gt; stream payload
// 所有的请求都会由 grpcCommonRequestAcceptor 和 grpcBiStreamRequestAcceptor 来处理，接下来看看是怎么处理请求的
private void addServices(MutableHandlerRegistry handlerRegistry, ServerInterceptor... serverInterceptor) {

    // unary common call register.
    final MethodDescriptor&lt;Payload, Payload&gt; unaryPayloadMethod = MethodDescriptor.&lt;Payload, Payload&gt;newBuilder()
            .setType(MethodDescriptor.MethodType.UNARY)
            .setFullMethodName(MethodDescriptor.generateFullMethodName(GrpcServerConstants.REQUEST_SERVICE_NAME,
                    GrpcServerConstants.REQUEST_METHOD_NAME))
            .setRequestMarshaller(ProtoUtils.marshaller(Payload.getDefaultInstance()))
            .setResponseMarshaller(ProtoUtils.marshaller(Payload.getDefaultInstance())).build();

    // 定义 payload -&gt; payload
    final ServerCallHandler&lt;Payload, Payload&gt; payloadHandler = ServerCalls
            .asyncUnaryCall((request, responseObserver) -&gt; grpcCommonRequestAcceptor.request(request, responseObserver));

    final ServerServiceDefinition serviceDefOfUnaryPayload = ServerServiceDefinition.builder(
                    GrpcServerConstants.REQUEST_SERVICE_NAME)
            .addMethod(unaryPayloadMethod, payloadHandler).build();
    handlerRegistry.addService(ServerInterceptors.intercept(serviceDefOfUnaryPayload, serverInterceptor));

    // bi stream register.
    // 定义 stream payload &lt;-&gt; stream payload
    final ServerCallHandler&lt;Payload, Payload&gt; biStreamHandler = ServerCalls.asyncBidiStreamingCall(
            (responseObserver) -&gt; grpcBiStreamRequestAcceptor.requestBiStream(responseObserver));

    final MethodDescriptor&lt;Payload, Payload&gt; biStreamMethod = MethodDescriptor.&lt;Payload, Payload&gt;newBuilder()
            .setType(MethodDescriptor.MethodType.BIDI_STREAMING).setFullMethodName(MethodDescriptor
                    .generateFullMethodName(GrpcServerConstants.REQUEST_BI_STREAM_SERVICE_NAME,
                            GrpcServerConstants.REQUEST_BI_STREAM_METHOD_NAME))
            .setRequestMarshaller(ProtoUtils.marshaller(Payload.newBuilder().build()))
            .setResponseMarshaller(ProtoUtils.marshaller(Payload.getDefaultInstance())).build();

    final ServerServiceDefinition serviceDefOfBiStream = ServerServiceDefinition
            .builder(GrpcServerConstants.REQUEST_BI_STREAM_SERVICE_NAME).addMethod(biStreamMethod, biStreamHandler).build();
    handlerRegistry.addService(ServerInterceptors.intercept(serviceDefOfBiStream, serverInterceptor));

}
```

## GrpcRequestAcceptor 处理单一请求

源码位置: `com.alibaba.nacos.core.remote.grpc.GrpcRequestAcceptor`

```java
// GrpcRequestAcceptor 处理请求
// 请求的逻辑比较清楚，最终由 RequestHandler 来处理请求
@Override
public void request(Payload grpcRequest, StreamObserver&lt;Payload&gt; responseObserver) {
    
    // trace 请求
    traceIfNecessary(grpcRequest, true);
    String type = grpcRequest.getMetadata().getType();
    
    //server is on starting.
    // server 正在启动中， 返回错误
    if (!ApplicationUtils.isStarted()) {
        Payload payloadResponse = GrpcUtils.convert(
                ErrorResponse.build(NacosException.INVALID_SERVER_STATUS, &#34;Server is starting,please try later.&#34;));
        traceIfNecessary(payloadResponse, false);
        responseObserver.onNext(payloadResponse);
        responseObserver.onCompleted();
        return;
    }
    
    // server check.
    // 检查请求处理，在客户端启动时，会发送 ServerCheckRequest 请求
    if (ServerCheckRequest.class.getSimpleName().equals(type)) {
        Payload serverCheckResponseP = GrpcUtils.convert(new ServerCheckResponse(GrpcServerConstants.CONTEXT_KEY_CONN_ID.get()));
        traceIfNecessary(serverCheckResponseP, false);
        responseObserver.onNext(serverCheckResponseP);
        responseObserver.onCompleted();
        return;
    }
    
    // 根据 type 来获取 handler，这里最重要
    RequestHandler requestHandler = requestHandlerRegistry.getByRequestType(type);
    //no handler found.
    // 没有找到对应的 handler，返回错误
    if (requestHandler == null) {
        Loggers.REMOTE_DIGEST.warn(String.format(&#34;[%s] No handler for request type : %s :&#34;, &#34;grpc&#34;, type));
        Payload payloadResponse = GrpcUtils
                .convert(ErrorResponse.build(NacosException.NO_HANDLER, &#34;RequestHandler Not Found&#34;));
        traceIfNecessary(payloadResponse, false);
        responseObserver.onNext(payloadResponse);
        responseObserver.onCompleted();
        return;
    }
    
    //check connection status.
    // 检查连接状态, 在客户端启动时，会发送 ConnectionSetupRequest 请求来创建 Connection
    String connectionId = GrpcServerConstants.CONTEXT_KEY_CONN_ID.get();
    boolean requestValid = connectionManager.checkValid(connectionId);
    if (!requestValid) {
        Loggers.REMOTE_DIGEST
                .warn(&#34;[{}] Invalid connection Id ,connection [{}] is un registered ,&#34;, &#34;grpc&#34;, connectionId);
        Payload payloadResponse = GrpcUtils
                .convert(ErrorResponse.build(NacosException.UN_REGISTER, &#34;Connection is unregistered.&#34;));
        traceIfNecessary(payloadResponse, false);
        responseObserver.onNext(payloadResponse);
        responseObserver.onCompleted();
        return;
    }
    
    Object parseObj = null;
    try {
        // 根据 grpcRequest 中的 type 来进行 json 反序列化
        parseObj = GrpcUtils.parse(grpcRequest);
    } catch (Exception e) {
        Loggers.REMOTE_DIGEST
                .warn(&#34;[{}] Invalid request receive from connection [{}] ,error={}&#34;, &#34;grpc&#34;, connectionId, e);
        Payload payloadResponse = GrpcUtils.convert(ErrorResponse.build(NacosException.BAD_GATEWAY, e.getMessage()));
        traceIfNecessary(payloadResponse, false);
        responseObserver.onNext(payloadResponse);
        responseObserver.onCompleted();
        return;
    }
    
    // 无效的请求，返回错误
    if (parseObj == null) {
        Loggers.REMOTE_DIGEST.warn(&#34;[{}] Invalid request receive  ,parse request is null&#34;, connectionId);
        Payload payloadResponse = GrpcUtils
                .convert(ErrorResponse.build(NacosException.BAD_GATEWAY, &#34;Invalid request&#34;));
        traceIfNecessary(payloadResponse, false);
        responseObserver.onNext(payloadResponse);
        responseObserver.onCompleted();
        return;
    }
    
    // 只能是 request 对象
    if (!(parseObj instanceof Request)) {
        Loggers.REMOTE_DIGEST
                .warn(&#34;[{}] Invalid request receive  ,parsed payload is not a request,parseObj={}&#34;, connectionId,
                        parseObj);
        Payload payloadResponse = GrpcUtils
                .convert(ErrorResponse.build(NacosException.BAD_GATEWAY, &#34;Invalid request&#34;));
        traceIfNecessary(payloadResponse, false);
        responseObserver.onNext(payloadResponse);
        responseObserver.onCompleted();
        return;
    }
    
    Request request = (Request) parseObj;
    try {
        // 获取对应的 connection，设置 requestMeta
        Connection connection = connectionManager.getConnection(GrpcServerConstants.CONTEXT_KEY_CONN_ID.get());
        RequestMeta requestMeta = new RequestMeta();
        requestMeta.setClientIp(connection.getMetaInfo().getClientIp());
        requestMeta.setConnectionId(GrpcServerConstants.CONTEXT_KEY_CONN_ID.get());
        requestMeta.setClientVersion(connection.getMetaInfo().getVersion());
        requestMeta.setLabels(connection.getMetaInfo().getLabels());
        connectionManager.refreshActiveTime(requestMeta.getConnectionId());
        // requestHandler 来处理具体的请求
        Response response = requestHandler.handleRequest(request, requestMeta);
        Payload payloadResponse = GrpcUtils.convert(response);
        traceIfNecessary(payloadResponse, false);
        // 返回请求给客户端
        responseObserver.onNext(payloadResponse);
        responseObserver.onCompleted();
    } catch (Throwable e) {
        Loggers.REMOTE_DIGEST
                .error(&#34;[{}] Fail to handle request from connection [{}] ,error message :{}&#34;, &#34;grpc&#34;, connectionId,
                        e);
        Payload payloadResponse = GrpcUtils.convert(ErrorResponse.build(e));
        traceIfNecessary(payloadResponse, false);
        responseObserver.onNext(payloadResponse);
        responseObserver.onCompleted();
    }
}
```

源码位置: `com.alibaba.nacos.core.remote.RequestHandler`

```java
// RequestHandler 处理 请求
public Response handleRequest(T request, RequestMeta meta) throws NacosException {
    // 处理过滤器，比如 TpsControlRequestFilter, RemoteRequestAuthFilter 
    for (AbstractRequestFilter filter : requestFilters.filters) {
        try {
            Response filterResult = filter.filter(request, meta, this.getClass());
            if (filterResult != null &amp;&amp; !filterResult.isSuccess()) {
                return filterResult;
            }
        } catch (Throwable throwable) {
            Loggers.REMOTE.error(&#34;filter error&#34;, throwable);
        }
        
    }
    // 子类来处理具体的请求
    return handle(request, meta);
}
```

## GrpcBiStreamRequestAcceptor 处理流式请求

源码位置: `com.alibaba.nacos.core.remote.grpc.GrpcBiStreamRequestAcceptor`

```java
// GrpcBiStreamRequestAcceptor 处理流式请求
// 处理逻辑比较清楚，主要分为 onNext(正常请求)、onError(错误请求)、onCompleted(关闭请求)
// 在流式处理中，没有 requestHandler 来处理请求，
// 这是因为流式请求主要是 服务端发送数据给客户端，客户端接受后发送 ack response
@Override
public StreamObserver&lt;Payload&gt; requestBiStream(StreamObserver&lt;Payload&gt; responseObserver) {
    
    StreamObserver&lt;Payload&gt; streamObserver = new StreamObserver&lt;Payload&gt;() {
        
        final String connectionId = GrpcServerConstants.CONTEXT_KEY_CONN_ID.get();
        
        final Integer localPort = GrpcServerConstants.CONTEXT_KEY_CONN_LOCAL_PORT.get();
        
        final int remotePort = GrpcServerConstants.CONTEXT_KEY_CONN_REMOTE_PORT.get();
        
        String remoteIp = GrpcServerConstants.CONTEXT_KEY_CONN_REMOTE_IP.get();
        
        String clientIp = &#34;&#34;;
        
        @Override
        public void onNext(Payload payload) {
            
            // 获取客户端的 ip
            clientIp = payload.getMetadata().getClientIp();
            traceDetailIfNecessary(payload);
            
            Object parseObj;
            try {
                // 反序列化对象
                parseObj = GrpcUtils.parse(payload);
            } catch (Throwable throwable) {
                Loggers.REMOTE_DIGEST
                        .warn(&#34;[{}]Grpc request bi stream,payload parse error={}&#34;, connectionId, throwable);
                return;
            }
            
            // 请求对象为 null，不处理
            if (parseObj == null) {
                Loggers.REMOTE_DIGEST
                        .warn(&#34;[{}]Grpc request bi stream,payload parse null ,body={},meta={}&#34;, connectionId,
                                payload.getBody().getValue().toStringUtf8(), payload.getMetadata());
                return;
            }
            //  处理 ConnectionSetupRequest 请求，客户端启动时会发送这个请求
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
                // 新建 connection
                Connection connection = new GrpcConnection(metaInfo, responseObserver, GrpcServerConstants.CONTEXT_KEY_CHANNEL.get());
                connection.setAbilities(setUpRequest.getAbilities());
                boolean rejectSdkOnStarting = metaInfo.isSdkSource() &amp;&amp; !ApplicationUtils.isStarted();
                
                // 注册 connection 对象, 如果不成功，则关闭连接
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
                
            } else if (parseObj instanceof Response) {
                // 处理 response 请求，请求可能需要 ack
                Response response = (Response) parseObj;
                if (connectionManager.traced(clientIp)) {
                    Loggers.REMOTE_DIGEST
                            .warn(&#34;[{}]Receive response of server request  ,response={}&#34;, connectionId, response);
                }
                // ack 通知
                RpcAckCallbackSynchronizer.ackNotify(connectionId, response);
                connectionManager.refreshActiveTime(connectionId);
            } else {
                Loggers.REMOTE_DIGEST
                        .warn(&#34;[{}]Grpc request bi stream,unknown payload receive ,parseObj={}&#34;, connectionId,
                                parseObj);
            }
            
        }
        
        @Override
        public void onError(Throwable t) {
            if (connectionManager.traced(clientIp)) {
                Loggers.REMOTE_DIGEST.warn(&#34;[{}]Bi stream on error,error={}&#34;, connectionId, t);
            }
            
            if (responseObserver instanceof ServerCallStreamObserver) {
                ServerCallStreamObserver serverCallStreamObserver = ((ServerCallStreamObserver) responseObserver);
                if (serverCallStreamObserver.isCancelled()) {
                    //client close the stream.
                } else {
                    try {
                        serverCallStreamObserver.onCompleted();
                    } catch (Throwable throwable) {
                        //ignore
                    }
                }
            }
            
        }
        
        @Override
        public void onCompleted() {
            if (connectionManager.traced(clientIp)) {
                Loggers.REMOTE_DIGEST.warn(&#34;[{}]Bi stream on completed&#34;, connectionId);
            }
            if (responseObserver instanceof ServerCallStreamObserver) {
                ServerCallStreamObserver serverCallStreamObserver = ((ServerCallStreamObserver) responseObserver);
                if (serverCallStreamObserver.isCancelled()) {
                    //client close the stream.
                } else {
                    try {
                        serverCallStreamObserver.onCompleted();
                    } catch (Throwable throwable) {
                        //ignore
                    }
                    
                }
            }
        }
    };
    
    return streamObserver;
}
```

## 测试类

`com.alibaba.nacos.core.remote.grpc.GrpcServerTest#testGrpcSdkServer`
`com.alibaba.nacos.core.remote.grpc.GrpcServerTest#testGrpcClusterServer`

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/06-grpc-server-%E8%AE%BE%E8%AE%A1/  

