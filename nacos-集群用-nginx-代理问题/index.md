# nacos 集群用 nginx 代理问题



## 1. nacos 的端口

`nacos` 的 `http` 端口为 `8848`，但是 `nacos2.0` 之后使用 `grpc` 端口, 而且是**偏移量**计算的，所以使用 `nginx` 代理就有坑。

对于 spring 来说, 可以配置多个地址
```yaml
spring:
  cloud:
    nacos:
      server-addr: 172.168.0.101:8848,172.168.0.102:8848,172.168.0.103:8848
```

## 2. 源码

**发送请求**的方法 `com.alibaba.nacos.common.remote.client.grpc.GrpcConnection#request`
```
@Override
public Response request(Request request, long timeouts) throws NacosException {
    Payload grpcRequest = GrpcUtils.convert(request);
    // 发送请求
    ListenableFuture<Payload> requestFuture = grpcFutureServiceStub.request(grpcRequest);
    Payload grpcResponse;
    try {
        grpcResponse = requestFuture.get(timeouts, TimeUnit.MILLISECONDS);
    } catch (Exception e) {
        throw new NacosException(NacosException.SERVER_ERROR, e);
    }

    return (Response) GrpcUtils.parse(grpcResponse);
}
```

**创建 grpc客户端** 的方法 `com.alibaba.nacos.common.remote.client.grpc.GrpcClient#connectToServer`
```
@Override
public Connection connectToServer(ServerInfo serverInfo) {
    try {
        if (grpcExecutor == null) {
            this.grpcExecutor = createGrpcExecutor(serverInfo.getServerIp());
        }
        // 这里就是计算端口的逻辑， serverPort 默认为 8848， rpcPortOffset 为 1000
        int port = serverInfo.getServerPort() + rpcPortOffset();
        ManagedChannel managedChannel = createNewManagedChannel(serverInfo.getServerIp(), port);
        // 新建
        RequestGrpc.RequestFutureStub newChannelStubTemp = createNewChannelStub(managedChannel);
        if (newChannelStubTemp != null) {
            
            Response response = serverCheck(serverInfo.getServerIp(), port, newChannelStubTemp);
            if (response == null || !(response instanceof ServerCheckResponse)) {
                shuntDownChannel(managedChannel);
                return null;
            }
            
            BiRequestStreamGrpc.BiRequestStreamStub biRequestStreamStub = BiRequestStreamGrpc
                    .newStub(newChannelStubTemp.getChannel());
            GrpcConnection grpcConn = new GrpcConnection(serverInfo, grpcExecutor);
            grpcConn.setConnectionId(((ServerCheckResponse) response).getConnectionId());
            
            //create stream request and bind connection event to this connection.
            StreamObserver<Payload> payloadStreamObserver = bindRequestStream(biRequestStreamStub, grpcConn);
            
            // stream observer to send response to server
            grpcConn.setPayloadStreamObserver(payloadStreamObserver);
            grpcConn.setGrpcFutureServiceStub(newChannelStubTemp);
            grpcConn.setChannel(managedChannel);
            //send a  setup request.
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
        LOGGER.error("[{}]Fail to connect to server!,error={}", GrpcClient.this.getName(), e);
    }
    return null;
}
```

## 3. 参考

> [官方文档-端口说明](https://nacos.io/zh-cn/docs/v2/upgrading/2.0.0-compatibility.html)
