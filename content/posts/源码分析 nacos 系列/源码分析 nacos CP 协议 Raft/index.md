---
title: 源码分析 nacos CP 协议 Raft
date: 2023-09-06T08:00:00+08:00
draft: false
tags: [ nacos, source code, 源码分析 nacos 系列 ]
categories: [ 源码分析 nacos 系列 ]
---

> nacos 基于 2.2.4 版本

## raft 协议的初始化

源码位置: `com.alibaba.nacos.core.distributed.raft.JRaftProtocol#init`

```java
@Override
public void init(RaftConfig config) {
    // 判断是否已经初始化
    if (initialized.compareAndSet(false, true)) {
        this.raftConfig = config;
        // 这里是一个空方法
        NotifyCenter.registerToSharePublisher(RaftEvent.class);
        // raftServer 初始化
        this.raftServer.init(this.raftConfig);
        // raftServer 启动
        this.raftServer.start();
        
        // There is only one consumer to ensure that the internal consumption
        // is sequential and there is no concurrent competition
        // 监听 RaftEvent 事件
        NotifyCenter.registerSubscriber(new Subscriber<RaftEvent>() {
            @Override
            public void onEvent(RaftEvent event) {
                Loggers.RAFT.info("This Raft event changes : {}", event);
                final String groupId = event.getGroupId();
                Map<String, Map<String, Object>> value = new HashMap<>();
                Map<String, Object> properties = new HashMap<>();
                final String leader = event.getLeader();
                final Long term = event.getTerm();
                final List<String> raftClusterInfo = event.getRaftClusterInfo();
                final String errMsg = event.getErrMsg();
                
                // Leader information needs to be selectively updated. If it is valid data,
                // the information in the protocol metadata is updated.
                MapUtil.putIfValNoEmpty(properties, MetadataKey.LEADER_META_DATA, leader);
                MapUtil.putIfValNoNull(properties, MetadataKey.TERM_META_DATA, term);
                MapUtil.putIfValNoEmpty(properties, MetadataKey.RAFT_GROUP_MEMBER, raftClusterInfo);
                MapUtil.putIfValNoEmpty(properties, MetadataKey.ERR_MSG, errMsg);
                
                value.put(groupId, properties);
                // 保存元数据
                metaData.load(value);
                
                // The metadata information is injected into the metadata information of the node
                // 会发布 MembersChangeEvent 事件
                injectProtocolMetaData(metaData);
            }
            
            @Override
            public Class<? extends Event> subscribeType() {
                return RaftEvent.class;
            }
            
        });
    }
}
```

## raftServer 的初始化

源码位置: `com.alibaba.nacos.core.distributed.raft.JRaftServer#init`

```java
void init(RaftConfig config) {
    this.raftConfig = config;
    this.serializer = SerializeFactory.getDefault();
    Loggers.RAFT.info("Initializes the Raft protocol, raft-config info : {}", config);
    // 初始化 raft 线程池
    RaftExecutor.init(config);
    
    // 解析配置
    final String self = config.getSelfMember();
    String[] info = InternetAddressUtil.splitIPPortStr(self);
    selfIp = info[0];
    selfPort = Integer.parseInt(info[1]);
    localPeerId = PeerId.parsePeer(self);
    nodeOptions = new NodeOptions();
    
    // Set the election timeout time. The default is 5 seconds.
    // 选举的超时时间
    int electionTimeout = Math.max(ConvertUtils.toInt(config.getVal(RaftSysConstants.RAFT_ELECTION_TIMEOUT_MS),
            RaftSysConstants.DEFAULT_ELECTION_TIMEOUT), RaftSysConstants.DEFAULT_ELECTION_TIMEOUT);
    
    // 请求超时时间
    rpcRequestTimeoutMs = ConvertUtils.toInt(raftConfig.getVal(RaftSysConstants.RAFT_RPC_REQUEST_TIMEOUT_MS),
            RaftSysConstants.DEFAULT_RAFT_RPC_REQUEST_TIMEOUT_MS);
    
    // 共享定时器
    nodeOptions.setSharedElectionTimer(true);
    nodeOptions.setSharedVoteTimer(true);
    nodeOptions.setSharedStepDownTimer(true);
    nodeOptions.setSharedSnapshotTimer(true);
    
    nodeOptions.setElectionTimeoutMs(electionTimeout);
    // 配置 raft
    RaftOptions raftOptions = RaftOptionsBuilder.initRaftOptions(raftConfig);
    nodeOptions.setRaftOptions(raftOptions);
    // open jraft node metrics record function
    nodeOptions.setEnableMetrics(true);
    
    CliOptions cliOptions = new CliOptions();
    
    // 初始化 raft 的 cliService
    this.cliService = RaftServiceFactory.createAndInitCliService(cliOptions);
    // cliService 的通信类, 从这个类中可以拿到 rpcClient
    this.cliClientService = (CliClientServiceImpl) ((CliServiceImpl) this.cliService).getCliClientService();
}
```

