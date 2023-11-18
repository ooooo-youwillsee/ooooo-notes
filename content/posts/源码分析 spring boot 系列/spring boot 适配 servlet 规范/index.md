---
title: spring boot 适配 servlet 规范
date: 2023-11-18T08:00:00+08:00
draft: false
tags: [ spring boot, source code,源码分析 spring boot 系列 ]
categories: [ 源码分析 spring boot 系列 ]
---


> 在 `spring boot` 中，只需要创建一个 `bean` 实现 `filter` 接口，`spring boot` 就会把这个 `filter` 加入到 `servlet` 容器中。
> 在实际使用中，常用的接口就是 `OncePerRequestFilter` 和 `OrderedFilter`, 所以来看看 `spring boot` 是如何适配 `servlet` 规范。

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
      throw new ApplicationContextException("Unable to start web server", ex);
  }
}
```

源码位置: `org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext#createWebServer`

```java
// 创建 webServer
private void createWebServer() {
  WebServer webServer = this.webServer;
  ServletContext servletContext = getServletContext();
  if (webServer == null && servletContext == null) {
    StartupStep createWebServer = this.getApplicationStartup().start("spring.boot.webserver.create");
    // 获取工厂类，比如有 tomcat，jetty 的实现, 这个省略了。
    ServletWebServerFactory factory = getWebServerFactory();
    createWebServer.tag("factory", factory.getClass().toString());
    // 创建 webServer，重点看这个
    this.webServer = factory.getWebServer(getSelfInitializer());
    createWebServer.end();
    // 注册钩子
    getBeanFactory().registerSingleton("webServerGracefulShutdown",
        new WebServerGracefulShutdownLifecycle(this.webServer));
    getBeanFactory().registerSingleton("webServerStartStop",
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
protected Collection<ServletContextInitializer> getServletContextInitializerBeans() {
  return new ServletContextInitializerBeans(getBeanFactory());
}
```

## ServletContextInitializerBeans 适配器

源码位置: `org.springframework.boot.web.servlet.ServletContextInitializerBeans#ServletContextInitializerBeans`

```java
// ServletContextInitializerBeans 的构造函数
public ServletContextInitializerBeans(ListableBeanFactory beanFactory,
    Class<? extends ServletContextInitializer>... initializerTypes) {
  this.initializers = new LinkedMultiValueMap<>();
  this.initializerTypes = (initializerTypes.length != 0) ? Arrays.asList(initializerTypes)
      : Collections.singletonList(ServletContextInitializer.class);
  // 适配 filter，servlet，listener，很重要
  addServletContextInitializerBeans(beanFactory);
  // 适配 filter，servlet，很重要
  addAdaptableBeans(beanFactory);
  // 排序 ServletContextInitializer
  List<ServletContextInitializer> sortedInitializers = this.initializers.values().stream()
      .flatMap((value) -> value.stream().sorted(AnnotationAwareOrderComparator.INSTANCE))
      .collect(Collectors.toList());
  this.sortedList = Collections.unmodifiableList(sortedInitializers);
  logMappings(this.initializers);
}
```

源码位置: `org.springframework.boot.web.servlet.ServletContextInitializerBeans#addServletContextInitializerBeans`

```java
// 适配 filter，servlet，listener
private void addServletContextInitializerBeans(ListableBeanFactory beanFactory) {
  for (Class<? extends ServletContextInitializer> initializerType : this.initializerTypes) {
    for (Entry<String, ? extends ServletContextInitializer> initializerBean : getOrderedBeansOfType(beanFactory,
        initializerType)) {
      addServletContextInitializerBean(initializerBean.getKey(), initializerBean.getValue(), beanFactory);
    }
  }
}

private void addServletContextInitializerBean(String beanName, ServletContextInitializer initializer,
    ListableBeanFactory beanFactory) {
  // 适配 servlet
  if (initializer instanceof ServletRegistrationBean) {
    Servlet source = ((ServletRegistrationBean<?>) initializer).getServlet();
    addServletContextInitializerBean(Servlet.class, beanName, initializer, beanFactory, source);
  }
  // 适配 filter
  else if (initializer instanceof FilterRegistrationBean) {
    Filter source = ((FilterRegistrationBean<?>) initializer).getFilter();
    addServletContextInitializerBean(Filter.class, beanName, initializer, beanFactory, source);
  }
  // 适配 filter
  else if (initializer instanceof DelegatingFilterProxyRegistrationBean) {
    String source = ((DelegatingFilterProxyRegistrationBean) initializer).getTargetBeanName();
    addServletContextInitializerBean(Filter.class, beanName, initializer, beanFactory, source);
  }
  // 适配 listener
  else if (initializer instanceof ServletListenerRegistrationBean) {
    EventListener source = ((ServletListenerRegistrationBean<?>) initializer).getListener();
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
  for (Class<?> listenerType : ServletListenerRegistrationBean.getSupportedTypes()) {
    addAsRegistrationBean(beanFactory, EventListener.class, (Class<EventListener>) listenerType,
        new ServletListenerRegistrationBeanAdapter());
  }
}
```
