---
title: 10 triple 协议
date: 2023-12-07T08:00:00+08:00
draft: false
tags: [ dubbo, source code, 源码分析 dubbo 系列 ]
collections: [ 源码分析 dubbo 系列 ]
---

> dubbo 基于 3.2.6 版本

> 在 `dubbo 3.x` 中，新增了**一种协议**，那就是 `triple` 协议，可以兼容 `grpc` 协议, 这两个协议的底层都是 `http2` 协议。 `triple` 协议实现的比较复杂，所以我会把**关键代码**贴出来。

## export 导出服务

源码位置: `org.apache.dubbo.rpc.protocol.tri.TripleProtocol#export`

```java
@Override
public <T> Exporter<T> export(Invoker<T> invoker) throws RpcException {
    URL url = invoker.getUrl();
    String key = serviceKey(url);
    ...
    invokers.add(invoker);

    // 添加到 pathResolver, 这个很关键
    Invoker<?> previous = pathResolver.add(url.getServiceKey(), invoker);
    if (previous != null) {
       ...
    }
    ...
    // 初始化线程池
    ExecutorRepository.getInstance(url.getOrDefaultApplicationModel()).createExecutorIfAbsent(ExecutorUtil.setThreadName(url, SERVER_THREAD_POOL_NAME));
    
    // 绑定端口，开启服务, 注意 DefaultPuHandler 是空实现，这是和 DubboProtocol 实现的主要区别
    PortUnificationExchanger.bind(url, new DefaultPuHandler());
    // 序列化，不用关心
    optimizeSerialization(url);
    return exporter;
}
```

源码位置: `org.apache.dubbo.remoting.transport.netty4.NettyPortUnificationTransporter#bind`

```java
// PortUnificationExchanger#bind 最终会调用此方法
// 在 NettyPortUnificationServer 的父类构造函数中会调用 doOpen 方法
@Override
public AbstractPortUnificationServer bind(URL url, ChannelHandler handler) throws RemotingException {
    return new NettyPortUnificationServer(url, handler);
}
```

源码位置: `org.apache.dubbo.remoting.transport.netty4.NettyPortUnificationServer#doOpen`

```java
// 下面的代码是标准的 netty 代码， 我们只需要关注其中的 channelHandler 就可以了
public void doOpen() throws Throwable {
    bootstrap = new ServerBootstrap();
    ...
    bootstrap.group(bossGroup, workerGroup)
        .channel(NettyEventLoopFactory.serverSocketChannelClass())
        .option(ChannelOption.SO_REUSEADDR, Boolean.TRUE)
        .childOption(ChannelOption.TCP_NODELAY, Boolean.TRUE)
        .childOption(ChannelOption.ALLOCATOR, PooledByteBufAllocator.DEFAULT)
        .childHandler(new ChannelInitializer<SocketChannel>() {
            @Override
            protected void initChannel(SocketChannel ch) throws Exception {
                // Do not add idle state handler here, because it should be added in the protocol handler.
                final ChannelPipeline p = ch.pipeline();
                // 负责心跳，不用关心
                NettyChannelHandler nettyChannelHandler = new NettyChannelHandler(dubboChannels, getUrl(), NettyPortUnificationServer.this);
                // puHandler 是最重要的 channelHandler, 负责检测是 grpc 还是 triple 协议
                NettyPortUnificationServerHandler puHandler = new NettyPortUnificationServerHandler(getUrl(), true, getProtocols(),
                    NettyPortUnificationServer.this,
                    getSupportedUrls(), getSupportedHandlers());
                p.addLast("channel-handler", nettyChannelHandler);
                p.addLast("negotiation-protocol", puHandler);
            }
        });
    ...
}
```

源码位置: `org.apache.dubbo.remoting.transport.netty4.NettyPortUnificationServerHandler#decode`

