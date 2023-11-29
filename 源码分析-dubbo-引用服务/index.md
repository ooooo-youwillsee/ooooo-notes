# 源码分析 dubbo 引用服务


> dubbo 基于 3.2.6 版本

> 在 `dubbo` 中**引用服务的源码是非常复杂**的，这里只介绍**主要流程**。

## DefaultModuleDeployer#referServices 引用服务

源码位置: `org.apache.dubbo.config.deploy.DefaultModuleDeployer#referServices`

```java
private void referServices() {
    // 遍历所有的 reference
    configManager.getReferences().forEach(rc -> {
        try {
            ReferenceConfig<?> referenceConfig = (ReferenceConfig<?>) rc;
            // 刷新配置
            if (!referenceConfig.isRefreshed()) {
                referenceConfig.refresh();
            }

            if (rc.shouldInit()) {
                // 异步引用
                if (referAsync || rc.shouldReferAsync()) {
                    ExecutorService executor = executorRepository.getServiceReferExecutor();
                    CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                        try {
                            referenceCache.get(rc, false);
                        } catch (Throwable t) {
                            logger.error(CONFIG_FAILED_EXPORT_SERVICE, "", "", "Failed to async export service config: " + getIdentifier() + " , catch error : " + t.getMessage(), t);
                        }
                    }, executor);

                    asyncReferringFutures.add(future);
                } else {
                    // 同步引用
                    referenceCache.get(rc, false);
                }
            }
        } catch (Throwable t) {
          ...
        }
    });
}
```

源码位置: `org.apache.dubbo.config.utils.SimpleReferenceCache#get`

```java
// 同步引用
public <T> T get(ReferenceConfigBase<T> rc, boolean check) {
    String key = generator.generateKey(rc);
    Class<?> type = rc.getInterfaceClass();

    boolean singleton = rc.getSingleton() == null || rc.getSingleton();
    T proxy = null;
    // Check existing proxy of the same 'key' and 'type' first.
    if (singleton) {
        // 单例对象，从缓存 referenceKeyMap 中获取
        proxy = get(key, (Class<T>) type);
    } else {
        logger.warn(CONFIG_API_WRONG_USE, "", "", "Using non-singleton ReferenceConfig and ReferenceCache at the same time may cause memory leak. " +
            "Call ReferenceConfig#get() directly for non-singleton ReferenceConfig instead of using ReferenceCache#get(ReferenceConfig)");
    }

    // 第一次获取
    if (proxy == null) {
        // 添加到 referenceTypeMap
        List<ReferenceConfigBase<?>> referencesOfType = ConcurrentHashMapUtils.computeIfAbsent(referenceTypeMap, type, _t -> Collections.synchronizedList(new ArrayList<>()));
        referencesOfType.add(rc);
        // 添加到 referenceKeyMap
        List<ReferenceConfigBase<?>> referenceConfigList = ConcurrentHashMapUtils.computeIfAbsent(referenceKeyMap, key, _k -> Collections.synchronizedList(new ArrayList<>()));
        referenceConfigList.add(rc);
        // 获取代理对象
        proxy = rc.get(check);
    }
    return proxy;
}
```

### ReferenceConfig#get 获取代理对象

源码位置: `org.apache.dubbo.config.ReferenceConfig#get`

```java
// 获取代理对象
public T get(boolean check) {
    ...
    if (ref == null) {
        if (getScopeModel().isLifeCycleManagedExternally()) {
            // prepare model for reference
            getScopeModel().getDeployer().prepare();
        } else {
            // ensure start module, compatible with old api usage
            // 启动模块
            getScopeModel().getDeployer().start();
        }
        // 初始化
        init(check);
    }
    return ref;
}
```

源码位置: `org.apache.dubbo.config.ReferenceConfig#init`

