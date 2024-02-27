# 17 获取配置


&gt; nacos 基于 2.2.4 版本

在 `nacos` 中，**获取配置**分为 `http` 和 `grpc` 两种方式，分别为 `ConfigControllerV2#getConfig` 和 `ConfigQueryRequestHandler`。这两个方法的处理逻辑都是**一样的**，所以我就选择 `http` 的方式来分析代码。

## 获取配置

源码位置: `com.alibaba.nacos.config.server.controller.v2.ConfigControllerV2#getConfig`

```java
// 接受 http 请求
public void getConfig(HttpServletRequest request, HttpServletResponse response,
        @RequestParam(&#34;dataId&#34;) String dataId, @RequestParam(&#34;group&#34;) String group,
        @RequestParam(value = &#34;namespaceId&#34;, required = false, defaultValue = StringUtils.EMPTY) String namespaceId,
        @RequestParam(value = &#34;tag&#34;, required = false) String tag)
        throws NacosException, IOException, ServletException {
    // check namespaceId
    // 检查参数
    ParamUtils.checkTenantV2(namespaceId);
    namespaceId = NamespaceUtil.processNamespaceParameter(namespaceId);
    // check params
    ParamUtils.checkParam(dataId, group, &#34;datumId&#34;, &#34;content&#34;);
    ParamUtils.checkParamV2(tag);
    final String clientIp = RequestUtil.getRemoteIp(request);
    String isNotify = request.getHeader(&#34;notify&#34;);
    // 获取配置
    inner.doGetConfig(request, response, dataId, group, namespaceId, tag, isNotify, clientIp, true);
}
```

源码位置: `com.alibaba.nacos.config.server.controller.ConfigServletInner#doGetConfig`

