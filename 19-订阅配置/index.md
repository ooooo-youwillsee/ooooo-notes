# 19 订阅配置


&gt; nacos 基于 2.2.4 版本

&gt; 在 `nacos` 中，订阅配置分为 `http长轮询` 和 `grpc` 两种方式。

## http 长轮询

源码位置: `com.alibaba.nacos.config.server.controller.ConfigController#listener`

```java
// http 长轮询
@PostMapping(&#34;/listener&#34;)
@Secured(action = ActionTypes.READ, signType = SignType.CONFIG)
public void listener(HttpServletRequest request, HttpServletResponse response)
        throws ServletException, IOException {
    
    // 启用 servlet 异步
    request.setAttribute(&#34;org.apache.catalina.ASYNC_SUPPORTED&#34;, true);
    // 获取要监听的配置
    String probeModify = request.getParameter(&#34;Listening-Configs&#34;);
    if (StringUtils.isBlank(probeModify)) {
        LOGGER.warn(&#34;invalid probeModify is blank&#34;);
        throw new IllegalArgumentException(&#34;invalid probeModify&#34;);
    }
    
    probeModify = URLDecoder.decode(probeModify, Constants.ENCODE);
    
    Map&lt;String, String&gt; clientMd5Map;
    try {
        // 解析出 md5 值，key 是 groupKey, value 是 md5 值
        clientMd5Map = MD5Util.getClientMd5Map(probeModify);
    } catch (Throwable e) {
        throw new IllegalArgumentException(&#34;invalid probeModify&#34;);
    }
    
    // do long-polling
    // 长轮询
    inner.doPollingConfig(request, response, clientMd5Map, probeModify.length());
}
```

源码位置: `com.alibaba.nacos.config.server.controller.ConfigServletInner#doPollingConfig`

```java
// 长轮询
public String doPollingConfig(HttpServletRequest request, HttpServletResponse response,
        Map&lt;String, String&gt; clientMd5Map, int probeRequestSize) throws IOException {
    
    // Long polling.
    // 是否支持长轮询, 判断请求头 Long-Pulling-Timeout 是否存在
    if (LongPollingService.isSupportLongPolling(request)) {
        // 添加长轮询
        longPollingService.addLongPollingClient(request, response, clientMd5Map, probeRequestSize);
        return HttpServletResponse.SC_OK &#43; &#34;&#34;;
    }
    
    // Compatible with short polling logic.
    // 下面的逻辑都是兼容短轮询的，也就是立马对比 md5 值是否发生改变
    // 如果不一样，返回改变的 groupKey，下面的逻辑就不看了
    List&lt;String&gt; changedGroups = MD5Util.compareMd5(request, response, clientMd5Map);
    
    // Compatible with short polling result.
    String oldResult = MD5Util.compareMd5OldResult(changedGroups);
    String newResult = MD5Util.compareMd5ResultString(changedGroups);
    
    String version = request.getHeader(Constants.CLIENT_VERSION_HEADER);
    if (version == null) {
        version = &#34;2.0.0&#34;;
    }
    int versionNum = Protocol.getVersionNumber(version);
    
    // Before 2.0.4 version, return value is put into header.
    if (versionNum &lt; START_LONG_POLLING_VERSION_NUM) {
        response.addHeader(Constants.PROBE_MODIFY_RESPONSE, oldResult);
        response.addHeader(Constants.PROBE_MODIFY_RESPONSE_NEW, newResult);
    } else {
        request.setAttribute(&#34;content&#34;, newResult);
    }
    
    // Disable cache.
    response.setHeader(&#34;Pragma&#34;, &#34;no-cache&#34;);
    response.setDateHeader(&#34;Expires&#34;, 0);
    response.setHeader(&#34;Cache-Control&#34;, &#34;no-cache,no-store&#34;);
    response.setStatus(HttpServletResponse.SC_OK);
    return HttpServletResponse.SC_OK &#43; &#34;&#34;;
}
```

源码位置: `com.alibaba.nacos.config.server.service.LongPollingService#addLongPollingClient`

