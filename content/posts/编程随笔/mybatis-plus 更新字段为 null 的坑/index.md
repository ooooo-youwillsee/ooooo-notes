---
title: mybatis-plus 更新字段为 null 的坑
date: 2023-11-07T08:00:00+08:00
draft: false
tags: [ mybatis ]
collections: [ 随笔 ]
---

## 字段更新为null的代码

```java
// 实体类字段设置
@TableField(value = "LOCK_EXP_TIME_", updateStrategy = FieldStrategy.IGNORED)
private Date lockExpirationTime;

// mapper操作
JobEntity jobEntity = new JobEntity();
jobEntity.setId(1);
jobEntity.setLockExpirationTime(null);
JobEntityMapper.updateById(jobEntity);
```

## 问题

上面的操作可能会抛出下面的异常

```
### Cause: org.apache.ibatis.type.TypeException: Could not set parameters for mapping: ParameterMapping{property='et.lockExpirationTime', mode=IN, javaType=class java.lang.Object, jdbcType=null, numericScale=null, resultMapId='null', jdbcTypeName='null', expression='null'}. Cause: org.apache.ibatis.type.TypeException: Error setting null for parameter #2 with JdbcType OTHER . Try setting a different JdbcType for this parameter or a different jdbcTypeForNull configuration property. 
```

## 解决方法

```java
// 添加 jdbcType
@TableField(value = "LOCK_EXP_TIME_", updateStrategy = FieldStrategy.IGNORED, jdbcType = JdbcType.TIMESTAMP)
private Date lockExpirationTime;
```

## 相应的源码

源码位置: `com.baomidou.mybatisplus.core.MybatisParameterHandler#setParameters`

```java
try {
    typeHandler.setParameter(ps, i + 1, value, jdbcType);
} catch (TypeException | SQLException e) {
    throw new TypeException("Could not set parameters for mapping: " + parameterMapping + ". Cause: " + e, e);
}
```