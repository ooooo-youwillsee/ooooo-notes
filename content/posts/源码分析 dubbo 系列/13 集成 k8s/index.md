---
title: 13 集成 k8s
date: 2023-12-25T08:00:00+08:00
draft: false
tags: [ dubbo, source code, 源码分析 dubbo 系列 ]
categories: [ 源码分析 dubbo 系列 ]
---

> dubbo 基于 3.2.6 版本

> 如果我们将 `dubbo` 应用部署在 `k8s` 环境中，我们就可以使用 `k8s` 作为**注册中心**。

##  服务调用流程

1. `provider` 使用 `KubernetesServiceDiscovery#doRegister` 注册**服务实例**，**元数据信息**会存放在 `pod` 对象上.
2. `consumer` 使用 `ServiceNameMapping#getMapping` 来获取 `consumerUrl` 对应的 `serviceName`.
3. `consumer` 使用 `KubernetesServiceDiscovery#getInstances` 来获取 `serviceName` 对应的**服务实例**.
4. 获取的**服务实例**上面就会有**元数据信息**，然后就会使用**元数据信息**来获取**服务实例**的所有 `url` 列表.
5. 根据这些 **url** 列表来创建对应的 `invoker`，比如 `DubboInvoker`, `TripleInvoker`.


## KubernetesServiceDiscovery#doRegister 注册实例

源码位置: `org.apache.dubbo.registry.kubernetes.KubernetesServiceDiscovery#KubernetesServiceDiscovery`

```java
// KubernetesServiceDiscovery 构造方法
public KubernetesServiceDiscovery(ApplicationModel applicationModel, URL registryURL) {
    super(applicationModel, registryURL);
    Config config = KubernetesConfigUtils.createKubernetesConfig(registryURL);
    // 初始化 k8s client
    this.kubernetesClient = new KubernetesClientBuilder().withConfig(config).build();
    // HostName 一般默认就是 podName
    this.currentHostname = System.getenv("HOSTNAME");
    this.registryURL = registryURL;
    this.namespace = config.getNamespace();
    // 默认需要注册
    this.enableRegister = registryURL.getParameter(KubernetesClientConst.ENABLE_REGISTER, true);

    boolean availableAccess;
    try {
        // 检查 k8s 是否可用
        availableAccess = kubernetesClient.pods().withName(currentHostname).get() != null;
    } catch (Throwable e) {
        availableAccess = false;
    }
    if (!availableAccess) {
      ...
    } else {
        // todo 暂时不解析
        KubernetesMeshEnvListener.injectKubernetesEnv(kubernetesClient, namespace);
    }
}
```

源码位置: `org.apache.dubbo.registry.kubernetes.KubernetesServiceDiscovery#doRegister`

```java
// 注册实例
@Override
public void doRegister(ServiceInstance serviceInstance) throws RuntimeException {
    if (enableRegister) {
        kubernetesClient
                .pods()
                .inNamespace(namespace)
                // 选择当前 pod
                .withName(currentHostname)
                .edit(pod ->
                        new PodBuilder(pod)
                                .editOrNewMetadata()
                                // 添加到注解
                                .addToAnnotations(KUBERNETES_PROPERTIES_KEY, JsonUtils.toJson(serviceInstance.getMetadata()))
                                .endMetadata()
                                .build());
        if (logger.isInfoEnabled()) {
            logger.info("Write Current Service Instance Metadata to Kubernetes pod. " +
                    "Current pod name: " + currentHostname);
        }
    }
}
```

源码位置: `org.apache.dubbo.registry.kubernetes.KubernetesServiceDiscovery#doUpdate`

```java
// 实例信息改变之后，重新注册
@Override
public void doUpdate(ServiceInstance oldServiceInstance, ServiceInstance newServiceInstance) throws RuntimeException {
    reportMetadata(newServiceInstance.getServiceMetadata());
    this.doRegister(newServiceInstance);
}
```


## KubernetesServiceDiscovery#getInstances 获取实例

源码位置: `org.apache.dubbo.registry.kubernetes.KubernetesServiceDiscovery#getInstances`

```java
@Override
public List<ServiceInstance> getInstances(String serviceName) throws NullPointerException {
    Endpoints endpoints = null;
    // 从 informer 中获取
    SharedIndexInformer<Endpoints> endInformer = ENDPOINTS_INFORMER.get(serviceName);
    if (endInformer != null) {
        // get endpoints directly from informer local store
        List<Endpoints> endpointsList = endInformer.getStore().list();
        if (endpointsList.size() > 0) {
            endpoints = endpointsList.get(0);
        }
    }
    if (endpoints == null) {
        // 直接获取
        endpoints = kubernetesClient
                .endpoints()
                .inNamespace(namespace)
                .withName(serviceName)
                .get();
    }
    // 根据 k8s 的 endpoint 来获取
    return toServiceInstance(endpoints, serviceName);
}
```

源码位置: `org.apache.dubbo.registry.kubernetes.KubernetesServiceDiscovery#toServiceInstance`

```java
// 方法的逻辑：查询出所有的 pod 和 endpoint，以 endpoint 为准，然后对比，挑选出可用的 pod，最终包装为 serviceInstance
private List<ServiceInstance> toServiceInstance(Endpoints endpoints, String serviceName) {
    Map<String, String> serviceSelector = getServiceSelector(serviceName);
    if (serviceSelector == null) {
        return new LinkedList<>();
    }
    // 获取 pod
    Map<String, Pod> pods = kubernetesClient
            .pods()
            .inNamespace(namespace)
            .withLabels(serviceSelector)
            .list()
            .getItems()
            .stream()
            .collect(
                    Collectors.toMap(
                            pod -> pod.getMetadata().getName(),
                            pod -> pod));

    List<ServiceInstance> instances = new LinkedList<>();
    Set<Integer> instancePorts = new HashSet<>();

    // 获取 port
    for (EndpointSubset endpointSubset : endpoints.getSubsets()) {
        instancePorts.addAll(
                endpointSubset.getPorts()
                        .stream().map(EndpointPort::getPort)
                        .collect(Collectors.toSet()));
    }

    for (EndpointSubset endpointSubset : endpoints.getSubsets()) {
        for (EndpointAddress address : endpointSubset.getAddresses()) {
            // 检查 endpoint 和 pod 是否关联，
            Pod pod = pods.get(address.getTargetRef().getName());
            String ip = address.getIp();
            // 如果 pod 为 null，说明这个 pod 删除了
            if (pod == null) {
                logger.warn(REGISTRY_UNABLE_MATCH_KUBERNETES, "", "", "Unable to match Kubernetes Endpoint address with Pod. " +
                    "EndpointAddress Hostname: " + address.getTargetRef().getName());
                continue;
            }
            // 遍历所有 port，新建 ServiceInstance
            instancePorts.forEach(port -> {
                ServiceInstance serviceInstance = new DefaultServiceInstance(serviceName, ip, port, ScopeModelUtil.getApplicationModel(getUrl().getScopeModel()));

                // 从 pod 上获取之前的元数据信息
                String properties = pod.getMetadata().getAnnotations().get(KUBERNETES_PROPERTIES_KEY);
                if (StringUtils.isNotEmpty(properties)) {
                    serviceInstance.getMetadata().putAll(JsonUtils.toJavaObject(properties, Map.class));
                    instances.add(serviceInstance);
                } else {
                  ...
                }
            });
        }
    }
    return instances;
}
```