## raftServer 的启动

源码位置: `com.alibaba.nacos.core.distributed.raft.JRaftServer#start`

```java
synchronized void start() {
    // 判断是否已经启动
    if (!isStarted) {
        Loggers.RAFT.info("========= The raft protocol is starting... =========");
        try {
            // init raft group node
            // 初始化 raft 的节点列表
            com.alipay.sofa.jraft.NodeManager raftNodeManager = com.alipay.sofa.jraft.NodeManager.getInstance();
            for (String address : raftConfig.getMembers()) {
                PeerId peerId = PeerId.parsePeer(address);
                conf.addPeer(peerId);
                raftNodeManager.addAddress(peerId.getEndpoint());
            }
            // 设置节点配置
            nodeOptions.setInitialConf(conf);
            
            // 创建 rpcServer 和自定义请求处理器, 这个 server 在多个 raft group 中是共享的
            rpcServer = JRaftUtils.initRpcServer(this, localPeerId);
            
            // rpcServer 初始化
            if (!this.rpcServer.init(null)) {
                Loggers.RAFT.error("Fail to init [BaseRpcServer].");
                throw new RuntimeException("Fail to init [BaseRpcServer].");
            }
            
            // Initialize multi raft group service framework
            isStarted = true;
            // 创建 raftGroup
            createMultiRaftGroup(processors);
            Loggers.RAFT.info("========= The raft protocol start finished... =========");
        } catch (Exception e) {
            Loggers.RAFT.error("raft protocol start failure, cause: ", e);
            throw new JRaftException(e);
        }
    }
}
```

源码位置: `com.alibaba.nacos.core.distributed.raft.utils.JRaftUtils#initRpcServer`

```java
// 创建 rpcServer 和自定义请求处理器
public static RpcServer initRpcServer(JRaftServer server, PeerId peerId) {
    GrpcRaftRpcFactory raftRpcFactory = (GrpcRaftRpcFactory) RpcFactoryHelper.rpcFactory();
    // 注册 protobuf 序列化类
    raftRpcFactory.registerProtobufSerializer(Log.class.getName(), Log.getDefaultInstance());
    raftRpcFactory.registerProtobufSerializer(GetRequest.class.getName(), GetRequest.getDefaultInstance());
    raftRpcFactory.registerProtobufSerializer(WriteRequest.class.getName(), WriteRequest.getDefaultInstance());
    raftRpcFactory.registerProtobufSerializer(ReadRequest.class.getName(), ReadRequest.getDefaultInstance());
    raftRpcFactory.registerProtobufSerializer(Response.class.getName(), Response.getDefaultInstance());
    
    // 注册响应类
    MarshallerRegistry registry = raftRpcFactory.getMarshallerRegistry();
    registry.registerResponseInstance(Log.class.getName(), Response.getDefaultInstance());
    registry.registerResponseInstance(GetRequest.class.getName(), Response.getDefaultInstance());
    
    registry.registerResponseInstance(WriteRequest.class.getName(), Response.getDefaultInstance());
    registry.registerResponseInstance(ReadRequest.class.getName(), Response.getDefaultInstance());
    
    final RpcServer rpcServer = raftRpcFactory.createRpcServer(peerId.getEndpoint());
    // 添加 raft 的 requestProcessor
    RaftRpcServerFactory.addRaftRequestProcessors(rpcServer, RaftExecutor.getRaftCoreExecutor(),
            RaftExecutor.getRaftCliServiceExecutor());
    
    // 注册自定义的 requestProcessor
    rpcServer.registerProcessor(new NacosWriteRequestProcessor(server, SerializeFactory.getDefault()));
    rpcServer.registerProcessor(new NacosReadRequestProcessor(server, SerializeFactory.getDefault()));
    
    return rpcServer;
}
```