```java
// 初始化
protected synchronized void init(boolean check) {
    if (initialized && ref != null) {
        return;
    }
    try {
        // 刷新配置
        if (!this.isRefreshed()) {
            this.refresh();
        }
        //auto detect proxy type
        String proxyType = getProxy();
        if (StringUtils.isBlank(proxyType)
            && DubboStub.class.isAssignableFrom(interfaceClass)) {
            setProxy(CommonConstants.NATIVE_STUB);
        }

        // init serviceMetadata
        initServiceMetadata(consumer);

        serviceMetadata.setServiceType(getServiceInterfaceClass());
        // TODO, uncomment this line once service key is unified
        serviceMetadata.generateServiceKey();

        // 添加配置，如 application, consumer, interface 
        Map<String, String> referenceParameters = appendConfig();

        ModuleServiceRepository repository = getScopeModel().getServiceRepository();
        ServiceDescriptor serviceDescriptor;
        if (CommonConstants.NATIVE_STUB.equals(getProxy())) {
            serviceDescriptor = StubSuppliers.getServiceDescriptor(interfaceName);
            repository.registerService(serviceDescriptor);
        } else {
            serviceDescriptor = repository.registerService(interfaceClass);
        }
        // 创建 consumerModel
        consumerModel = new ConsumerModel(serviceMetadata.getServiceKey(), proxy, serviceDescriptor,
                getScopeModel(), serviceMetadata, createAsyncMethodInfo(), interfaceClassLoader);

        // Compatible with dependencies on ServiceModel#getReferenceConfig() , and will be removed in a future version.
        consumerModel.setConfig(this);

        // 注册 consumerModel
        repository.registerConsumer(consumerModel);

        serviceMetadata.getAttachments().putAll(referenceParameters);

        // 创建代理对象，这个最重要
        ref = createProxy(referenceParameters);

        serviceMetadata.setTarget(ref);
        serviceMetadata.addAttribute(PROXY_CLASS_REF, ref);
        
        // 设置销毁回调函数
        consumerModel.setDestroyRunner(getDestroyRunner());
        consumerModel.setProxyObject(ref);
        consumerModel.initMethodModels();

        // 检查可用性，dubbo3 默认为 false
        if (check) {
            checkInvokerAvailable(0);
        }
    } catch (Throwable t) {
        logAndCleanup(t);

        throw t;
    }
    // 标记已初始化
    initialized = true;
}
```

### ReferenceConfig#createProxy 创建代理

源码位置: `org.apache.dubbo.config.ReferenceConfig#createProxy`

```java
// 创建代理对象
private T createProxy(Map<String, String> referenceParameters) {
    urls.clear();
    
    // mesh mode 这一节不解析，以后会继续解析
    meshModeHandleUrl(referenceParameters);

    if (StringUtils.isNotEmpty(url)) {
        // user specified URL, could be peer-to-peer address, or register center's address.
        // url 不为空, 说明是直连
        parseUrl(referenceParameters);
    } else {
        // if protocols not in jvm checkRegistry
        // 从注册中心来获取 urls
        aggregateUrlFromRegistry(referenceParameters);
    }
    // 根据 urls 来创建 invoker
    createInvoker();
    ...
    // 发布服务定义
    MetadataUtils.publishServiceDefinition(consumerUrl, consumerModel.getServiceModel(), getApplicationModel());

    // create service proxy
    // 获取代理对象
    return (T) proxyFactory.getProxy(invoker, ProtocolUtils.isGeneric(generic));
}
```

源码位置: `org.apache.dubbo.config.ReferenceConfig#aggregateUrlFromRegistry`

```java
// 通过注册中心来获取 urls
private void aggregateUrlFromRegistry(Map<String, String> referenceParameters) {
    checkRegistry();
    // 加载所有的注册中心
    List<URL> us = ConfigValidationUtils.loadRegistries(this, false);
    if (CollectionUtils.isNotEmpty(us)) {
        // 遍历所有的注册中心地址
        for (URL u : us) {
            // 加载监控地址
            URL monitorUrl = ConfigValidationUtils.loadMonitor(this, u);
            if (monitorUrl != null) {
                u = u.putAttribute(MONITOR_KEY, monitorUrl);
            }
            u = u.setScopeModel(getScopeModel());
            u = u.setServiceModel(consumerModel);
            if (isInjvm() != null && isInjvm()) {
                u = u.addParameter(LOCAL_PROTOCOL, true);
            }
            // 把 referenceParameters 添加到 registryUrl 的 REFER_KEY 参数中
            urls.add(u.putAttribute(REFER_KEY, referenceParameters));
        }
    }
    ...
}
```

