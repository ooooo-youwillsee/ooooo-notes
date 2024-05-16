# 在 Java 中如何使用 Grpc


## grpc 使用方式

`grpc` 作为一个**通信**方式，现在可以说是**非常流行**。如果不会 `grpc`，你可能跟不上时代了, 这里我只是做一个很简单的例子，并说下如何进一步学习 `grpc`。


`grpc` 接口需要编写 `.proto` 文件，如下面的例子：

* 有一个接口类：`Greeter`.
* 有两个方法 `SayHello`, `SayHi`.

```
syntax = &#34;proto3&#34;;

option java_multiple_files = true;
option java_package = &#34;com.ooooo.grpc.helloworld&#34;;
option java_outer_classname = &#34;HelloWorldProto&#34;;

package helloworld;

// The greeting service definition.
service Greeter {
  // Sends a greeting
  rpc SayHello (HelloRequest) returns (HelloReply) {}
  rpc SayHi (HelloRequest) returns (HelloReply) {}
}

// The request message containing the user&#39;s name.
message HelloRequest {
  string name = 1;
}

// The response message containing the greetings
message HelloReply {
  string message = 1;
}

```

在这里，我很推荐大家看下，`protobuf 是怎么编码的`。

&gt; proto3, 官方地址： https://developers.google.com/protocol-buffers/docs/proto3
&gt; proto3 encoding, 官方地址： https://developers.google.com/protocol-buffers/docs/encoding


编写完 `.proto` 文件，执行 `gradle` 的 `generateProto` 任务, 就会生成相应的 java 代码。

然后编写入口程序 `GrpcClient` 和 `GrpcServer`。


## 如何进一步学习 grpc

* 学习 `grpc` 如何使用，如何扩展，可以看 https://github.com/grpc/grpc-java/tree/master/examples.
* 在 `spring-boot` 中如何使用，有开源的 `starter`.
* `grpc` 是基于 `http2` 协议的，你必须熟悉 `http2` 协议。
* 更深入的学习，也就是学习源码，有时间给大家说下 `grpc` 的源码，也是比较简单的。



## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/spring-boot-grpc)


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-java-%E4%B8%AD%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8-grpc/  

