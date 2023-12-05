---
title: 源码分析 dubbo 引用服务（接口级别）
date: 2023-12-06T08:00:00+08:00
draft: false
tags: [ dubbo, source code, 源码分析 dubbo 系列 ]
categories: [ 源码分析 dubbo 系列 ]
---

> dubbo 基于 3.2.6 版本

**接口级别引用**是 `dubbo 2.x` 版本的方式，其主流程和之前的章节【引用服务】没有差别，主要区别在于**注册中心的逻辑不一样**。

## RegistryProtocol#doCreateInvoker 创建 invoker

源码位置: `org.apache.dubbo.registry.integration.RegistryProtocol#doCreateInvoker`

```java
protected <T> ClusterInvoker<T> doCreateInvoker(DynamicDirectory<T> directory, Cluster cluster, Registry registry, Class<T> type) {
    directory.setRegistry(registry);
    directory.setProtocol(protocol);
    ...
    directory.buildRouterChain(urlToRegistry);
    // 订阅 url, directory 实现类 为 RegistryDirectory
    directory.subscribe(toSubscribeUrl(urlToRegistry));

    return (ClusterInvoker<T>) cluster.join(directory, true);
}
```

源码位置: `org.apache.dubbo.registry.integration.RegistryDirectory#subscribe`

```java
@Override
public void subscribe(URL url) {
    ...
    ApplicationModel applicationModel = url.getApplicationModel();
    String registryClusterName = registry.getUrl().getParameter(RegistryConstants.REGISTRY_CLUSTER_KEY, registry.getUrl().getParameter(PROTOCOL_KEY));
    MetricsEventBus.post(RegistryEvent.toSubscribeEvent(applicationModel,registryClusterName), () ->
        {
            // 调用父类 DynamicDirectory#subscribe 
            super.subscribe(url);
            return null;
        }
    );
    // 开启配置监听，不解析
    if (moduleModel.modelEnvironment().getConfiguration().convert(Boolean.class, org.apache.dubbo.registry.Constants.ENABLE_CONFIGURATION_LISTEN, true)) {
        consumerConfigurationListener.addNotifyListener(this);
        referenceConfigurationListener = new ReferenceConfigurationListener(moduleModel, this, url);
    }
}
```

源码位置: `org.apache.dubbo.registry.integration.DynamicDirectory#subscribe`

```java
public void subscribe(URL url) {
    setSubscribeUrl(url);
    // 这里以 ZookeeperRegistry 为例
    registry.subscribe(url, this);
}
```

## ZookeeperRegistry#subscribe 订阅服务

源码位置: ``

```java
@Override
public void subscribe(URL url, NotifyListener listener) {
    ...
    // 移除 url
    removeFailedSubscribed(url, listener);
    try {
        // Sending a subscription request to the server side
        // 调用子类的订阅方法，这里以 ZookeeperRegistry 为例
        doSubscribe(url, listener);
    } catch (Exception e) {
        Throwable t = e;
        
        List<URL> urls = getCacheUrls(url);
        if (CollectionUtils.isNotEmpty(urls)) {
            notify(url, listener, urls);
        } else {
            // If the startup detection is opened, the Exception is thrown directly.
            boolean check = getUrl().getParameter(Constants.CHECK_KEY, true)
                && url.getParameter(Constants.CHECK_KEY, true);
            boolean skipFailback = t instanceof SkipFailbackWrapperException;
            // 检查 check 参数，如果为 true，表示第一次订阅服务要成功
            if (check || skipFailback) {
                if (skipFailback) {
                    t = t.getCause();
                }
                throw new IllegalStateException("Failed to subscribe " + url + ", cause: " + t.getMessage(), t);
            } else {
                logger.error(REGISTRY_FAILED_NOTIFY_EVENT, "", "", "Failed to subscribe " + url + ", waiting for retry, cause: " + t.getMessage(), t);
            }
        }

        // 记录失败的url， 稍后定时任务会再次订阅
        addFailedSubscribed(url, listener);
    }
}
```

源码位置: `org.apache.dubbo.registry.zookeeper.ZookeeperRegistry#doSubscribe`

```java
@Override
public void doSubscribe(final URL url, final NotifyListener listener) {
    try {
        checkDestroyed();
        // 订阅所有接口，dubbo-admin 服务会使用，这个不分析
        if (ANY_VALUE.equals(url.getServiceInterface())) {
           ... 
        } else {
            CountDownLatch latch = new CountDownLatch(1);
            try {
                List<URL> urls = new ArrayList<>();
                /*
                    Iterate over the category value in URL.
                    With default settings, the path variable can be when url is a consumer URL:

                        /dubbo/[service name]/providers,
                        /dubbo/[service name]/configurators
                        /dubbo/[service name]/routers
                */
                // 监听每一个路径
                for (String path : toCategoriesPath(url)) {
                    ConcurrentMap<NotifyListener, ChildListener> listeners = ConcurrentHashMapUtils.computeIfAbsent(zkListeners, url, k -> new ConcurrentHashMap<>());
                    // 这里把 listener 添加进去了，等 url 更改时，再执行回调函数
                    ChildListener zkListener = ConcurrentHashMapUtils.computeIfAbsent(listeners, listener, k -> new RegistryChildListenerImpl(url, k, latch));

                    if (zkListener instanceof RegistryChildListenerImpl) {
                        // latch 为了监听到 urls 时，通知主线程
                        ((RegistryChildListenerImpl) zkListener).setLatch(latch);
                    }
                    // 创建根路径，比如 /dubbo/${interfaceName}/consumers
                    zkClient.create(path, false, true);
                    // 获取所有的子路径，用于第一次初始化 urls
                    List<String> children = zkClient.addChildListener(path, zkListener);
                    if (children != null) {
                        // The invocation point that may cause 1-1.
                        urls.addAll(toUrlsWithEmpty(url, path, children));
                    }
                }
                // 执行回调函数
                notify(url, listener, urls);
            } finally {
                // tells the listener to run only after the sync notification of main thread finishes.
                latch.countDown();
            }
        }
    } catch (Throwable e) {
        ...
    }
}
```