```java
// 当接受到请求时，netty 会回调这个方法
@Override
protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)
    throws Exception {
    NettyChannel channel = NettyChannel.getOrAddChannel(ctx.channel(), url, handler);
    ...
    if (providerConnectionConfig != null && isSsl(in)) {
        // 检测 SSL，就是判断前5个字符
        enableSsl(ctx, providerConnectionConfig);
    } else {
        // 检测是 grpc 还是 triple
        for (final WireProtocol protocol : protocols) {
            in.markReaderIndex();
            ChannelBuffer buf = new NettyBackedChannelBuffer(in);
            final ProtocolDetector.Result result = protocol.detector().detect(buf);
            in.resetReaderIndex();
            switch (result) {
                case UNRECOGNIZED:
                    continue;
                case RECOGNIZED:
                    String protocolName = url.getOrDefaultFrameworkModel().getExtensionLoader(WireProtocol.class)
                        .getExtensionName(protocol);
                    // 获取 handler 和 url， 不用关心
                    ChannelHandler localHandler = this.handlerMapper.getOrDefault(protocolName, handler);
                    URL localURL = this.urlMapper.getOrDefault(protocolName, url);
                    channel.setUrl(localURL);
                    NettyConfigOperator operator = new NettyConfigOperator(channel, localHandler);
                    // 配置 channelHandler，非常重要，后面继续解析
                    protocol.configServerProtocolHandler(url, operator);
                    // 移除当前 channelHandler，下一次就不需要在检测了
                    ctx.pipeline().remove(this);
                case NEED_MORE_DATA:
                    return;
                default:
                    return;
            }
        }
        ...
    }
}
```

源码位置: `org.apache.dubbo.rpc.protocol.tri.TripleHttp2Protocol#configServerProtocolHandler`

```java
// 配置 http2 相关的 channelHandler
@Override
public void configServerProtocolHandler(URL url, ChannelOperator operator) {
    ...
    final Http2FrameCodec codec = TripleHttp2FrameCodecBuilder.forServer()
         ...
        .build();
    ExecutorSupport executorSupport = ExecutorRepository.getInstance(url.getOrDefaultApplicationModel()).getExecutorSupport(url);
    codec.connection().local().flowController().frameWriter(codec.encoder().frameWriter());
    TripleWriteQueue writeQueue = new TripleWriteQueue();
    final Http2MultiplexHandler handler = new Http2MultiplexHandler(
        new ChannelInitializer<Http2StreamChannel>() {
            @Override
            protected void initChannel(Http2StreamChannel ch) {
                final ChannelPipeline p = ch.pipeline();
                p.addLast(new TripleCommandOutBoundHandler());
                // TripleHttp2FrameServerHandler 就是真实处理 http2 请求
                p.addLast(new TripleHttp2FrameServerHandler(frameworkModel, executorSupport,
                    headFilters, ch, writeQueue));
            }
        });
    // 添加一系列的 channelHandler
    List<ChannelHandler> handlers = new ArrayList<>();
    handlers.add(new ChannelHandlerPretender(codec)); // http2 的编解码
    handlers.add(new ChannelHandlerPretender(new FlushConsolidationHandler(64, true))); // 减少 flush 次数
    handlers.add(new ChannelHandlerPretender(new TripleServerConnectionHandler())); // 连接管理
    handlers.add(new ChannelHandlerPretender(handler)); // 处理 http2 frame
    handlers.add(new ChannelHandlerPretender(new TripleTailHandler())); // 释放 ReferenceCounted
    operator.configChannelHandler(handlers);
}
```

## TripleHttp2FrameServerHandler

> 接受客户端的消息

源码位置: `org.apache.dubbo.rpc.protocol.tri.transport.TripleHttp2FrameServerHandler#TripleHttp2FrameServerHandler`

```java
// http2 中的每个 stream 都会接受到回调方法
@Override
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
    if (msg instanceof Http2HeadersFrame) {
        // 处理 Http2HeadersFrame， 读取 serviceName，methodName
        onHeadersRead(ctx, (Http2HeadersFrame) msg);
    } else if (msg instanceof Http2DataFrame) {
        // 处理 Http2DataFrame, 读取数据
        onDataRead(ctx, (Http2DataFrame) msg);
    } else if (msg instanceof ReferenceCounted) {
        // ignored
        ReferenceCountUtil.release(msg);
    }
}


// 处理 Http2DataFrame
public void onDataRead(ChannelHandlerContext ctx, Http2DataFrame msg) throws Exception {
    tripleServerStream.transportObserver.onData(msg.content(), msg.isEndStream());
}

// 处理 Http2HeadersFrame
public void onHeadersRead(ChannelHandlerContext ctx, Http2HeadersFrame msg) throws Exception {
    Executor executor = executorSupport.getExecutor(msg.headers());
    tripleServerStream.setExecutor(executor);
    // 调用 ServerTransportObserver#onHeader 方法
    tripleServerStream.transportObserver.onHeader(msg.headers(), msg.isEndStream());
}
```

