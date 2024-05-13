# spring aop 原理


## AopAutoConfiguration 自动配置类

源码位置: `org.springframework.boot.autoconfigure.aop.AopAutoConfiguration`

```java
@Configuration(proxyBeanMethods = false)
// 自动激活 aop 配置, 还会激活 @EnableAspectJAutoProxy 注解
@ConditionalOnProperty(prefix = &#34;spring.aop&#34;, name = &#34;auto&#34;, havingValue = &#34;true&#34;, matchIfMissing = true)
public class AopAutoConfiguration {

	@Configuration(proxyBeanMethods = false)
	@ConditionalOnClass(Advice.class)
	static class AspectJAutoProxyingConfiguration {

		@Configuration(proxyBeanMethods = false)
		@EnableAspectJAutoProxy(proxyTargetClass = false)
		// aop 使用 jdk proxy
		@ConditionalOnProperty(prefix = &#34;spring.aop&#34;, name = &#34;proxy-target-class&#34;, havingValue = &#34;false&#34;)
		static class JdkDynamicAutoProxyConfiguration {

		}

		@Configuration(proxyBeanMethods = false)
		@EnableAspectJAutoProxy(proxyTargetClass = true)
		// aop 使用 cglib proxy
		@ConditionalOnProperty(prefix = &#34;spring.aop&#34;, name = &#34;proxy-target-class&#34;, havingValue = &#34;true&#34;,
				matchIfMissing = true)
		static class CglibAutoProxyConfiguration {

		}
	}

	@Configuration(proxyBeanMethods = false)
	@ConditionalOnMissingClass(&#34;org.aspectj.weaver.Advice&#34;)
	// cglib proxy 激活
	@ConditionalOnProperty(prefix = &#34;spring.aop&#34;, name = &#34;proxy-target-class&#34;, havingValue = &#34;true&#34;,
			matchIfMissing = true)
	static class ClassProxyingConfiguration {

		@Bean
		static BeanFactoryPostProcessor forceAutoProxyCreatorToUseClassProxying() {
			return (beanFactory) -&gt; {
				if (beanFactory instanceof BeanDefinitionRegistry) {
					BeanDefinitionRegistry registry = (BeanDefinitionRegistry) beanFactory;
					// 注册 aop 相关类
					AopConfigUtils.registerAutoProxyCreatorIfNecessary(registry);
					// 强制使用 proxyTargetClass = true
					AopConfigUtils.forceAutoProxyCreatorToUseClassProxying(registry);
				}
			};
		}

	}

}
```

源码位置: `org.springframework.aop.config.AopConfigUtils#registerAutoProxyCreatorIfNecessary`

```java
// 注册 aop 相关类
@Nullable
public static BeanDefinition registerAutoProxyCreatorIfNecessary(
        BeanDefinitionRegistry registry, @Nullable Object source) {
    return registerOrEscalateApcAsRequired(InfrastructureAdvisorAutoProxyCreator.class, registry, source);
}

private static BeanDefinition registerOrEscalateApcAsRequired(
        Class&lt;?&gt; cls, BeanDefinitionRegistry registry, @Nullable Object source) {

    Assert.notNull(registry, &#34;BeanDefinitionRegistry must not be null&#34;);

    // 检查之前是否注册过
    if (registry.containsBeanDefinition(AUTO_PROXY_CREATOR_BEAN_NAME)) {
        BeanDefinition apcDefinition = registry.getBeanDefinition(AUTO_PROXY_CREATOR_BEAN_NAME);
        // 和当前注册类不一样
        if (!cls.getName().equals(apcDefinition.getBeanClassName())) {
            int currentPriority = findPriorityForClass(apcDefinition.getBeanClassName());
            int requiredPriority = findPriorityForClass(cls);
            // 比较优先级
            if (currentPriority &lt; requiredPriority) {
                // 重新设置 beanClassName
                apcDefinition.setBeanClassName(cls.getName());
            }
        }
        return null;
    }

    // 之前没有注册过
    RootBeanDefinition beanDefinition = new RootBeanDefinition(cls);
    beanDefinition.setSource(source);
    // order 是最大值
    beanDefinition.getPropertyValues().add(&#34;order&#34;, Ordered.HIGHEST_PRECEDENCE);
    // 基础类
    beanDefinition.setRole(BeanDefinition.ROLE_INFRASTRUCTURE);
    // 注册 beanDefinition
    registry.registerBeanDefinition(AUTO_PROXY_CREATOR_BEAN_NAME, beanDefinition);
    return beanDefinition;
}
```

源码位置: `org.springframework.aop.config.AopConfigUtils`

