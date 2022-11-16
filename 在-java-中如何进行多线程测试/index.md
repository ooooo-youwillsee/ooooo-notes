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
@Outcome(id = {"1, 2", "2, 1"}, expect = Expect.ACCEPTABLE, desc = "Mutex works")
@Outcome(id = "1, 1", expect = Expect.FORBIDDEN, desc = "Mutex failure")
@State
public class Mutex_03_SpinLock {

  private final AtomicBoolean taken = new AtomicBoolean(false);
  private int v;

  @Actor
  public void actor1(II_Result r) {
    while (taken.get() || !taken.compareAndSet(false, true))
      ; // wait
    { // critical section
      r.r1 = ++v;
    }
    taken.set(false);
  }

  @Actor
  public void actor2(II_Result r) {
    while (taken.get() || !taken.compareAndSet(false, true))
      ; // wait
    { // critical section
      r.r2 = ++v;
    }
    taken.set(false);
  }
}
```

## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/demo-java-jcstress)


## 3. 参考

> 强烈建议大家看官方代码, 地址: https://github.com/openjdk/jcstress
