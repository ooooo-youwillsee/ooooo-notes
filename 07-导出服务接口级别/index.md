# 07 导出服务（接口级别）


&gt; dubbo 基于 3.2.6 版本

**接口级别导出**是 `dubbo 2.x` 版本的方式，其主流程和之前的章节【导出服务】没有差别，主要区别在于**注册中心的逻辑不一样**。


## RegistryProtocol#export 导出服务

源码位置: `org.apache.dubbo.registry.integration.RegistryProtocol#export`

```java
@Override
public &lt;T&gt; Exporter&lt;T&gt; export(final Invoker&lt;T&gt; originInvoker) throws RpcException {
    ...
    // 获取 registry，比如 ZookeeperRegistry (接口级注册)
    final Registry registry = getRegistry(registryUrl);
    final URL registeredProviderUrl = getUrlToRegistry(providerUrl, registryUrl);

    // decide if we need to delay publish (provider itself and registry should both need to register)
    // 如果是接口级别，register 为 true
    boolean register = providerUrl.getParameter(REGISTER_KEY, true) &amp;&amp; registryUrl.getParameter(REGISTER_KEY, true);
    if (register) {
        // 注册 providerUrl，最终调用 ZookeeperRegistry#registry 方法
        register(registry, registeredProviderUrl);
    }
    ...
    return new DestroyableExporter&lt;&gt;(exporter);
}
```

## ZookeeperRegistry#register 注册服务

源码位置: `org.apache.dubbo.registry.support.FailbackRegistry#register`

```java
// 注册 url, 这个类是 ZookeeperRegistry 的 父类
@Override
public void register(URL url) {
    ...
    super.register(url);
    // 移除 url
    removeFailedRegistered(url);
    removeFailedUnregistered(url);
    try {
        // Sending a registration request to the server side
        // 调用子类的注册方法, 这里以 ZookeeperRegistry 为例
        doRegister(url);
    } catch (Exception e) {
        Throwable t = e;

        // If the startup detection is opened, the Exception is thrown directly.
        boolean check = getUrl().getParameter(Constants.CHECK_KEY, true)
            &amp;&amp; url.getParameter(Constants.CHECK_KEY, true)
            &amp;&amp; (url.getPort() != 0);
        boolean skipFailback = t instanceof SkipFailbackWrapperException;
        // 检查 check 参数，如果是 true，表示第一次一定要注册成功
        if (check || skipFailback) {
            if (skipFailback) {
                t = t.getCause();
            }
            throw new IllegalStateException(&#34;Failed to register &#34; &#43; url &#43; &#34; to registry &#34; &#43; getUrl().getAddress() &#43; &#34;, cause: &#34; &#43; t.getMessage(), t);
        } else {
            logger.error(INTERNAL_ERROR, &#34;unknown error in registry module&#34;, &#34;&#34;, &#34;Failed to register &#34; &#43; url &#43; &#34;, waiting for retry, cause: &#34; &#43; t.getMessage(), t);
        }

        // Record a failed registration request to a failed list, retry regularly
        // 添加失败的 url，稍后定时任务会重新注册
        addFailedRegistered(url);
    }
}
```

源码位置: `org.apache.dubbo.registry.zookeeper.ZookeeperRegistry#doRegister`

```java
@Override
public void doRegister(URL url) {
    try {
        checkDestroyed();
        // 创建 zookeeper 临时节点， 路径为 /dubbo/${interfaceName}/providers/
        zkClient.create(toUrlPath(url), url.getParameter(DYNAMIC_KEY, true), true);
    } catch (Throwable e) {
        throw new RpcException(&#34;Failed to register &#34; &#43; url &#43; &#34; to zookeeper &#34; &#43; getUrl() &#43; &#34;, cause: &#34; &#43; e.getMessage(), e);
    }
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/07-%E5%AF%BC%E5%87%BA%E6%9C%8D%E5%8A%A1%E6%8E%A5%E5%8F%A3%E7%BA%A7%E5%88%AB/  

