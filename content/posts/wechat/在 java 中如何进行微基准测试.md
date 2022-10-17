---
title: 在 java 中如何进行微基准测试 ?
date: 2022-10-16T09:00:00+08:00
draft: false
tags: [java]
categories: [微信文章]
---

## 1. jmh 微基准测试

实际上，在 java 中进行**微基椎测试**并不容易，主要原因在于**解释执行**，**编译执行**，而编译执行又分为 **C1编译**, **C2编译**。即使是对同一个代码来说，不同的 jvm 参数也会导致测试不一样。

那是否应该了解微基准测试？ 我的答案，是必须掌握的。

`jmh` 就是我们应该学习的`微基准测试`的框架。

下面我以一个示例来说明如何快速上手测试，测试 `StringBuilder`， `StringBuffer`， `String` 连接字符的性能。

注意点：
* Fork 参数可以测试不同的 Jvm 参数。
* 输出结果的时间单位最好是**纳秒**。
* 测试模式可以自由选择，如果测试性能，最好选择**平均时间**。
* 如果是在 IDE 中，建议安装 jmh 插件来执行。

代码示例
```java
// 预热的参数
@Warmup(time = 1)
// 测试的参数
@Measurement(time = 1)
// 可以添加 JVM 参数来测试
@Fork(value = 1)
@State(Scope.Thread)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@BenchmarkMode(Mode.AverageTime)
public class TestStringBenchmark {

  @Benchmark
  public String stringBuilder() {
    StringBuilder sb = new StringBuilder();
    sb.append("hello");
    sb.append("world");
    return sb.toString();
  }


  @Benchmark
  public String stringBuffer() {
    StringBuffer sb = new StringBuffer();
    sb.append("hello");
    sb.append("world");
    return sb.toString();
  }

  @Benchmark
  public String stringConcat() {
    return "hello" + "world";
  }

}
```

## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/spring-boot-jmh)


## 3. 参考

> 强烈建议大家看官方代码, 地址: https://github.com/openjdk/jmh