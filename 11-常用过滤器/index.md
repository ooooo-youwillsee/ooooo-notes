# 11 常用过滤器


> dubbo 基于 3.2.6 版本

> 在 `dubbo` 中，`filter` 是**非常核心**的组件之一，很多功能都是依靠 `filter` 来实现的，下面我来介绍几种常用的 `filter` 实现。

## ConsumerContextFilter (consumer 传递隐式参数)

源码位置: `org.apache.dubbo.rpc.cluster.filter.support.ConsumerContextFilter`

```java
@Override
public Result invoke(Invoker<?> invoker, Invocation invocation) throws RpcException {
    ...
    RpcContext context = RpcContext.getClientAttachment();
    context.setAttachment(REMOTE_APPLICATION_KEY, invoker.getUrl().getApplication());
    if (invocation instanceof RpcInvocation) {
        ((RpcInvocation) invocation).setInvoker(invoker);
    }

    // 添加 ServerAttachment 参数
    ((RpcInvocation) invocation).addObjectAttachments(RpcContext.getServerAttachment().getObjectAttachments());
    // 添加 ClientAttachment 参数
    Map<String, Object> contextAttachments = RpcContext.getClientAttachment().getObjectAttachments();
    if (CollectionUtils.isNotEmptyMap(contextAttachments)) {
        ((RpcInvocation) invocation).addObjectAttachments(contextAttachments);
    }
    ...
    RpcContext.removeClientResponseContext();
    return invoker.invoke(invocation);
}
```

## ContextFilter (provider 接受隐式参数)

源码位置: `org.apache.dubbo.rpc.filter.ContextFilter`

```java
@Override
public Result invoke(Invoker<?> invoker, Invocation invocation) throws RpcException {
    Map<String, Object> attachments = invocation.getObjectAttachments();
    ...
    // 设置 RemoteApplicationName
    String remoteApplication = invocation.getAttachment(REMOTE_APPLICATION_KEY);
    if (StringUtils.isNotEmpty(remoteApplication)) {
        RpcContext.getServiceContext().setRemoteApplicationName(remoteApplication);
    } else {
        RpcContext.getServiceContext().setRemoteApplicationName(context.getAttachment(REMOTE_APPLICATION_KEY));
    }

    // 添加 invocation 中的 attachments（consumer 端传递的隐式参数）
    if (CollectionUtils.isNotEmptyMap(attachments)) {
        if (context.getObjectAttachments().size() > 0) {
            context.getObjectAttachments().putAll(attachments);
        } else {
            context.setObjectAttachments(attachments);
        }
    }
    
    try {
        context.clearAfterEachInvoke(false);
        return invoker.invoke(invocation);
    } finally {
        context.clearAfterEachInvoke(true);
        if (context.isAsyncStarted()) {
            removeContext();
        }
    }
}
```

## ClassLoaderFilter (provider 设置类加载器)

源码位置: `org.apache.dubbo.rpc.filter.ClassLoaderFilter`

```java
public Result invoke(Invoker<?> invoker, Invocation invocation) throws RpcException {
    // 获取之前的 classloader
    ClassLoader stagedClassLoader = Thread.currentThread().getContextClassLoader();
    // 获取当前的 classloader
    ClassLoader effectiveClassLoader;
    if (invocation.getServiceModel() != null) {
        effectiveClassLoader = invocation.getServiceModel().getClassLoader();
    } else {
        effectiveClassLoader = invoker.getClass().getClassLoader();
    }

    if (effectiveClassLoader != null) {
        invocation.put(STAGED_CLASSLOADER_KEY, stagedClassLoader);
        invocation.put(WORKING_CLASSLOADER_KEY, effectiveClassLoader);

        Thread.currentThread().setContextClassLoader(effectiveClassLoader);
    }
    try {
        return invoker.invoke(invocation);
    } finally {
        // 还原 classloader
        Thread.currentThread().setContextClassLoader(stagedClassLoader);
    }
}
```

## ActiveLimitFilter (consumer 限流)

代码不分析，主要逻辑是获取 `active` 参数来判断。

## ExecuteLimitFilter (provider 限流)

代码不分析，主要逻辑是获取 `executes` 参数来判断

## ExceptionFilter (provider 异常处理)

源码位置: `org.apache.dubbo.rpc.filter.ExceptionFilter`

