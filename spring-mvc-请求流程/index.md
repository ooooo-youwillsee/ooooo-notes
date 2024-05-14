# spring mvc 请求流程


&gt; `spring mvc` 原理真的必须懂。


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
            dispatchException = new NestedServletException(&#34;Handler dispatch failed&#34;, err);
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
                new NestedServletException(&#34;Handler processing failed&#34;, err));
    }
    finally {
        ...
    }
}
```

&gt; 总结： &lt;br/&gt;
&gt; 1. 根据 url 查找对应的 HandlerMapping。 &lt;br/&gt;
&gt; 2. 根据 HandlerMapping  查找对应的 HandlerAdapter。 &lt;br/&gt;
&gt; 3. 执行 HandlerInterceptor#preHandle。 &lt;br/&gt;
&gt; 4. 执行请求。 &lt;br/&gt;
&gt; 5. 执行 HandlerInterceptor#postHandle。 &lt;br/&gt;
&gt; 6. 执行 HandlerExceptionResolver#resolveException。 &lt;br/&gt;
&gt; 7. 执行 HandlerInterceptor#afterCompletion。 &lt;br/&gt;

## HandlerMapping

&gt; 常用实现类 `RequestMappingHandlerMapping`

## HandlerAdapter

&gt; 常用实现类 `RequestMappingHandlerAdapter`


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/spring-mvc-%E8%AF%B7%E6%B1%82%E6%B5%81%E7%A8%8B/  

