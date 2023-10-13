# 源码分析 activiti DbSqlSession


> activiti 基于 8.0.0 版本

工作流**操作数据库**，并不是直接执行 `SQL` 语句来完成的，而是通过**操作缓存对象**来**实现**的。

## Entity 类

源码位置: `org.activiti.engine.impl.persistence.entity.Entity`

```java
// 每个数据库实体对象都会实现这个接口
public interface Entity {

  String getId();

  void setId(String id);

  boolean isInserted();

  // 标记对象是新增的
  void setInserted(boolean inserted);

  boolean isUpdated();

  // 标记对象是更新的
  void setUpdated(boolean updated);

  boolean isDeleted();

  // 标记对象是删除的
  void setDeleted(boolean deleted);

  /**
   * Returns a representation of the object, as would be stored in the database.
   * Used when deciding if updates have occurred to the object or not since it was last loaded.
   */
  // 持久化状态，当对象的属性没有改动时，不需要更新到数据库
  Object getPersistentState();
}
```

## HasRevision 类

源码位置: `org.activiti.engine.impl.db.HasRevision`

```java
// 实现并发控制的实体需要实现这个接口
// 执行 update 语句，类似与 update reversion = ${revsionNext} where reversion = ${reversion}
// 判断这个语句的影响条数，就可以知道是否有并发了
public interface HasRevision {

  void setRevision(int revision);

  int getRevision();

  int getRevisionNext();

}
```

## DbSqlSession 类

源码位置: `org.activiti.engine.impl.db.DbSqlSession#insert`

```java
// 插入实体
public void insert(Entity entity) {
  // 分配 id
  if (entity.getId() == null) {
      String id = dbSqlSessionFactory.getIdGenerator().getNextId();
      entity.setId(id);
  }

  // 加入缓存
  Class<? extends Entity> clazz = entity.getClass();
  if (!insertedObjects.containsKey(clazz)) {
      insertedObjects.put(clazz,
                          new LinkedHashMap<String, Entity>()); // order of insert is important, hence LinkedHashMap
  }

  insertedObjects.get(clazz).put(entity.getId(),
                                 entity);
  entityCache.put(entity,
                  false); // False -> entity is inserted, so always changed
  // 设置为新增
  entity.setInserted(true);
}
```

源码位置: `org.activiti.engine.impl.db.DbSqlSession#update`

```java
// 更新实体
public void update(Entity entity) {
  entityCache.put(entity,
                  false); // false -> we don't store state, meaning it will always be seen as changed
  // 设置为更新                
  entity.setUpdated(true);
}
```

源码位置: `org.activiti.engine.impl.db.DbSqlSession#delete`

```java
// 删除实体
public void delete(Entity entity) {
  // 添加缓存
  Class<? extends Entity> clazz = entity.getClass();
  if (!deletedObjects.containsKey(clazz)) {
      deletedObjects.put(clazz,
                         new LinkedHashMap<String, Entity>()); // order of insert is important, hence LinkedHashMap
  }
  deletedObjects.get(clazz).put(entity.getId(),
                                entity);
  // 设置为删除
  entity.setDeleted(true);
}
```

源码位置: `org.activiti.engine.impl.db.DbSqlSession#flush`

```java
// 更新到数据库，此时事务还没有提交
public void flush() {
    // 有些更新对象可能标记删除了，所以需要删除
    determineUpdatedObjects(); // Needs to be done before the removeUnnecessaryOperations, as removeUnnecessaryOperations will remove stuff from the cache
    // 有些新增对象可能标记删除了，所以需要删除
    removeUnnecessaryOperations();

    if (log.isDebugEnabled()) {
        debugFlush();
    }

    // 执行 SQL 语句 
    flushInserts();
    flushUpdates();
    flushDeletes();
}
```

源码位置: `org.activiti.engine.impl.db.DbSqlSession#commit`

```java
// 提交事务
public void commit() {
  sqlSession.commit();
}
```