源码位置: `org.apache.dubbo.config.ReferenceConfig#createInvoker`

```java
// 根据 urls 来创建 invoker
// 一个 url 表示一种注册中心
private void createInvoker() {
    // 单注册中心
    if (urls.size() == 1) {
        URL curUrl = urls.get(0);
        // 利用 SPI 机制生成对应的 invoker, 这时 url 是 registryUrl, 所以实现类就是 RegistryProtocol
        invoker = protocolSPI.refer(interfaceClass, curUrl);
        // registry url, mesh-enable and unloadClusterRelated is true, not need Cluster.
        if (!UrlUtils.isRegistry(curUrl) &&
                !curUrl.getParameter(UNLOAD_CLUSTER_RELATED, false)) {
            List<Invoker<?>> invokers = new ArrayList<>();
            invokers.add(invoker);
            invoker = Cluster.getCluster(getScopeModel(), Cluster.DEFAULT).join(new StaticDirectory(curUrl, invokers), true);
        }
    } else {
        // 多注册中心
        List<Invoker<?>> invokers = new ArrayList<>();
        URL registryUrl = null;
        for (URL url : urls) {
            // For multi-registry scenarios, it is not checked whether each referInvoker is available.
            // Because this invoker may become available later.
            // 每个 url 都是创建一个 invoker
            invokers.add(protocolSPI.refer(interfaceClass, url));

            if (UrlUtils.isRegistry(url)) {
                // use last registry url
                registryUrl = url;
            }
        }
        ...省略 invokers 聚合的代码
    }
}
```

### RegistryProtocol#refer 引用服务

源码位置: `org.apache.dubbo.registry.integration.RegistryProtocol#refer`

```java
// 引用服务
@Override
@SuppressWarnings("unchecked")
public <T> Invoker<T> refer(Class<T> type, URL url) throws RpcException {
    url = getRegistryUrl(url);
    // 获取注册中心
    Registry registry = getRegistry(url);
    if (RegistryService.class.equals(type)) {
        return proxyFactory.getInvoker((T) registry, type, url);
    }
    // qs 是 consumer 配置, 在之前已经把 consumer 的配置存入 REFER_KEY 中
    Map<String, String> qs = (Map<String, String>) url.getAttribute(REFER_KEY);
    ...
    // 获取 cluster，默认是 failover
    Cluster cluster = Cluster.getCluster(url.getScopeModel(), qs.get(CLUSTER_KEY));
    // 引用服务
    return doRefer(cluster, registry, type, url, qs);
}

```

源码位置: `org.apache.dubbo.registry.integration.RegistryProtocol#doRefer`

```java
// 引用服务
protected <T> Invoker<T> doRefer(Cluster cluster, Registry registry, Class<T> type, URL url, Map<String, String> parameters) {
    Map<String, Object> consumerAttribute = new HashMap<>(url.getAttributes());
    consumerAttribute.remove(REFER_KEY);
    String p = isEmpty(parameters.get(PROTOCOL_KEY)) ? CONSUMER : parameters.get(PROTOCOL_KEY);
    // 构建 consumerUrl
    URL consumerUrl = new ServiceConfigURL(
        p,
        null,
        null,
        parameters.get(REGISTER_IP_KEY),
        0, getPath(parameters, type),
        parameters,
        consumerAttribute
    );
    url = url.putAttribute(CONSUMER_URL_KEY, consumerUrl);
    // 实现类为 ServiceDiscoveryMigrationInvoker
    ClusterInvoker<T> migrationInvoker = getMigrationInvoker(this, cluster, registry, type, url, consumerUrl);
    // 执行 RegistryProtocolListener 钩子函数，最终会执行 MigrationRuleListener#onRefer 方法
    return interceptInvoker(migrationInvoker, url, consumerUrl);
}
```

### MigrationRuleListener#onRefer 执行钩子函数


源码位置: ``