源码位置: `org.apache.dubbo.rpc.protocol.tri.stream.TripleServerStream.ServerTransportObserver#onHeader`

```java
@Override
public void onHeader(Http2Headers headers, boolean endStream) {
    executor.execute(() -> processHeader(headers, endStream));
}

private void processHeader(Http2Headers headers, boolean endStream) {
    ...
    String[] parts = path.split("/");
    if (parts.length != 3) {
        responseErr(TriRpcStatus.UNIMPLEMENTED.withDescription("Bad path format:" + path));
        return;
    }
    String serviceName = parts[1];
    String originalMethodName = parts[2];

    // 从 pathResolver 中获取 invoker
    Invoker<?> invoker = getInvoker(headers, serviceName);
    ...

    // headers 转换为 map
    Map<String, Object> requestMetadata = headersToMap(headers, () -> {
        return Optional.ofNullable(headers.get(TripleHeaderEnum.TRI_HEADER_CONVERT.getHeader()))
            .map(CharSequence::toString)
            .orElse(null);
    });
    boolean hasStub = pathResolver.hasNativeStub(path);
    if (hasStub) {
        listener = new StubAbstractServerCall(invoker, TripleServerStream.this,
            frameworkModel,
            acceptEncoding, serviceName, originalMethodName, executor);
    } else {
        // 常用的就是这个，下面以这个为例子
        listener = new ReflectionAbstractServerCall(invoker, TripleServerStream.this,
            frameworkModel, acceptEncoding, serviceName, originalMethodName, filters,
            executor);
    }
    // must before onHeader
    deframer = new TriDecoder(deCompressor, new ServerDecoderListener(listener));
    // 根据 methodDescriptor 来获取最终调用的 listener，非常重要
    listener.onHeader(requestMetadata);
}
```

源码位置: `org.apache.dubbo.rpc.protocol.tri.call.AbstractServerCall#onHeader`

```java
@Override
public void onHeader(Map<String, Object> requestMetadata) {
    this.requestMetadata = requestMetadata;
    ...
    startCall();
}

// 注意 startCall 应该调用子类的方法，在这里忽略，直接分析父类的方法逻辑
protected void startCall() {
    // 构建 RpcInvocation
    RpcInvocation invocation = buildInvocation(methodDescriptor);
    // 非常重要
    listener = startInternalCall(invocation, methodDescriptor, invoker);
}
```

源码位置: `org.apache.dubbo.rpc.protocol.tri.call.AbstractServerCall#startInternalCall`

> 设置**调用监听器**, 比如 `UnaryServerCallListener`, `ServerStreamServerCallListener`, `BiStreamServerCallListener`

```java
protected ServerCall.Listener startInternalCall(
    RpcInvocation invocation,
    MethodDescriptor methodDescriptor,
    Invoker<?> invoker) {
    this.cancellationContext = RpcContext.getCancellationContext();
    ServerCallToObserverAdapter<Object> responseObserver =
        new ServerCallToObserverAdapter<>(this, cancellationContext);
    try {
        ServerCall.Listener listener;
        switch (methodDescriptor.getRpcType()) {
            case UNARY:
                listener = new UnaryServerCallListener(invocation, invoker, responseObserver, packableMethod.needWrapper());
                request(2);
                break;
            case SERVER_STREAM:
                listener = new ServerStreamServerCallListener(invocation, invoker,
                    responseObserver);
                request(2);
                break;
            case BI_STREAM:
            case CLIENT_STREAM:
                listener = new BiStreamServerCallListener(invocation, invoker,
                    responseObserver);
                request(1);
                break;
            default:
                throw new IllegalStateException("Can not reach here");
        }
        return listener;
    } catch (Exception e) {
        ...
    }
    return null;
}
```

下面以 `UnaryServerCallListener` 来分析**是怎么处理请求**, 这里一定要仔细看。

