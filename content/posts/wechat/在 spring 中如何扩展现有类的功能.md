---
title: 在 spring 中如何扩展现有类的功能
date: 2022-09-05T21:09:00+08:00
lastmod: 2022-09-05T21:01:00+08:00
draft: false
tags: [java, spring, spring-extension]
categories: [微信文章]
---

# 在 spring 中如何扩展现有类的功能

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

由于之前的功能是**根据 key 来获取 value **的，而现在需要**根据业务编号和 key 来获取 value**。

* 先根据 businType.key1 来获取 value
* 如果结果不是 null，则返回
* 如果结果是 null， 再根据 key1 来获取 value

根据上面的描述，也就是优先取**业务类型的配置**

因为我们的功能实际上在上一篇就已经完成了，所以在这一节中，只需要**扩展原有的功能**就行了。

这里我使用 ``