源码位置: `com.alibaba.nacos.core.distributed.raft.JRaftServer#createMultiRaftGroup`

```java
// 创建 raftGroup
// 从这个方法可以看出
// 每个 groupName 都会对应一个 processor，一个 NacosStateMachine，一个 Node。
synchronized void createMultiRaftGroup(Collection<RequestProcessor4CP> processors) {
    // There is no reason why the LogProcessor cannot be processed because of the synchronization
    if (!this.isStarted) {
        // 添加 processor
        this.processors.addAll(processors);
        return;
    }
    
    // raft 日志存储路径
    final String parentPath = Paths.get(EnvUtil.getNacosHome(), "data/protocol/raft").toString();
    
    // 遍历 processors
    for (RequestProcessor4CP processor : processors) {
        final String groupName = processor.group();
        // 判断 group 是否重复
        if (multiRaftGroup.containsKey(groupName)) {
            throw new DuplicateRaftGroupException(groupName);
        }
        
        // Ensure that each Raft Group has its own configuration and NodeOptions
        Configuration configuration = conf.copy();
        NodeOptions copy = nodeOptions.copy();
        // 初始化目录
        JRaftUtils.initDirectory(parentPath, groupName, copy);
        
        // Here, the LogProcessor is passed into StateMachine, and when the StateMachine
        // triggers onApply, the onApply of the LogProcessor is actually called
        // raft 的状态机
        NacosStateMachine machine = new NacosStateMachine(this, processor);
        
        // 设置状态机和配置
        copy.setFsm(machine);
        copy.setInitialConf(configuration);
        
        // Set snapshot interval, default 1800 seconds
        int doSnapshotInterval = ConvertUtils.toInt(raftConfig.getVal(RaftSysConstants.RAFT_SNAPSHOT_INTERVAL_SECS),
                RaftSysConstants.DEFAULT_RAFT_SNAPSHOT_INTERVAL_SECS);
        
        // If the business module does not implement a snapshot processor, cancel the snapshot
        doSnapshotInterval = CollectionUtils.isEmpty(processor.loadSnapshotOperate()) ? 0 : doSnapshotInterval;
        
        // 设置快照
        copy.setSnapshotIntervalSecs(doSnapshotInterval);
        Loggers.RAFT.info("create raft group : {}", groupName);
        // 创建 raftGroupService
        RaftGroupService raftGroupService = new RaftGroupService(groupName, localPeerId, copy, rpcServer, true);

        // Because BaseRpcServer has been started before, it is not allowed to start again here
        // 启动 raftGroupService
        Node node = raftGroupService.start(false);
        // 设置节点
        machine.setNode(node);
        // 更新配置
        RouteTable.getInstance().updateConfiguration(groupName, configuration);
        
        // 定时任务，注册自己到 raft 集群中
        RaftExecutor.executeByCommon(() -> registerSelfToCluster(groupName, localPeerId, configuration));
        
        // Turn on the leader auto refresh for this group
        Random random = new Random();
        long period = nodeOptions.getElectionTimeoutMs() + random.nextInt(5 * 1000);
        // 定时任务，刷新 raft 配置，可以获取集群成员列表
        RaftExecutor.scheduleRaftMemberRefreshJob(() -> refreshRouteTable(groupName),
                nodeOptions.getElectionTimeoutMs(), period, TimeUnit.MILLISECONDS);
        // 添加 multiRaftGroup
        multiRaftGroup.put(groupName, new RaftGroupTuple(node, processor, raftGroupService, machine));
    }
}
```

