---
title: 12 集成 spring
date: 2023-12-24T08:00:00+08:00
draft: false
tags: [ dubbo, source code, 源码分析 dubbo 系列 ]
categories: [ 源码分析 dubbo 系列 ]
---

> dubbo 基于 3.2.6 版本

`dubbo` 集成 `spring` 的实现方式：

1. 提供 `ServiceAnnotationPostProcessor` 来扫描 `@DubboService` 注解，**导出服务**
2. 提供 `ReferenceAnnotationBeanPostProcessor` 来扫描 `@DubboReference` 注解，**引用服务**
3. 提供 `SpringExtensionInjector` 来获取 `spring` 的 `bean`
4. 提供 `DubboInfraBeanRegisterPostProcessor` 来**注册**相关类，加载 `spring` 配置

## ServiceAnnotationPostProcessor

对一个 `HelloService`, 会注册**两个** `beanDefinition`，分别为

- `HelloService`
- `ServiceBean<HelloService>`

源码位置: `org.apache.dubbo.config.spring.beans.factory.annotation.ServiceAnnotationPostProcessor#postProcessBeanFactory`

```java
@Override
public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
    // 扫描方法上的 @DubboService，这个很少用
    String[] beanNames = beanFactory.getBeanDefinitionNames();
    for (String beanName : beanNames) {
        BeanDefinition beanDefinition = beanFactory.getBeanDefinition(beanName);
        Map<String, Object> annotationAttributes = getServiceAnnotationAttributes(beanDefinition);
        if (annotationAttributes != null) {
            // process @DubboService at java-config @bean method
            processAnnotatedBeanDefinition(beanName, (AnnotatedBeanDefinition) beanDefinition, annotationAttributes);
        }
    }

    if (!scanned) {
        // 扫描类上的 @DubboService，这个继续解析
        scanServiceBeans(resolvedPackagesToScan, registry);
    }
}
```

源码位置: `org.apache.dubbo.config.spring.beans.factory.annotation.ServiceAnnotationPostProcessor#scanServiceBeans`

```java
private void scanServiceBeans(Set<String> packagesToScan, BeanDefinitionRegistry registry) {
    // 标记已扫描
    scanned = true;
    if (CollectionUtils.isEmpty(packagesToScan)) {
        return;
    }

    // 创建扫描器
    DubboClassPathBeanDefinitionScanner scanner =
            new DubboClassPathBeanDefinitionScanner(registry, environment, resourceLoader);

    BeanNameGenerator beanNameGenerator = resolveBeanNameGenerator(registry);
    scanner.setBeanNameGenerator(beanNameGenerator);
    // 添加注解过滤器，比如 @DubboService
    for (Class<? extends Annotation> annotationType : serviceAnnotationTypes) {
        scanner.addIncludeFilter(new AnnotationTypeFilter(annotationType));
    }

    ScanExcludeFilter scanExcludeFilter = new ScanExcludeFilter();
    scanner.addExcludeFilter(scanExcludeFilter);

    // 对每个包都进行扫描
    for (String packageToScan : packagesToScan) {
        // Registers @Service Bean first，这个会注册 spring bean
        scanner.scan(packageToScan);

        // Finds all BeanDefinitionHolders of @Service whether @ComponentScan scans or not.
        Set<BeanDefinitionHolder> beanDefinitionHolders =
                findServiceBeanDefinitionHolders(scanner, packageToScan, registry, beanNameGenerator);
        // 有 @DubboService 的 beanDefintion 
        if (!CollectionUtils.isEmpty(beanDefinitionHolders)) {
            if (logger.isInfoEnabled()) {
                List<String> serviceClasses = new ArrayList<>(beanDefinitionHolders.size());
                for (BeanDefinitionHolder beanDefinitionHolder : beanDefinitionHolders) {
                    serviceClasses.add(beanDefinitionHolder.getBeanDefinition().getBeanClassName());
                }
                logger.info("Found " + beanDefinitionHolders.size() + " classes annotated by Dubbo @Service under package [" + packageToScan + "]: " + serviceClasses);
            }

            for (BeanDefinitionHolder beanDefinitionHolder : beanDefinitionHolders) {
                // 处理 beanDefinition，很重要
                processScannedBeanDefinition(beanDefinitionHolder);
                servicePackagesHolder.addScannedClass(beanDefinitionHolder.getBeanDefinition().getBeanClassName());
            }
        } else {
            ...
        }
        // 标记已扫描
        servicePackagesHolder.addScannedPackage(packageToScan);
    }
}
```

源码位置: `org.apache.dubbo.config.spring.beans.factory.annotation.ServiceAnnotationPostProcessor#processScannedBeanDefinition`

```java
private void processScannedBeanDefinition(BeanDefinitionHolder beanDefinitionHolder) {
    Class<?> beanClass = resolveClass(beanDefinitionHolder);
    // 找到 @DubboService 
    Annotation service = findServiceAnnotation(beanClass);

    // The attributes of @Service annotation
    Map<String, Object> serviceAnnotationAttributes = AnnotationUtils.getAttributes(service, true);
    String serviceInterface = resolveInterfaceName(serviceAnnotationAttributes, beanClass);
    String annotatedServiceBeanName = beanDefinitionHolder.getBeanName();

    // ServiceBean Bean name
    String beanName = generateServiceBeanName(serviceAnnotationAttributes, serviceInterface);
    // 构建 ServiceBeanDefinition, 也就是 dubbo 的 ServiceBean, 里面的 ref 属性会引用 spring bean 
    AbstractBeanDefinition serviceBeanDefinition =
            buildServiceBeanDefinition(serviceAnnotationAttributes, serviceInterface, annotatedServiceBeanName);
    // 注册 ServiceBeanDefinition
    registerServiceBeanDefinition(beanName, serviceBeanDefinition, serviceInterface);
}
```

