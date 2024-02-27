# 在 spring 中如何扩展现有类的功能2 ?


在 spring 中，我们常常会基于**现有的代码**来扩展之前的功能，或者**换一个实现的方式**。

在上一篇中，我使用 `BeanPostProcessor` 来进行扩展。

而在这一篇中，我使用 `BeanDefinitionRegistryPostProcessor` 来进行扩展。

由于已经实现过一次，我这里就不多说了。

## 1. 实现思路

* 判断 `beanName`
* 删除原有的 `beanDefinition`
* 注册新的 `beanDefinition`

注意点：

* 新实现的类，必须要是 `CompositePropertySources` 的子类，否则**注入会有问题**
* 所有方法都必须重新实现一遍，无法复用父类的方法

```java

@Component
public class CompositePropertySourcesBeanDefinitionRegistry implements BeanDefinitionRegistryPostProcessor {

  public static final String COMPOSITE_PROPERTY_SOURCES_BEAN_NAME = &#34;compositePropertySources&#34;;

  @Override
  public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) throws BeansException {
    if (registry.containsBeanDefinition(COMPOSITE_PROPERTY_SOURCES_BEAN_NAME)) {
      registry.removeBeanDefinition(COMPOSITE_PROPERTY_SOURCES_BEAN_NAME);

      RootBeanDefinition definition = new RootBeanDefinition(ProxyCompositePropertySources.class);
      definition.setAutowireMode(AbstractBeanDefinition.AUTOWIRE_CONSTRUCTOR);

      registry.registerBeanDefinition(COMPOSITE_PROPERTY_SOURCES_BEAN_NAME, definition);
    }
  }

  @Override
  public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {

  }
}

```

## 2. 如何选择

* 如果是改进之前的功能，就使用第一种方式, `BeanPostProcessor`
* 如果是重写之前的功能，就使用第二种方式, `BeanDefinitionRegistryPostProcessor`
* 如果不好选择，就啥用第二种方式，也是最强大的。

## 2. 完整代码实现

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/spring-boot-compositePropertySourcesExt2)




---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-spring-%E4%B8%AD%E5%A6%82%E4%BD%95%E6%89%A9%E5%B1%95%E7%8E%B0%E6%9C%89%E7%B1%BB%E7%9A%84%E5%8A%9F%E8%83%BD2/  

