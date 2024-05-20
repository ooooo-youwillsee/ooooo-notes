# Spring Bean 初始化


&gt; `spring bean` 初始化过程涉及到很多 `spring` 的**扩展接口**，源码必懂。

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
protected &lt;T&gt; T doGetBean(
        String name, @Nullable Class&lt;T&gt; requiredType, @Nullable Object[] args, boolean typeCheckOnly)
        throws BeansException {
    // 转换 beanName, 因为你传入的 name 可能只是别名
    String beanName = transformedBeanName(name);
    Object beanInstance;

    // 从缓存中获取 bean
    Object sharedInstance = getSingleton(beanName);
    if (sharedInstance != null &amp;&amp; args == null) {
        // 返回真实的 bean， 可能是 FactoryBean
        beanInstance = getObjectForBeanInstance(sharedInstance, name, beanName, null);
    }
    else {
        ...
        // 从父容器中获取 bean
        BeanFactory parentBeanFactory = getParentBeanFactory();
        if (parentBeanFactory != null &amp;&amp; !containsBeanDefinition(beanName)) {
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
                sharedInstance = getSingleton(beanName, () -&gt; {
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
    Class&lt;?&gt; resolvedClass = resolveBeanClass(mbd, beanName);
    if (resolvedClass != null &amp;&amp; !mbd.hasBeanClass() &amp;&amp; mbd.getBeanClassName() != null) {
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
                &#34;BeanPostProcessor before instantiation of bean failed&#34;, ex);
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
    Class&lt;?&gt; beanType = instanceWrapper.getWrappedClass();
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
    boolean earlySingletonExposure = (mbd.isSingleton() &amp;&amp; this.allowCircularReferences &amp;&amp;
            isSingletonCurrentlyInCreation(beanName));
    if (earlySingletonExposure) {
        // 加入到 singletonFactory 中，当有循环引用时，调用 ObjectFactory#getObject 获取 bean
        addSingletonFactory(beanName, () -&gt; getEarlyBeanReference(beanName, mbd, bean));
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

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/spring-bean-%E5%88%9D%E5%A7%8B%E5%8C%96/  

