---
title: 09 dubbo 协议
date: 2023-12-07T08:00:00+08:00
draft: false
tags: [ dubbo, source code, 源码分析 dubbo 系列 ]
collections: [ 源码分析 dubbo 系列 ]
---

> dubbo 基于 3.2.6 版本

> 在 `dubbo 2.x` 中，**最常用**的协议就是 `dubbo` 协议，我们有必要**弄懂**整个实现过程。

## export 导出服务

源码位置: `org.apache.dubbo.rpc.protocol.dubbo.DubboProtocol#export`

```java
@Override
public <T> Exporter<T> export(Invoker<T> invoker) throws RpcException {
    checkDestroyed();
    URL url = invoker.getUrl();
    String key = serviceKey(url);
    // 添加到 exporterMap
    DubboExporter<T> exporter = new DubboExporter<T>(invoker, key, exporterMap);
    ...
    // 打开服务，会监听端口
    openServer(url);
    // 优化序列化，不用太关心
    optimizeSerialization(url);
    return exporter;
}
```

源码位置: `org.apache.dubbo.rpc.protocol.dubbo.DubboProtocol#openServer`

```java
private void openServer(URL url) {
    checkDestroyed();
    String key = url.getAddress();
    // 判断是否为 server 端
    boolean isServer = url.getParameter(IS_SERVER_KEY, true);
    if (isServer) {
        // 延迟初始化
        ProtocolServer server = serverMap.get(key);
        if (server == null) {
            synchronized (this) {
                server = serverMap.get(key);
                if (server == null) {
                    // 创建服务
                    serverMap.put(key, createServer(url));
                    return;
                }
            }
        }
        // server supports reset, use together with override
        server.reset(url);
    }
}
```

源码位置: `org.apache.dubbo.rpc.protocol.dubbo.DubboProtocol#createServer`

```java
private ProtocolServer createServer(URL url) {
    url = URLBuilder.from(url)
        .addParameterIfAbsent(CHANNEL_READONLYEVENT_SENT_KEY, Boolean.TRUE.toString())
        // 心跳
        .addParameterIfAbsent(HEARTBEAT_KEY, String.valueOf(DEFAULT_HEARTBEAT))
        // 编解码
        .addParameter(CODEC_KEY, DubboCodec.NAME)
        .build();

    // 使用 netty  
    String transporter = url.getParameter(SERVER_KEY, DEFAULT_REMOTING_SERVER);
    if (StringUtils.isNotEmpty(transporter) && !url.getOrDefaultFrameworkModel().getExtensionLoader(Transporter.class).hasExtension(transporter)) {
        throw new RpcException("Unsupported server type: " + transporter + ", url: " + url);
    }

    ExchangeServer server;
    try {
        // 绑定端口, 设置 requestHandler，因为 client 和 server 都是同一个 requestHandler, 最后再解析 
        server = Exchangers.bind(url, requestHandler);
    } catch (RemotingException e) {
        throw new RpcException("Fail to start server(url: " + url + ") " + e.getMessage(), e);
    }
    ...
    return protocolServer;
}
```

## refer 引用服务

源码位置: `org.apache.dubbo.rpc.protocol.dubbo.DubboProtocol#refer`

```java
@Override
public <T> Invoker<T> refer(Class<T> type, URL url) throws RpcException {
    checkDestroyed();
    return protocolBindingRefer(type, url);
}

@Override
public <T> Invoker<T> protocolBindingRefer(Class<T> serviceType, URL url) throws RpcException {
    checkDestroyed();
    // 优化序列化，不需要关心
    optimizeSerialization(url);

    // 获取 clients, 创建 dubboInvoker
    DubboInvoker<T> invoker = new DubboInvoker<T>(serviceType, url, getClients(url), invokers);
    invokers.add(invoker);
    return invoker;
}
```

源码位置: `org.apache.dubbo.rpc.protocol.dubbo.DubboProtocol#getClients`

