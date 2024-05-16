# Spring Boot 启动流程


&gt; `spring boot` 启动流程必须懂。

启动类示例:

```java
@SpringBootApplication
public class HiApplication {

    public static void main(String[] args) {
        // 先执行 SpringApplication 的构造方法，然后执行 run 方法
        SpringApplication.run(HiApplication.class, args);
    }
}
```

## SpringApplication#run

源码位置: `org.springframework.boot.SpringApplication#SpringApplication`

```java
// SpringApplication 的构造方法
public SpringApplication(ResourceLoader resourceLoader, Class&lt;?&gt;... primarySources) {
    ... 
    // 决定 web 类型，如 servlet, reactive
    this.webApplicationType = WebApplicationType.deduceFromClasspath();
    // 加载 BootstrapRegistryInitializer 扩展
    this.bootstrapRegistryInitializers = new ArrayList&lt;&gt;(
            getSpringFactoriesInstances(BootstrapRegistryInitializer.class));
    // 加载 ApplicationContextInitializer 扩展
    setInitializers((Collection) getSpringFactoriesInstances(ApplicationContextInitializer.class));
    // 加载 ApplicationListener 扩展，这个很重要
    setListeners((Collection) getSpringFactoriesInstances(ApplicationListener.class));
    this.mainApplicationClass = deduceMainApplicationClass();
}
```

源码位置: `org.springframework.boot.SpringApplication#run`

```java
public ConfigurableApplicationContext run(String... args) {
    long startTime = System.nanoTime();
    // 会执行 BootstrapRegistryInitializer#initialize 方法
    DefaultBootstrapContext bootstrapContext = createBootstrapContext();
    ConfigurableApplicationContext context = null;
    configureHeadlessProperty();
    // 加载 SpringApplicationRunListener 扩展
    SpringApplicationRunListeners listeners = getRunListeners(args);
    // 执行 SpringApplicationRunListener#starting 方法
    listeners.starting(bootstrapContext, this.mainApplicationClass);
    try {
        ApplicationArguments applicationArguments = new DefaultApplicationArguments(args);
        // 准备 environment, 后面继续解析
        ConfigurableEnvironment environment = prepareEnvironment(listeners, bootstrapContext, applicationArguments);
        configureIgnoreBeanInfo(environment);
        // 打印 banner
        Banner printedBanner = printBanner(environment);
        // 创建 applicationContext, 后面继续解析
        context = createApplicationContext();
        context.setApplicationStartup(this.applicationStartup);
        // 准备 context, 后面继续解析
        prepareContext(bootstrapContext, context, environment, listeners, applicationArguments, printedBanner);
        // 刷新 context, 后面继续解析
        refreshContext(context);
        // 空实现 
        afterRefresh(context, applicationArguments);
        ...
        // 执行 SpringApplicationRunListener#started 方法
        listeners.started(context, timeTakenToStartup);
        // 执行 ApplicationRunner 和 CommandLineRunner 
        callRunners(context, applicationArguments);
    }
    catch (Throwable ex) {
        // 执行 SpringApplicationRunListener#failed 方法
        handleRunFailure(context, ex, listeners);
        throw new IllegalStateException(ex);
    }
    try {
        Duration timeTakenToReady = Duration.ofNanos(System.nanoTime() - startTime);
        // 执行 SpringApplicationRunListener#ready 方法
        listeners.ready(context, timeTakenToReady);
    }
    catch (Throwable ex) {
        // 执行 SpringApplicationRunListener#failed 方法
        handleRunFailure(context, ex, null);
        throw new IllegalStateException(ex);
    }
    return context;
}
```

## prepareEnvironment 准备环境

源码位置: `org.springframework.boot.SpringApplication#prepareEnvironment`

```java
private ConfigurableEnvironment prepareEnvironment(SpringApplicationRunListeners listeners,
        DefaultBootstrapContext bootstrapContext, ApplicationArguments applicationArguments) {
    // 根据 webType 来创建环境
    ConfigurableEnvironment environment = getOrCreateEnvironment();
    // 环境中添加默认配置和命令行配置
    configureEnvironment(environment, applicationArguments.getSourceArgs());
    // 没干啥事, 不重要
    ConfigurationPropertySources.attach(environment);
    // 执行 SpringApplicationRunListener#environmentPrepared 方法
    listeners.environmentPrepared(bootstrapContext, environment);
    // 默认配置移到最后
    DefaultPropertiesPropertySource.moveToEnd(environment);
    Assert.state(!environment.containsProperty(&#34;spring.main.environment-prefix&#34;),
            &#34;Environment prefix cannot be set via properties.&#34;);
    // 绑定 spring.main 的属性到 SpringApplication
    bindToSpringApplication(environment);
    if (!this.isCustomEnvironment) {
        environment = convertEnvironment(environment);
    }
    // 没干啥事, 不重要
    ConfigurationPropertySources.attach(environment);
    return environment;
}
```

## createApplicationContext 创建上下文

源码位置: `org.springframework.boot.SpringApplication#createApplicationContext`

```java
protected ConfigurableApplicationContext createApplicationContext() {
    // 根据 webType 来创建 applicationContext
    return this.applicationContextFactory.create(this.webApplicationType);
}
```

