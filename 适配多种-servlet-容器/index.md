# 适配多种 Servlet 容器


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
			ObjectProvider&lt;WebListenerRegistrar&gt; webListenerRegistrars,
			ObjectProvider&lt;CookieSameSiteSupplier&gt; cookieSameSiteSuppliers) {
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
        throw new ApplicationContextException(&#34;Unable to start web server&#34;, ex);
    }
}
```

源码位置: `org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext#createWebServer`

```java
private void createWebServer() {
    WebServer webServer = this.webServer;
    ServletContext servletContext = getServletContext();
    if (webServer == null &amp;&amp; servletContext == null) {
        // 获取 ServletWebServerFactory (在自动配置类中)
        ServletWebServerFactory factory = getWebServerFactory();
        // 创建 webServer
        this.webServer = factory.getWebServer(getSelfInitializer());
        ...
	    // 会执行回调来执行 webServer#start 方法
        getBeanFactory().registerSingleton(&#34;webServerStartStop&#34;,
                new WebServerStartStopLifecycle(this, this.webServer));
    }
    ... 
}
```


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E9%80%82%E9%85%8D%E5%A4%9A%E7%A7%8D-servlet-%E5%AE%B9%E5%99%A8/  