```java
private ClientsProvider getClients(URL url) {
    // 获取连接数，0表示共享一个连接
    int connections = url.getParameter(CONNECTIONS_KEY, 0);
    // whether to share connection
    // if not configured, connection is shared, otherwise, one connection for one service
    if (connections == 0) {
        ...
        // 获取共享client，最终调用 initClient 方法
        return getSharedClient(url, connections);
    }

    // 获取多个client
    List<ExchangeClient> clients = IntStream.range(0, connections)
        .mapToObj((i) -> initClient(url))
        .collect(Collectors.toList());
    return new ExclusiveClientsProvider(clients);
}
```

源码位置: `org.apache.dubbo.rpc.protocol.dubbo.DubboProtocol#initClient`

```java
private ExchangeClient initClient(URL url) {
    // 使用 netty
    String str = url.getParameter(CLIENT_KEY, url.getParameter(SERVER_KEY, DEFAULT_REMOTING_CLIENT));
    ...
    try {
        ScopeModel scopeModel = url.getScopeModel();
        int heartbeat = UrlUtils.getHeartbeat(url);
        // Replace InstanceAddressURL with ServiceConfigURL.
        url = new ServiceConfigURL(DubboCodec.NAME, url.getUsername(), url.getPassword(), url.getHost(), url.getPort(), url.getPath(), url.getAllParameters());
        // 编解码
        url = url.addParameter(CODEC_KEY, DubboCodec.NAME);
        // 心跳
        url = url.addParameterIfAbsent(HEARTBEAT_KEY, Integer.toString(heartbeat));
        url = url.setScopeModel(scopeModel);

        // connection should be lazy
        return url.getParameter(LAZY_CONNECT_KEY, false)
            ? new LazyConnectExchangeClient(url, requestHandler)
            // 连接端口，设置 requestHandler
            : Exchangers.connect(url, requestHandler);
    } catch (RemotingException e) {
        throw new RpcException("Fail to create remoting client for service(" + url + "): " + e.getMessage(), e);
    }
}
```

## requestHandler

> client 和 server 共用的请求处理器

源码位置: `org.apache.dubbo.remoting.exchange.support.ExchangeHandlerAdapter#reply`

```java
@Override
public CompletableFuture<Object> reply(ExchangeChannel channel, Object message) throws RemotingException {
    ...
    Invocation inv = (Invocation) message;
    // 获取 invoker
    Invoker<?> invoker = inv.getInvoker() == null ? getInvoker(channel, inv) : inv.getInvoker();
    // switch TCCL
    if (invoker.getUrl().getServiceModel() != null) {
        Thread.currentThread().setContextClassLoader(invoker.getUrl().getServiceModel().getClassLoader());
    }
    // 判断回调方法是否存在
    if (Boolean.TRUE.toString().equals(inv.getObjectAttachmentWithoutConvert(IS_CALLBACK_SERVICE_INVOKE))) {
        String methodsStr = invoker.getUrl().getParameters().get("methods");
        boolean hasMethod = false;
        if (methodsStr == null || !methodsStr.contains(",")) {
            hasMethod = inv.getMethodName().equals(methodsStr);
        } else {
            String[] methods = methodsStr.split(",");
            for (String method : methods) {
                if (inv.getMethodName().equals(method)) {
                    hasMethod = true;
                    break;
                }
            }
        }
        if (!hasMethod) {
            logger.warn(PROTOCOL_FAILED_REFER_INVOKER, "", "", new IllegalStateException("The methodName " + inv.getMethodName()
                + " not found in callback service interface ,invoke will be ignored."
                + " please update the api interface. url is:"
                + invoker.getUrl()) + " ,invocation is :" + inv);
            return null;
        }
    }
    RpcContext.getServiceContext().setRemoteAddress(channel.getRemoteAddress());
    // 调用业务接口，返回 AsyncRpcResult
    Result result = invoker.invoke(inv);
    return result.thenApply(Function.identity());
}
```