源码位置: `org.springframework.boot.web.servlet.context.AnnotationConfigServletWebServerApplicationContext.Factory#create`

```java
// 根据 webType 来创建 applicationContext
@Override
public ConfigurableApplicationContext create(WebApplicationType webApplicationType) {
    return (webApplicationType != WebApplicationType.SERVLET) ? null
            : new AnnotationConfigServletWebServerApplicationContext();
}

// 构造函数
public AnnotationConfigServletWebServerApplicationContext() {
    // 非常重要，构造方法中注册了 ConfigurationClassPostProcessor，AutowiredAnnotationBeanPostProcessor
    this.reader = new AnnotatedBeanDefinitionReader(this);
    // 非常重要，扫描方法 ClassPathBeanDefinitionScanner#scan
    this.scanner = new ClassPathBeanDefinitionScanner(this);
}
```

## prepareContext 准备上下文

源码位置: `org.springframework.boot.SpringApplication#prepareContext`

```java
private void prepareContext(DefaultBootstrapContext bootstrapContext, ConfigurableApplicationContext context,
        ConfigurableEnvironment environment, SpringApplicationRunListeners listeners,
        ApplicationArguments applicationArguments, Banner printedBanner) {
    // 设置环境
    context.setEnvironment(environment);
    // 设置 beanNameGenerator，resourceLoader，conversionService
    postProcessApplicationContext(context);
    // 执行 ApplicationContextInitializer#initialize
    applyInitializers(context);
    // 执行 SpringApplicationRunListener#contextPrepared 方法
    listeners.contextPrepared(context);
    // 发布 BootstrapContextClosedEvent 事件，不重要
    bootstrapContext.close(context);
    ...
    // lazy 初始化 bean
    if (this.lazyInitialization) {
        context.addBeanFactoryPostProcessor(new LazyInitializationBeanFactoryPostProcessor());
    }
    // 不重要
    context.addBeanFactoryPostProcessor(new PropertySourceOrderingBeanFactoryPostProcessor(context));
    // Load the sources
    Set&lt;Object&gt; sources = getAllSources();
    Assert.notEmpty(sources, &#34;Sources must not be empty&#34;);
    // 加载启动类, 这样启动类就会作为一个 bean, 会被 ConfigurationClassPostProcessor 处理
    load(context, sources.toArray(new Object[0]));
    // 执行 SpringApplicationRunListener#contextLoaded 方法
    listeners.contextLoaded(context);
}
```

## refreshContext 刷新上下文

源码位置: `org.springframework.boot.SpringApplication#refreshContext`

```java
private void refreshContext(ConfigurableApplicationContext context) {
    // 注册 shutdown 钩子
    if (this.registerShutdownHook) {
        shutdownHook.registerApplicationContext(context);
    }
    // 刷新, 实现类为 ServletWebServerApplicationContext
    refresh(context);
}
```

源码位置: `org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext#refresh`

```java
@Override
public final void refresh() throws BeansException, IllegalStateException {
    try {
        // 父类为 AbstractApplicationContext
        super.refresh();
    }
    catch (RuntimeException ex) {
        WebServer webServer = this.webServer;
        if (webServer != null) {
            webServer.stop();
        }
        throw ex;
    }
}
```

源码位置: `org.springframework.context.support.AbstractApplicationContext#refresh`

```java
@Override
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        ...
        // 初始化 ServletPropertySources 
        prepareRefresh();
        // 做一些准备操作，如忽略依赖接口，注册可解析的依赖, 注册默认的Bean
        prepareBeanFactory(beanFactory);
        try {
            // 子类实现为 AnnotationConfigServletWebServerApplicationContext
            // 读取和扫描 beanDefinition(spring boot 没有用)
            postProcessBeanFactory(beanFactory);

            // 执行 BeanFactoryPostProcessor (按照 PriorityOrdered，Ordered，nonOrdered)，不解析
            // 里面会用到 ConfigurationClassPostProcessor 扫描启动类
            invokeBeanFactoryPostProcessors(beanFactory);

            // 注册 BeanPostProcessor (按照 PriorityOrdered，Ordered，nonOrdered)，不解析
            registerBeanPostProcessors(beanFactory);

            // 注册 MessageSource（国际化）不用关心
            initMessageSource();

            // 注册 ApplicationEventMulticaster
            initApplicationEventMulticaster();

            // 子类实现为 AnnotationConfigServletWebServerApplicationContext
            // 创建了 servlet 容器
            onRefresh();

            // 注册 ApplicationListener
            registerListeners();

            // 初始化 beanFactory, 初始化 non-lazy-init bean, 非常重要，会在【bean 初始化】章节解析
            finishBeanFactoryInitialization(beanFactory);

            // 执行 LifecycleProcessor#onRefresh 方法，发布 ContextRefreshedEvent 事件
            finishRefresh();
        }
        catch (BeansException ex) {
            ...
        } finally {
            ...
        }
    }
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/spring-boot-%E5%90%AF%E5%8A%A8%E6%B5%81%E7%A8%8B/  

