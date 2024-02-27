# 在 java 中如何进行多线程测试


## 1. java 多线程测试

在任何语言中，**多线程测试**都是比较困难的，在这里我介绍下 java 的多线程测试 `jcstress`.

* `jcstress` 是 `OpenJDK` 提供的一个测试多线程的框架
* 主要由多个 `Actor` 来构成，每个 `Actor` 就是一个线程。
* 通过匹配 `Outcome` 的结果来报告测试
* 运行之后的结果为 `html` 文件，需要你自己查看。

示例代码:

* 测试自旋锁，其实也告诉你该怎么编写 `CAS`
* 执行命令 `gradle jcstress`，会生成目录 `build/reports/jcstress` 

```java
@JCStressTest
@Outcome(id = {&#34;1, 2&#34;, &#34;2, 1&#34;}, expect = Expect.ACCEPTABLE, desc = &#34;Mutex works&#34;)
@Outcome(id = &#34;1, 1&#34;, expect = Expect.FORBIDDEN, desc = &#34;Mutex failure&#34;)
@State
public class Mutex_03_SpinLock {

  private final AtomicBoolean taken = new AtomicBoolean(false);
  private int v;

  @Actor
  public void actor1(II_Result r) {
    while (taken.get() || !taken.compareAndSet(false, true))
      ; // wait
    { // critical section
      r.r1 = &#43;&#43;v;
    }
    taken.set(false);
  }

  @Actor
  public void actor2(II_Result r) {
    while (taken.get() || !taken.compareAndSet(false, true))
      ; // wait
    { // critical section
      r.r2 = &#43;&#43;v;
    }
    taken.set(false);
  }
}
```

## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/demo-java-jcstress)


## 3. 参考

&gt; 强烈建议大家看官方代码, 地址: https://github.com/openjdk/jcstress

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-java-%E4%B8%AD%E5%A6%82%E4%BD%95%E8%BF%9B%E8%A1%8C%E5%A4%9A%E7%BA%BF%E7%A8%8B%E6%B5%8B%E8%AF%95/  