```java
// 执行钩子函数
@Override
public void onRefer(RegistryProtocol registryProtocol, ClusterInvoker<?> invoker, URL consumerUrl, URL registryURL) {
    MigrationRuleHandler<?> migrationRuleHandler = ConcurrentHashMapUtils.computeIfAbsent(handlers, (MigrationInvoker<?>) invoker, _key -> {
        ((MigrationInvoker<?>) invoker).setMigrationRuleListener(this);
        return new MigrationRuleHandler<>((MigrationInvoker<?>) invoker, consumerUrl);
    });
    // 迁移规则
    migrationRuleHandler.doMigrate(rule);
}
```

源码位置: `org.apache.dubbo.registry.client.migration.MigrationRuleHandler#doMigrate`

```java
// 迁移规则
public synchronized void doMigrate(MigrationRule rule) {
    // 这里会走到这个分支
    if (migrationInvoker instanceof ServiceDiscoveryMigrationInvoker) {
        // 刷新 invoker
        refreshInvoker(MigrationStep.FORCE_APPLICATION, 1.0f, rule);
        return;
    }
    ...省略获取 step 的代码
}
```

源码位置: `org.apache.dubbo.registry.client.migration.MigrationRuleHandler#refreshInvoker`

```java
// 刷新 invoker
private boolean refreshInvoker(MigrationStep step, Float threshold, MigrationRule newRule) {
    if (step == null || threshold == null) {
        throw new IllegalStateException("Step or threshold of migration rule cannot be null");
    }
    MigrationStep originStep = currentStep;

    // 这里的 step 为 FORCE_APPLICATION
    if ((currentStep == null || currentStep != step) || !currentThreshold.equals(threshold)) {
        boolean success = true;
        switch (step) {
            case APPLICATION_FIRST:
                migrationInvoker.migrateToApplicationFirstInvoker(newRule);
                break;
            case FORCE_APPLICATION:
                // 强制使用服务级别引用
                success = migrationInvoker.migrateToForceApplicationInvoker(newRule);
                break;
            case FORCE_INTERFACE:
            default:
                success = migrationInvoker.migrateToForceInterfaceInvoker(newRule);
        }

        ...
        return success;
    }
    // ignore if step is same with previous, will continue override rule for MigrationInvoker
    return true;
}
```

源码位置: `org.apache.dubbo.registry.client.migration.MigrationInvoker#migrateToForceApplicationInvoker`

```java
@Override
public boolean migrateToForceApplicationInvoker(MigrationRule newRule) {
    CountDownLatch latch = new CountDownLatch(1);
    // 刷新 invoker, 这个很重要
    refreshServiceDiscoveryInvoker(latch);

    if (invoker == null) {
        // invoker is absent, ignore threshold check
        this.currentAvailableInvoker = serviceDiscoveryInvoker;
        return true;
    }

    // wait and compare threshold
    // 等待初次 invoker 创建成功
    waitAddressNotify(newRule, latch);

    ...
    return false;
}
```

源码位置: ``

```java
protected void refreshServiceDiscoveryInvoker(CountDownLatch latch) {
    clearListener(serviceDiscoveryInvoker);
    // 需要刷新
    if (needRefresh(serviceDiscoveryInvoker)) {
        if (logger.isDebugEnabled()) {
            logger.debug("Re-subscribing instance addresses, current interface " + type.getName());
        }

        if (serviceDiscoveryInvoker != null) {
            serviceDiscoveryInvoker.destroy();
        }
        // 获取 invoker, registryProtocol 的实现类为 RegistryProtocol
        serviceDiscoveryInvoker = registryProtocol.getServiceDiscoveryInvoker(cluster, registry, type, url);
    }
    // 设置监听器
    setListener(serviceDiscoveryInvoker, () -> {
        latch.countDown();
        ...
        if (step == APPLICATION_FIRST) {
            calcPreferredInvoker(rule);
        }
    });
}
```

### RegistryProtocol#getServiceDiscoveryInvoker 获取 invoker

源码位置: `org.apache.dubbo.registry.integration.RegistryProtocol#getServiceDiscoveryInvoker`

```java
// 获取 invoker
public <T> ClusterInvoker<T> getServiceDiscoveryInvoker(Cluster cluster, Registry registry, Class<T> type, URL url) {
    // 创建 directory
    DynamicDirectory<T> directory = new ServiceDiscoveryRegistryDirectory<>(type, url);
    // 创建 invoker
    return doCreateInvoker(directory, cluster, registry, type);
   
}
```

