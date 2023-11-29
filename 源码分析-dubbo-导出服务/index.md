# 源码分析 dubbo 导出服务


> dubbo 基于 3.2.6 版本

> 在 `dubbo` 中**导出服务的源码是非常复杂**的，这里只介绍**主要流程**。

## exportServices 导出服务

源码位置: `org.apache.dubbo.config.deploy.DefaultModuleDeployer#exportServices`

```java
// 导出服务
private void exportServices() {
    // 遍历 serviceConfig
    for (ServiceConfigBase sc : configManager.getServices()) {
        exportServiceInternal(sc);
    }
}

private void exportServiceInternal(ServiceConfigBase sc) {
    ServiceConfig<?> serviceConfig = (ServiceConfig<?>) sc;
    // 刷新服务
    if (!serviceConfig.isRefreshed()) {
        serviceConfig.refresh();
    }
    if (sc.isExported()) {
        return;
    }
    // 异步导出服务
    if (exportAsync || sc.shouldExportAsync()) {
        ExecutorService executor = executorRepository.getServiceExportExecutor();
        CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
            try {
                if (!sc.isExported()) {
                    sc.export();
                    exportedServices.add(sc);
                }
            } catch (Throwable t) {
                logger.error(CONFIG_FAILED_EXPORT_SERVICE, "", "", "Failed to async export service config: " + getIdentifier() + " , catch error : " + t.getMessage(), t);
            }
        }, executor);

        asyncExportingFutures.add(future);
    } else {
        // 同步导出服务
        if (!sc.isExported()) {
            sc.export(RegisterTypeEnum.AUTO_REGISTER_BY_DEPLOYER);
            exportedServices.add(sc);
        }
    }
}
```

源码位置: `org.apache.dubbo.config.ServiceConfig#export`

```java
// 导出服务
@Override
public void export(RegisterTypeEnum registerType) {
    if (this.exported) {
        return;
    }

    if (getScopeModel().isLifeCycleManagedExternally()) {
        // prepare model for reference
        getScopeModel().getDeployer().prepare();
    } else {
        // ensure start module, compatible with old api usage
        getScopeModel().getDeployer().start();
    }

    synchronized (this) {
        if (this.exported) {
            return;
        }

        // 刷新配置
        if (!this.isRefreshed()) {
            this.refresh();
        }
        if (this.shouldExport()) {
            // 初始化，这里是初始化 serviceListeners 和 serviceMetadata
            this.init();

            if (shouldDelay()) {
                // should register if delay export
                // 延迟导出
                doDelayExport();
            } else if (Integer.valueOf(-1).equals(getDelay()) &&
                Boolean.parseBoolean(ConfigurationUtils.getProperty(
                    getScopeModel(), CommonConstants.DUBBO_MANUAL_REGISTER_KEY, "false"))) {
                // should not register by default
                doExport(RegisterTypeEnum.MANUAL_REGISTER);
            } else {
                // 导出服务
                doExport(registerType);
            }
        }
    }
}
```

源码位置: `org.apache.dubbo.config.ServiceConfig#doExport`

```java
protected synchronized void doExport(RegisterTypeEnum registerType) {
    if (unexported) {
        throw new IllegalStateException("The service " + interfaceClass.getName() + " has already unexported!");
    }
    if (exported) {
        return;
    }

    if (StringUtils.isEmpty(path)) {
        path = interfaceName;
    }
    // 导出 urls，这个很重要
    doExportUrls(registerType);
    // 标记已导出，执行 serviceNameMapping.map(url)，这个很重要
    exported();
}
```

### doExportUrls 导出接口

源码位置: `org.apache.dubbo.config.ServiceConfig#doExportUrls`

