---
title: 适配多种 servlet 容器
date: 2024-05-16T08:00:00+08:00
draft: false
tags: [ spring boot, source code,源码分析 spring boot 系列 ]
collections: [ 源码分析 spring boot 系列 ]
---

## 自动配置类

源码位置: `org.springframework.boot.autoconfigure.web.servlet.ServletWebServerFactoryAutoConfiguration`

```java
// 导入 tomcat，jetty，undertow 的配置
@Import({ ServletWebServerFactoryAutoConfiguration.BeanPostProcessorsRegistrar.class,
		ServletWebServerFactoryConfiguration.EmbeddedTomcat.class,
		ServletWebServerFactoryConfiguration.EmbeddedJetty.class,
		ServletWebServerFactoryConfiguration.EmbeddedUndertow.class })
public class ServletWebServerFactoryAutoConfiguration {

	@Bean
	public ServletWebServerFactoryCustomizer servletWebServerFactoryCustomizer(ServerProperties serverProperties,
			ObjectProvider<WebListenerRegistrar> webListenerRegistrars,
			ObjectProvider<CookieSameSiteSupplier> cookieSameSiteSuppliers) {
	    // 配置 serverProperties
		return new ServletWebServerFactoryCustomizer(serverProperties,
				webListenerRegistrars.orderedStream().collect(Collectors.toList()),
				cookieSameSiteSuppliers.orderedStream().collect(Collectors.toList()));
	}
	...
}
```

## 创建 webServer

源码位置: `org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext#onRefresh`

```java
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
private void createWebServer() {
    WebServer webServer = this.webServer;
    ServletContext servletContext = getServletContext();
    if (webServer == null && servletContext == null) {
        // 获取 ServletWebServerFactory (在自动配置类中)
        ServletWebServerFactory factory = getWebServerFactory();
        // 创建 webServer
        this.webServer = factory.getWebServer(getSelfInitializer());
        ...
	    // 会执行回调来执行 webServer#start 方法
        getBeanFactory().registerSingleton("webServerStartStop",
                new WebServerStartStopLifecycle(this, this.webServer));
    }
    ... 
}
```