## ReferenceAnnotationBeanPostProcessor

源码位置: `org.apache.dubbo.config.spring.beans.factory.annotation.ReferenceAnnotationBeanPostProcessor#postProcessBeanFactory`

```java
@Override
public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
    // 遍历所有的 beanName
    String[] beanNames = beanFactory.getBeanDefinitionNames();
    for (String beanName : beanNames) {
        Class<?> beanType;
        // 解析出 beanType
        if (beanFactory.isFactoryBean(beanName)) {
            ...
            beanType = ClassUtils.resolveClass(beanClassName, getClassLoader());
        } else {
            beanType = beanFactory.getType(beanName);
        }
        if (beanType != null) {
            AnnotatedInjectionMetadata metadata = findInjectionMetadata(beanName, beanType, null);
            try {
                // 注入字段和方法
                prepareInjection(metadata);
            } catch (BeansException e) {
                throw e;
            } catch (Exception e) {
                throw new IllegalStateException("Prepare dubbo reference injection element failed", e);
            }
        }
    }
    ...
}
```

源码位置: `org.apache.dubbo.config.spring.beans.factory.annotation.ReferenceAnnotationBeanPostProcessor#prepareInjection`

```java
protected void prepareInjection(AnnotatedInjectionMetadata metadata) throws BeansException {
    try {
        //find and register bean definition for @DubboReference/@Reference
        // 遍历字段
        for (AnnotatedFieldElement fieldElement : metadata.getFieldElements()) {
            if (fieldElement.injectedObject != null) {
                continue;
            }
            Class<?> injectedType = fieldElement.field.getType();
            AnnotationAttributes attributes = fieldElement.attributes;
            // 注册 @DubboReference bean, 也就是 dubbo 的 ReferenceBean
            String referenceBeanName = registerReferenceBean(fieldElement.getPropertyName(), injectedType, attributes, fieldElement.field);

            //associate fieldElement and reference bean
            // 设置关联
            fieldElement.injectedObject = referenceBeanName;
            injectedFieldReferenceBeanCache.put(fieldElement, referenceBeanName);
        }

        // 遍历方法
        for (AnnotatedMethodElement methodElement : metadata.getMethodElements()) {
            if (methodElement.injectedObject != null) {
                continue;
            }
            Class<?> injectedType = methodElement.getInjectedType();
            AnnotationAttributes attributes = methodElement.attributes;
            // 注册 @DubboReference bean, 也就是 dubbo 的 ReferenceBean
            String referenceBeanName = registerReferenceBean(methodElement.getPropertyName(), injectedType, attributes, methodElement.method);

            //associate methodElement and reference bean
            // 设置关联
            methodElement.injectedObject = referenceBeanName;
            injectedMethodReferenceBeanCache.put(methodElement, referenceBeanName);
        }
    } catch (ClassNotFoundException e) {
        throw new BeanCreationException("prepare reference annotation failed", e);
    }
}
```

## SpringExtensionInjector

我们常常需要扩展自己的 `filter`，如果在这个类中需要**获取** `spring` 的 `bean`，就会用到这个**扩展类**。

源码位置: `org.apache.dubbo.config.spring.extension.SpringExtensionInjector#getInstance`

```java
// type: 字段类型
// name: 字段名称
// 字段是需要 setter 方法
public <T> T getInstance(Class<T> type, String name) {
    if (context == null) {
        // ignore if spring context is not bound
        return null;
    }

    //check @SPI annotation
    if (type.isInterface() && type.isAnnotationPresent(SPI.class)) {
        return null;
    }

    // 最终调用 spring 的 BeanFactory 来获取 bean
    T bean = getOptionalBean(context, name, type);
    if (bean != null) {
        return bean;
    }

    //logger.warn("No spring extension (bean) named:" + name + ", try to find an extension (bean) of type " + type.getName());
    return null;
}
```

## DubboInfraBeanRegisterPostProcessor

源码位置: `org.apache.dubbo.config.spring.context.DubboInfraBeanRegisterPostProcessor#postProcessBeanFactory`

```java
@Override
public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
    if (registry != null) {
        // 注册 ReferenceAnnotationBeanPostProcessor, 负责扫描 @DubboReference
        ReferenceAnnotationBeanPostProcessor referenceAnnotationBeanPostProcessor = beanFactory.getBean(
            ReferenceAnnotationBeanPostProcessor.BEAN_NAME, ReferenceAnnotationBeanPostProcessor.class);
        beanFactory.addBeanPostProcessor(referenceAnnotationBeanPostProcessor);

        // register PropertySourcesPlaceholderConfigurer bean if not exits
        DubboBeanUtils.registerPlaceholderConfigurerBeanIfNotExists(beanFactory, registry);
    }
    ApplicationModel applicationModel = DubboBeanUtils.getApplicationModel(beanFactory);
    ModuleModel moduleModel = DubboBeanUtils.getModuleModel(beanFactory);

    // 初始化 SpringExtensionInjector
    SpringExtensionInjector.get(applicationModel).init(applicationContext);
    SpringExtensionInjector.get(moduleModel).init(applicationContext);
    DubboBeanUtils.getInitializationContext(beanFactory).setApplicationContext(applicationContext);

    // 将 spring 的 environment 传递到 dubbo 的 environment 中，重要
    ConfigurableEnvironment environment = (ConfigurableEnvironment) applicationContext.getEnvironment();
    SortedMap<String, String> dubboProperties = EnvironmentUtils.filterDubboProperties(environment);
    applicationModel.modelEnvironment().getAppConfigMap().putAll(dubboProperties);
    ...
}
```