```java
// 获取配置
public String doGetConfig(HttpServletRequest request, HttpServletResponse response, String dataId, String group,
        String tenant, String tag, String isNotify, String clientIp, boolean isV2)
        throws IOException, ServletException {
    
    ...
    final String groupKey = GroupKey2.getKey(dataId, group, tenant);
    String autoTag = request.getHeader(&#34;Vipserver-Tag&#34;);
    
    String requestIpApp = RequestUtil.getAppName(request);
    // 获取读锁
    int lockResult = tryConfigReadLock(groupKey);
    
    final String requestIp = RequestUtil.getRemoteIp(request);
    boolean isBeta = false;
    boolean isSli = false;
    // 获取锁成功
    if (lockResult &gt; 0) {
        // LockResult &gt; 0 means cacheItem is not null and other thread can`t delete this cacheItem
        FileInputStream fis = null;
        try {
            String md5 = Constants.NULL;
            long lastModified = 0L;
            CacheItem cacheItem = ConfigCacheService.getContentCache(groupKey);
            // 判断配置是否为 beta
            if (cacheItem.isBeta() &amp;&amp; cacheItem.getIps4Beta().contains(clientIp)) {
                isBeta = true;
            }
            
            ...        
            File file = null;
            ConfigInfoBase configInfoBase = null;
            PrintWriter out;
            // 下面的逻辑分为 beta 和 tag，分别读取不同的表或者文件
            if (isBeta) {
                md5 = cacheItem.getMd54Beta();
                lastModified = cacheItem.getLastModifiedTs4Beta();
                if (PropertyUtil.isDirectRead()) {
                    configInfoBase = configInfoBetaPersistService.findConfigInfo4Beta(dataId, group, tenant);
                } else {
                    file = DiskUtil.targetBetaFile(dataId, group, tenant);
                }
                response.setHeader(&#34;isBeta&#34;, &#34;true&#34;);
            } else {
                if (StringUtils.isBlank(tag)) {
                    if (isUseTag(cacheItem, autoTag)) {
                        if (cacheItem.tagMd5 != null) {
                            md5 = cacheItem.tagMd5.get(autoTag);
                        }
                        if (cacheItem.tagLastModifiedTs != null) {
                            lastModified = cacheItem.tagLastModifiedTs.get(autoTag);
                        }
                        // 从 configInfoTag 中读取
                        if (PropertyUtil.isDirectRead()) {
                            configInfoBase = configInfoTagPersistService.findConfigInfo4Tag(dataId, group, tenant, autoTag);
                        } else {
                            file = DiskUtil.targetTagFile(dataId, group, tenant, autoTag);
                        }
                        
                        response.setHeader(com.alibaba.nacos.api.common.Constants.VIPSERVER_TAG,
                                URLEncoder.encode(autoTag, StandardCharsets.UTF_8.displayName()));
                    } else {
                        md5 = cacheItem.getMd5();
                        lastModified = cacheItem.getLastModifiedTs();
                        // 从 configInfo 中读取
                        if (PropertyUtil.isDirectRead()) {
                            configInfoBase = configInfoPersistService.findConfigInfo(dataId, group, tenant);
                        } else {
                            file = DiskUtil.targetFile(dataId, group, tenant);
                        }
                        if (configInfoBase == null &amp;&amp; fileNotExist(file)) {
                            // FIXME CacheItem
                            // No longer exists. It is impossible to simply calculate the push delayed. Here, simply record it as - 1.
                            ConfigTraceService.logPullEvent(dataId, group, tenant, requestIpApp, -1,
                                    ConfigTraceService.PULL_EVENT_NOTFOUND, -1, requestIp, notify);
                            
                            // pullLog.info(&#34;[client-get] clientIp={}, {},
                            // no data&#34;,
                            // new Object[]{clientIp, groupKey});
                            
                            // 没有配置，返回404
                            return get404Result(response, isV2);
                        }
                        isSli = true;
                    }
                } else {
                    if (cacheItem.tagMd5 != null) {
                        md5 = cacheItem.tagMd5.get(tag);
                    }
                    if (cacheItem.tagLastModifiedTs != null) {
                        Long lm = cacheItem.tagLastModifiedTs.get(tag);
                        if (lm != null) {
                            lastModified = lm;
                        }
                    }
                    // 从 configInfoTag 中读取
                    if (PropertyUtil.isDirectRead()) {
                        configInfoBase = configInfoTagPersistService.findConfigInfo4Tag(dataId, group, tenant, tag);
                    } else {
                        file = DiskUtil.targetTagFile(dataId, group, tenant, tag);
                    }
                    if (configInfoBase == null &amp;&amp; fileNotExist(file)) {
                        // FIXME CacheItem
                        // No longer exists. It is impossible to simply calculate the push delayed. Here, simply record it as - 1.
                        ConfigTraceService.logPullEvent(dataId, group, tenant, requestIpApp, -1,
                                ConfigTraceService.PULL_EVENT_NOTFOUND, -1, requestIp, notify &amp;&amp; isSli);
                        
                        // pullLog.info(&#34;[client-get] clientIp={}, {},
                        // no data&#34;,
                        // new Object[]{clientIp, groupKey});
                        
                        return get404Result(response, isV2);
                    }
                }
            }
            
            response.setHeader(Constants.CONTENT_MD5, md5);
            
            ...  
            LogUtil.PULL_CHECK_LOG.warn(&#34;{}|{}|{}|{}&#34;, groupKey, requestIp, md5, TimeUtils.getCurrentTimeStr());
            
            // 计算延时时间，客户端接受到配置改变之后，会发起获取配置请求
            final long delayed = System.currentTimeMillis() - lastModified;
            
            // TODO distinguish pull-get &amp;&amp; push-get
            /*
             Otherwise, delayed cannot be used as the basis of push delay directly,
             because the delayed value of active get requests is very large.
             */
            ConfigTraceService.logPullEvent(dataId, group, tenant, requestIpApp, lastModified,
                    ConfigTraceService.PULL_EVENT_OK, delayed, requestIp, notify &amp;&amp; isSli);
            
        } finally {
            releaseConfigReadLock(groupKey);
            IoUtils.closeQuietly(fis);
        }
    } else if (lockResult == 0) {
        
        // FIXME CacheItem No longer exists. It is impossible to simply calculate the push delayed. Here, simply record it as - 1.
        ConfigTraceService
                .logPullEvent(dataId, group, tenant, requestIpApp, -1, ConfigTraceService.PULL_EVENT_NOTFOUND, -1,
                        requestIp, notify &amp;&amp; isSli);
        
        return get404Result(response, isV2);
        
    } else {
        
        PULL_LOG.info(&#34;[client-get] clientIp={}, {}, get data during dump&#34;, clientIp, groupKey);
        return get409Result(response, isV2);
        
    }
    
    return HttpServletResponse.SC_OK &#43; &#34;&#34;;
}
```

## 测试类

`com.alibaba.nacos.test.config.ConfigAPI_V2_CITCase#test`


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/17-%E8%8E%B7%E5%8F%96%E9%85%8D%E7%BD%AE/  

