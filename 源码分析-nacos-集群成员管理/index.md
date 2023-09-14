# 源码分析 nacos 集群成员管理


> nacos 基于 2.2.4 版本

在 nacos 中，集群成员分为**静态加载**和**动态加载**，**静态加载**就是读取 `cluster.conf` 文件，**动态加载**就是从`一个接口`中获取。

## 集群成员加载的入口

源码位置: `com.alibaba.nacos.core.cluster.ServerMemberManager#initAndStartLookup`

```java
private void initAndStartLookup() throws NacosException {
    // 查找对应的 lookup, lookup 的实现有 file, standalone, address
    this.lookup = LookupFactory.createLookUp(this);
    // 是否使用 address lookup
    isUseAddressServer = this.lookup.useAddressServer();
    // 启动 lookup
    this.lookup.start();
}
```

源码位置: `com.alibaba.nacos.core.cluster.lookup.LookupFactory#createLookUp`

```java
// 查找对应的 lookup
public static MemberLookup createLookUp(ServerMemberManager memberManager) throws NacosException {
    // 不是 standalone 模式
    if (!EnvUtil.getStandaloneMode()) {
        // lookupType 默认为空
        String lookupType = EnvUtil.getProperty(LOOKUP_MODE_TYPE);
        // 根据 lookupType 来选择
        LookupType type = chooseLookup(lookupType);
        LOOK_UP = find(type);
        currentLookupType = type;
    } else {
        // standalone lookup 
        LOOK_UP = new StandaloneMemberLookup();
    }
    //  注入 memberManager
    LOOK_UP.injectMemberManager(memberManager);
    Loggers.CLUSTER.info("Current addressing mode selection : {}", LOOK_UP.getClass().getSimpleName());
    return LOOK_UP;
}
```

源码位置: `com.alibaba.nacos.core.cluster.lookup.LookupFactory#chooseLookup`

```java
// 根据 lookupType 来选择
private static LookupType chooseLookup(String lookupType) {
    // lookupType 不为空，则返回
    if (StringUtils.isNotBlank(lookupType)) {
        LookupType type = LookupType.sourceOf(lookupType);
        if (Objects.nonNull(type)) {
            return type;
        }
    }
    // 判断 cluster.conf 是否存在，如果存在就是 file lookup
    File file = new File(EnvUtil.getClusterConfFilePath());
    if (file.exists() || StringUtils.isNotBlank(EnvUtil.getMemberList())) {
        return LookupType.FILE_CONFIG;
    }
    // 默认返回 address lookup
    return LookupType.ADDRESS_SERVER;
}
```


## standalone lookup

源码位置: `com.alibaba.nacos.core.cluster.lookup.StandaloneMemberLookup`

```java
// 这个类，就是添加了自己的 url
public class StandaloneMemberLookup extends AbstractMemberLookup {
    
    @Override
    public void doStart() {
        String url = EnvUtil.getLocalAddress();
        // 发布 MembersChangeEvent 事件
        afterLookup(MemberUtil.readServerConf(Collections.singletonList(url)));
    }
    
    @Override
    protected void doDestroy() throws NacosException {
    
    }
    
    @Override
    public boolean useAddressServer() {
        return false;
    }
}
```

## file lookup

源码位置: `com.alibaba.nacos.core.cluster.lookup.FileConfigMemberLookup#doStart`

```java
@Override
public void doStart() throws NacosException {
    // 读取文件, 然后发布 MembersChangeEvent 事件
    readClusterConfFromDisk();
    
    // Use the inotify mechanism to monitor file changes and automatically
    // trigger the reading of cluster.conf
    try {
        // 动态监听配置文件
        WatchFileCenter.registerWatcher(EnvUtil.getConfPath(), watcher);
    } catch (Throwable e) {
        Loggers.CLUSTER.error("An exception occurred in the launch file monitor : {}", e.getMessage());
    }
}

// 监听器，会监听 cluster.conf 文件，如果变动，就重新读取文件
private FileWatcher watcher = new FileWatcher() {
    @Override
    public void onChange(FileChangeEvent event) {
        readClusterConfFromDisk();
    }
    
    @Override
    public boolean interest(String context) {
        return StringUtils.contains(context, DEFAULT_SEARCH_SEQ);
    }
};
```