```java
// 添加长轮询
public void addLongPollingClient(HttpServletRequest req, HttpServletResponse rsp, Map&lt;String, String&gt; clientMd5Map,
        int probeRequestSize) {
    
    // str 就是长轮询的超时时间，由客户端传入
    String str = req.getHeader(LongPollingService.LONG_POLLING_HEADER);
    String noHangUpFlag = req.getHeader(LongPollingService.LONG_POLLING_NO_HANG_UP_HEADER);
    int delayTime = SwitchService.getSwitchInteger(SwitchService.FIXED_DELAY_TIME, 500);
    
    // Add delay time for LoadBalance, and one response is returned 500 ms in advance to avoid client timeout.
    long timeout = -1L;
    // 固定长轮询的时间
    if (isFixedPolling()) {
        timeout = Math.max(10000, getFixedPollingInterval());
        // Do nothing but set fix polling timeout.
    } else {
        // 计算长轮询时间
        timeout = Math.max(10000, Long.parseLong(str) - delayTime);
        long start = System.currentTimeMillis();
        List&lt;String&gt; changedGroups = MD5Util.compareMd5(req, rsp, clientMd5Map);
        // 如果 md5 值有变化，立即返回结果
        if (changedGroups.size() &gt; 0) {
            generateResponse(req, rsp, changedGroups);
            LogUtil.CLIENT_LOG.info(&#34;{}|{}|{}|{}|{}|{}|{}&#34;, System.currentTimeMillis() - start, &#34;instant&#34;,
                    RequestUtil.getRemoteIp(req), &#34;polling&#34;, clientMd5Map.size(), probeRequestSize,
                    changedGroups.size());
            return;
        } else if (noHangUpFlag != null &amp;&amp; noHangUpFlag.equalsIgnoreCase(TRUE_STR)) {
            // 不挂起请求
            LogUtil.CLIENT_LOG.info(&#34;{}|{}|{}|{}|{}|{}|{}&#34;, System.currentTimeMillis() - start, &#34;nohangup&#34;,
                    RequestUtil.getRemoteIp(req), &#34;polling&#34;, clientMd5Map.size(), probeRequestSize,
                    changedGroups.size());
            return;
        }
    }
    String ip = RequestUtil.getRemoteIp(req);
    ConnectionCheckResponse connectionCheckResponse = checkLimit(req);
    // 检查限流
    if (!connectionCheckResponse.isSuccess()) {
        generate503Response(req, rsp, connectionCheckResponse.getMessage());
        return;
    }
    
    // Must be called by http thread, or send response.
    // 开始异步
    final AsyncContext asyncContext = req.startAsync();
    
    // AsyncContext.setTimeout() is incorrect, Control by oneself
    asyncContext.setTimeout(0L);
    
    String appName = req.getHeader(RequestUtil.CLIENT_APPNAME_HEADER);
    String tag = req.getHeader(&#34;Vipserver-Tag&#34;);
    // 提交长轮询任务
    ConfigExecutor.executeLongPolling(
            new ClientLongPolling(asyncContext, clientMd5Map, ip, probeRequestSize, timeout, appName, tag));
}
```

源码位置: `com.alibaba.nacos.config.server.service.LongPollingService.ClientLongPolling#run`

