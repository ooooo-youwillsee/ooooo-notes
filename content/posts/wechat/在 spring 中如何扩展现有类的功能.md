---
title: 在 spring 中如何扩展现有类的功能
date: 2022-09-05T21:09:00+08:00
lastmod: 2022-09-05T21:01:00+08:00
draft: false
tags: [spring, spring-extension]
categories: [微信文章]
---

# 在 spring 中如何扩展现有类的功能

在 spring 中，我们常常会基于**现有的代码**来扩展之前的功能，或者**换一个实现的方式**。

## 原有的功能

假设我现在有这样的一个类 `PropertySources`, 用来获取**属性值**。

```java
public 
```