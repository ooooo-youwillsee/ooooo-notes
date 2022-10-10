---
title: 在 spring 中如何扩展现有类的功能 ?
date: 2022-09-05T21:09:00+08:00
lastmod: 2022-09-05T21:01:00+08:00
draft: false
tags: [java, spring, spring-extension]
categories: [微信文章]
---

在 spring 中，我们常常会基于**现有的代码**来扩展之前的功能，或者**换一个实现的方式**。

## 1. 原有的功能

在这里基于之前的功能**获取属性**来继续深入。

大致代码如下

```java
@Slf4j
@Order
public class CompositePropertySources implements PropertySources {
	
	private final MutablePropertySources mutablePropertySources = new MutablePropertySources();
	
	public CompositePropertySources(List<AbstractSimplePropertySource> sources) {
		if (sources == null) return;
		AnnotationAwareOrderComparator.sort(sources);
		for (AbstractSimplePropertySource source : sources) {
			mutablePropertySources.addLast(source);
		}
	}
	
	public boolean containsProperty(String name) {
		return stream().anyMatch(p -> p.containsProperty(name));
	}
	
	public String getProperty(String name) {
		return isBlank(name) ? name : getProperty(name, null);
	}
	
	public String getProperty(String propertyName, String defaultValue) {
		String value = null;
		for (PropertySource<?> ps : mutablePropertySources) {
			value = (String) ps.getProperty(propertyName);
			if (value != null) {
				return value;
			}
		}
		return defaultValue;
	}
	
	public Map<String, String> getProperties(String... propertyNames) {
		if (propertyNames != null) {
			Map<String, String> map = new HashMap<>();
			for (String key : propertyNames) {
				map.put(key, getProperty(key, null));
			}
			return map;
		}
		return null;
	}
}
```


## 2. 新的需求

由于之前的功能是**根据 key 来获取 value**的，而现在需要**根据业务编号和 key 来获取 value**。

* 先根据 businType.key 来获取 value
* 如果结果不是 null，则返回
* 如果结果是 null， 再根据 key 来获取 value

根据上面的描述，也就是优先取**业务类型的配置**

因为我们的功能实际上在上一篇就已经完成了，所以在这一节中，只需要**扩展原有的功能**就行了。

这里我使用 `BeanPostProcessor` 来进行扩展，选择这个类的原因是**原有的 bean 已经生成了，无需更改 bean 定义**.

实现如下：

* 判断 bean 是否为 `CompositePropertySources` 的实例
* 使用 `ProxyCompositePropertySources` 对象来代替**原有的类**
* 使用 `propertyNamesFunction` 来分隔 `propertyName`

```java
@Component
public class CompositePropertySourcesBeanPostProcessor implements BeanPostProcessor {

  @Override
  public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
    if (bean instanceof CompositePropertySources) {
      return new ProxyCompositePropertySources((CompositePropertySources) bean);
    }

    return bean;
  }

  protected static class ProxyCompositePropertySources extends CompositePropertySources {

    private final CompositePropertySources compositePropertySources;

    public ProxyCompositePropertySources(CompositePropertySources compositePropertySources) {
      super(null);
      this.compositePropertySources = compositePropertySources;
    }

    @Override
    public String getProperty(String propertyName, String defaultValue) {
      String[] propertyNames = propertyNamesFunction.apply(propertyName);

      for (String p : propertyNames) {
        String v = compositePropertySources.getProperty(p);
        if (v != null) {
          return v;
        }
      }

      return defaultValue;
    }

    @Override
    public boolean containsProperty(String propertyName) {
      String[] propertyNames = propertyNamesFunction.apply(propertyName);

      for (String p : propertyNames) {
        boolean contains = compositePropertySources.containsProperty(p);
        if (contains) {
          return true;
        }
      }

      return false;
    }
  }

  private static final Function<String, String[]> propertyNamesFunction = (propertyName) -> {
    if (propertyName == null) {
      return new String[0];
    }

    propertyName = propertyName.trim();

    if (propertyName.contains(".")) {
      return new String[]{propertyName, propertyName.substring(propertyName.lastIndexOf(".") + 1)};
    }

    return new String[]{propertyName};
  };
}
```

## 3. 完整代码实现

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/spring-boot-compositePropertySourcesExt)


