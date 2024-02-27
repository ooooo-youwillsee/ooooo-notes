# 

## 1、Exception 和 Error

- `Exception` 和 `Error` 都继承 `Throwable` 类，只有 `Throwable` 类的实例才可以抛出。
- `Exception` 是可以预料的意外情况，可以被捕获进行相应的处理。而 `Error` 是不太可能出现的情况，可能会造成程序终止，如 `OutOfMemoryError`（内存溢出）。
- `Exception` 分为可检查（checked）异常和不检查（unchecked）异常，可检查异常必须显式捕获处理，不检查异常就是运行时异常。如 `NullPointerException` 。

**常见的 Exception**

- `NullPointerException` （空指针异常）
- `ArrayIndexOutOfBoundsException` （数组越界异常）
- `NoSuchFileException` （文件没有找到异常）
- `InterruptedException` （线程被打断异常）
- `ClassCastException` （类型转换异常）

**常见的 Error**

- `NoClassDefFoundError` （类没有被找到错误）
- `OutOfMemoryError` （堆内存溢出错误）
- `StackOverflowError` （栈内存溢出错误）


## 2、try-catch-finally

```java
try (BuferedReader br = new BuferedReader(...);
    BuferedWriter writer = new BuferedWriter(...)) {
    // do something
catch ( IOException | XEception e) { // Multiple catch
    // Handle it 
} finally {
    // do something
}
```

**注意**

1. 尽量不要捕获 `Exception` 类型的异常，具体异常具体处理。
2. 不要生吞（swallow）异常，避免错误后出现难以诊断的情况，可以输出到日志中。

**Java 的异常处理机制会有额外的开销**

1. try-catch 的代码段会影响 JVM 的优化，尽量只捕获有必要的代码段。
2. Java 每实例化一个 `Exception`，就会对当前栈进行快照。



---

> 作者:   
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/old-notes/geektime/java-core-36/02/  