```java
// 导出 urls
// 因为 dubbo 支持多协议服务，所以需要对每个协议执行导出服务
private void doExportUrls(RegisterTypeEnum registerType) {
    // 获取 ServiceRepository，调用的时候，可以通过这个来获取接口的元数据信息
    ModuleServiceRepository repository = getScopeModel().getServiceRepository();
    ServiceDescriptor serviceDescriptor;
    final boolean serverService = ref instanceof ServerService;
    if (serverService) {
        serviceDescriptor = ((ServerService) ref).getServiceDescriptor();
        // 注册服务元数据
        repository.registerService(serviceDescriptor);
    } else {
        // 注册服务元数据
        serviceDescriptor = repository.registerService(getInterfaceClass());
    }
    // 创建 ProviderModel
    providerModel = new ProviderModel(serviceMetadata.getServiceKey(),
        ref,
        serviceDescriptor,
        getScopeModel(),
        serviceMetadata, interfaceClassLoader);

    // Compatible with dependencies on ServiceModel#getServiceConfig(), and will be removed in a future version
    providerModel.setConfig(this);

    providerModel.setDestroyRunner(getDestroyRunner());
    // 注册 provider
    repository.registerProvider(providerModel);

    // 加载注册中心配置, 很重要
    List<URL> registryURLs = ConfigValidationUtils.loadRegistries(this, true);

    // 遍历协议
    for (ProtocolConfig protocolConfig : protocols) {
        String pathKey = URL.buildKey(getContextPath(protocolConfig)
            .map(p -> p + "/" + path)
            .orElse(path), group, version);
        // stub service will use generated service name
        if (!serverService) {
            // In case user specified path, register service one more time to map it to path.
            repository.registerService(pathKey, interfaceClass);
        }
        // 对每个协议导出服务，很重要
        doExportUrlsFor1Protocol(protocolConfig, registryURLs, registerType);
    }

    // 设置 urls
    providerModel.setServiceUrls(urls);
}
```

### loadRegistries 加载注册中心

源码位置: `org.apache.dubbo.config.utils.ConfigValidationUtils#loadRegistries`

```java
// 加载注册中心配置
public static List<URL> loadRegistries(AbstractInterfaceConfig interfaceConfig, boolean provider) {
    // check && override if necessary
    List<URL> registryList = new ArrayList<>();
    ApplicationConfig application = interfaceConfig.getApplication();
    List<RegistryConfig> registries = interfaceConfig.getRegistries();
    if (CollectionUtils.isNotEmpty(registries)) {
        // 遍历 registries
        for (RegistryConfig config : registries) {
            // try to refresh registry in case it is set directly by user using config.setRegistries()
            // 刷新配置
            if (!config.isRefreshed()) {
                config.refresh();
            }
            String address = config.getAddress();
            if (StringUtils.isEmpty(address)) {
                address = ANYHOST_VALUE;
            }
            // 是可用的地址
            if (!RegistryConfig.NO_AVAILABLE.equalsIgnoreCase(address)) {
                // 组合参数
                Map<String, String> map = new HashMap<String, String>();
                AbstractConfig.appendParameters(map, application);
                AbstractConfig.appendParameters(map, config);
                map.put(PATH_KEY, RegistryService.class.getName());
                AbstractInterfaceConfig.appendRuntimeParameters(map);
                if (!map.containsKey(PROTOCOL_KEY)) {
                    map.put(PROTOCOL_KEY, DUBBO_PROTOCOL);
                }
                List<URL> urls = UrlUtils.parseURLs(address, map);
                // 组合 url
                for (URL url : urls) {
                    url = URLBuilder.from(url)
                        // 保留原始的协议类型，对服务级别注册有用
                        .addParameter(REGISTRY_KEY, url.getProtocol())
                        // 提取注册类型，设置协议，这个很重要，在 dubbo 3.0 有服务级别和接口级别两种注册方式
                        .setProtocol(extractRegistryType(url))
                        .setScopeModel(interfaceConfig.getScopeModel())
                        .build();
                    // provider delay register state will be checked in RegistryProtocol#export
                    if (provider || url.getParameter(SUBSCRIBE_KEY, true)) {
                        registryList.add(url);
                    }
                }
            }
        }
    }
    // 兼容处理，不解析
    return genCompatibleRegistries(interfaceConfig.getScopeModel(), registryList, provider);
}
```

