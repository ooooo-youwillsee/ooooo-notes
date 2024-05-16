# 使用 Netty 的注意点


## 1. `HttpHelloWorldServerHandler` 为啥需要使用 `SimpleChannelInboundHandler` ?

`HttpObject` 的子类有 `LastHttpContent`, `HttpContent`, `HttpData`， 它需要手动调用 `release()`。

![netty HttpObject类图](/ooooo-notes/images/use-netty-01.png)





---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E4%BD%BF%E7%94%A8-netty-%E7%9A%84%E6%B3%A8%E6%84%8F%E7%82%B9/  