## raft 节点变更

源码位置: `com.alibaba.nacos.core.distributed.raft.JRaftServer#registerSelfToCluster`

```java
// 增加节点 
void registerSelfToCluster(String groupId, PeerId selfIp, Configuration conf) {
    while (!isShutdown) {
        try {
            // 获取 groupId 对应的成员列表
            List<PeerId> peerIds = cliService.getPeers(groupId, conf);
            if (peerIds.contains(selfIp)) {
                return;
            }
            // 添加自己的 ip 到集群中
            Status status = cliService.addPeer(groupId, conf, selfIp);
            if (status.isOk()) {
                return;
            }
            Loggers.RAFT.warn("Failed to join the cluster, retry...");
        } catch (Exception e) {
            Loggers.RAFT.error("Failed to join the cluster, retry...", e);
        }
        ThreadUtils.sleep(1_000L);
    }
}
```

源码位置: `com.alibaba.nacos.consistency.ConsistencyProtocol#memberChange`

```java
// 删除节点
@Override
public void memberChange(Set<String> addresses) {
    // 这里会重试 5 次
    for (int i = 0; i < 5; i++) {
        // 删除节点
        if (this.raftServer.peerChange(jRaftMaintainService, addresses)) {
            return;
        }
        ThreadUtils.sleep(100L);
    }
    Loggers.RAFT.warn("peer removal failed");
}

boolean peerChange(JRaftMaintainService maintainService, Set<String> newPeers) {
    // This is only dealing with node deletion, the Raft protocol, where the node adds itself to the cluster when it starts up
    Set<String> oldPeers = new HashSet<>(this.raftConfig.getMembers());
    this.raftConfig.setMembers(localPeerId.toString(), newPeers);
    oldPeers.removeAll(newPeers);
    // 检查节点是否有删除，为空，表示节点不变或者有新的节点加入
    if (oldPeers.isEmpty()) {
        return true;
    }
    
    Set<String> waitRemove = oldPeers;
    AtomicInteger successCnt = new AtomicInteger(0);
    // 遍历 multiRaftGroup 来删除
    multiRaftGroup.forEach(new BiConsumer<String, RaftGroupTuple>() {
        @Override
        public void accept(String group, RaftGroupTuple tuple) {
            Map<String, String> params = new HashMap<>();
            params.put(JRaftConstants.GROUP_ID, group);
            params.put(JRaftConstants.COMMAND_NAME, JRaftConstants.REMOVE_PEERS);
            params.put(JRaftConstants.COMMAND_VALUE, StringUtils.join(waitRemove, StringUtils.COMMA));
            // 执行删除命令, REMOVE_PEERS
            RestResult<String> result = maintainService.execute(params);
            if (result.ok()) {
                successCnt.incrementAndGet();
            } else {
                Loggers.RAFT.error("Node removal failed : {}", result);
            }
        }
    });
    return successCnt.get() == multiRaftGroup.size();
}

// 源码位置：com.alibaba.nacos.core.distributed.raft.utils.JRaftOps#REMOVE_PEERS
REMOVE_PEERS(JRaftConstants.REMOVE_PEERS) {
    @Override
    public RestResult<String> execute(CliService cliService, String groupId, Node node, Map<String, String> args) {
        final Configuration conf = node.getOptions().getInitialConf();
        final String peers = args.get(JRaftConstants.COMMAND_VALUE);
        // 遍历节点
        for (String s : peers.split(",")) {
            List<PeerId> peerIds = cliService.getPeers(groupId, conf);
            final PeerId waitRemove = PeerId.parsePeer(s);
            
            // 不包含，则不需要删除
            if (!peerIds.contains(waitRemove)) {
                continue;
            }
            
            // 删除节点
            Status status = cliService.removePeer(groupId, conf, waitRemove);
            if (!status.isOk()) {
                return RestResultUtils.failed(status.getErrorMsg());
            }
        }
        return RestResultUtils.success();
    }
},
```

