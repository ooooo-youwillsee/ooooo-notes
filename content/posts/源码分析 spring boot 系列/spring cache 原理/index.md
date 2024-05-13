---
title: spring cache 原理
date: 2024-05-13T08:00:00+08:00
draft: false
tags: [ spring boot, source code,源码分析 spring boot 系列 ]
collections: [ 源码分析 spring boot 系列 ]
---

> `spring cache` 是**最常见**的功能之一，有必要了解其原理。

## CacheAutoConfiguration 自动配置类

源码位置: `org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration`

```java
// 导入 CacheConfigurationImportSelector 配置类
@Import({ CacheConfigurationImportSelector.class, ... })
public class CacheAutoConfiguration {

    // 自定义 CacheManager
    @Bean
	@ConditionalOnMissingBean
	public CacheManagerCustomizers cacheManagerCustomizers(ObjectProvider<CacheManagerCustomizer<?>> customizers) {
		return new CacheManagerCustomizers(customizers.orderedStream().collect(Collectors.toList()));
	}
	
	...
	
	static class CacheConfigurationImportSelector implements ImportSelector {

		@Override
		public String[] selectImports(AnnotationMetadata importingClassMetadata) {
		    // CacheType 定义了多种缓存的实现，比如 redis，caffine，simple
			CacheType[] types = CacheType.values();
			String[] imports = new String[types.length];
			for (int i = 0; i < types.length; i++) {
			    // 获取对应的配置类，每个配置类都有注解 @Conditional(CacheCondition.class)
				imports[i] = CacheConfigurations.getConfigurationClass(types[i]);
			}
			return imports;
		}
	}
}
```

## CacheCondition 选择不同的缓存

源码位置: `org.springframework.boot.autoconfigure.cache.CacheCondition`

```java
class CacheCondition extends SpringBootCondition {

	@Override
	public ConditionOutcome getMatchOutcome(ConditionContext context, AnnotatedTypeMetadata metadata) {
        ...	
		try {
		    // 获取配置的 cacheType
			BindResult<CacheType> specified = Binder.get(environment).bind("spring.cache.type", CacheType.class);
			if (!specified.isBound()) {
				return ConditionOutcome.match(message.because("automatic cache type"));
			}
			// 加载指定的缓存
			CacheType required = CacheConfigurations.getType(((AnnotationMetadata) metadata).getClassName());
			if (specified.get() == required) {
				return ConditionOutcome.match(message.because(specified.get() + " cache type"));
			}
		}
		catch (BindException ex) {
		}
		return ConditionOutcome.noMatch(message.because("unknown cache type"));
	}
}
```

## @EnableCaching 启用缓存

> 启用**缓存功能**，可以在启动类上使用注解 `@EnableCaching`。

源码位置: `org.springframework.cache.annotation.EnableCaching`

```java
@Import(CachingConfigurationSelector.class)
public @interface EnableCaching {

    boolean proxyTargetClass() default false;
    
    AdviceMode mode() default AdviceMode.PROXY;
    
    int order() default Ordered.LOWEST_PRECEDENCE;
}
```

源码位置: `org.springframework.cache.annotation.CachingConfigurationSelector`

```java
// 选择不同的代理模式
public class CachingConfigurationSelector extends AdviceModeImportSelector<EnableCaching> {

    @Override
	public String[] selectImports(AdviceMode adviceMode) {
		switch (adviceMode) {
			case PROXY:
			    // 默认是这个
				return getProxyImports();
			case ASPECTJ:
				return getAspectJImports();
			default:
				return null;
		}
	}
    
	private String[] getProxyImports() {
		List<String> result = new ArrayList<>(3);
		// 加载 aop 配置类
		result.add(AutoProxyRegistrar.class.getName());
		// 加载 CacheInterceptor
		result.add(ProxyCachingConfiguration.class.getName());
		if (jsr107Present && jcacheImplPresent) {
			result.add(PROXY_JCACHE_CONFIGURATION_CLASS);
		}
		return StringUtils.toStringArray(result);
	}
}
```

## CacheInterceptor 拦截器

源码位置: `org.springframework.cache.interceptor.CacheInterceptor#invoke`

```java
public Object invoke(final MethodInvocation invocation) throws Throwable {
    ...
    CacheOperationInvoker aopAllianceInvoker = () -> {
        try {
            return invocation.proceed();
        }
        catch (Throwable ex) {
            throw new CacheOperationInvoker.ThrowableWrapper(ex);
        }
    };
    ...
    try {
        return execute(aopAllianceInvoker, target, method, invocation.getArguments());
    }
    catch (CacheOperationInvoker.ThrowableWrapper th) {
        throw th.getOriginal();
    }
}
```

源码位置: `org.springframework.cache.interceptor.CacheAspectSupport#execute`

```java
// 缓存值为 null，会执行 @Cachable
// 任何时候都会执行 @CachePut 和 @CacheEvict
private Object execute(final CacheOperationInvoker invoker, Method method, CacheOperationContexts contexts) {
    if (contexts.isSynchronized()) {
        // 默认情况下不是同步操作，这里不解析了
        ...
    }

    // 处理注解 @CacheEvict(beforeInvocation=true)
    processCacheEvicts(contexts.get(CacheEvictOperation.class), true,
            CacheOperationExpressionEvaluator.NO_RESULT);

    // 从缓存中获取值
    Cache.ValueWrapper cacheHit = findCachedItem(contexts.get(CacheableOperation.class));

    // Collect puts from any @Cacheable miss, if no cached item is found
    List<CachePutRequest> cachePutRequests = new ArrayList<>();
    if (cacheHit == null) {
        // 缓存值为 null，说明要执行 @Cacheable
        collectPutRequests(contexts.get(CacheableOperation.class),
                CacheOperationExpressionEvaluator.NO_RESULT, cachePutRequests);
    }

    Object cacheValue;
    Object returnValue;

    // 缓存值不为 null，直接使用
    if (cacheHit != null && !hasCachePut(contexts)) {
        // If there are no put requests, just use the cache hit
        cacheValue = cacheHit.get();
        returnValue = wrapCacheValue(method, cacheValue);
    }
    else {
        // 调用真实方法获取值
        returnValue = invokeOperation(invoker);
        cacheValue = unwrapReturnValue(returnValue);
    }

    // Collect any explicit @CachePuts
    // 处理注解 @CachePut
    collectPutRequests(contexts.get(CachePutOperation.class), cacheValue, cachePutRequests);

    // Process any collected put requests, either from @CachePut or a @Cacheable miss
    for (CachePutRequest cachePutRequest : cachePutRequests) {
        cachePutRequest.apply(cacheValue);
    }

    // 处理注解 @CacheEvict(beforeInvocation=false) (默认情况)
    processCacheEvicts(contexts.get(CacheEvictOperation.class), false, cacheValue);

    return returnValue;
}
```

