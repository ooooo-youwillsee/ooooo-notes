# Spring 常用扩展点


&gt; 在 spring 中，最常用的两种扩展就是 `BeanFactoryPostProcessor` 和 `BeanPostProcessor`, 当然还有其他的扩展，比如 `ApplicationListener`, `SpringApplicationRunListener` 等等。

## BeanFactoryPostProcessor

源码位置: `org.springframework.beans.factory.config.BeanFactoryPostProcessor`

```java
@FunctionalInterface
public interface BeanFactoryPostProcessor {

    // 可以用 beanFactory 来修改 beanDefinition, 注册 singletonBean
	void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException;
}
```

源码位置: `org.springframework.beans.factory.support.BeanDefinitionRegistryPostProcessor`

```java
// 当前类是 BeanFactoryPostProcessor 的子接口
public interface BeanDefinitionRegistryPostProcessor extends BeanFactoryPostProcessor {

    // 可以用 registry 来注册和修改 beanDefinition
	void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) throws BeansException;
}
```

## BeanPostProcessor

源码位置: `org.springframework.beans.factory.config.BeanPostProcessor`

```java
public interface BeanPostProcessor {

    // 在 InitializingBean#afterPropertiesSet 执行前
	default Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
	    // 1. 可以返回代理对象
	    // 2. 可以设置bean的属性 (这里)
		return bean;
	}

    // 在 InitializingBean#afterPropertiesSet 执行后
	default Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
	    // 1. 可以返回代理对象
	    // 2. 可以设置bean的属性
		return bean;
	}
}
```

源码位置: `org.springframework.beans.factory.config.InstantiationAwareBeanPostProcessor`

```java
// 当前类是 BeanPostProcessor 的子接口
public interface InstantiationAwareBeanPostProcessor extends BeanPostProcessor {

	// 执行实例化之前
	default Object postProcessBeforeInstantiation(Class&lt;?&gt; beanClass, String beanName) throws BeansException {
		return null;
	}

    // 执行实例化之后
	default boolean postProcessAfterInstantiation(Object bean, String beanName) throws BeansException {
		return true;
	}

    // 填充属性
	default PropertyValues postProcessProperties(PropertyValues pvs, Object bean, String beanName)
			throws BeansException {
		return null;
	}

    // 过期方法，和 postProcessProperties 一样
	@Deprecated
	default PropertyValues postProcessPropertyValues(
			PropertyValues pvs, PropertyDescriptor[] pds, Object bean, String beanName) throws BeansException {
		return pvs;
	}
}
```

源码位置: `org.springframework.beans.factory.config.SmartInstantiationAwareBeanPostProcessor`

```java
// 当前类是 BeanPostProcessor 的子接口
public interface SmartInstantiationAwareBeanPostProcessor extends InstantiationAwareBeanPostProcessor {

	// 预测 bean 的类型，这个方法用的很少
	default Class&lt;?&gt; predictBeanType(Class&lt;?&gt; beanClass, String beanName) throws BeansException {
		return null;
	}

    // 决定候选的构造函数, 这个方法用的很少
	default Constructor&lt;?&gt;[] determineCandidateConstructors(Class&lt;?&gt; beanClass, String beanName)
			throws BeansException {
		return null;
	}

    // 返回 early 访问的 bean 引用 (解决循环引用)
	default Object getEarlyBeanReference(Object bean, String beanName) throws BeansException {
	    // 可以返回代理对象
		return bean;
	}
}
```

## 其他扩展

1. `ApplicationListener`: 监听 `spring` 事件，比如 `ContextRefreshedEvent`, `ContextStartedEvent`。

2. `SpringApplicationRunListener`: 监听 `spring boot` 事件，比如 `contextLoaded`，`started`。

3. `ApplicationRunner`, `CommandLineRunner`: 服务启动的回调。

4. `InitializingBean`: 初始化 `bean` 的回调。

5. `DisposableBean`: 销毁 `bean` 的回调。

6. `*Aware`: 注入 `bean` 的回调，比如 `ApplicationContextAware`, `EnvironmentAware`。

7. `FactoryBean`: 创建 `bean` 的工厂类。

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/spring-%E5%B8%B8%E7%94%A8%E6%89%A9%E5%B1%95%E7%82%B9/  