## raft 的请求处理过程

这里以 `writeRequest` 为例，来说明 `raft` 是如何处理请求的。

源码位置: `com.alibaba.nacos.naming.core.v2.service.impl.PersistentClientOperationServiceImpl#registerInstance`

```java
// 客户端发起注册持久化实例
@Override
public void registerInstance(Service service, Instance instance, String clientId) {
    Service singleton = ServiceManager.getInstance().getSingleton(service);
    if (singleton.isEphemeral()) {
        throw new NacosRuntimeException(NacosException.INVALID_PARAM,
                String.format("Current service %s is ephemeral service, can't register persistent instance.",
                        singleton.getGroupedServiceName()));
    }
    final InstanceStoreRequest request = new InstanceStoreRequest();
    request.setService(service);
    request.setInstance(instance);
    request.setClientId(clientId);
    // 这里设置了 raft group, 等下会用到
    final WriteRequest writeRequest = WriteRequest.newBuilder().setGroup(group())
            .setData(ByteString.copyFrom(serializer.serialize(request))).setOperation(DataOperation.ADD.name())
            .build();
    
    try {
        // raftProtocol 来写请求
        protocol.write(writeRequest);
        Loggers.RAFT.info("Client registered. service={}, clientId={}, instance={}", service, instance, clientId);
    } catch (Exception e) {
        throw new NacosRuntimeException(NacosException.SERVER_ERROR, e);
    }
}
```

源码位置: `com.alibaba.nacos.core.distributed.raft.JRaftProtocol#write`

```java
// raftProtocol 来写请求
@Override
public Response write(WriteRequest request) throws Exception {
    // 异步请求
    CompletableFuture<Response> future = writeAsync(request);
    // Here you wait for 10 seconds, as long as possible, for the request to complete
    return future.get(10_000L, TimeUnit.MILLISECONDS);
}

@Override
public CompletableFuture<Response> writeAsync(WriteRequest request) {
    // raftServer 提交请求
    return raftServer.commit(request.getGroup(), request, new CompletableFuture<>());
}
```

源码位置: `com.alibaba.nacos.core.distributed.raft.JRaftServer#commit`

```java
// raftServer 提交请求
public CompletableFuture<Response> commit(final String group, final Message data,
        final CompletableFuture<Response> future) {
    LoggerUtils.printIfDebugEnabled(Loggers.RAFT, "data requested this time : {}", data);
    // 通过 group 找到对应的 raft 配置
    final RaftGroupTuple tuple = findTupleByGroup(group);
    if (tuple == null) {
        future.completeExceptionally(new IllegalArgumentException("No corresponding Raft Group found : " + group));
        return future;
    }
    
    // 包装 future 回调函数
    FailoverClosureImpl closure = new FailoverClosureImpl(future);
    
    final Node node = tuple.node;
    if (node.isLeader()) {
        // The leader node directly applies this request
        // 如果是 leader，直接 apply 请求
        applyOperation(node, data, closure);
    } else {
        // Forward to Leader for request processing
        // 如果不是 leader，把请求转发给 leader，后面 leader 继续 apply 请求
        invokeToLeader(group, data, rpcRequestTimeoutMs, closure);
    }
    return future;
}
```

源码位置: `com.alibaba.nacos.core.distributed.raft.JRaftServer#applyOperation`