```java
@Override
public void onResponse(Result appResponse, Invoker<?> invoker, Invocation invocation) {
    // 有异常，并且不是泛化调用
    if (appResponse.hasException() && GenericService.class != invoker.getInterface()) {
        try {
            Throwable exception = appResponse.getException();

            // directly throw if it's checked exception
            // 不是 RuntimeException, 直接 return, 传递到 consumer 端
            if (!(exception instanceof RuntimeException) && (exception instanceof Exception)) {
                return;
            }
            // directly throw if the exception appears in the signature
            // 检查方法上声明的异常
            try {
                Method method = invoker.getInterface().getMethod(RpcUtils.getMethodName(invocation), invocation.getParameterTypes());
                Class<?>[] exceptionClasses = method.getExceptionTypes();
                for (Class<?> exceptionClass : exceptionClasses) {
                    if (exception.getClass().equals(exceptionClass)) {
                        return;
                    }
                }
            } catch (NoSuchMethodException e) {
                return;
            }

            // 检查接口和异常类是同一个jar，直接 return，返回给 consumer 端
            String serviceFile = ReflectUtils.getCodeBase(invoker.getInterface());
            String exceptionFile = ReflectUtils.getCodeBase(exception.getClass());
            if (serviceFile == null || exceptionFile == null || serviceFile.equals(exceptionFile)) {
                return;
            }
            // directly throw if it's JDK exception
            String className = exception.getClass().getName();
            // 检查是 JDK 异常，直接 return，返回给 consumer 端
            if (className.startsWith("java.") || className.startsWith("javax.")) {
                return;
            }
            // directly throw if it's dubbo exception
            // 检查是 RpcException，直接 return, 返回给 consumer 端
            if (exception instanceof RpcException) {
                return;
            }

            // otherwise, wrap with RuntimeException and throw back to the client
            // 包装为 RuntimeException
            appResponse.setException(new RuntimeException(StringUtils.toString(exception)));
        } catch (Throwable e) {
          ...
        }
    }
}
```

## GenericFilter (provider 泛化调用)

源码位置: `org.apache.dubbo.rpc.filter.GenericFilter`

```java
@Override
public Result invoke(Invoker<?> invoker, Invocation inv) throws RpcException {
    // 检查是否为泛化调用
    if ((inv.getMethodName().equals($INVOKE) || inv.getMethodName().equals($INVOKE_ASYNC))
        && inv.getArguments() != null
        && inv.getArguments().length == 3
        && !GenericService.class.isAssignableFrom(invoker.getInterface())) {
        // 获取泛化调用的 方法名，参数类型，参数值
        String name = ((String) inv.getArguments()[0]).trim();
        String[] types = (String[]) inv.getArguments()[1];
        Object[] args = (Object[]) inv.getArguments()[2];
        try {
            Method method = findMethodByMethodSignature(invoker.getInterface(), name, types, inv.getServiceModel());
            Class<?>[] params = method.getParameterTypes();
            ...
            String generic = inv.getAttachment(GENERIC_KEY);

            // 获取 GENERIC_KEY 参数
            if (StringUtils.isBlank(generic)) {
                generic = getGenericValueFromRpcContext();
            }

            if (StringUtils.isEmpty(generic)
                || ProtocolUtils.isDefaultGenericSerialization(generic)
                || ProtocolUtils.isGenericReturnRawResult(generic)) {
                    // 默认序列化方式，比如 Map 装换为 JavaBean
                    args = PojoUtils.realize(args, params, method.getGenericParameterTypes());
                }
            } else if (ProtocolUtils.isGsonGenericSerialization(generic)) {
                // gson 序列化
                args = getGsonGenericArgs(args, method.getGenericParameterTypes());
            } else if (ProtocolUtils.isJavaGenericSerialization(generic)) {
                // java 序列化
                ...
            } else if (ProtocolUtils.isBeanGenericSerialization(generic)) {
                // bean 序列化，参数需要实现 JavaBeanDescriptor 接口 
                ...
            } else if (ProtocolUtils.isProtobufGenericSerialization(generic)) {
               // protobuf 序列化 
            }
            // 构建新的 invocation
            RpcInvocation rpcInvocation = new RpcInvocation(inv.getTargetServiceUniqueName(),
            ...
            // 调用
            return invoker.invoke(rpcInvocation);
        } catch (NoSuchMethodException | ClassNotFoundException e) {
            throw new RpcException(e.getMessage(), e);
        }
    }
    // 不是泛化调用，直接调用
    return invoker.invoke(inv);
}
```