### doExportUrlsFor1Protocol 对单协议导出

源码位置: `org.apache.dubbo.config.ServiceConfig#doExportUrlsFor1Protocol`

```java
// 对单个协议导出
private void doExportUrlsFor1Protocol(ProtocolConfig protocolConfig, List<URL> registryURLs, RegisterTypeEnum registerType) {
    Map<String, String> map = buildAttributes(protocolConfig);

    // remove null key and null value
    map.keySet().removeIf(key -> StringUtils.isEmpty(key) || StringUtils.isEmpty(map.get(key)));
    // init serviceMetadata attachments
    serviceMetadata.getAttachments().putAll(map);

    // 构建 url
    URL url = buildUrl(protocolConfig, map);
    
    // 设置单独的 executor, 之后会用这个 executor 去执行请求
    processServiceExecutor(url);
    
    // 导出 url
    exportUrl(url, registryURLs, registerType);
    
    initServiceMethodMetrics(url);
}
```

源码位置: `org.apache.dubbo.config.ServiceConfig#exportUrl`

```java
// 导出 url
private void exportUrl(URL url, List<URL> registryURLs, RegisterTypeEnum registerType) {
    // 获取 scope, scope 分为 remote 和 local, 默认为空，表示两种都会导出
    String scope = url.getParameter(SCOPE_KEY);
    // don't export when none is configured
    if (!SCOPE_NONE.equalsIgnoreCase(scope)) {

        // export to local if the config is not remote (export to remote only when config is remote)
        if (!SCOPE_REMOTE.equalsIgnoreCase(scope)) {
            // 导出本地服务, 不解析这个
            exportLocal(url);
        }

        // export to remote if the config is not local (export to local only when config is local)
        if (!SCOPE_LOCAL.equalsIgnoreCase(scope)) {
            // export to extra protocol is used in remote export
            // extProtocol 默认为空
            String extProtocol = url.getParameter("ext.protocol", "");
            List<String> protocols = new ArrayList<>();

            if (StringUtils.isNotBlank(extProtocol)) {
                // export original url
                url = URLBuilder.from(url).
                    addParameter(IS_PU_SERVER_KEY, Boolean.TRUE.toString()).
                    removeParameter("ext.protocol").
                    build();
            }

            // 导出远程服务, 这个很重要
            url = exportRemote(url, registryURLs, registerType);
            if (!isGeneric(generic) && !getScopeModel().isInternal()) {
                // 元数据中心，发布服务定义，这个很重要
                MetadataUtils.publishServiceDefinition(url, providerModel.getServiceModel(), getApplicationModel());
            }

            if (StringUtils.isNotBlank(extProtocol)) {
                String[] extProtocols = extProtocol.split(",", -1);
                protocols.addAll(Arrays.asList(extProtocols));
            }
            // export extra protocols
            // 导出额外协议
            for (String protocol : protocols) {
                if (StringUtils.isNotBlank(protocol)) {
                    URL localUrl = URLBuilder.from(url).
                        setProtocol(protocol).
                        build();
                    // 导出远程服务, 这个很重要
                    localUrl = exportRemote(localUrl, registryURLs, registerType);
                    if (!isGeneric(generic) && !getScopeModel().isInternal()) {
                        // 元数据中心，发布服务定义，这个很重要 
                        MetadataUtils.publishServiceDefinition(localUrl, providerModel.getServiceModel(), getApplicationModel());
                    }
                    this.urls.add(localUrl);
                }
            }
        }
    }
    this.urls.add(url);
}
```

### exportRemote 导出接口

源码位置: `org.apache.dubbo.config.ServiceConfig#exportRemote`