```java
// leader 节点 apply 请求
public void applyOperation(Node node, Message data, FailoverClosure closure) {
    final Task task = new Task();
    // 设置回调
    task.setDone(new NacosClosure(data, status -> {
        // 把响应设置给 closure, closure 就是 FailoverClosureImpl
        NacosClosure.NacosStatus nacosStatus = (NacosClosure.NacosStatus) status;
        closure.setThrowable(nacosStatus.getThrowable());
        closure.setResponse(nacosStatus.getResponse());
        closure.run(nacosStatus);
    }));
    
    // add request type field at the head of task data.
    // 封装请求，WriteRequest 或者 ReadRequest
    byte[] requestTypeFieldBytes = new byte[2];
    requestTypeFieldBytes[0] = ProtoMessageUtil.REQUEST_TYPE_FIELD_TAG;
    if (data instanceof ReadRequest) {
        requestTypeFieldBytes[1] = ProtoMessageUtil.REQUEST_TYPE_READ;
    } else {
        requestTypeFieldBytes[1] = ProtoMessageUtil.REQUEST_TYPE_WRITE;
    }
    
    byte[] dataBytes = data.toByteArray();
    // 设置数据
    task.setData((ByteBuffer) ByteBuffer.allocate(requestTypeFieldBytes.length + dataBytes.length)
            .put(requestTypeFieldBytes).put(dataBytes).position(0));
    // apply 请求，写入主节点日志，复制日志到从节点，超过半数节点成功，然后执行状态机 NacosStateMachine
    node.apply(task);
}
```

源码位置: `com.alibaba.nacos.core.distributed.raft.NacosStateMachine#onApply`

```java
// 执行状态机
@Override
public void onApply(Iterator iter) {
    int index = 0;
    int applied = 0;
    Message message;
    NacosClosure closure = null;
    try {
        while (iter.hasNext()) {
            Status status = Status.OK();
            try {
                // 获取 message
                if (iter.done() != null) {
                    closure = (NacosClosure) iter.done();
                    message = closure.getMessage();
                } else {
                    final ByteBuffer data = iter.getData();
                    message = ProtoMessageUtil.parse(data.array());
                    if (message instanceof ReadRequest) {
                        //'iter.done() == null' means current node is follower, ignore read operation
                        applied++;
                        index++;
                        iter.next();
                        continue;
                    }
                }
                
                LoggerUtils.printIfDebugEnabled(Loggers.RAFT, "receive log : {}", message);
                
                // 处理 WriteRequest
                if (message instanceof WriteRequest) {
                    Response response = processor.onApply((WriteRequest) message);
                    postProcessor(response, closure);
                }
                
                // 处理 ReadRequest
                if (message instanceof ReadRequest) {
                    Response response = processor.onRequest((ReadRequest) message);
                    postProcessor(response, closure);
                }
            } catch (Throwable e) {
                index++;
                status.setError(RaftError.UNKNOWN, e.toString());
                Optional.ofNullable(closure).ifPresent(closure1 -> closure1.setThrowable(e));
                throw e;
            } finally {
                Optional.ofNullable(closure).ifPresent(closure1 -> closure1.run(status));
            }
            
            applied++;
            index++;
            iter.next();
        }
    } catch (Throwable t) {
        Loggers.RAFT.error("processor : {}, stateMachine meet critical error: {}.", processor, t);
        iter.setErrorAndRollback(index - applied,
                new Status(RaftError.ESTATEMACHINE, "StateMachine meet critical error: %s.",
                        ExceptionUtil.getStackTrace(t)));
    }
}
```

源码位置: `com.alibaba.nacos.naming.core.v2.service.impl.PersistentClientOperationServiceImpl#onApply`