```java
onHeadersRead(ctx, (Http2HeadersFrame) msg); 
// 读取 headers，设置了当前的 listener 为 UnaryServerCallListener

onDataRead(ctx, (Http2DataFrame) msg); 
// endStream 为 false，会调用 deframer.deframe(data) 解析数据
// 最终调用 UnaryServerCallListener#onMessage 方法来设置参数

onDataRead(ctx, (Http2DataFrame) msg); 
// endStream 为 true，会调用 deframer.close() 关闭 listener
// 最终调用 UnaryServerCallListener#onComplete 方法来执行 invoke 方法

onReturn(r.getValue());
// 把结果返回给客户端
```

## refer 引用服务

源码位置: `org.apache.dubbo.rpc.protocol.tri.TripleProtocol#refer`

```java
@Override
public <T> Invoker<T> refer(Class<T> type, URL url) throws RpcException {
    // 序列化优化，不用关心
    optimizeSerialization(url);
    ExecutorService streamExecutor = getOrCreateStreamExecutor(
        url.getOrDefaultApplicationModel(), url);
    // 连接端口，注意 DefaultPuHandler 是空实现，这是和 DubboProtocol 实现的主要区别
    AbstractConnectionClient connectionClient = PortUnificationExchanger.connect(url, new DefaultPuHandler());
    // 包装为 tripleInvoker
    TripleInvoker<T> invoker = new TripleInvoker<>(type, url, acceptEncodings,
        connectionClient, invokers, streamExecutor);
    invokers.add(invoker);
    return invoker;
}
```

源码位置: `org.apache.dubbo.remoting.transport.netty4.NettyPortUnificationTransporter#connect`

```java
// PortUnificationExchanger#connect 最终会调用此方法
@Override
public AbstractConnectionClient connect(URL url, ChannelHandler handler) throws RemotingException {
    ConnectionManager manager = url.getOrDefaultFrameworkModel().getExtensionLoader(ConnectionManager.class).getExtension(MultiplexProtocolConnectionManager.NAME);
    // 连接, 最终会调用 NettyConnectionManager#connect 方法
    return manager.connect(url, handler);
}
```

源码位置: `org.apache.dubbo.remoting.transport.netty4.NettyConnectionManager#connect`

```java
// 在 NettyConnectionClient 的父类构造方法中会调用 doOpen 和 doConnect 方法
@Override
public AbstractConnectionClient connect(URL url, ChannelHandler handler) {
    try {
        return new NettyConnectionClient(url, handler);
    } catch (RemotingException e) {
        throw new RuntimeException(e);
    }
}
```

源码位置: `org.apache.dubbo.remoting.transport.netty4.NettyConnectionClient#doOpen`

```java
@Override
protected void doOpen() throws Throwable {
    initConnectionClient();
    // 初始化 netty 的 bootstrap, 设置了 http2 的编解码
    initBootstrap();
}

@Override
protected void doConnect() throws RemotingException {
    ...
    createConnectingPromise();
    // 连接端口
    final ChannelFuture promise = bootstrap.connect();
    ...忽略错误处理逻辑
}
```

## TripleInvoker

> 当客户端调用方法时，就会执行 `TripleInvoker#doInvoke` 方法, 接下来分析这部分逻辑。

源码位置: `org.apache.dubbo.rpc.protocol.tri.TripleInvoker#doInvoke`

```java
// 根据不同的方式来调用，比如 invokeUnary, invokeServerStream, invokeBiOrClientStream
@Override
protected Result doInvoke(final Invocation invocation) {
    ...
    ClientCall call = new TripleClientCall(connectionClient, callbackExecutor,
        getUrl().getOrDefaultFrameworkModel(), writeQueue);
    AsyncRpcResult result;
    try {
        switch (methodDescriptor.getRpcType()) {
            case UNARY:
                // 重点分析这个
                result = invokeUnary(methodDescriptor, invocation, call, callbackExecutor);
                break;
            case SERVER_STREAM:
                result = invokeServerStream(methodDescriptor, invocation, call);
                break;
            case CLIENT_STREAM:
            case BI_STREAM:
                result = invokeBiOrClientStream(methodDescriptor, invocation, call);
                break;
            default:
                throw new IllegalStateException("Can not reach here");
        }
        return result;
    } catch (Throwable t) {
        ...省略处理错误逻辑 
    }
}
```

源码位置: `org.apache.dubbo.rpc.protocol.tri.TripleInvoker#invokeUnary`