源码位置: `org.apache.dubbo.registry.integration.RegistryProtocol#doCreateInvoker`

```java
// 创建 invoker
protected <T> ClusterInvoker<T> doCreateInvoker(DynamicDirectory<T> directory, Cluster cluster, Registry registry, Class<T> type) {
    directory.setRegistry(registry);
    directory.setProtocol(protocol);
    // all attributes of REFER_KEY
    Map<String, String> parameters = new HashMap<>(directory.getConsumerUrl().getParameters());
    // 创建 consumerUrl
    URL urlToRegistry = new ServiceConfigURL(
        parameters.get(PROTOCOL_KEY) == null ? CONSUMER : parameters.get(PROTOCOL_KEY),
        parameters.remove(REGISTER_IP_KEY),
        0,
        getPath(parameters, type),
        parameters
    );
    urlToRegistry = urlToRegistry.setScopeModel(directory.getConsumerUrl().getScopeModel());
    urlToRegistry = urlToRegistry.setServiceModel(directory.getConsumerUrl().getServiceModel());
    // 注册 consumerUrl，有助于排查问题 
    if (directory.isShouldRegister()) {
        directory.setRegisteredConsumerUrl(urlToRegistry);
        registry.register(directory.getRegisteredConsumerUrl());
    }
    // 创建 routerChain, 例如 TagStateRouter
    directory.buildRouterChain(urlToRegistry);
    // 订阅服务
    directory.subscribe(toSubscribeUrl(urlToRegistry));
    
    return (ClusterInvoker<T>) cluster.join(directory, true);
}
```

源码位置: `org.apache.dubbo.registry.client.ServiceDiscoveryRegistryDirectory#subscribe`

```java
// 订阅服务
@Override
public void subscribe(URL url) {
    // 开启配置监听，key: ${applicationName}.configurators
    if (moduleModel.modelEnvironment().getConfiguration().convert(Boolean.class, Constants.ENABLE_CONFIGURATION_LISTEN, true)) {
        enableConfigurationListen = true;
        getConsumerConfigurationListener(moduleModel).addNotifyListener(this);
        referenceConfigurationListener = new ReferenceConfigurationListener(this.moduleModel, this, url);
    } else {
        enableConfigurationListen = false;
    }
    // 调用父类 DynamicDirectory#subscribe
    super.subscribe(url);
}
```

源码位置: `org.apache.dubbo.registry.integration.DynamicDirectory#subscribe`

```java
// 订阅服务
public void subscribe(URL url) {
    setSubscribeUrl(url);
    // 这里的 registry 是 ServiceDiscoveryRegistry
    registry.subscribe(url, this);
}
```

### ServiceDiscoveryRegistry#subscribe 订阅服务

源码位置: `org.apache.dubbo.registry.client.ServiceDiscoveryRegistry#subscribe`

```java
// 订阅服务
@Override
public final void subscribe(URL url, NotifyListener listener) {
    // 不用订阅
    if (!shouldSubscribe(url)) { // Should Not Subscribe
        return;
    }
    // 订阅
    doSubscribe(url, listener);
}

// 订阅
@Override
public void doSubscribe(URL url, NotifyListener listener) {
    url = addRegistryClusterKey(url);
    // 添加 url 到 metadataInfo
    serviceDiscovery.subscribe(url, listener);
    // 从 provided-by 中解析 serviceNames
    Set<String> mappingByUrl = ServiceNameMapping.getMappingByUrl(url);

    String key = ServiceNameMapping.buildMappingKey(url);

    // 说明这个 url 是第一次订阅
    if (mappingByUrl == null) {
        // 获取锁
        Lock mappingLock = serviceNameMapping.getMappingLock(key);
        try {
            mappingLock.lock();
            // 从缓存中获取 url 对应的 serviceNames
            mappingByUrl = serviceNameMapping.getMapping(url);
            try {
                // 创建 mappingListener，当 mapping 改变时，会执行回调方法
                MappingListener mappingListener = new DefaultMappingListener(url, mappingByUrl, listener);
                // 获取 url 对应的 serviceNames, 并开始监听 mapping
                // 对应的 provider 源码是 ServiceConfig#exported 方法
                mappingByUrl = serviceNameMapping.getAndListen(this.getUrl(), url, mappingListener);
                mappingListeners.put(url.getProtocolServiceKey(), mappingListener);
            } catch (Exception e) {
                logger.warn(INTERNAL_ERROR, "", "", "Cannot find app mapping for service " + url.getServiceInterface() + ", will not migrate.", e);
            }
            ...
        } finally {
            mappingLock.unlock();
        }
    }
    // 根据 serviceNames 来获取 url
    subscribeURLs(url, listener, mappingByUrl);
}
```