```java
// 从上到下，优先级依次变高
static {
    // Set up the escalation list...
    APC_PRIORITY_LIST.add(InfrastructureAdvisorAutoProxyCreator.class);
    APC_PRIORITY_LIST.add(AspectJAwareAdvisorAutoProxyCreator.class);
    APC_PRIORITY_LIST.add(AnnotationAwareAspectJAutoProxyCreator.class);
}
```

## @EnableAspectJAutoProxy 

源码位置: `org.springframework.context.annotation.EnableAspectJAutoProxy`

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
// 导入配置类
@Import(AspectJAutoProxyRegistrar.class)
public @interface EnableAspectJAutoProxy {

	/**
	 * Indicate whether subclass-based (CGLIB) proxies are to be created as opposed
	 * to standard Java interface-based proxies. The default is {@code false}.
	 */
	// 如果为 true，则为 cglib proxy
	boolean proxyTargetClass() default false;

	/**
	 * Indicate that the proxy should be exposed by the AOP framework as a {@code ThreadLocal}
	 * for retrieval via the {@link org.springframework.aop.framework.AopContext} class.
	 * Off by default, i.e. no guarantees that {@code AopContext} access will work.
	 * @since 4.3.1
	 */
	boolean exposeProxy() default false;

}
```

源码位置: `org.springframework.context.annotation.AspectJAutoProxyRegistrar`

```java
class AspectJAutoProxyRegistrar implements ImportBeanDefinitionRegistrar {

