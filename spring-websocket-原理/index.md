# Spring Websocket 原理


## 使用示例

[例子来自于官网](https://docs.spring.io/spring-framework/docs/5.3.31/reference/html/web.html#websocket-server-handler)

```java
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(myHandler(), &#34;/myHandler&#34;);
    }

    @Bean
    public WebSocketHandler myHandler() {
        return new MyHandler();
    }
}
```

&gt; 说明： &lt;br/&gt;
&gt; 1. `WebSocketConfigurer` 配置 `websocket`。 &lt;br/&gt;
&gt; 2. `WebSocketHandler` 处理 `websocket` 的连接。 &lt;br/&gt;

## WebSocketServletAutoConfiguration

&gt; 添加了 tomcat 对 websocket 的支持，也就是 WsSci。

源码位置: `org.springframework.boot.autoconfigure.websocket.servlet.WebSocketServletAutoConfiguration`

```java
@ConditionalOnWebApplication(type = Type.SERVLET)
@AutoConfigureBefore(ServletWebServerFactoryAutoConfiguration.class)
public class WebSocketServletAutoConfiguration {

	@Configuration(proxyBeanMethods = false)
	@ConditionalOnClass({ Tomcat.class, WsSci.class })
	static class TomcatWebSocketConfiguration {

		@Bean
		@ConditionalOnMissingBean(name = &#34;websocketServletWebServerCustomizer&#34;)
		TomcatWebSocketServletWebServerCustomizer websocketServletWebServerCustomizer() {
			return new TomcatWebSocketServletWebServerCustomizer();
		}
	}
	...
}
```

## @EnableWebSocket

&gt; 最关键的配置入口。

源码位置: `org.springframework.web.socket.config.annotation.EnableWebSocket`

```java
// 导入 websocket 配置类, 父类为 WebSocketConfigurationSupport
@Import(DelegatingWebSocketConfiguration.class)
public @interface EnableWebSocket {
}
```

源码位置: `org.springframework.web.socket.config.annotation.WebSocketConfigurationSupport`

```java
public class WebSocketConfigurationSupport {

    // 注册 WebSocketHandlerMapping
	@Bean
	public HandlerMapping webSocketHandlerMapping(@Nullable TaskScheduler defaultSockJsTaskScheduler) {
	    // 初始化 registry
		ServletWebSocketHandlerRegistry registry = initHandlerRegistry();
		...
		// 很重要, 后面继续解析
		return registry.getHandlerMapping();
	}

	private ServletWebSocketHandlerRegistry initHandlerRegistry() {
		if (this.handlerRegistry == null) {
			this.handlerRegistry = new ServletWebSocketHandlerRegistry();
			// 由子类 DelegatingWebSocketConfiguration 来实现
			registerWebSocketHandlers(this.handlerRegistry);
		}
		return this.handlerRegistry;
	}
}
```

源码位置: `org.springframework.web.socket.config.annotation.ServletWebSocketHandlerRegistry#getHandlerMapping`

```java
public AbstractHandlerMapping getHandlerMapping() {
    Map&lt;String, Object&gt; urlMap = new LinkedHashMap&lt;&gt;();
    // 遍历所有的 websocket 的配置
    for (ServletWebSocketHandlerRegistration registration : this.registrations) {
        // HttpRequestHandler 实现类为 WebSocketHttpRequestHandler，负责处理 websocket 请求, 很重要
        MultiValueMap&lt;HttpRequestHandler, String&gt; mappings = registration.getMappings();
        mappings.forEach((httpHandler, patterns) -&gt; {
            for (String pattern : patterns) {
                urlMap.put(pattern, httpHandler);
            }
        });
    }
    // WebSocketHandlerMapping 负责拦截 websocket 的 url，然后由 WebSocketHttpRequestHandler 处理请求
    WebSocketHandlerMapping hm = new WebSocketHandlerMapping();
    hm.setUrlMap(urlMap);
    hm.setOrder(this.order);
    if (this.urlPathHelper != null) {
        hm.setUrlPathHelper(this.urlPathHelper);
    }
    return hm;
}
```

## WebSocketHttpRequestHandler 处理 websocket 请求

源码位置: `org.springframework.web.socket.server.support.WebSocketHttpRequestHandler#handleRequest`

```java
@Override
public void handleRequest(HttpServletRequest servletRequest, HttpServletResponse servletResponse)
        throws ServletException, IOException {
    ...
    try {
        ...
        // 执行 HandshakeInterceptor#beforeHandshake 方法
        if (!chain.applyBeforeHandshake(request, response, attributes)) {
            return;
        }
        // 执行 websocket 握手, 最终会调用 TomcatRequestUpgradeStrategy#upgradeInternal
        this.handshakeHandler.doHandshake(request, response, this.wsHandler, attributes);
        // 执行 HandshakeInterceptor#afterHandshake 方法
        chain.applyAfterHandshake(request, response, null);
    }
    catch (HandshakeFailureException ex) {
        failure = ex;
    }
    catch (Exception ex) {
        failure = new HandshakeFailureException(&#34;Uncaught failure for request &#34; &#43; request.getURI(), ex);
    }
    finally {
        ...
    }
}
```



---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/spring-websocket-%E5%8E%9F%E7%90%86/  