```java
// 对每一个注册中心，都导出接口
private URL exportRemote(URL url, List<URL> registryURLs, RegisterTypeEnum registerType) {
    if (CollectionUtils.isNotEmpty(registryURLs) && registerType != RegisterTypeEnum.NEVER_REGISTER) {
        // 遍历 registryUrl
        for (URL registryURL : registryURLs) {
            // dubbo3 中是 service-registry
            if (SERVICE_REGISTRY_PROTOCOL.equals(registryURL.getProtocol())) {
                url = url.addParameterIfAbsent(SERVICE_NAME_MAPPING_KEY, "true");
            }
  
            //if protocol is only injvm ,not register
            // 如果是 injvm 协议，跳过
            if (LOCAL_PROTOCOL.equalsIgnoreCase(url.getProtocol())) {
                continue;
            }
  
            // 添加 dynamic 参数，表示这个接口是临时的，当注册中心注销时，需要注销这个接口
            url = url.addParameterIfAbsent(DYNAMIC_KEY, registryURL.getParameter(DYNAMIC_KEY));
            // 添加 monitor 参数
            URL monitorUrl = ConfigValidationUtils.loadMonitor(this, registryURL);
            if (monitorUrl != null) {
                url = url.putAttribute(MONITOR_KEY, monitorUrl);
            }
  
            // For providers, this is used to enable custom proxy to generate invoker
            // 添加 proxy 参数，可以自定义代理实现, 默认为 javassist
            String proxy = url.getParameter(PROXY_KEY);
            if (StringUtils.isNotEmpty(proxy)) {
                registryURL = registryURL.addParameter(PROXY_KEY, proxy);
            }
  
            if (logger.isInfoEnabled()) {
                if (url.getParameter(REGISTER_KEY, true)) {
                    logger.info("Register dubbo service " + interfaceClass.getName() + " url " + url + " to registry " + registryURL.getAddress());
                } else {
                    logger.info("Export dubbo service " + interfaceClass.getName() + " to url " + url);
                }
            }
            // 导出 url，这里很重要，把 url 添加到 registryUrl 的 export 参数中
            doExportUrl(registryURL.putAttribute(EXPORT_KEY, url), true, registerType);
        }
  
    } else {
        if (logger.isInfoEnabled()) {
            logger.info("Export dubbo service " + interfaceClass.getName() + " to url " + url);
        }
        // 导出url，不会把接口注册到注册中心
        doExportUrl(url, true, registerType);
    }
    return url;
}
```

源码位置: `org.apache.dubbo.config.ServiceConfig#doExportUrl`

```java
// 导出接口
private void doExportUrl(URL url, boolean withMetaData, RegisterTypeEnum registerType) {
    // 在 dubbo3 中，registerType 默认就是 AUTO_REGISTER_BY_DEPLOYER
    if (!url.getParameter(REGISTER_KEY, true)) {
        registerType = RegisterTypeEnum.MANUAL_REGISTER;
    }
    if (registerType == RegisterTypeEnum.NEVER_REGISTER ||
        registerType == RegisterTypeEnum.MANUAL_REGISTER ||
        registerType == RegisterTypeEnum.AUTO_REGISTER_BY_DEPLOYER) {
        url = url.addParameter(REGISTER_KEY, false);
    }
  
    // 包装 ref，生成 invoker
    Invoker<?> invoker = proxyFactory.getInvoker(ref, (Class) interfaceClass, url);
    if (withMetaData) {
        invoker = new DelegateProviderMetaDataInvoker(invoker, this);
    }
    // 通过 SPI 机制获取对应的实现类，这里的 url 是 registryUrl，实现类为 RegistryProtocol
    Exporter<?> exporter = protocolSPI.export(invoker);
    // 注册 exporter
    exporters.computeIfAbsent(registerType, k -> new CopyOnWriteArrayList<>()).add(exporter);
}
```

### RegistryProtocol#export 导出接口

源码位置: `org.apache.dubbo.registry.integration.RegistryProtocol#export`

