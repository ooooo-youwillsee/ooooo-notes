# h2 数据库使用


怎么使用 h2 数据库。

## 1. 引入依赖

```groovy
dependencies {
  api(&#39;p6spy:p6spy&#39;)
  api(&#39;com.h2database:h2&#39;)
}

```

## 2. 以内存的方式使用

```yaml
# spring boot 配置
spring:
  datasource:
    driverClassName: com.p6spy.engine.spy.P6SpyDriver
    url: jdbc:p6spy:h2:mem:test;DB_CLOSE_DELAY=1000

```

## 3. 以进程的方式使用

```shell
# 启动 h2 数据库
java -cp h2*.jar org.h2.tools.Server -ifNotExists

# 启动 h2 console (可选)
java -cp h2*.jar org.h2.tools.Console

# 连接配置，会自动创建文件
url: jdbc:h2:tcp://localhost/~/test
```

## 4. 参考

&gt; 1. [官方文档](http://www.h2database.com/html/tutorial.html#using_server)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/h2-%E6%95%B0%E6%8D%AE%E5%BA%93%E4%BD%BF%E7%94%A8/  