	/**
	 * Register, escalate, and configure the AspectJ auto proxy creator based on the value
	 * of the @{@link EnableAspectJAutoProxy#proxyTargetClass()} attribute on the importing
	 * {@code @Configuration} class.
	 */
	@Override
	public void registerBeanDefinitions(
			AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
        // 激活 aop 相关类 AnnotationAwareAspectJAutoProxyCreator
		AopConfigUtils.registerAspectJAnnotationAutoProxyCreatorIfNecessary(registry);

		AnnotationAttributes enableAspectJAutoProxy =
				AnnotationConfigUtils.attributesFor(importingClassMetadata, EnableAspectJAutoProxy.class);
		if (enableAspectJAutoProxy != null) {
			if (enableAspectJAutoProxy.getBoolean(&#34;proxyTargetClass&#34;)) {
			    // 强制使用 proxyTargetClass = true, 使用 cglib 来实现代理
				AopConfigUtils.forceAutoProxyCreatorToUseClassProxying(registry);
			}
			if (enableAspectJAutoProxy.getBoolean(&#34;exposeProxy&#34;)) {
			    // 强制使用 exposeProxy = true, 可以用 AopContext#currentProxy 获取代理对象
				AopConfigUtils.forceAutoProxyCreatorToExposeProxy(registry);
			}
		}
	}
}
```

## AnnotationAwareAspectJAutoProxyCreator

&gt; 这里以 `AnnotationAwareAspectJAutoProxyCreator` 为例, 当我们添加了 `org.springframework.boot:spring-boot-starter-aop` 依赖后就会激活这个类。


源码位置: `org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#postProcessBeforeInstantiation`

```java
// bean 实例化之前会执行这个方法
@Override
public Object postProcessBeforeInstantiation(Class&lt;?&gt; beanClass, String beanName) {
    Object cacheKey = getCacheKey(beanClass, beanName);
    
    if (!StringUtils.hasLength(beanName) || !this.targetSourcedBeans.contains(beanName)) {
        if (this.advisedBeans.containsKey(cacheKey)) {
            return null;
        }
        // 基础类 或者 需要跳过
        if (isInfrastructureClass(beanClass) || shouldSkip(beanClass, beanName)) {
            this.advisedBeans.put(cacheKey, Boolean.FALSE);
            return null;
        }
    }

    // Create proxy here if we have a custom TargetSource.
    // Suppresses unnecessary default instantiation of the target bean:
    // The TargetSource will handle target instances in a custom fashion.
    // 获取自定义的 targetSource, 默认为空，所以不会在这个方法中生成代理对象
    TargetSource targetSource = getCustomTargetSource(beanClass, beanName);
    if (targetSource != null) {
        if (StringUtils.hasLength(beanName)) {
            this.targetSourcedBeans.add(beanName);
        }
        // 获取这个类的 advisor
        Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(beanClass, beanName, targetSource);
        // 创建代理对象
        Object proxy = createProxy(beanClass, beanName, specificInterceptors, targetSource);
        this.proxyTypes.put(cacheKey, proxy.getClass());
        return proxy;
    }
    // 返回 null，会继续实例化
    return null;
}
```

源码位置: `org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#postProcessAfterInitialization`

```java
// bean 初始化之后会执行这个方法
@Override
public Object postProcessAfterInitialization(@Nullable Object bean, String beanName) {
    if (bean != null) {
        Object cacheKey = getCacheKey(bean.getClass(), beanName);
        // 如果没有 early getBean, 这里就是 null
        if (this.earlyProxyReferences.remove(cacheKey) != bean) {
            // 创建代理对象, 后面继续解析
            return wrapIfNecessary(bean, beanName, cacheKey);
        }
    }
    return bean;
}
```

源码位置: `org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#wrapIfNecessary`

```java
protected Object wrapIfNecessary(Object bean, String beanName, Object cacheKey) {
    // 有自定义的 targetSource, 则跳过
    if (StringUtils.hasLength(beanName) &amp;&amp; this.targetSourcedBeans.contains(beanName)) {
        return bean;
    }
    // 不需要代理
    if (Boolean.FALSE.equals(this.advisedBeans.get(cacheKey))) {
        return bean;
    }
    // 基础类 或者 应该跳过
    if (isInfrastructureClass(bean.getClass()) || shouldSkip(bean.getClass(), beanName)) {
        this.advisedBeans.put(cacheKey, Boolean.FALSE);
        return bean;
    }

    // Create proxy if we have advice.
    // 获取 advisor, 这个会获取 @Aspect，Advisor，后面会继续解析
    Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(bean.getClass(), beanName, null);
    if (specificInterceptors != DO_NOT_PROXY) {
        this.advisedBeans.put(cacheKey, Boolean.TRUE);
        // 创建代理对象，后面会继续解析
        Object proxy = createProxy(
                bean.getClass(), beanName, specificInterceptors, new SingletonTargetSource(bean));
        this.proxyTypes.put(cacheKey, proxy.getClass());
        return proxy;
    }

    // 标记不需要代理
    this.advisedBeans.put(cacheKey, Boolean.FALSE);
    return bean;
}
```

源码位置: `org.springframework.aop.framework.autoproxy.AbstractAdvisorAutoProxyCreator#getAdvicesAndAdvisorsForBean`

```java
// 获取 advisor
@Override
@Nullable
protected Object[] getAdvicesAndAdvisorsForBean(
        Class&lt;?&gt; beanClass, String beanName, @Nullable TargetSource targetSource) {
    // 找到合适的 advisor
    List&lt;Advisor&gt; advisors = findEligibleAdvisors(beanClass, beanName);
    if (advisors.isEmpty()) {
        // 返回 null，不需要代理
        return DO_NOT_PROXY;
    }
    return advisors.toArray();
}

// 找到合适的 advisor
protected List&lt;Advisor&gt; findEligibleAdvisors(Class&lt;?&gt; beanClass, String beanName) {
    // 找到所有的 advisor bean, 包括 @Aspect
    List&lt;Advisor&gt; candidateAdvisors = findCandidateAdvisors();
    // 判断 advisor 是否能应用到 bean, ClassFilter 和 MethodMatcher
    List&lt;Advisor&gt; eligibleAdvisors = findAdvisorsThatCanApply(candidateAdvisors, beanClass, beanName);
    // 子类扩展，目前会添加 ExposeInvocationInterceptor
    extendAdvisors(eligibleAdvisors);
    if (!eligibleAdvisors.isEmpty()) {
        // 对 advisor 排序
        eligibleAdvisors = sortAdvisors(eligibleAdvisors);
    }
    return eligibleAdvisors;
}
```

源码位置: `org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#createProxy`

```java
// 创建代理对象
protected Object createProxy(Class&lt;?&gt; beanClass, @Nullable String beanName,
        @Nullable Object[] specificInterceptors, TargetSource targetSource) {
    ...
    // 代理工厂
    ProxyFactory proxyFactory = new ProxyFactory();
    proxyFactory.copyFrom(this);

    // 添加代理接口
    if (proxyFactory.isProxyTargetClass()) {
        // Explicit handling of JDK proxy targets and lambdas (for introduction advice scenarios)
        if (Proxy.isProxyClass(beanClass) || ClassUtils.isLambdaClass(beanClass)) {
            // Must allow for introductions; can&#39;t just set interfaces to the proxy&#39;s interfaces only.
            for (Class&lt;?&gt; ifc : beanClass.getInterfaces()) {
                proxyFactory.addInterface(ifc);
            }
        }
    }
    else {
        // No proxyTargetClass flag enforced, let&#39;s apply our default checks...
        if (shouldProxyTargetClass(beanClass, beanName)) {
            proxyFactory.setProxyTargetClass(true);
        }
        else {
            evaluateProxyInterfaces(beanClass, proxyFactory);
        }
    }
    // 获取 advisor
    Advisor[] advisors = buildAdvisors(beanName, specificInterceptors);
    proxyFactory.addAdvisors(advisors);
    proxyFactory.setTargetSource(targetSource);
    ...
    // 获取代理对象
    return proxyFactory.getProxy(classLoader);
}
```




---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/spring-aop-%E5%8E%9F%E7%90%86/  

