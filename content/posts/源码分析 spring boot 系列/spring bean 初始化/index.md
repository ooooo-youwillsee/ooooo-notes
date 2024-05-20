---
title: spring bean 初始化
date: 2024-05-21T08:00:00+08:00
draft: false
tags: [ spring boot, source code,源码分析 spring boot 系列 ]
collections: [ 源码分析 spring boot 系列 ]
---

> `spring bean` 初始化过程涉及到很多 `spring` 的**扩展接口**，源码必懂。

## getBean

源码位置: `org.springframework.beans.factory.BeanFactory#getBean`

```java
// BeanFactory 是接口，由 AbstractBeanFactory 类来实现
@Override
public Object getBean(String name) throws BeansException {
    return doGetBean(name, null, null, false);
}
```

源码位置: `org.springframework.beans.factory.support.AbstractBeanFactory#doGetBean`

```java
// 代码非常长，只分析单例对象
protected <T> T doGetBean(
        String name, @Nullable Class<T> requiredType, @Nullable Object[] args, boolean typeCheckOnly)
        throws BeansException {
    // 转换 beanName, 因为你传入的 name 可能只是别名
    String beanName = transformedBeanName(name);
    Object beanInstance;

    // 从缓存中获取 bean
    Object sharedInstance = getSingleton(beanName);
    if (sharedInstance != null && args == null) {
        // 返回真实的 bean， 可能是 FactoryBean
        beanInstance = getObjectForBeanInstance(sharedInstance, name, beanName, null);
    }
    else {
        ...
        // 从父容器中获取 bean
        BeanFactory parentBeanFactory = getParentBeanFactory();
        if (parentBeanFactory != null && !containsBeanDefinition(beanName)) {
          ... 
        }
        // 标记 bean 正在创建中 
        if (!typeCheckOnly) {
            markBeanAsCreated(beanName);
        }
        try {
            // 获取 beanDefinition
            RootBeanDefinition mbd = getMergedLocalBeanDefinition(beanName);
            // 初始化 bean 的依赖, 注解 @DependsOn，不用关心
            String[] dependsOn = mbd.getDependsOn();
            if (dependsOn != null) {
              ... 
            }
            // 初始化单例 bean
            if (mbd.isSingleton()) {
                sharedInstance = getSingleton(beanName, () -> {
                    try {
                        // 创建 bean, 后面继续分析
                        return createBean(beanName, mbd, args);
                    }
                    catch (BeansException ex) {
                        ...
                    }
                });
                // 获取真实的 bean，可能是 FactoryBean
                beanInstance = getObjectForBeanInstance(sharedInstance, name, beanName, mbd);
            }
            // 省略了 PROTOTYPE，@Scope 类型的 bean 的代码
            ...
        }
        ...
    }
    // 根据 requiredType 转换 bean 的类型, TypeConverter 
    return adaptBeanInstance(name, beanInstance, requiredType);
}
```

## createBean

源码位置: `org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory#createBean`

```java
@Override
protected Object createBean(String beanName, RootBeanDefinition mbd, @Nullable Object[] args)
        throws BeanCreationException {
    RootBeanDefinition mbdToUse = mbd;
    // 解析 bean 的 class
    Class<?> resolvedClass = resolveBeanClass(mbd, beanName);
    if (resolvedClass != null && !mbd.hasBeanClass() && mbd.getBeanClassName() != null) {
        mbdToUse = new RootBeanDefinition(mbd);
        mbdToUse.setBeanClass(resolvedClass);
    }
    ...
    try {
        // 执行 InstantiationAwareBeanPostProcessor 钩子，这里可以返回代理对象
        Object bean = resolveBeforeInstantiation(beanName, mbdToUse);
        if (bean != null) {
            return bean;
        }
    }
    catch (Throwable ex) {
        throw new BeanCreationException(mbdToUse.getResourceDescription(), beanName,
                "BeanPostProcessor before instantiation of bean failed", ex);
    }
    try {
        // 创建 bean, 继续分析
        Object beanInstance = doCreateBean(beanName, mbdToUse, args);
        return beanInstance;
    }
    catch (BeanCreationException | ImplicitlyAppearedSingletonException ex) {
        ...
    }
}
```

## doCreateBean

源码位置: `org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory#doCreateBean`

```java
protected Object doCreateBean(String beanName, RootBeanDefinition mbd, @Nullable Object[] args)
        throws BeanCreationException {
    // Instantiate the bean.
    BeanWrapper instanceWrapper = null;
    if (mbd.isSingleton()) {
        instanceWrapper = this.factoryBeanInstanceCache.remove(beanName);
    }
    if (instanceWrapper == null) {
        // 创建 beanWrapper
        instanceWrapper = createBeanInstance(beanName, mbd, args);
    }
    Object bean = instanceWrapper.getWrappedInstance();
    Class<?> beanType = instanceWrapper.getWrappedClass();
    if (beanType != NullBean.class) {
        mbd.resolvedTargetType = beanType;
    }

    // Allow post-processors to modify the merged bean definition.
    synchronized (mbd.postProcessingLock) {
        if (!mbd.postProcessed) {
            try {
                // 执行 MergedBeanDefinitionPostProcessor 钩子
                applyMergedBeanDefinitionPostProcessors(mbd, beanType, beanName);
            }
            catch (Throwable ex) {
                ...
            }
            mbd.postProcessed = true;
        }
    }

    // 是否允许循环引用, 默认不允许
    boolean earlySingletonExposure = (mbd.isSingleton() && this.allowCircularReferences &&
            isSingletonCurrentlyInCreation(beanName));
    if (earlySingletonExposure) {
        // 加入到 singletonFactory 中，当有循环引用时，调用 ObjectFactory#getObject 获取 bean
        addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));
    }

    Object exposedObject = bean;
    try {
        // 填充 bean 属性， 执行 @Autowired, @Value
        populateBean(beanName, mbd, instanceWrapper);
        // 初始化 bean，执行 BeanPostProcessor, InitializingBean
        exposedObject = initializeBean(beanName, exposedObject, mbd);
    }
    catch (Throwable ex) {
        ...
    }
    ...
    try {
        // 注册 DisposableBean, 销毁前的回调方法
        registerDisposableBeanIfNecessary(beanName, bean, mbd);
    }
    catch (BeanDefinitionValidationException ex) {
        ...
    }
    // 返回最终的 bean
    return exposedObject;
}
```