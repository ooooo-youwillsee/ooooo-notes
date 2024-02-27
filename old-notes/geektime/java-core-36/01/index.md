# 

## 1、Java本身有两个显著的特性

&gt; JRE 就是 Java 运行环境， JDK 就是 Java 开发工具包

- 跨平台运行（一次编写，到处运行）
- 垃圾回收器（程序员不用手动回收内存，但仍然可能存在内存泄漏）

## 2、Java是解析执行？（不太正确）

我们开发的 java 源代码，经过 javac 编译成为字节码，在运行时，通过 JVM 内置的解析器将字节码装换为机器码。

常见的 JVM， 比如 Oracle 的 Hotspot JVM，提供了 JIT（Just-In-Time）动态编译器。

在主流的 Java 版本中，Java 8 采用混合模式`-Xmixed`进行。

Oracle Hotspot JVM 提供了两种不同的 JIT 编译器，C1 对应 client 模式，适用于启动敏感的应用，C2 对应 server 模式，适用于长时间运行的服务器。默认采用的是分层编译。

JVM 启动时，可以通过指定不同的参数对运行模式选择。

- `-Xint`  JVM 只进行解释执行。
- `-Xcomp` JVM 只进行编译执行。

除了上面的编译方式，还有一种新的编译方式（AOT），就是直接把字节码编译为机器码。

利用下面的命令把某个类或者某个模块编译成为AOT库

``` shell script
jaotc --output libHelloWorld.so HelloWorld.class
jaotc --output libjava.base.so --module java.base
```

然后在启动时直接指定

```shell script
java -XX:AOTLibrary=./libHelloWorld.so,./libjava.base.so HelloWorld
```











---

> 作者:   
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/old-notes/geektime/java-core-36/01/  

