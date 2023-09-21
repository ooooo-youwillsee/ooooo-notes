# 源码分析 dubbo 启动流程


> dubbo 基于 3.2.6 版本

## 入口程序

```java
// registry、protocol、reference、service 都会调用 configManager#addConfig，很重要。
DubboBootstrap bootstrap = DubboBootstrap.getInstance();
    // 设置应用配置
    bootstrap.application(new ApplicationConfig("dubbo-demo-api-consumer"))
        // 注册中心
        .registry(registryConfig)
        // 协议配置
        .protocol(new ProtocolConfig(CommonConstants.DUBBO, -1))
        // 服务引用
        .reference(reference)
        // 服务暴露
        .service(service)
        // 启动 dubbo
        .start();
```

源码位置: `org.apache.dubbo.config.context.AbstractConfigManager#addConfig`

```java
public final <T extends AbstractConfig> T addConfig(AbstractConfig config) {
    if (config == null) {
        return null;
    }
    // ignore MethodConfig
    // 不支持
    if (!isSupportConfigType(config.getClass())) {
        throw new IllegalArgumentException("Unsupported config type: " + config);
    }

    if (config.getScopeModel() != scopeModel) {
        config.setScopeModel(scopeModel);
    }

    // 获取 tagName, 然后添加
    Map<String, AbstractConfig> configsMap = configsCache.computeIfAbsent(getTagName(config.getClass()), type -> new ConcurrentHashMap<>());

    // fast check duplicated equivalent config before write lock
    if (!(config instanceof ReferenceConfigBase || config instanceof ServiceConfigBase)) {
        for (AbstractConfig value : configsMap.values()) {
            if (value.equals(config)) {
                return (T) value;
            }
        }
    }

    // lock by config type
    synchronized (configsMap) {
        return (T) addIfAbsent(config, configsMap);
    }
}
```

## 启动 dubbo

源码位置: `org.apache.dubbo.config.bootstrap.DubboBootstrap#start`

```java
public DubboBootstrap start(boolean wait) {
    Future future = applicationDeployer.start();
    if (wait) {
        try {
            future.get();
        } catch (Exception e) {
            throw new IllegalStateException("await dubbo application start finish failure", e);
        }
    }
    return this;
}
```

源码位置: `org.apache.dubbo.config.deploy.DefaultApplicationDeployer#start`

```java
@Override
public Future start() {
    synchronized (startLock) {
        // 判断状态
        if (isStopping() || isStopped() || isFailed()) {
            throw new IllegalStateException(getIdentifier() + " is stopping or stopped, can not start again");
        }

        try {
            // maybe call start again after add new module, check if any new module
            // 有待启动的模块
            boolean hasPendingModule = hasPendingModule();

            // 正在启动
            if (isStarting()) {
                // currently, is starting, maybe both start by module and application
                // if it has new modules, start them
                if (hasPendingModule) {
                    // 启动模块
                    startModules();
                }
                // if it is starting, reuse previous startFuture
                return startFuture;
            }

            // if is started and no new module, just return
            if (isStarted() && !hasPendingModule) {
                return CompletableFuture.completedFuture(false);
            }

            // pending -> starting : first start app
            // started -> starting : re-start app
            // 改变状态为正在启动, 执行回调函数 DeployListener
            onStarting();

            // 初始化
            initialize();
            // 启动
            doStart();
        } catch (Throwable e) {
            onFailed(getIdentifier() + " start failure", e);
            throw e;
        }

        return startFuture;
    }
}
```

源码位置: `org.apache.dubbo.config.deploy.DefaultApplicationDeployer#initialize`

```java
// 初始化
@Override
public void initialize() {
    if (initialized) {
        return;
    }
    // Ensure that the initialization is completed when concurrent calls
    synchronized (startLock) {
        if (initialized) {
            return;
        }
        // 执行 DeployListener#onInitialize 钩子函数
        onInitialize();

        // register shutdown hook
        // 注册 shutdown 钩子
        registerShutdownHook();

        // 启动配置中心，之后会用一章来说
        startConfigCenter();

        // 加载应用配置
        loadApplicationConfigs();

        // 初始化 modoule deployer
        initModuleDeployers();

        initMetricsReporter();

        initMetricsService();

        // @since 2.7.8
        // 启动元数据中心
        startMetadataCenter();

        // 变更状态
        initialized = true;

        if (logger.isInfoEnabled()) {
            logger.info(getIdentifier() + " has been initialized!");
        }
    }
}
```

源码位置: `org.apache.dubbo.config.deploy.DefaultApplicationDeployer#doStart`

```java
// 启动
private void doStart() {
        // 启动模块
        startModules();
}

// 启动模块
private void startModules() {
    // ensure init and start internal module first
    // 启动内部模块
    prepareInternalModule();

    // filter and start pending modules, ignore new module during starting, throw exception of module start
    // 启动外部模块
    for (ModuleModel moduleModel : applicationModel.getModuleModels()) {
        if (moduleModel.getDeployer().isPending()) {
            moduleModel.getDeployer().start();
        }
    }
}
```

源码位置: `org.apache.dubbo.config.deploy.DefaultModuleDeployer#start`

```java
// 启动模块
@Override
public Future start() throws IllegalStateException {
    // initialize，maybe deadlock applicationDeployer lock & moduleDeployer lock
    // 初始化, 上面已经说过了
    applicationDeployer.initialize();
    // 启动，加锁
    return startSync();
}

private synchronized Future startSync() throws IllegalStateException {
    // 判断状态
    if (isStopping() || isStopped() || isFailed()) {
        throw new IllegalStateException(getIdentifier() + " is stopping or stopped, can not start again");
    }

    try {
        if (isStarting() || isStarted()) {
            return startFuture;
        }

        // 变更状态，启动中
        onModuleStarting();

        // 初始化，加载配置
        initialize();

        // export services
        // 暴露服务，很重要
        exportServices();

        // prepare application instance
        // exclude internal module to avoid wait itself
        if (moduleModel != moduleModel.getApplicationModel().getInternalModule()) {
            applicationDeployer.prepareInternalModule();
        }

        // refer services
        // 引用服务，很重要
        referServices();

        // if no async export/refer services, just set started
        // 下面的逻辑分为同步和异步处理, 逻辑都是一样的
        if (asyncExportingFutures.isEmpty() && asyncReferringFutures.isEmpty()) {
            // publish module started event
            // 变更状态为已启动，暴露 metadataService, 这个很重要
            onModuleStarted();

            // register services to registry
            // 注册服务，刷新元数据
            registerServices();

            // check reference config
            // 检查
            checkReferences();

            // complete module start future after application state changed
            // 完成启动
            completeStartFuture(true);
        } else {
            frameworkExecutorRepository.getSharedExecutor().submit(() -> {
                try {
                    // wait for export finish
                    waitExportFinish();
                    // wait for refer finish
                    waitReferFinish();

                    // publish module started event
                    onModuleStarted();

                    // register services to registry
                    registerServices();

                    // check reference config
                    checkReferences();
                } catch (Throwable e) {
                    logger.warn(CONFIG_FAILED_WAIT_EXPORT_REFER, "", "", "wait for export/refer services occurred an exception", e);
                    onModuleFailed(getIdentifier() + " start failed: " + e, e);
                } finally {
                    // complete module start future after application state changed
                    completeStartFuture(true);
                }
            });
        }

    } catch (Throwable e) {
        onModuleFailed(getIdentifier() + " start failed: " + e, e);
        throw e;
    }

    return startFuture;
}
```
