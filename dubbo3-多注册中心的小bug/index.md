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