```java
// 导出接口
@Override
public <T> Exporter<T> export(final Invoker<T> originInvoker) throws RpcException {
    // 获取 registryUrl
    URL registryUrl = getRegistryUrl(originInvoker);
    // 获取 providerUrl, 之前这个url 放在 registryUrl 的 export 参数中
    URL providerUrl = getProviderUrl(originInvoker);
  
    // Subscribe the override data
    // FIXME When the provider subscribes, it will affect the scene : a certain JVM exposes the service and call
    //  the same service. Because the subscribed is cached key with the name of the service, it causes the
    //  subscription information to cover.
    // 一些覆盖配置的监听器，这里包括 provider, service 两个维度的
    final URL overrideSubscribeUrl = getSubscribedOverrideUrl(providerUrl);
    final OverrideListener overrideSubscribeListener = new OverrideListener(overrideSubscribeUrl, originInvoker);
    Map<URL, Set<NotifyListener>> overrideListeners = getProviderConfigurationListener(overrideSubscribeUrl).getOverrideListeners();
    overrideListeners.computeIfAbsent(overrideSubscribeUrl, k -> new ConcurrentHashSet<>())
        .add(overrideSubscribeListener);
  
    providerUrl = overrideUrlWithConfig(providerUrl, overrideSubscribeListener);
    //export invoker
    // 导出接口，这个最重要
    final ExporterChangeableWrapper<T> exporter = doLocalExport(originInvoker, providerUrl);
  
    // url to registry
    // 根据 SPI 机制获取对应的 registry 实现类
    final Registry registry = getRegistry(registryUrl);
    // 获取注册的 url
    final URL registeredProviderUrl = getUrlToRegistry(providerUrl, registryUrl);
  
    // decide if we need to delay publish (provider itself and registry should both need to register)
    // 决定是否要注册 url，刚才是 AUTO_REGISTER_BY_DEPLOYER，所以不会注册
    boolean register = providerUrl.getParameter(REGISTER_KEY, true) && registryUrl.getParameter(REGISTER_KEY, true);
    if (register) {
        register(registry, registeredProviderUrl);
    }
  
    // register stated url on provider model
    registerStatedUrl(registryUrl, registeredProviderUrl, register);
  
    // 设置一些参数
    exporter.setRegisterUrl(registeredProviderUrl);
    exporter.setSubscribeUrl(overrideSubscribeUrl);
    exporter.setNotifyListener(overrideSubscribeListener);
    exporter.setRegistered(register);
    ...
    // 执行 RegistryProtocolListener 钩子函数
    notifyExport(exporter);
    //Ensure that a new exporter instance is returned every time export
    return new DestroyableExporter<>(exporter);
}
```

源码位置: `org.apache.dubbo.registry.integration.RegistryProtocol#doLocalExport`

```java
// 导出接口
private <T> ExporterChangeableWrapper<T> doLocalExport(final Invoker<T> originInvoker, URL providerUrl) {
    String providerUrlKey = getProviderUrlKey(originInvoker);
    String registryUrlKey = getRegistryUrlKey(originInvoker);
    Invoker<?> invokerDelegate = new InvokerDelegate<>(originInvoker, providerUrl);
    // 根据 SPI 机制获取对应的实现类，如 DubboProtocol, TripleProtocol, 在后面的章节会继续解析
    ReferenceCountExporter<?> exporter = exporterFactory.createExporter(psfdsnroviderUrlKey, () -> protocol.export(invokerDelegate));
    // 记录导出的接口
    return (ExporterChangeableWrapper<T>) bounds.computeIfAbsent(providerUrlKey, _k -> new ConcurrentHashMap<>())
        .computeIfAbsent(registryUrlKey, s -> {
            // ExporterChangeableWrapper 这个类很重要，后续会调用 registry 方法来注册接口
            return new ExporterChangeableWrapper<>(
                (ReferenceCountExporter<T>) exporter, originInvoker);
        });
}
```

### ServiceConfig#exported

