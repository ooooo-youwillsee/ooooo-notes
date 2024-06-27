---
title: mybatis-plus 打印日志
date: 2024-06-27T08:00:00+08:00
draft: false
tags: [ mybatis ]
collections: [ 随笔 ]
---

## 在 spring boot 打印日志

application.yaml:

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.slf4j.Slf4jImpl

logging:
  level:
    com.ooooo.dao.mapper: debug
```

参考
1. [spring boot logging](https://docs.spring.io/spring-boot/docs/2.7.18/reference/html/features.html#features.logging.log-levels)

## 原理

源码位置: `org.apache.ibatis.mapping.MappedStatement.Builder#Builder`

```java
public Builder(Configuration configuration, String id, SqlSource sqlSource, SqlCommandType sqlCommandType) {
    mappedStatement.configuration = configuration;
    mappedStatement.id = id;
    mappedStatement.sqlSource = sqlSource;
    mappedStatement.statementType = StatementType.PREPARED;
    mappedStatement.resultSetType = ResultSetType.DEFAULT;
    mappedStatement.parameterMap = new ParameterMap.Builder(configuration, "defaultParameterMap", null, new ArrayList<>()).build();
    mappedStatement.resultMaps = new ArrayList<>();
    mappedStatement.sqlCommandType = sqlCommandType;
    mappedStatement.keyGenerator = configuration.isUseGeneratedKeys() && SqlCommandType.INSERT.equals(sqlCommandType) ? Jdbc3KeyGenerator.INSTANCE : NoKeyGenerator.INSTANCE;
    // id 就是 mapper 的 id
    String logId = id;
    if (configuration.getLogPrefix() != null) {
    logId = configuration.getLogPrefix() + id;
    }
    // 初始化 log
    mappedStatement.statementLog = LogFactory.getLog(logId);
    mappedStatement.lang = configuration.getDefaultScriptingLanguageInstance();
}
```




