# 适配 Servlet 规范



&gt; 在 `spring boot` 中，只需要创建一个 `bean` 实现 `filter` 接口，`spring boot` 就会把这个 `filter` 加入到 `servlet` 容器中。
&gt; 在实际使用中，常用的接口就是 `OncePerRequestFilter` 和 `OrderedFilter`, 所以来看看 `spring boot` 是如何适配 `servlet` 规范。

## 创建 WebServer

源码位置: `org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext#onRefresh`

```java
// 在 spring 容器刷新时，会调用此方法
@Override
protected void onRefresh() {
    super.onRefresh();
    try {
        // 创建 webServer
        createWebServer();
    }
    catch (Throwable ex) {
        throw new ApplicationContextException(&#34;Unable to start web server&#34;, ex);
    }
}
```

源码位置: `org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext#createWebServer`

```java
// 创建 webServer
private void createWebServer() {
    WebServer webServer = this.webServer;
    ServletContext servletContext = getServletContext();
    if (webServer == null &amp;&amp; servletContext == null) {
        StartupStep createWebServer = this.getApplicationStartup().start(&#34;spring.boot.webserver.create&#34;);
        // 获取工厂类，比如有 tomcat，jetty 的实现, 这个省略了。
        ServletWebServerFactory factory = getWebServerFactory();
        createWebServer.tag(&#34;factory&#34;, factory.getClass().toString());
        // 创建 webServer，重点看这个
        this.webServer = factory.getWebServer(getSelfInitializer());
        createWebServer.end();
        // 注册钩子
        getBeanFactory().registerSingleton(&#34;webServerGracefulShutdown&#34;,
            new WebServerGracefulShutdownLifecycle(this.webServer));
        getBeanFactory().registerSingleton(&#34;webServerStartStop&#34;,
            new WebServerStartStopLifecycle(this, this.webServer));
    }
    ...
}
```

源码位置: `org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext#getSelfInitializer`

```java
// 获取 ServletContextInitializer
private org.springframework.boot.web.servlet.ServletContextInitializer getSelfInitializer() {
    return this::selfInitialize;
}

private void selfInitialize(ServletContext servletContext) throws ServletException {
    prepareWebApplicationContext(servletContext);
    registerApplicationScope(servletContext);
    WebApplicationContextUtils.registerEnvironmentBeans(getBeanFactory(), servletContext);
    // 初始化 ServletContextInitializer, 里面就包括 filter，servlet，listener
    for (ServletContextInitializer beans : getServletContextInitializerBeans()) {
        beans.onStartup(servletContext);
    }
}

// ServletContextInitializerBeans 的构造方法很重要
protected Collection&lt;ServletContextInitializer&gt; getServletContextInitializerBeans() {
  return new ServletContextInitializerBeans(getBeanFactory());
}
```

## ServletContextInitializerBeans 适配器

源码位置: `org.springframework.boot.web.servlet.ServletContextInitializerBeans#ServletContextInitializerBeans`

```java
// ServletContextInitializerBeans 的构造函数
public ServletContextInitializerBeans(ListableBeanFactory beanFactory,
    Class&lt;? extends ServletContextInitializer&gt;... initializerTypes) {
    this.initializers = new LinkedMultiValueMap&lt;&gt;();
    this.initializerTypes = (initializerTypes.length != 0) ? Arrays.asList(initializerTypes)
        : Collections.singletonList(ServletContextInitializer.class);
    // 适配 filter，servlet，listener，很重要
    addServletContextInitializerBeans(beanFactory);
    // 适配 filter，servlet，很重要
    addAdaptableBeans(beanFactory);
    // 排序 ServletContextInitializer
    List&lt;ServletContextInitializer&gt; sortedInitializers = this.initializers.values().stream()
        .flatMap((value) -&gt; value.stream().sorted(AnnotationAwareOrderComparator.INSTANCE))
        .collect(Collectors.toList());
    this.sortedList = Collections.unmodifiableList(sortedInitializers);
    logMappings(this.initializers);
}
```

源码位置: `org.springframework.boot.web.servlet.ServletContextInitializerBeans#addServletContextInitializerBeans`

```java
// 适配 filter，servlet，listener
private void addServletContextInitializerBeans(ListableBeanFactory beanFactory) {
    for (Class&lt;? extends ServletContextInitializer&gt; initializerType : this.initializerTypes) {
        for (Entry&lt;String, ? extends ServletContextInitializer&gt; initializerBean : getOrderedBeansOfType(beanFactory,
            initializerType)) {
          addServletContextInitializerBean(initializerBean.getKey(), initializerBean.getValue(), beanFactory);
        }
    }
}

private void addServletContextInitializerBean(String beanName, ServletContextInitializer initializer,
    ListableBeanFactory beanFactory) {
    // 适配 servlet
    if (initializer instanceof ServletRegistrationBean) {
        Servlet source = ((ServletRegistrationBean&lt;?&gt;) initializer).getServlet();
        addServletContextInitializerBean(Servlet.class, beanName, initializer, beanFactory, source);
    }
    // 适配 filter
    else if (initializer instanceof FilterRegistrationBean) {
        Filter source = ((FilterRegistrationBean&lt;?&gt;) initializer).getFilter();
        addServletContextInitializerBean(Filter.class, beanName, initializer, beanFactory, source);
    }
    // 适配 filter
    else if (initializer instanceof DelegatingFilterProxyRegistrationBean) {
        String source = ((DelegatingFilterProxyRegistrationBean) initializer).getTargetBeanName();
        addServletContextInitializerBean(Filter.class, beanName, initializer, beanFactory, source);
    }
    // 适配 listener
    else if (initializer instanceof ServletListenerRegistrationBean) {
        EventListener source = ((ServletListenerRegistrationBean&lt;?&gt;) initializer).getListener();
        addServletContextInitializerBean(EventListener.class, beanName, initializer, beanFactory, source);
    }
    else {
        addServletContextInitializerBean(ServletContextInitializer.class, beanName, initializer, beanFactory,
            initializer);
    }
}
```

源码位置: `org.springframework.boot.web.servlet.ServletContextInitializerBeans#addAdaptableBeans`

```java
// 适配 filter，servlet
protected void addAdaptableBeans(ListableBeanFactory beanFactory) {
    MultipartConfigElement multipartConfig = getMultipartConfig(beanFactory);
    // 适配 servlet
    addAsRegistrationBean(beanFactory, Servlet.class, new ServletRegistrationBeanAdapter(multipartConfig));
    // 适配 filter
    addAsRegistrationBean(beanFactory, Filter.class, new FilterRegistrationBeanAdapter());
    for (Class&lt;?&gt; listenerType : ServletListenerRegistrationBean.getSupportedTypes()) {
        addAsRegistrationBean(beanFactory, EventListener.class, (Class&lt;EventListener&gt;) listenerType,
            new ServletListenerRegistrationBeanAdapter());
    }
}
```


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E9%80%82%E9%85%8D-servlet-%E8%A7%84%E8%8C%83/  