## address lookup 

源码位置: `com.alibaba.nacos.core.cluster.lookup.AddressServerMemberLookup#doStart`

```java
@Override
public void doStart() throws NacosException {
    // 最大的是失败个数
    this.maxFailCount = Integer.parseInt(EnvUtil.getProperty(HEALTH_CHECK_FAIL_COUNT_PROPERTY, DEFAULT_HEALTH_CHECK_FAIL_COUNT));
    // 初始化发现地址
    initAddressSys();
    // 运行，获取地址
    run();
}
```

源码位置: `com.alibaba.nacos.core.cluster.lookup.AddressServerMemberLookup#initAddressSys`

```java
// 初始化发现地址
// 获取域名，端口，然后拼装为地址
private void initAddressSys() {
    String envDomainName = System.getenv(ADDRESS_SERVER_DOMAIN_ENV);
    if (StringUtils.isBlank(envDomainName)) {
        domainName = EnvUtil.getProperty(ADDRESS_SERVER_DOMAIN_PROPERTY, DEFAULT_SERVER_DOMAIN);
    } else {
        domainName = envDomainName;
    }
    String envAddressPort = System.getenv(ADDRESS_SERVER_PORT_ENV);
    if (StringUtils.isBlank(envAddressPort)) {
        addressPort = EnvUtil.getProperty(ADDRESS_SERVER_PORT_PROPERTY, DEFAULT_SERVER_POINT);
    } else {
        addressPort = envAddressPort;
    }
    String envAddressUrl = System.getenv(ADDRESS_SERVER_URL_ENV);
    if (StringUtils.isBlank(envAddressUrl)) {
        addressUrl = EnvUtil.getProperty(ADDRESS_SERVER_URL_PROPERTY, EnvUtil.getContextPath() + "/" + "serverlist");
    } else {
        addressUrl = envAddressUrl;
    }
    addressServerUrl = HTTP_PREFIX + domainName + ":" + addressPort + addressUrl;
    envIdUrl = HTTP_PREFIX + domainName + ":" + addressPort + "/env";
    
    Loggers.CORE.info("ServerListService address-server port:" + addressPort);
    Loggers.CORE.info("ADDRESS_SERVER_URL:" + addressServerUrl);
}
```

源码位置: `com.alibaba.nacos.core.cluster.lookup.AddressServerMemberLookup#run`

```java
// 运行，获取地址
private void run() throws NacosException {
    // With the address server, you need to perform a synchronous member node pull at startup
    // Repeat three times, successfully jump out
    boolean success = false;
    Throwable ex = null;
    int maxRetry = EnvUtil.getProperty(ADDRESS_SERVER_RETRY_PROPERTY, Integer.class, DEFAULT_SERVER_RETRY_TIME);
    // 重试次数
    for (int i = 0; i < maxRetry; i++) {
        try {
            // 获取集群成员地址, 发布 MembersChangeEvent 事件
            syncFromAddressUrl();
            success = true;
            break;
        } catch (Throwable e) {
            ex = e;
            Loggers.CLUSTER.error("[serverlist] exception, error : {}", ExceptionUtil.getAllExceptionMsg(ex));
        }
    }
    if (!success) {
        throw new NacosException(NacosException.SERVER_ERROR, ex);
    }
    
    // 定时调用
    GlobalExecutor.scheduleByCommon(new AddressServerSyncTask(), DEFAULT_SYNC_TASK_DELAY_MS);
}
```

## 测试类

`com.alibaba.nacos.test.core.cluster.MemberLookup_ITCase#test_a_lookup_file_config`

`com.alibaba.nacos.test.core.cluster.MemberLookup_ITCase#test_c_lookup_address_server`


