---
title: spring websocket 原理
date: 2024-05-18T08:00:00+08:00
draft: false
tags: [ spring boot, source code,源码分析 spring boot 系列 ]
collections: [ 源码分析 spring boot 系列 ]
---

## 使用示例

[例子来自于官网](https://docs.spring.io/spring-framework/docs/5.3.31/reference/html/web.html#websocket-server-handler)

```java
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(myHandler(), "/myHandler");
    }

    @Bean
    public WebSocketHandler myHandler() {
        return new MyHandler();
    }
}
```

> 说明： <br/>
> 1. `WebSocketConfigurer` 配置 `websocket`。 <br/>
> 2. `WebSocketHandler` 处理 `websocket` 的连接。 <br/>

## WebSocketServletAutoConfiguration

> 添加了 tomcat 对 websocket 的支持，也就是 WsSci。

源码位置: `org.springframework.boot.autoconfigure.websocket.servlet.WebSocketServletAutoConfiguration`

```java
@ConditionalOnWebApplication(type = Type.SERVLET)
@AutoConfigureBefore(ServletWebServerFactoryAutoConfiguration.class)
public class WebSocketServletAutoConfiguration {

	@Configuration(proxyBeanMethods = false)
	@ConditionalOnClass({ Tomcat.class, WsSci.class })
	static class TomcatWebSocketConfiguration {

		@Bean
		@ConditionalOnMissingBean(name = "websocketServletWebServerCustomizer")
		TomcatWebSocketServletWebServerCustomizer websocketServletWebServerCustomizer() {
			return new TomcatWebSocketServletWebServerCustomizer();
		}
	}
	...
}
```

## @EnableWebSocket

> 最关键的配置入口。

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
    Map<String, Object> urlMap = new LinkedHashMap<>();
    // 遍历所有的 websocket 的配置
    for (ServletWebSocketHandlerRegistration registration : this.registrations) {
        // HttpRequestHandler 实现类为 WebSocketHttpRequestHandler，负责处理 websocket 请求, 很重要
        MultiValueMap<HttpRequestHandler, String> mappings = registration.getMappings();
        mappings.forEach((httpHandler, patterns) -> {
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
        failure = new HandshakeFailureException("Uncaught failure for request " + request.getURI(), ex);
    }
    finally {
        ...
    }
}
```

