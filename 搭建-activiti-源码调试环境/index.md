# 搭建 activiti 源码调试环境


> activiti 基于 8.0.0 版本

## 下载源码和编译

```shell
git clone git@github.com:Activiti/Activiti.git

mvn clean package -DskipTests
```

## 运行示例程序

在源码中有模块 `activiti-examples/activiti-api-basic-full-example-bean`，这是一个 `spring boot` 应用，是可以直接启动的，默认是以**h2内存数据库**来运行的，建议使用**MySQL数据库**，这样的话，可以更方便来观察数据库中的数据。

大多数情况下，推荐你使用**测试类**来调试代码。 在模块 `activiti-core/activiti-engine` 下，`src/test/resources/activiti.cfg.xml` 中可以配置数据库，也建议使用**MySQL数据库**。

如果你能成功运行 `org.activiti.examples.bpmn.receivetask.ReceiveTaskTest#testWaitStateBehavior`, 说明你的环境没有问题了。
