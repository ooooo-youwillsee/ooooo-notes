# 使用 netty 的注意点


## 1. `HttpHelloWorldServerHandler` 为啥需要使用 `SimpleChannelInboundHandler` ?

`HttpObject` 的子类有 `LastHttpContent`, `HttpContent`, `HttpData`， 它需要手动调用 `release()`。

![netty HttpObject类图](/ooooo-notes/images/use-netty-01.png)