```java
// 处理 WriteRequest
@Override
public Response onApply(WriteRequest request) {
    final Lock lock = readLock;
    lock.lock();
    try {
        final InstanceStoreRequest instanceRequest = serializer.deserialize(request.getData().toByteArray());
        final DataOperation operation = DataOperation.valueOf(request.getOperation());
        switch (operation) {
            case ADD:
                onInstanceRegister(instanceRequest.service, instanceRequest.instance,
                        instanceRequest.getClientId());
                break;
            case DELETE:
                onInstanceDeregister(instanceRequest.service, instanceRequest.getClientId());
                break;
            case CHANGE:
                if (instanceAndServiceExist(instanceRequest)) {
                    onInstanceRegister(instanceRequest.service, instanceRequest.instance,
                            instanceRequest.getClientId());
                }
                break;
            default:
                return Response.newBuilder().setSuccess(false).setErrMsg("unsupport operation : " + operation)
                        .build();
        }
        return Response.newBuilder().setSuccess(true).build();
    } catch (Exception e) {
        Loggers.RAFT.warn("Persistent client operation failed. ", e);
        return Response.newBuilder().setSuccess(false)
                .setErrMsg("Persistent client operation failed. " + e.getMessage()).build();
    } finally {
        lock.unlock();
    }
}
```

## 转发请求给 leader

源码位置: `com.alibaba.nacos.core.distributed.raft.JRaftServer#invokeToLeader`

```java
// 转发请求给 leader
private void invokeToLeader(final String group, final Message request, final int timeoutMillis,
        FailoverClosure closure) {
    try {
        final Endpoint leaderIp = Optional.ofNullable(getLeader(group))
                .orElseThrow(() -> new NoLeaderException(group)).getEndpoint();
        // 调用 cliClientService 来转发请求
        cliClientService.getRpcClient().invokeAsync(leaderIp, request, new InvokeCallback() {
            @Override
            public void complete(Object o, Throwable ex) {
                if (Objects.nonNull(ex)) {
                    closure.setThrowable(ex);
                    closure.run(new Status(RaftError.UNKNOWN, ex.getMessage()));
                    return;
                }
                if (!((Response)o).getSuccess()) {
                    closure.setThrowable(new IllegalStateException(((Response) o).getErrMsg()));
                    closure.run(new Status(RaftError.UNKNOWN, ((Response) o).getErrMsg()));
                    return;
                }
                closure.setResponse((Response) o);
                closure.run(Status.OK());
            }
            
            @Override
            public Executor executor() {
                return RaftExecutor.getRaftCliServiceExecutor();
            }
        }, timeoutMillis);
    } catch (Exception e) {
        closure.setThrowable(e);
        closure.run(new Status(RaftError.UNKNOWN, e.toString()));
    }
}
```

源码位置: `com.alibaba.nacos.core.distributed.raft.processor.NacosWriteRequestProcessor`

```java
// 接受 WriteRequest
public class NacosWriteRequestProcessor extends AbstractProcessor implements RpcProcessor<WriteRequest> {
    
    private static final String INTEREST_NAME = WriteRequest.class.getName();
    
    private final JRaftServer server;
    
    public NacosWriteRequestProcessor(JRaftServer server, Serializer serializer) {
        super(serializer);
        this.server = server;
    }
    
    @Override
    public void handleRequest(RpcContext rpcCtx, WriteRequest request) {
        // 处理请求
        handleRequest(server, request.getGroup(), rpcCtx, request);
    }
    
    @Override
    public String interest() {
        return INTEREST_NAME;
    }
}

// 处理请求
protected void handleRequest(final JRaftServer server, final String group, final RpcContext rpcCtx, Message message) {
    try {
        ... 
        // 如果是 leader 节点，就处理请求，否则返回错误
        if (tuple.getNode().isLeader()) {
            execute(server, rpcCtx, message, tuple);
        } else {
            rpcCtx.sendResponse(
                    Response.newBuilder().setSuccess(false).setErrMsg("Could not find leader : " + group).build());
        }
    } catch (Throwable e) {
        Loggers.RAFT.error("handleRequest has error : ", e);
        rpcCtx.sendResponse(Response.newBuilder().setSuccess(false).setErrMsg(e.toString()).build());
    }
}

// 执行请求
protected void execute(JRaftServer server, final RpcContext asyncCtx, final Message message,
        final JRaftServer.RaftGroupTuple tuple) {
    ...
    // apply 请求，这个和上面的逻辑一样，不继续分析了
    server.applyOperation(tuple.getNode(), message, closure);
}
```

