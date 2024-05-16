# Mybatis-Plus 更新字段为 Null 的坑


## 字段更新为null的代码

```java
// 实体类字段设置
@TableField(value = &#34;LOCK_EXP_TIME_&#34;, updateStrategy = FieldStrategy.IGNORED)
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
### Cause: org.apache.ibatis.type.TypeException: Could not set parameters for mapping: ParameterMapping{property=&#39;et.lockExpirationTime&#39;, mode=IN, javaType=class java.lang.Object, jdbcType=null, numericScale=null, resultMapId=&#39;null&#39;, jdbcTypeName=&#39;null&#39;, expression=&#39;null&#39;}. Cause: org.apache.ibatis.type.TypeException: Error setting null for parameter #2 with JdbcType OTHER . Try setting a different JdbcType for this parameter or a different jdbcTypeForNull configuration property. 
```

## 解决方法

```java
// 添加 jdbcType
@TableField(value = &#34;LOCK_EXP_TIME_&#34;, updateStrategy = FieldStrategy.IGNORED, jdbcType = JdbcType.TIMESTAMP)
private Date lockExpirationTime;
```

## 相应的源码

源码位置: `com.baomidou.mybatisplus.core.MybatisParameterHandler#setParameters`

```java
try {
    typeHandler.setParameter(ps, i &#43; 1, value, jdbcType);
} catch (TypeException | SQLException e) {
    throw new TypeException(&#34;Could not set parameters for mapping: &#34; &#43; parameterMapping &#43; &#34;. Cause: &#34; &#43; e, e);
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/mybatis-plus-%E6%9B%B4%E6%96%B0%E5%AD%97%E6%AE%B5%E4%B8%BA-null-%E7%9A%84%E5%9D%91/  

