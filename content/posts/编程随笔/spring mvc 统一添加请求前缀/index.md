---
title: spring mvc 统一添加请求前缀
date: 2025-12-14T08:00:00+08:00
draft: false
tags: [spring mvc]
collections: [随笔]
---


## 解决方法

```java
@Configuration
public class WebMvcPrefixConfig implements WebMvcConfigurer {

    // 全局前缀（所有 Controller）
    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        // 添加统一前缀 /api/v2
        configurer.addPathPrefix("/api/v2", clazz -> true);
        // 若需仅对特定包下的 Controller 加前缀：
        // configurer.addPathPrefix("/api/v2", clazz -> clazz.getPackageName().startsWith("com.example.controller.api"));
    }

    // （可选）方案 2.2：自定义 HandlerMapping（进阶，可兼容更多场景）
    @Bean
    public RequestMappingHandlerMapping requestMappingHandlerMapping() {
        RequestMappingHandlerMapping handlerMapping = new RequestMappingHandlerMapping();
        // 设置全局前缀
        handlerMapping.setPrefix("/api/v2");
        return handlerMapping;
    }
}
```