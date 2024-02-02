# 异步 servlet 原理


> 在 `servlet 3.0` 的规范中，有**异步servlet**特性，这个可以**增大吞吐量**。我们有必要看看 `spring` 是如何适配这个特性的。

## 实现异步 servlet

在 `spring mvc` 中，实现**异步servlet**有多种方式，比如 `DeferredResult`、`Callable`，相关代码见**末尾**。

### DeferredResult 方式

```java
@GetMapping("/test2")
public DeferredResult<String> test2() {
    before();
    DeferredResult<String> result = new DeferredResult<>();
    executor.submit(() -> {
        process();
        result.setResult("test2");
    });
    after();
    return result;
}
```

相关日志:

{{< image src="deferredResult-log.png" caption="deferredResult-log" >}}

### Callable 方式

```java
@GetMapping("/test4")
public Callable<String> test4() {
    before();
    Callable<String> callable = () -> {
        process();
        return "test4";
    };
    after();
    return callable;
}
```

相关日志:

{{< image src="callable-log.png" caption="callable-log" >}}

## 源码解读

> 在 `spring` 中，有一个特殊的接口 `HandlerMethodReturnValueHandler`，专门来处理**请求的返回值**。

### 处理 DeferredResult

源码位置: `org.springframework.web.servlet.mvc.method.annotation.DeferredResultMethodReturnValueHandler`

```java
public class DeferredResultMethodReturnValueHandler implements HandlerMethodReturnValueHandler {

	@Override
	public boolean supportsReturnType(MethodParameter returnType) {
	    // 判断类型
		Class<?> type = returnType.getParameterType();
		return (DeferredResult.class.isAssignableFrom(type) ||
				ListenableFuture.class.isAssignableFrom(type) ||
				CompletionStage.class.isAssignableFrom(type));
	}

	@Override
	public void handleReturnValue(@Nullable Object returnValue, MethodParameter returnType,
			ModelAndViewContainer mavContainer, NativeWebRequest webRequest) throws Exception {
        ...
		DeferredResult<?> result;

		if (returnValue instanceof DeferredResult) {
			result = (DeferredResult<?>) returnValue;
		}
		else if (returnValue instanceof ListenableFuture) {
			result = adaptListenableFuture((ListenableFuture<?>) returnValue);
		}
		else if (returnValue instanceof CompletionStage) {
			result = adaptCompletionStage((CompletionStage<?>) returnValue);
		}
		else {
			// Should not happen...
			throw new IllegalStateException("Unexpected return value type: " + returnValue);
		}
        // 开始异步处理
		WebAsyncUtils.getAsyncManager(webRequest).startDeferredResultProcessing(result, mavContainer);
	}
}
```

### 处理 Callable

源码位置: `org.springframework.web.servlet.mvc.method.annotation.CallableMethodReturnValueHandler`

```java
public class CallableMethodReturnValueHandler implements HandlerMethodReturnValueHandler {

	@Override
	public boolean supportsReturnType(MethodParameter returnType) {
	    // 判断类型
		return Callable.class.isAssignableFrom(returnType.getParameterType());
	}

	@Override
	public void handleReturnValue(@Nullable Object returnValue, MethodParameter returnType,
			ModelAndViewContainer mavContainer, NativeWebRequest webRequest) throws Exception {
        ...
		Callable<?> callable = (Callable<?>) returnValue;
		// 开始异步处理
		WebAsyncUtils.getAsyncManager(webRequest).startCallableProcessing(callable, mavContainer);
	}
}
```

从上面两个类可以看出，最终都是调用了 `WebAsyncManager` 类的 `startDeferredResultProcessing` 或者 `startCallableProcessing` 方法， 这两个方法的内部实现都是差不多的，下面以 `startCallableProcessing` 为例。

### WebAsyncManager

源码位置: `org.springframework.web.context.request.async.WebAsyncManager#startCallableProcessing`

