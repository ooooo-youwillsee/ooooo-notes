---
title: 源码分析 nacos 删除配置
date: 2023-09-13T08:00:00+08:00
draft: false
tags: [ nacos, source code, 源码分析 nacos 系列 ]
categories: [ 源码分析 nacos 系列 ]
---

> nacos 基于 2.2.4 版本

在 `nacos` 中，**删除配置**分为 `http` 和 `grpc` 两种方式，分别为 `ConfigControllerV2#deleteConfig` 和 `ConfigRemoveRequestHandler`。这两个方法的处理逻辑都是**一样的**，所以我就选择 `http` 的方式来分析代码。

## 删除配置

源码位置: `com.alibaba.nacos.config.server.controller.v2.ConfigControllerV2#deleteConfig`

```java
// 接受 http 请求
public Result<Boolean> deleteConfig(HttpServletRequest request, @RequestParam("dataId") String dataId,
        @RequestParam("group") String group,
        @RequestParam(value = "namespaceId", required = false, defaultValue = StringUtils.EMPTY) String namespaceId,
        @RequestParam(value = "tag", required = false) String tag) throws NacosException {
    //fix issue #9783
    namespaceId = NamespaceUtil.processNamespaceParameter(namespaceId);
    // check namespaceId
    // 检查参数
    ParamUtils.checkTenantV2(namespaceId);
    ParamUtils.checkParam(dataId, group, "datumId", "rm");
    ParamUtils.checkParamV2(tag);
    
    String clientIp = RequestUtil.getRemoteIp(request);
    String srcUser = RequestUtil.getSrcUserName(request);
    // 删除配置
    return Result.success(configOperationService.deleteConfig(dataId, group, namespaceId, tag, clientIp, srcUser));
}
```

源码位置: `com.alibaba.nacos.config.server.service.ConfigOperationService#deleteConfig`

```java
// 删除配置
public Boolean deleteConfig(String dataId, String group, String namespaceId, String tag, String clientIp,
        String srcUser) {
    // 这个方法中没有删除 beta 配置，是因为有单独的接口来操作，接口为 ConfigController#stopBeta
    if (StringUtils.isBlank(tag)) {
        // 删除 configInfo 
        configInfoPersistService.removeConfigInfo(dataId, group, namespaceId, clientIp, srcUser);
    } else {
        // 删除 configInfoTag
        configInfoTagPersistService.removeConfigInfoTag(dataId, group, namespaceId, tag, clientIp, srcUser);
    }
    final Timestamp time = TimeUtils.getCurrentTime();
    // 记录日志
    ConfigTraceService.logPersistenceEvent(dataId, group, namespaceId, null, time.getTime(), clientIp,
            ConfigTraceService.PERSISTENCE_EVENT_REMOVE, null);
    // 发布 ConfigDataChangeEvent 事件，这个事件在发布配置章节中分析过了
    ConfigChangePublisher
            .notifyConfigChange(new ConfigDataChangeEvent(false, dataId, group, namespaceId, tag, time.getTime()));
    
    return true;
}
```

## 测试类

`com.alibaba.nacos.test.config.ConfigAPI_V2_CITCase#test`