## raft 处理 ReadRequest

源码位置: `com.alibaba.nacos.core.distributed.raft.JRaftServer#get`

```java
// raft 处理 ReadRequest 
CompletableFuture<Response> get(final ReadRequest request) {
    final String group = request.getGroup();
    CompletableFuture<Response> future = new CompletableFuture<>();
    // 检查 group 是否存在
    final RaftGroupTuple tuple = findTupleByGroup(group);
    if (Objects.isNull(tuple)) {
        future.completeExceptionally(new NoSuchRaftGroupException(group));
        return future;
    }
    final Node node = tuple.node;
    final RequestProcessor processor = tuple.processor;
    try {
        // raft 协议的一致性读，如果返回成功，可以确保数据是一致的，直接本地处理就可以
        node.readIndex(BytesUtil.EMPTY_BYTES, new ReadIndexClosure() {
            @Override
            public void run(Status status, long index, byte[] reqCtx) {
                if (status.isOk()) {
                    try {
                        Response response = processor.onRequest(request);
                        future.complete(response);
                    } catch (Throwable t) {
                        MetricsMonitor.raftReadIndexFailed();
                        future.completeExceptionally(new ConsistencyException(
                                "The conformance protocol is temporarily unavailable for reading", t));
                    }
                    return;
                }
                // 返回错误，从 leader 中读取数据
                MetricsMonitor.raftReadIndexFailed();
                Loggers.RAFT.error("ReadIndex has error : {}, go to Leader read.", status.getErrorMsg());
                MetricsMonitor.raftReadFromLeader();
                readFromLeader(request, future);
            }
        });
        return future;
    } catch (Throwable e) {
        MetricsMonitor.raftReadFromLeader();
        Loggers.RAFT.warn("Raft linear read failed, go to Leader read logic : {}", e.toString());
        // run raft read
        readFromLeader(request, future);
        return future;
    }
}

// 从 leader 中读取数据
public void readFromLeader(final ReadRequest request, final CompletableFuture<Response> future) {
    commit(request.getGroup(), request, future);
}

// 提交请求, 这个方法上面已经解析过了
public CompletableFuture<Response> commit(final String group, final Message data,
        final CompletableFuture<Response> future) {
    LoggerUtils.printIfDebugEnabled(Loggers.RAFT, "data requested this time : {}", data);
    final RaftGroupTuple tuple = findTupleByGroup(group);
    if (tuple == null) {
        future.completeExceptionally(new IllegalArgumentException("No corresponding Raft Group found : " + group));
        return future;
    }
    
    FailoverClosureImpl closure = new FailoverClosureImpl(future);
    
    final Node node = tuple.node;
    if (node.isLeader()) {
        // The leader node directly applies this request
        applyOperation(node, data, closure);
    } else {
        // Forward to Leader for request processing
        invokeToLeader(group, data, rpcRequestTimeoutMs, closure);
    }
    return future;
}
```

## nacos 中的 raft 用法

1. `com.alibaba.nacos.naming.core.v2.service.impl.PersistentClientOperationServiceImpl`: 客户端注册实例
2. `com.alibaba.nacos.naming.consistency.persistent.impl.PersistentServiceProcessor`: naming 模块，配置管理
3. `com.alibaba.nacos.config.server.service.repository.embedded.DistributedDatabaseOperateImpl`: 内嵌数据库


## 测试类

`com.alibaba.nacos.test.naming.CPInstancesAPI_ITCase#registerInstance_ephemeral_false`