```java
public void startCallableProcessing(final WebAsyncTask<?> webAsyncTask, Object... processingContext)
        throws Exception {
    ...
    List<CallableProcessingInterceptor> interceptors = new ArrayList<>();
    interceptors.add(webAsyncTask.getInterceptor());
    interceptors.addAll(this.callableInterceptors.values());
    interceptors.add(timeoutCallableInterceptor);

    final Callable<?> callable = webAsyncTask.getCallable();
    final CallableInterceptorChain interceptorChain = new CallableInterceptorChain(interceptors);

    // 设置超时处理器
    this.asyncWebRequest.addTimeoutHandler(() -> {
        if (logger.isDebugEnabled()) {
            logger.debug("Async request timeout for " + formatRequestUri());
        }
        Object result = interceptorChain.triggerAfterTimeout(this.asyncWebRequest, callable);
        if (result != CallableProcessingInterceptor.RESULT_NONE) {
            setConcurrentResultAndDispatch(result);
        }
    });

    // 设置错误处理
    this.asyncWebRequest.addErrorHandler(ex -> {
        if (!this.errorHandlingInProgress) {
            if (logger.isDebugEnabled()) {
                logger.debug("Async request error for " + formatRequestUri() + ": " + ex);
            }
            Object result = interceptorChain.triggerAfterError(this.asyncWebRequest, callable, ex);
            result = (result != CallableProcessingInterceptor.RESULT_NONE ? result : ex);
            setConcurrentResultAndDispatch(result);
        }
    });

    // 设置完成处理器
    this.asyncWebRequest.addCompletionHandler(() ->
            interceptorChain.triggerAfterCompletion(this.asyncWebRequest, callable));

    // 执行钩子
    interceptorChain.applyBeforeConcurrentHandling(this.asyncWebRequest, callable);
    // 开启异步处理，就是 request#startAsync (servlet api)
    startAsyncProcessing(processingContext);
    try {
        Future<?> future = this.taskExecutor.submit(() -> {
            Object result = null;
            try {
                // 执行钩子 applyPreProcess
                interceptorChain.applyPreProcess(this.asyncWebRequest, callable);
                // 处理请求
                result = callable.call();
            }
            catch (Throwable ex) {
                result = ex;
            }
            finally {
                // 执行钩子 applyPostProcess
                result = interceptorChain.applyPostProcess(this.asyncWebRequest, callable, result);
            }
            // 设置结果, 然后 dispatch, 当前这个请求就会再次处理，会被 RequestMappingHandlerAdapter#invokeHandlerMethod 拦截
            setConcurrentResultAndDispatch(result);
        });
        interceptorChain.setTaskFuture(future);
    }
    catch (RejectedExecutionException ex) {
        Object result = interceptorChain.applyPostProcess(this.asyncWebRequest, callable, ex);
        setConcurrentResultAndDispatch(result);
        throw ex;
    }
}
```

源码位置: `org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter#invokeHandlerMethod`

```java
protected ModelAndView invokeHandlerMethod(HttpServletRequest request,
        HttpServletResponse response, HandlerMethod handlerMethod) throws Exception {
        ...
        WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);
        // 检查是否有异步结果
        if (asyncManager.hasConcurrentResult()) {
            Object result = asyncManager.getConcurrentResult();
            mavContainer = (ModelAndViewContainer) asyncManager.getConcurrentResultContext()[0];
            asyncManager.clearConcurrentResult();
            // 这里会返回一个新的 handlerMethod, 这个很重要
            invocableMethod = invocableMethod.wrapConcurrentResult(result);
        }

        // 返回 json
        invocableMethod.invokeAndHandle(webRequest, mavContainer);
        if (asyncManager.isConcurrentHandlingStarted()) {
            return null;
        }
        // 对于 json 请求来说，这里不会执行
        return getModelAndView(mavContainer, modelFactory, webRequest);
    }
    finally {
        webRequest.requestCompleted();
    }
}
```

### task 线程池

`Callable` 的执行，需要线程池，默认配置类如下:

源码位置: `org.springframework.boot.autoconfigure.task.TaskExecutionAutoConfiguration`

```java
@Lazy
@Bean(name = { APPLICATION_TASK_EXECUTOR_BEAN_NAME,
        AsyncAnnotationBeanPostProcessor.DEFAULT_TASK_EXECUTOR_BEAN_NAME })
@ConditionalOnMissingBean(Executor.class)
public ThreadPoolTaskExecutor applicationTaskExecutor(TaskExecutorBuilder builder) {
    return builder.build();
}
```

## 代码

[demo-spring-async-servlet](https://github.com/ooooo-youwillsee/demo-spring-async-servlet)

