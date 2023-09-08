---
title: raft 协议重新设置 ip
date: 2023-09-08T08:00:00+08:00
draft: false
tags: [raft]
categories: [随笔]
---

raft 节点在机器ip变动之后，可能出现选主不成功的问题。

## 解决方法

下面是 nacos 的 JRaft 解决方法 

```java
  @Test
  public void test() throws IOException {
    String[] groupIds = {"naming_instance_metadata", "naming_persistent_service_v2", "naming_service_metadata"};
    String logPath = "/Users/ooooo/nacos/data/protocol/raft/%s/log";

    // 遍历 groupId
    for (String groupId : groupIds) {
      // logStorage
      LogStorage logStorage = new RocksDBLogStorage(String.format(logPath, groupId), new RaftOptions());
      // logStorageOptions
      LogStorageOptions logStorageOptions = new LogStorageOptions();
      logStorageOptions.setConfigurationManager(new ConfigurationManager());
      logStorageOptions.setLogEntryCodecFactory(LogEntryV2CodecFactory.getInstance());
      logStorageOptions.setGroupId(groupId);
      // 初始化
      boolean init = logStorage.init(logStorageOptions);
      if (init) {
        // 获取最后一个 index
        long lastLogIndex = logStorage.getLastLogIndex();
        System.out.println(lastLogIndex);
        // 新增配置
        LogEntry logEntry = new LogEntry();
        logEntry.setType(EnumOutter.EntryType.ENTRY_TYPE_CONFIGURATION);
        logEntry.setPeers(Collections.singletonList(PeerId.parsePeer("127.0.0.1:7848")));
        // 添加到日志中
        boolean b = logStorage.appendEntry(logEntry);
        System.out.println(b);
      }
    }
  }
```