源码位置: `org.apache.dubbo.registry.client.ServiceDiscoveryRegistry#subscribeURLs`

```java
// 根据 serviceNames 来获取 url
protected void subscribeURLs(URL url, NotifyListener listener, Set<String> serviceNames) {
    // 排序 serviceNames, 用来当做 key
    serviceNames = toTreeSet(serviceNames);
    String serviceNamesKey = toStringKeys(serviceNames);
    String serviceKey = url.getServiceKey();
    logger.info(String.format("Trying to subscribe from apps %s for service key %s, ", serviceNamesKey, serviceKey));

    // register ServiceInstancesChangedListener
    Lock appSubscriptionLock = getAppSubscription(serviceNamesKey);
    try {
        // 加锁
        appSubscriptionLock.lock();
        ServiceInstancesChangedListener serviceInstancesChangedListener = serviceListeners.get(serviceNamesKey);
        if (serviceInstancesChangedListener == null) {
            // 创建 serviceInstancesChangedListener
            // 当 serviceName 下的 instance 发生改变时，执行回调函数
            serviceInstancesChangedListener = serviceDiscovery.createListener(serviceNames);
            // 对每一个 serviceName 都获取 instances，然后执行回调函数
            for (String serviceName : serviceNames) {
                List<ServiceInstance> serviceInstances = serviceDiscovery.getInstances(serviceName);
                if (CollectionUtils.isNotEmpty(serviceInstances)) {
                    // 这个方法很重要，重点分析
                    serviceInstancesChangedListener.onEvent(new ServiceInstancesChangedEvent(serviceName, serviceInstances));
                }
            }
            // 添加缓存
            serviceListeners.put(serviceNamesKey, serviceInstancesChangedListener);
        }

       ... 
    } finally {
        appSubscriptionLock.unlock();
    }
}
```

源码位置: `org.apache.dubbo.registry.client.event.listener.ServiceInstancesChangedListener#onEvent`

```java
public void onEvent(ServiceInstancesChangedEvent event) {
    // 判断 event
    if (destroyed.get() || !accept(event) || isRetryAndExpired(event)) {
        return;
    }
    // 处理 event
    doOnEvent(event);
}
```

源码位置: `org.apache.dubbo.registry.client.event.listener.ServiceInstancesChangedListener#doOnEvent`

