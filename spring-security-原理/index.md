# Spring Security 原理


&gt; `spring security` 的代码比较难，之前我在 `ProcessOn` 上做了[源码导读](https://www.processon.com/view/62444e46f346fb072d1b1e16)，所以这里只说**关键点**。

## 理解关键点

1. 认证的逻辑有多个 `filter` 来完成，常用的 `filter` 如 `UsernamePasswordAuthenticationFilter`， `RememberMeAuthenticationFilter`。
2. 认证成功，就会生成 `Authentication` 对象，可以从 `SecurityContextHolder` 获取。
3. 有两个核心配置类，`HttpSecurity` 和 `WebSecurity`，这两个都是用来配置 `springSecurityFilterChain`，只不过**暴露的方法不一样**。

## 关键代码

&gt; 第一步执行下面方法，添加 SecurityConfigurer。

源码位置: `org.springframework.security.config.annotation.web.configuration.WebSecurityConfiguration#setFilterChainProxySecurityConfigurer`

```java
@Autowired(required = false)
public void setFilterChainProxySecurityConfigurer(ObjectPostProcessor&lt;Object&gt; objectPostProcessor,
        @Value(&#34;#{@autowiredWebSecurityConfigurersIgnoreParents.getWebSecurityConfigurers()}&#34;) List&lt;SecurityConfigurer&lt;Filter, WebSecurity&gt;&gt; webSecurityConfigurers)
        throws Exception {
    // 初始化 webSecurity, objectPostProcessor 是 AutowireBeanFactoryObjectPostProcessor 类
    this.webSecurity = objectPostProcessor.postProcess(new WebSecurity(objectPostProcessor));
    // 配置 debug，在开发阶段建议开启
    if (this.debugEnabled != null) {
        this.webSecurity.debug(this.debugEnabled);
    }
    ...
    // 添加 SecurityConfigurer（我们实现的 WebSecurityConfigurerAdapter 就是这类）
    for (SecurityConfigurer&lt;Filter, WebSecurity&gt; webSecurityConfigurer : webSecurityConfigurers) {
        this.webSecurity.apply(webSecurityConfigurer);
    }
    this.webSecurityConfigurers = webSecurityConfigurers;
}
```

&gt; 第二步执行 `build`，构建 `filter`。

源码位置: `org.springframework.security.config.annotation.web.configuration.WebSecurityConfiguration#springSecurityFilterChain`

```java
@Bean(name = AbstractSecurityWebApplicationInitializer.DEFAULT_FILTER_NAME)
public Filter springSecurityFilterChain() throws Exception {
    ...
    // 添加 securityFilterChain, 默认为空
    for (SecurityFilterChain securityFilterChain : this.securityFilterChains) {
        this.webSecurity.addSecurityFilterChainBuilder(() -&gt; securityFilterChain);
        for (Filter filter : securityFilterChain.getFilters()) {
            if (filter instanceof FilterSecurityInterceptor) {
                this.webSecurity.securityInterceptor((FilterSecurityInterceptor) filter);
                break;
            }
        }
    }
    // 默认为空
    for (WebSecurityCustomizer customizer : this.webSecurityCustomizers) {
        customizer.customize(this.webSecurity);
    }
    // 执行 build 方法，里面就会执行 SecurityConfigurer#configure 方法，关键点
    return this.webSecurity.build();
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/spring-security-%E5%8E%9F%E7%90%86/  

