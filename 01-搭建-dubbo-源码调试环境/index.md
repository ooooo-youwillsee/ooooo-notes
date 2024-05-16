# 01 搭建 Dubbo 源码调试环境


&gt; dubbo 基于 3.2.6 版本

&gt; 源码分析，主要介绍**服务级别的注册和发现**，所以我们需要设置下参数来启用。
&gt; 选取 `dubbo-demo-api` 模块作为示例。

## provider 示例程序

```java
public class Application {

    private static final String REGISTRY_URL = &#34;zookeeper://127.0.0.1:2181&#34;;

    public static void main(String[] args) {
        startWithBootstrap();
    }

    private static void startWithBootstrap() {
        ServiceConfig&lt;DemoServiceImpl&gt; service = new ServiceConfig&lt;&gt;();
        service.setInterface(DemoService.class);
        service.setRef(new DemoServiceImpl());

        RegistryConfig registryConfig = new RegistryConfig(REGISTRY_URL);
        // 注册类型为 service
        registryConfig.setParameters(Collections.singletonMap(RegistryConstants.REGISTRY_TYPE_KEY, RegistryConstants.SERVICE_REGISTRY_TYPE));

        DubboBootstrap bootstrap = DubboBootstrap.getInstance();
        bootstrap.application(new ApplicationConfig(&#34;dubbo-demo-api-provider&#34;))
            .registry(registryConfig)
            .protocol(new ProtocolConfig(CommonConstants.DUBBO, -1))
            .service(service)
            .start()
            .await();
    }
}
```

## consumer 示例程序

```java
public class Application {

    private static final String REGISTRY_URL = &#34;zookeeper://127.0.0.1:2181&#34;;

    public static void main(String[] args) {
            runWithBootstrap();
    }

    private static void runWithBootstrap() {
        ReferenceConfig&lt;DemoService&gt; reference = new ReferenceConfig&lt;&gt;();
        reference.setInterface(DemoService.class);
        reference.setGeneric(&#34;true&#34;);

        RegistryConfig registryConfig = new RegistryConfig(REGISTRY_URL);
        // 注册类型为 service
        registryConfig.setParameters(Collections.singletonMap(RegistryConstants.REGISTRY_TYPE_KEY, RegistryConstants.SERVICE_REGISTRY_TYPE));

        DubboBootstrap bootstrap = DubboBootstrap.getInstance();
        bootstrap.application(new ApplicationConfig(&#34;dubbo-demo-api-consumer&#34;))
            .registry(registryConfig)
            .protocol(new ProtocolConfig(CommonConstants.DUBBO, -1))
            .reference(reference)
            .start();

        DemoService demoService = bootstrap.getCache().get(reference);
        String message = demoService.sayHello(&#34;dubbo&#34;);
        System.out.println(message);

        // generic invoke
        GenericService genericService = (GenericService) demoService;
        Object genericInvokeResult = genericService.$invoke(&#34;sayHello&#34;, new String[]{String.class.getName()},
            new Object[]{&#34;dubbo generic invoke&#34;});
        System.out.println(genericInvokeResult.toString());
    }
}
```



---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/01-%E6%90%AD%E5%BB%BA-dubbo-%E6%BA%90%E7%A0%81%E8%B0%83%E8%AF%95%E7%8E%AF%E5%A2%83/  