```java
// 一元请求逻辑
AsyncRpcResult invokeUnary(MethodDescriptor methodDescriptor, Invocation invocation,
                           ClientCall call, ExecutorService callbackExecutor) {

    ...
    final AsyncRpcResult result;
    DeadlineFuture future = DeadlineFuture.newFuture(getUrl().getPath(),
        methodDescriptor.getMethodName(), getUrl().getAddress(), timeout, callbackExecutor);

    RequestMetadata request = createRequest(methodDescriptor, invocation, timeout);

    final Object pureArgument;

    // 封装参数
    if (methodDescriptor instanceof StubMethodDescriptor) {
        pureArgument = invocation.getArguments()[0];
    } else {
        if (methodDescriptor.isGeneric()) {
            Object[] args = new Object[3];
            args[0] = RpcUtils.getMethodName(invocation);
            args[1] = Arrays.stream(RpcUtils.getParameterTypes(invocation)).map(Class::getName).collect(Collectors.toList());
            args[2] = RpcUtils.getArguments(invocation);
            pureArgument = args;
        } else {
            pureArgument = invocation.getArguments();
        }
    }
    result = new AsyncRpcResult(future, invocation);
    ...
    ClientCall.Listener callListener = new UnaryClientCallListener(future);
    // start 方法非常重要，创建了 TripleClientStream, 并设置 channelHandler
    final StreamObserver<Object> requestObserver = call.start(request, callListener);
    // 发送请求
    requestObserver.onNext(pureArgument);
    requestObserver.onCompleted();
    return result;
}
```

源码位置: `org.apache.dubbo.rpc.protocol.tri.call.TripleClientCall#start`

```java
@Override
public StreamObserver<Object> start(RequestMetadata metadata,
                                    ClientCall.Listener responseListener) {
    this.requestMetadata = metadata;
    this.listener = responseListener;
    // 在构造方法中调用 initHttp2StreamChannel 方法
    this.stream = new TripleClientStream(frameworkModel, executor, (Channel) connectionClient.getChannel(true),
        this, writeQueue);
    return new ClientCallToObserverAdapter<>(this);
}
```

源码位置: `org.apache.dubbo.rpc.protocol.tri.stream.TripleClientStream#initHttp2StreamChannel`

```java
// 初始化 http2 stream 的 channelHandler
private TripleStreamChannelFuture initHttp2StreamChannel(Channel parent) {
    TripleStreamChannelFuture streamChannelFuture = new TripleStreamChannelFuture(parent);
    Http2StreamChannelBootstrap bootstrap = new Http2StreamChannelBootstrap(parent);
    bootstrap.handler(new ChannelInboundHandlerAdapter() {
            @Override
            public void handlerAdded(ChannelHandlerContext ctx) throws Exception {
                Channel channel = ctx.channel();
                // 负责发送请求
                channel.pipeline().addLast(new TripleCommandOutBoundHandler());
                // 负责接受响应
                channel.pipeline().addLast(new TripleHttp2ClientResponseHandler(createTransportListener()));
            }
        });
    CreateStreamQueueCommand cmd = CreateStreamQueueCommand.create(bootstrap, streamChannelFuture);
    this.writeQueue.enqueue(cmd);
    return streamChannelFuture;
}
```

## TripleHttp2ClientResponseHandler

> 接受服务端的消息

源码位置: `org.apache.dubbo.rpc.protocol.tri.transport.TripleHttp2ClientResponseHandler#channelRead0`

```java
// 负责接受响应
protected void channelRead0(ChannelHandlerContext ctx, Http2StreamFrame msg) throws Exception {
    if (msg instanceof Http2HeadersFrame) {
        final Http2HeadersFrame headers = (Http2HeadersFrame) msg;
        transportListener.onHeader(headers.headers(), headers.isEndStream());
    } else if (msg instanceof Http2DataFrame) {
        final Http2DataFrame data = (Http2DataFrame) msg;
        transportListener.onData(data.content(), data.isEndStream());
    } else {
        super.channelRead(ctx, msg);
    }
}
```

## 测试类

`org.apache.dubbo.rpc.protocol.tri.TripleProtocolTest#testDemoProtocol`

在调试过程，可能会出现**超时**，可以添加下面代码来解决。

```java
URL consumerUrl = URL.valueOf(
    "tri://127.0.0.1:" + availablePort + "/" + IGreeter.class.getName());
// 添加下面代码
RpcContext.getClientAttachment().getObjectAttachments().put("timeout", 180000);
```