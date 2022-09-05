---
title: 在 spring 中如何设计一个获取配置的接口
date: 2022-09-05T21:09:00+08:00
lastmod: 2022-09-05T21:01:00+08:00
draft: false
tags: [spring, spring-extension]
categories: [微信文章]
---

# 在 spring 中如何设计一个获取配置的接口 ?

## 1. 需求

希望根据 `propertyName` 来获取相应的 `propertyValue`, 这个接口需要支持**多种数据来源**。

## 2. 设计接口

很明显这个接口应该设计为这样, 有一个方法为 `Object getProperty(String name)` 来获取属性。

因为是在 spring 中，所以我就直接复用了 `org.springframework.core.env.PropertySource`, 但这个类需要**泛型**，所以我就随便实现了一个 `Map<String, String>` 的泛型，也不会用到这个。

抽象类的设计如下：

```java
public abstract class AbstractSimplePropertySource extends PropertySource<Map<String, String>> implements EnvironmentAware {
	
	protected Environment environment;
	
	public AbstractSimplePropertySource(String name) {
		super(name, Collections.emptyMap());
	}
	
	public void setEnvironment(@NonNull Environment environment) {
		this.environment = environment;
	}
	
	public Environment getEnvironment() {
		return environment;
	}
	
}
```