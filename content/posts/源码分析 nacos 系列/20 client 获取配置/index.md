---
title: 20 client 获取配置
date: 2023-09-15T08:00:00+08:00
draft: false
tags: [ nacos, source code, 源码分析 nacos 系列 ]
collections: [ 源码分析 nacos 系列 ]
---

> nacos 基于 2.2.4 版本

> 这里的 `client` 是指 `nacos SDK`，也就是模块 `nacos-client`.

## 获取配置

源码位置: `com.alibaba.nacos.client.config.NacosConfigService#getConfig`

```java
// 获取配置
@Override
public String getConfig(String dataId, String group, long timeoutMs) throws NacosException {
    return getConfigInner(namespace, dataId, group, timeoutMs);
}
```

源码位置: `com.alibaba.nacos.client.config.NacosConfigService#getConfigInner`

```java
// 获取配置
private String getConfigInner(String tenant, String dataId, String group, long timeoutMs) throws NacosException {
    group = blank2defaultGroup(group);
    // 检查参数
    ParamUtils.checkKeyParam(dataId, group);
    ConfigResponse cr = new ConfigResponse();
    
    cr.setDataId(dataId);
    cr.setTenant(tenant);
    cr.setGroup(group);
    
    // We first try to use local failover content if exists.
    // A config content for failover is not created by client program automatically,
    // but is maintained by user.
    // This is designed for certain scenario like client emergency reboot,
    // changing config needed in the same time, while nacos server is down.
    // 是否从本地获取, 默认不是
    String content = LocalConfigInfoProcessor.getFailover(worker.getAgentName(), dataId, group, tenant);
    if (content != null) {
        LOGGER.warn("[{}] [get-config] get failover ok, dataId={}, group={}, tenant={}, config={}",
                worker.getAgentName(), dataId, group, tenant, ContentUtils.truncateContent(content));
        cr.setContent(content);
        String encryptedDataKey = LocalEncryptedDataKeyProcessor
                .getEncryptDataKeyFailover(agent.getName(), dataId, group, tenant);
        cr.setEncryptedDataKey(encryptedDataKey);
        configFilterChainManager.doFilter(null, cr);
        content = cr.getContent();
        return content;
    }
    
    try {
        // 获取配置，发送 ConfigQueryRequest 请求，会被 ConfigQueryRequestHandler 处理
        ConfigResponse response = worker.getServerConfig(dataId, group, tenant, timeoutMs, false);
        cr.setContent(response.getContent());
        cr.setEncryptedDataKey(response.getEncryptedDataKey());
        // 加解密
        configFilterChainManager.doFilter(null, cr);
        content = cr.getContent();
        
        return content;
    } catch (NacosException ioe) {
        if (NacosException.NO_RIGHT == ioe.getErrCode()) {
            throw ioe;
        }
        LOGGER.warn("[{}] [get-config] get from server error, dataId={}, group={}, tenant={}, msg={}",
                worker.getAgentName(), dataId, group, tenant, ioe.toString());
    }

    // 获取本地快照, 返回
    content = LocalConfigInfoProcessor.getSnapshot(worker.getAgentName(), dataId, group, tenant);
    if (content != null) {
        LOGGER.warn("[{}] [get-config] get snapshot ok, dataId={}, group={}, tenant={}, config={}",
                worker.getAgentName(), dataId, group, tenant, ContentUtils.truncateContent(content));
    }
    cr.setContent(content);
    String encryptedDataKey = LocalEncryptedDataKeyProcessor
            .getEncryptDataKeySnapshot(agent.getName(), dataId, group, tenant);
    cr.setEncryptedDataKey(encryptedDataKey);
    configFilterChainManager.doFilter(null, cr);
    content = cr.getContent();
    return content;
}
```