---
title: spring mvc 请求流程
date: 2024-05-14T08:00:00+08:00
draft: false
tags: [ spring boot, source code,源码分析 spring boot 系列 ]
collections: [ 源码分析 spring boot 系列 ]
---

> `spring mvc` 原理真的必须懂, 之前写的[源码导读](https://www.processon.com/view/61a36f72e0b34d5e7fd8388c)。


## DispatcherServlet

源码位置: `org.springframework.web.servlet.DispatcherServlet#doDispatch`

```java
protected void doDispatch(HttpServletRequest request, HttpServletResponse response) throws Exception {
    ... 
    try {
        ...
        try {
            // 检查是否为文件上传
            processedRequest = checkMultipart(request);

            // 获取 HandlerMapping  
            mappedHandler = getHandler(processedRequest);
            if (mappedHandler == null) {
                // 40
                noHandlerFound(processedRequest, response);
                return;
            }
            // 获取 HandlerAdapter
            HandlerAdapter ha = getHandlerAdapter(mappedHandler.getHandler());
            ...
            // 执行 HandlerInterceptor#preHandle
            if (!mappedHandler.applyPreHandle(processedRequest, response)) {
                return;
            }
            // 执行请求
            mv = ha.handle(processedRequest, response, mappedHandler.getHandler());
            ...
            // 执行 HandlerInterceptor#postHandle
            mappedHandler.applyPostHandle(processedRequest, response, mv);
        }
        catch (Exception ex) {
            dispatchException = ex;
        }
        catch (Throwable err) {
            dispatchException = new NestedServletException("Handler dispatch failed", err);
        }
        // 处理异常，然后执行 HandlerInterceptor#afterCompletion
        processDispatchResult(processedRequest, response, mappedHandler, mv, dispatchException);
    }
    catch (Exception ex) {
        // 执行 HandlerInterceptor#afterCompletion
        triggerAfterCompletion(processedRequest, response, mappedHandler, ex);
    }
    catch (Throwable err) {
        // 执行 HandlerInterceptor#afterCompletion
        triggerAfterCompletion(processedRequest, response, mappedHandler,
                new NestedServletException("Handler processing failed", err));
    }
    finally {
        ...
    }
}
```

> 总结： <br/>
> 1. 根据 url 查找对应的 HandlerMapping。 <br/>
> 2. 根据 HandlerMapping  查找对应的 HandlerAdapter。 <br/>
> 3. 执行 HandlerInterceptor#preHandle。 <br/>
> 4. 执行请求。 <br/>
> 5. 执行 HandlerInterceptor#postHandle。 <br/>
> 6. 执行 HandlerExceptionResolver#resolveException。 <br/>
> 7. 执行 HandlerInterceptor#afterCompletion。 <br/>

## HandlerMapping

> 常用实现类 `RequestMappingHandlerMapping`

## HandlerAdapter

> 常用实现类 `RequestMappingHandlerAdapter`