源码位置: `org.apache.dubbo.config.ServiceConfig#exported`

```java
// 在导出接口后，会调用这个方法
protected void exported() {
    exported = true;
    List<URL> exportedURLs = this.getExportedUrls();
    exportedURLs.forEach(url -> {
        if (url.getParameters().containsKey(SERVICE_NAME_MAPPING_KEY)) {
            ServiceNameMapping serviceNameMapping = ServiceNameMapping.getDefaultExtension(getScopeModel());
            ScheduledExecutorService scheduledExecutor = getScopeModel().getBeanFactory()
                .getBean(FrameworkExecutorRepository.class).getSharedScheduledExecutor();
            // 对接口创建对应的 mappping，这样可以根据接口来获取是服务名，很重要
            mapServiceName(url, serviceNameMapping, scheduledExecutor);
        }
    });
    // 执行 ServiceListener 钩子函数
    onExported();
}
```

## registerServices 注册服务

源码位置: `org.apache.dubbo.config.deploy.DefaultModuleDeployer#registerServices`

```java
// 注册服务
private void registerServices() {
    // 遍历所有的 service
    for (ServiceConfigBase sc : configManager.getServices()) {
        if (!Boolean.FALSE.equals(sc.isRegister())) {
            // 注册 service, 这个很重要
            registerServiceInternal(sc);
        }
    }
    // 刷新服务实例, 这个很重要
    applicationDeployer.refreshServiceInstance();
}
```

源码位置: `org.apache.dubbo.config.deploy.DefaultModuleDeployer#registerServiceInternal`

```java
// 注册 service
private void registerServiceInternal(ServiceConfigBase sc) {
    ServiceConfig<?> serviceConfig = (ServiceConfig<?>) sc;
    // 刷新配置
    if (!serviceConfig.isRefreshed()) {
        serviceConfig.refresh();
    }
    if (!sc.isExported()) {
        return;
    }
    // 注册
    sc.register(true);
}
```

源码位置: `org.apache.dubbo.config.ServiceConfig#register`

```java
// 注册, byDeployer 参数为 true
@Override
public void register(boolean byDeployer) {
    if (!this.exported) {
        return;
    }
  
    synchronized (this) {
        if (!this.exported) {
            return;
        }
  
        // AUTO_REGISTER 类型的注册
        for (Exporter<?> exporter : exporters.getOrDefault(RegisterTypeEnum.AUTO_REGISTER, Collections.emptyList())) {
            exporter.register();
        }
  
        // AUTO_REGISTER_BY_DEPLOYER 类型的注册, dubbo3 默认走这里
        if (byDeployer) {
            for (Exporter<?> exporter : exporters.getOrDefault(RegisterTypeEnum.AUTO_REGISTER_BY_DEPLOYER, Collections.emptyList())) {
                // exporter 实现类为 ExporterChangeableWrapper
                exporter.register();
            }
        }
    }
}
```

### ExporterChangeableWrapper#register

源码位置: `org.apache.dubbo.registry.integration.RegistryProtocol.ExporterChangeableWrapper#register`

```java
// ExporterChangeableWrapper 在 RegistryProtocol#doLocalExport 方法中会生成
@Override
public void register() {
    if (registered.compareAndSet(false, true)) {
        URL registryUrl = getRegistryUrl(originInvoker);
        // 根据 SPI 机制获取 registry, 实现类为 ServiceDiscoveryRegistry（服务级别注册），ZookeeperRegistry（接口级别注册）
        Registry registry = getRegistry(registryUrl);
        // 注册 url，这个很重要，这里只分析 ServiceDiscoveryRegistry#register
        RegistryProtocol.register(registry, getRegisterUrl());
  
        ProviderModel providerModel = frameworkModel.getServiceRepository()
            .lookupExportedService(getRegisterUrl().getServiceKey());
        // 标记已注册
        List<ProviderModel.RegisterStatedURL> statedUrls = providerModel.getStatedUrl();
        statedUrls.stream()
            .filter(u -> u.getRegistryUrl().equals(registryUrl)
                && u.getProviderUrl().getProtocol().equals(getRegisterUrl().getProtocol()))
            .forEach(u -> u.setRegistered(true));
        logger.info("Registered dubbo service " + getRegisterUrl().getServiceKey() + " url " + getRegisterUrl() + " to registry " + registryUrl);
    }
}
```

