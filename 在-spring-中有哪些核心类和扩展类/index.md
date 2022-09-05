# 在 spring 中有哪些核心类和扩展类



# 在 spring 中有哪些核心类和扩展类 ?

作为一个 Java 开发，Spring 的技术可以说是必须要掌握的，不仅仅是会使用，而且要掌握原理，学会扩展。
今天我就说说，哪些核心类和扩展类是必须要掌握的，同时我也说明这些扩展可以干什么，后面 Spring 文章，我会用到这些扩展类，让你学懂这些类。


## 核心类：

IOC容器:  `org.springframework.context.ApplicationContext`

配置类: `org.springframework.core.env.Environment`

Bean工厂：`org.springframework.beans.factory.BeanFactory`

事件发布器： `org.springframework.context.ApplicationEventPublisher`

资源加载器： `org.springframework.core.io.ResourceLoader`

上面这几个类，是我们经常会用到的。它们都有相应的 `Aware` 接口, 如 `org.springframework.context.ApplicationContextAware`, 可以设置 `applicationContext` 对象到**我们自己定义的 bean 对象中**.

注意这样 **setApplicationContext** 的方式比 **@Autowired** 注解注入 `applicationContext` 的方式的**时机要早很多**，所以一般推荐用 **setApplicationContext** 的方式。

相应的源码 `ApplicationContextAwareProcessor`


## 扩展类

beanFactory的后置处理器： `org.springframework.beans.factory.config.BeanFactoryPostProcessor`

bean的后置处理器： `org.springframework.beans.factory.config.BeanPostProcessor`

上面的两个类非常重要，如果你现在还不会熟练使用它们，说明 spring 掌握的很一般。

## 非常有用的类

代理工厂： `org.springframework.aop.framework.ProxyFactory`

bean工厂： `org.springframework.beans.factory.ObjectFactory`

属性绑定： `org.springframework.boot.context.properties.bind.Binder`

选择性导入bean: `org.springframework.context.annotation.ImportSelector`

上面这几个类，一般在扩展功能时，都会用到。

