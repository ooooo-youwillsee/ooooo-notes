# 在 java 中如何进行微基准测试 ?


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
    sb.append(&#34;hello&#34;);
    sb.append(&#34;world&#34;);
    return sb.toString();
  }


  @Benchmark
  public String stringBuffer() {
    StringBuffer sb = new StringBuffer();
    sb.append(&#34;hello&#34;);
    sb.append(&#34;world&#34;);
    return sb.toString();
  }

  @Benchmark
  public String stringConcat() {
    return &#34;hello&#34; &#43; &#34;world&#34;;
  }

}
```

## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/spring-boot-jmh)


## 3. 参考

&gt; 强烈建议大家看官方代码, 地址: https://github.com/openjdk/jmh

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-java-%E4%B8%AD%E5%A6%82%E4%BD%95%E8%BF%9B%E8%A1%8C%E5%BE%AE%E5%9F%BA%E5%87%86%E6%B5%8B%E8%AF%95/  