### ServiceDiscoveryRegistry#register 服务级别注册

源码位置: `org.apache.dubbo.registry.client.ServiceDiscoveryRegistry#register`

```java
@Override
public final void register(URL url) {
    if (!shouldRegister(url)) { // Should Not Register
        return;
    }
    doRegister(url);
}

@Override
public void doRegister(URL url) {
    // fixme, add registry-cluster is not necessary anymore
    url = addRegistryClusterKey(url);
    // 注册 url
    serviceDiscovery.register(url);
}
```

源码位置: `org.apache.dubbo.registry.client.AbstractServiceDiscovery#register`

```java
@Override
public void register(URL url) {
    // 只是添加了 url，实际并没有发布
    metadataInfo.addService(url);
}
```

## DefaultApplicationDeployer#refreshServiceInstance 刷新服务实例

源码位置: `org.apache.dubbo.config.deploy.DefaultApplicationDeployer#refreshServiceInstance`

```java
@Override
public void refreshServiceInstance() {
    if (registered) {
        try {
            // 刷新元数据和实例
            ServiceInstanceMetadataUtils.refreshMetadataAndInstance(applicationModel);
        } catch (Exception e) {
            logger.error(CONFIG_REFRESH_INSTANCE_ERROR, "", "", "Refresh instance and metadata error.", e);
        }
    }
}

// 刷新元数据和实例
public static void refreshMetadataAndInstance(ApplicationModel applicationModel) {
    RegistryManager registryManager = applicationModel.getBeanFactory().getBean(RegistryManager.class);
    // update service instance revision
    // 对每一个 serviceDiscovery 都更新
    registryManager.getServiceDiscoveries().forEach(ServiceDiscovery::update);
}
```

### ServiceDiscovery#update 更新服务实例

源码位置: `org.apache.dubbo.registry.client.AbstractServiceDiscovery#update`

```java
@Override
public synchronized void update() throws RuntimeException {
    if (isDestroy) {
        return;
    }
  
    // 注册实例, 会根据 metadataInfo 创建 serviceInstance
    if (this.serviceInstance == null) {
        register();
    }
  
    if (!isValidInstance(this.serviceInstance)) {
        return;
    }
    ServiceInstance oldServiceInstance = this.serviceInstance;
    DefaultServiceInstance newServiceInstance = new DefaultServiceInstance((DefaultServiceInstance) oldServiceInstance);
    // 计算 revision 是否发生改变
    boolean revisionUpdated = calOrUpdateInstanceRevision(newServiceInstance);
    if (revisionUpdated) {
        logger.info(String.format("Metadata of instance changed, updating instance with revision %s.", newServiceInstance.getServiceMetadata().getRevision()));
        // 更新服务实例
        doUpdate(oldServiceInstance, newServiceInstance);
        this.serviceInstance = newServiceInstance;
    }
}
```

源码位置: `org.apache.dubbo.registry.client.AbstractServiceDiscovery#doUpdate`

```java
protected void doUpdate(ServiceInstance oldServiceInstance, ServiceInstance newServiceInstance) {
    // 注销旧的服务实例
    this.doUnregister(oldServiceInstance);
    this.serviceInstance = newServiceInstance;
  
    if (!EMPTY_REVISION.equals(getExportedServicesRevision(newServiceInstance))) {
        // 报告服务元数据
        reportMetadata(newServiceInstance.getServiceMetadata());
        // 注册新的服务实例
        this.doRegister(newServiceInstance);
    }
}
```