```java
// 处理 event
private synchronized void doOnEvent(ServiceInstancesChangedEvent event) {
    if (destroyed.get() || !accept(event) || isRetryAndExpired(event)) {
        return;
    }

    // 刷新实例
    refreshInstance(event);

    Map<String, List<ServiceInstance>> revisionToInstances = new HashMap<>();
    Map<ServiceInfo, Set<String>> localServiceToRevisions = new HashMap<>();

    // grouping all instances of this app(service name) by revision
    // 按照 revsion 来分类 instance
    for (Map.Entry<String, List<ServiceInstance>> entry : allInstances.entrySet()) {
        List<ServiceInstance> instances = entry.getValue();
        for (ServiceInstance instance : instances) {
            String revision = getExportedServicesRevision(instance);
            if (revision == null || EMPTY_REVISION.equals(revision)) {
                if (logger.isDebugEnabled()) {
                    logger.debug("Find instance without valid service metadata: " + instance.getAddress());
                }
                continue;
            }
            List<ServiceInstance> subInstances = revisionToInstances.computeIfAbsent(revision, r -> new LinkedList<>());
            subInstances.add(instance);
        }
    }

    // get MetadataInfo with revision
    for (Map.Entry<String, List<ServiceInstance>> entry : revisionToInstances.entrySet()) {
        String revision = entry.getKey();
        List<ServiceInstance> subInstances = entry.getValue();

        // 获取 metadata
        MetadataInfo metadata = subInstances.stream()
            .map(ServiceInstance::getServiceMetadata)
            .filter(Objects::nonNull)
            .filter(m -> revision.equals(m.getRevision()))
            .findFirst()
            // 第一次调用时，会执行 serviceDiscovery#getRemoteMetadata
            .orElseGet(() -> serviceDiscovery.getRemoteMetadata(revision, subInstances));

        // 解析 metadata
        parseMetadata(revision, metadata, localServiceToRevisions);
        // update metadata into each instance, in case new instance created.
        // 更新 metadata 到每一个 instance
        for (ServiceInstance tmpInstance : subInstances) {
            MetadataInfo originMetadata = tmpInstance.getServiceMetadata();
            if (originMetadata == null || !Objects.equals(originMetadata.getRevision(), metadata.getRevision())) {
                tmpInstance.setServiceMetadata(metadata);
            }
        }
    }

    ...
    // 引入这个 map 是为了加速处理，如果 protocol, port, revision 都是一样，说明 urls 也是一样的
    Map<String, Map<Integer, Map<Set<String>, Object>>> protocolRevisionsToUrls = new HashMap<>();
     
    Map<String, List<ProtocolServiceKeyWithUrls>> newServiceUrls = new HashMap<>();
    for (Map.Entry<ServiceInfo, Set<String>> entry : localServiceToRevisions.entrySet()) {
        ServiceInfo serviceInfo = entry.getKey();
        Set<String> revisions = entry.getValue();

        Map<Integer, Map<Set<String>, Object>> portToRevisions = protocolRevisionsToUrls.computeIfAbsent(serviceInfo.getProtocol(), k -> new HashMap<>());
        Map<Set<String>, Object> revisionsToUrls = portToRevisions.computeIfAbsent(serviceInfo.getPort(), k -> new HashMap<>());
        // 如果不存在，就会从 revision 中获取所有的 urls
        Object urls = revisionsToUrls.computeIfAbsent(revisions, k -> getServiceUrlsCache(revisionToInstances, revisions, serviceInfo.getProtocol(), serviceInfo.getPort()));

        List<ProtocolServiceKeyWithUrls> list = newServiceUrls.computeIfAbsent(serviceInfo.getPath(), k -> new LinkedList<>());
        list.add(new ProtocolServiceKeyWithUrls(serviceInfo.getProtocolServiceKey(), (List<URL>) urls));
    }
    
    // 新的 serviceUrls 
    this.serviceUrls = newServiceUrls;
    // 通知 urls，这时 ServiceDiscoveryRegistryDirectory 就会执行 notify 方法
    this.notifyAddressChanged();
}
```

### ServiceDiscoveryRegistryDirectory#notify 执行回调

源码位置: `org.apache.dubbo.registry.client.ServiceDiscoveryRegistryDirectory#notify`

```java
// 回调 urls
@Override
public synchronized void notify(List<URL> instanceUrls) {
    if (isDestroyed()) {
        return;
    }
    // Set the context of the address notification thread.
    RpcServiceContext.getServiceContext().setConsumerUrl(getConsumerUrl());

    //  3.x added for extend URL address
    // 执行 AddressListener 回调
    ExtensionLoader<AddressListener> addressListenerExtensionLoader = getUrl().getOrDefaultModuleModel().getExtensionLoader(AddressListener.class);
    List<AddressListener> supportedListeners = addressListenerExtensionLoader.getActivateExtension(getUrl(), (String[]) null);
    if (supportedListeners != null && !supportedListeners.isEmpty()) {
        for (AddressListener addressListener : supportedListeners) {
            instanceUrls = addressListener.notify(instanceUrls, getConsumerUrl(), this);
        }
    }

    // 刷新 invoker
    refreshOverrideAndInvoker(instanceUrls);
}
```