```java
// 提交长轮询任务
@Override
public void run() {
    asyncTimeoutFuture = ConfigExecutor.scheduleLongPolling(() -&gt; {
        try {
            getRetainIps().put(ClientLongPolling.this.ip, System.currentTimeMillis());
            
            // Delete subscriber&#39;s relations.
            boolean removeFlag = allSubs.remove(ClientLongPolling.this);
            // 移除成功，表示这段时间配置没有发生改变
            if (removeFlag) {
                if (isFixedPolling()) {
                    LogUtil.CLIENT_LOG
                            .info(&#34;{}|{}|{}|{}|{}|{}&#34;, (System.currentTimeMillis() - createTime), &#34;fix&#34;,
                                    RequestUtil.getRemoteIp((HttpServletRequest) asyncContext.getRequest()),
                                    &#34;polling&#34;, clientMd5Map.size(), probeRequestSize);
                    List&lt;String&gt; changedGroups = MD5Util
                            .compareMd5((HttpServletRequest) asyncContext.getRequest(),
                                    (HttpServletResponse) asyncContext.getResponse(), clientMd5Map);
                    if (changedGroups.size() &gt; 0) {
                        // 发送有变动的配置
                        sendResponse(changedGroups);
                    } else {
                        // 返回 null，配置没有变动
                        sendResponse(null);
                    }
                } else {
                    LogUtil.CLIENT_LOG
                            .info(&#34;{}|{}|{}|{}|{}|{}&#34;, (System.currentTimeMillis() - createTime), &#34;timeout&#34;,
                                    RequestUtil.getRemoteIp((HttpServletRequest) asyncContext.getRequest()),
                                    &#34;polling&#34;, clientMd5Map.size(), probeRequestSize);
                    // 返回 null，配置没有变动
                    sendResponse(null);
                }
            } else {
                LogUtil.DEFAULT_LOG.warn(&#34;client subsciber&#39;s relations delete fail.&#34;);
            }
        } catch (Throwable t) {
            LogUtil.DEFAULT_LOG.error(&#34;long polling error:&#34; &#43; t.getMessage(), t.getCause());
        }
        
    }, timeoutTime, TimeUnit.MILLISECONDS);
    
    allSubs.add(this);
}
```

源码位置: `com.alibaba.nacos.config.server.service.LongPollingService.DataChangeTask#run`

```java
// 遍历订阅者
// 接受 LocalDataChangeEvent 事件，会执行这个方法
@Override
public void run() {
    try {
        ConfigCacheService.getContentBetaMd5(groupKey);
        for (Iterator&lt;ClientLongPolling&gt; iter = allSubs.iterator(); iter.hasNext(); ) {
            ClientLongPolling clientSub = iter.next();
            if (clientSub.clientMd5Map.containsKey(groupKey)) {
                // If published tag is not in the beta list, then it skipped.
                // beta 配置有变动
                if (isBeta &amp;&amp; !CollectionUtils.contains(betaIps, clientSub.ip)) {
                    continue;
                }
                
                // If published tag is not in the tag list, then it skipped.
                // tag 配置有变动
                if (StringUtils.isNotBlank(tag) &amp;&amp; !tag.equals(clientSub.tag)) {
                    continue;
                }
                
                getRetainIps().put(clientSub.ip, System.currentTimeMillis());
                // 删除
                iter.remove(); // Delete subscribers&#39; relationships.
                LogUtil.CLIENT_LOG
                        .info(&#34;{}|{}|{}|{}|{}|{}|{}&#34;, (System.currentTimeMillis() - changeTime), &#34;in-advance&#34;,
                                RequestUtil
                                        .getRemoteIp((HttpServletRequest) clientSub.asyncContext.getRequest()),
                                &#34;polling&#34;, clientSub.clientMd5Map.size(), clientSub.probeRequestSize, groupKey);
                // 返回响应
                clientSub.sendResponse(Arrays.asList(groupKey));
            }
        }
        
    } catch (Throwable t) {
        LogUtil.DEFAULT_LOG.error(&#34;data change error: {}&#34;, ExceptionUtil.getStackTrace(t));
    }
}
```

## grpc 订阅

源码位置: `com.alibaba.nacos.config.server.remote.ConfigChangeBatchListenRequestHandler#handle`

```java
// grpc 监听配置
public ConfigChangeBatchListenResponse handle(ConfigBatchListenRequest configChangeListenRequest, RequestMeta meta)
        throws NacosException {
    String connectionId = StringPool.get(meta.getConnectionId());
    String tag = configChangeListenRequest.getHeader(Constants.VIPSERVER_TAG);
    
    ConfigChangeBatchListenResponse configChangeBatchListenResponse = new ConfigChangeBatchListenResponse();
    for (ConfigBatchListenRequest.ConfigListenContext listenContext : configChangeListenRequest
            .getConfigListenContexts()) {
        String groupKey = GroupKey2
                .getKey(listenContext.getDataId(), listenContext.getGroup(), listenContext.getTenant());
        groupKey = StringPool.get(groupKey);
        
        String md5 = StringPool.get(listenContext.getMd5());
        
        // 监听配置
        if (configChangeListenRequest.isListen()) {
            // 添加监听
            configChangeListenContext.addListen(groupKey, md5, connectionId);
            boolean isUptoDate = ConfigCacheService.isUptodate(groupKey, md5, meta.getClientIp(), tag);
            // 如果有变动，直接返回配置
            if (!isUptoDate) {
                configChangeBatchListenResponse.addChangeConfig(listenContext.getDataId(), listenContext.getGroup(),
                        listenContext.getTenant());
            }
        } else {
            // 取消监听
            configChangeListenContext.removeListen(groupKey, connectionId);
        }
    }
    return configChangeBatchListenResponse;
}
```

