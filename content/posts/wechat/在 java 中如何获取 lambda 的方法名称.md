---
title: 在 java 中如何获取 lambda 的方法名称?
date: 2022-10-11T22:25:00+08:00
draft: false
tags: [IDE]
categories: [微信文章]
---

我们在开发过程中，经常会使用 lambda 函数式编程，这样会更加简单。

## 1. 使用方式

比如下面有一个很简单的 `User` 类。其中有一个属性 `username`

```java
@Data
public class User {

	private String username;

	public String getPassword(String password) {
		return password;
	}
}

// 使用的方式
// user -> user.getUsername() 等价于 User::getUsername 
Function<User, String> getUsername1 = User::getUsername
```

比如我现在要使用 `user -> user.getUsername()`， 这样的 lambda 表达式来获取一个 `User` 对象的 `username` 属性值。

我现在可以这样来获取 `username` 这个方法名称。

```java
public class LambdaUtils {

	// 正常情况，要做缓存
	public static <T> String resolveMethod(SFunction<T, ?> func) {
		SerializedLambda serializedLambda = resovle(func);
		String methodName = serializedLambda.getImplMethodName();
		return methodName;
	}

	@SneakyThrows
	public static SerializedLambda resovle(SFunction<?, ?> func) {
		Method method = func.getClass().getDeclaredMethod("writeReplace");
		method.setAccessible(true);
		return (SerializedLambda) method.invoke(func);
	}
}
```

## 2. 代码实现位置

本节的内容，我叙述的不是很好，可能看的一脸懵, 使用过 `mybatis-plus` 的人，可能会有点印象 `LambdaQueryWrapper`，

推荐看下这个测试类 `LambdaUtilsTests`

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/spring-boot-lambda)




