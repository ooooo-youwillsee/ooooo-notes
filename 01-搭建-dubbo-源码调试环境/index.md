# 01 搭建 dubbo 源码调试环境


> dubbo 基于 3.2.6 版本

> 源码分析，主要介绍**服务级别的注册和发现**，所以我们需要设置下参数来启用。
> 选取 `dubbo-demo-api` 模块作为示例。

## provider 示例程序

```java
public class Application {

    private static final String REGISTRY_URL = "zookeeper://127.0.0.1:2181";

    public static void main(String[] args) {
        startWithBootstrap();
    }

    private static void startWithBootstrap() {
        ServiceConfig<DemoServiceImpl> service = new ServiceConfig<>();
        service.setInterface(DemoService.class);
        service.setRef(new DemoServiceImpl());

        RegistryConfig registryConfig = new RegistryConfig(REGISTRY_URL);
        // 注册类型为 service
        registryConfig.setParameters(Collections.singletonMap(RegistryConstants.REGISTRY_TYPE_KEY, RegistryConstants.SERVICE_REGISTRY_TYPE));

        DubboBootstrap bootstrap = DubboBootstrap.getInstance();
        bootstrap.application(new ApplicationConfig("dubbo-demo-api-provider"))
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

    private static final String REGISTRY_URL = "zookeeper://127.0.0.1:2181";

    public static void main(String[] args) {
            runWithBootstrap();
    }

    private static void runWithBootstrap() {
        ReferenceConfig<DemoService> reference = new ReferenceConfig<>();
        reference.setInterface(DemoService.class);
        reference.setGeneric("true");

        RegistryConfig registryConfig = new RegistryConfig(REGISTRY_URL);
        // 注册类型为 service
        registryConfig.setParameters(Collections.singletonMap(RegistryConstants.REGISTRY_TYPE_KEY, RegistryConstants.SERVICE_REGISTRY_TYPE));

        DubboBootstrap bootstrap = DubboBootstrap.getInstance();
        bootstrap.application(new ApplicationConfig("dubbo-demo-api-consumer"))
            .registry(registryConfig)
            .protocol(new ProtocolConfig(CommonConstants.DUBBO, -1))
            .reference(reference)
            .start();

        DemoService demoService = bootstrap.getCache().get(reference);
        String message = demoService.sayHello("dubbo");
        System.out.println(message);

        // generic invoke
        GenericService genericService = (GenericService) demoService;
        Object genericInvokeResult = genericService.$invoke("sayHello", new String[]{String.class.getName()},
            new Object[]{"dubbo generic invoke"});
        System.out.println(genericInvokeResult.toString());
    }
}
```