源码位置: `com.alibaba.nacos.config.server.remote.ConfigChangeListenContext#addListen`

```java
// 添加监听
public synchronized void addListen(String groupKey, String md5, String connectionId) {
    // 1.add groupKeyContext
    Set&lt;String&gt; listenClients = groupKeyContext.get(groupKey);
    if (listenClients == null) {
        groupKeyContext.putIfAbsent(groupKey, new HashSet&lt;&gt;());
        listenClients = groupKeyContext.get(groupKey);
    }
    listenClients.add(connectionId);
    
    // 2.add connectionIdContext
    HashMap&lt;String, String&gt; groupKeys = connectionIdContext.get(connectionId);
    if (groupKeys == null) {
        connectionIdContext.putIfAbsent(connectionId, new HashMap&lt;&gt;(16));
        groupKeys = connectionIdContext.get(connectionId);
    }
    groupKeys.put(groupKey, md5);
    
}
```

源码位置: `com.alibaba.nacos.config.server.remote.ConfigChangeListenContext#removeListen`

```java
// 取消监听
public synchronized void removeListen(String groupKey, String connectionId) {
    
    //1. remove groupKeyContext
    Set&lt;String&gt; connectionIds = groupKeyContext.get(groupKey);
    if (connectionIds != null) {
        connectionIds.remove(connectionId);
        if (connectionIds.isEmpty()) {
            groupKeyContext.remove(groupKey);
        }
    }
    
    //2.remove connectionIdContext
    HashMap&lt;String, String&gt; groupKeys = connectionIdContext.get(connectionId);
    if (groupKeys != null) {
        groupKeys.remove(groupKey);
    }
}
```

源码位置: `com.alibaba.nacos.config.server.remote.RpcConfigChangeNotifier#configDataChanged`

```java
// 接受 LocalDataChangeEvent 事件，会执行这个方法
public void configDataChanged(String groupKey, String dataId, String group, String tenant, boolean isBeta,
        List&lt;String&gt; betaIps, String tag) {
    
    Set&lt;String&gt; listeners = configChangeListenContext.getListeners(groupKey);
    if (CollectionUtils.isEmpty(listeners)) {
        return;
    }
    int notifyClientCount = 0;
    for (final String client : listeners) {
        // 获取连接
        Connection connection = connectionManager.getConnection(client);
        if (connection == null) {
            continue;
        }
        
        ConnectionMeta metaInfo = connection.getMetaInfo();
        //beta ips check.
        String clientIp = metaInfo.getClientIp();
        String clientTag = metaInfo.getTag();
        // 判断 beat 配置
        if (isBeta &amp;&amp; betaIps != null &amp;&amp; !betaIps.contains(clientIp)) {
            continue;
        }
        //tag check
        // 判断 tag 配置
        if (StringUtils.isNotBlank(tag) &amp;&amp; !tag.equals(clientTag)) {
            continue;
        }
        
        ConfigChangeNotifyRequest notifyRequest = ConfigChangeNotifyRequest.build(dataId, group, tenant);
        
        // 推送配置的 groupKey
        RpcPushTask rpcPushRetryTask = new RpcPushTask(notifyRequest, 50, client, clientIp, metaInfo.getAppName());
        push(rpcPushRetryTask);
        notifyClientCount&#43;&#43;;
    }
    Loggers.REMOTE_PUSH.info(&#34;push [{}] clients ,groupKey=[{}]&#34;, notifyClientCount, groupKey);
}
```

## 测试类

`com.alibaba.nacos.test.config.ConfigLongPollReturnChanges_CITCase#testAdd`

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/19-%E8%AE%A2%E9%98%85%E9%85%8D%E7%BD%AE/  

