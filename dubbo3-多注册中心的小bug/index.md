# dubbo3 多注册中心的小 bug


## 1. 配置

```yaml
dubbo:
  application:
    parameters:
      registry-type: service
  registries:
    a:
      address: nacos://172.16.1.104:7848
      group: DUBBO_SERVICE_GROUP
      parameters:
        namespace: a
    b:
      address: nacos://172.16.1.104:7848
      group: DUBBO_SERVICE_GROUP
      parameters:
        namespace: b
```

## 2. 问题

只会注册到一个 `namespace` 中

## 3. github

[dubbo issue](https://github.com/apache/dubbo/issues/12629)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/dubbo3-%E5%A4%9A%E6%B3%A8%E5%86%8C%E4%B8%AD%E5%BF%83%E7%9A%84%E5%B0%8Fbug/  

