---
title: 事务传播类型
date: 2024-02-23T08:00:00+08:00
draft: false
tags: [ spring boot, source code,源码分析 spring boot 系列 ]
categories: [ 源码分析 spring boot 系列 ]
---

> 只要涉及到**数据库操作**，必定就会使用 `@Transactional` 注解，其中有一个属性就是 **propagation(传播类型)**，掌握它的用法很重要。演示代码见末尾。

## 演示事务传播

### 基础代码

> 定义了所有的**传播类型**，第二个参数来控制**是否抛出异常**。

```java
@Transactional(propagation = Propagation.REQUIRED)
public void REQUIRED(User user, boolean throwException) {
    insertUser(user, throwException);
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void REQUIRES_NEW(User user, boolean throwException) {
    insertUser(user, throwException);
}

@Transactional(propagation = Propagation.NESTED)
public void NESTED(User user, boolean throwException) {
    insertUser(user, throwException);
}

@Transactional(propagation = Propagation.NOT_SUPPORTED)
public void NOT_SUPPORTED(User user, boolean throwException) {
    insertUser(user, throwException);
}

@Transactional(propagation = Propagation.SUPPORTS)
public void SUPPORTS(User user, boolean throwException) {
    insertUser(user, throwException);
}

@Transactional(propagation = Propagation.NEVER)
public void NEVER(User user, boolean throwException) {
    insertUser(user, throwException);
}

@Transactional(propagation = Propagation.MANDATORY)
public void MANDATORY(User user, boolean throwException) {
    insertUser(user, throwException);
}
```

### REQUIRED_REQUIRED

```java
@Transactional(propagation = Propagation.REQUIRED)
public void REQUIRED_REQUIRED() {
    serviceA.REQUIRED(new User("111"), false);
    try {
        serviceA.REQUIRED(new User("222"), true);
    } catch (Exception ignored) {
    }
}
```

> 结论：不会插入数据, 会抛出异常

> 分析：第一次调用创建**新的事务状态**，第二次调用因为是 `REQUIRED`, 所以会**共用**之前的事务状态，这样两次调用**是同一个事务状态**。
> 第二次调用**发生异常**，事务状态要**回滚**，而第一次调用**没有异常**，事务状态要**提交**，导致事务状态**冲突**。

### REQUIRED_REQUIRES_NEW

```java
@Transactional(propagation = Propagation.REQUIRED)
public void REQUIRED_REQUIRES_NEW() {
    serviceA.REQUIRED(new User("111"), false);
    try {
        serviceA.REQUIRES_NEW(new User("222"), true);
    } catch (Exception ignored) {
    }
}
```

> 结论：会插入 111 数据

> 分析：第一次调用创建**新的事务状态**，第二次调用因为是 `REQUIRES_NEW`, 所以会创建**新的事务状态**，这样两次调用**不是同一个事务状态**。
> 第二次调用**发生异常**，事务状态要**回滚**，而第一次调用**没有异常**，事务状态要**提交**。

### REQUIRED_NESTED

```java
@Transactional(propagation = Propagation.REQUIRED)
public void REQUIRED_NESTED() {
    serviceA.REQUIRED(new User("111"), false);
    try {
        serviceA.NESTED(new User("222"), true);
    } catch (Exception ignored) {
    }
}
```

> 结论：会插入 111 数据

> 分析：第一次调用创建**新的事务状态**，第二次调用因为是 `NESTED`, 所以会设置**保存点**，这样两次调用**是同一个事务状态**。
> 第二次调用**发生异常**，事务状态要**回滚**到**保存点**，而第一次调用**没有异常**，事务状态要**提交**。

### REQUIRED_NOT_SUPPORTED

```java
@Transactional(propagation = Propagation.REQUIRED)
public void REQUIRED_NOT_SUPPORTED() {
    serviceA.REQUIRED(new User("111"), false);
    try {
        serviceA.NOT_SUPPORTED(new User("222"), true);
    } catch (Exception ignored) {
    }
}
```

> 结论：会插入 111 数据, 222 数据

> 分析：第一次调用创建**新的事务状态**，第二次调用因为是 `NOT_SUPPORTED`, 所以会**挂起事务**，这样只有第一次调用是**有事务**。
> 第二次调用**发生异常**，因为**没有事务**，所以不会**回滚**，而第一次调用**没有异常**，事务状态要**提交**。

### REQUIRED_SUPPORTS

```java
@Transactional(propagation = Propagation.REQUIRED)
public void REQUIRED_SUPPORTS() {
    serviceA.REQUIRED(new User("111"), false);
    try {
        serviceA.SUPPORTS(new User("222"), true);
    } catch (Exception ignored) {
    }
}
```

> 结论：不会插入数据, 会抛出异常

> 分析：第一次调用创建**新的事务状态**，第二次调用因为是 `SUPPORTS`, 所以会**共用**之前的事务状态，这样两次调用**是同一个事务状态**。
> 第二次调用**发生异常**，事务状态要**回滚**，而第一次调用**没有异常**，事务状态要**提交**，导致事务状态**冲突**。

### REQUIRED_NEVER

```java
@Transactional(propagation = Propagation.REQUIRED)
public void REQUIRED_NEVER() {
    serviceA.REQUIRED(new User("111"), false);
    try {
        serviceA.NEVER(new User("222"), true);
    } catch (Exception ignored) {
    }
}
```

> 结论：会插入 111 数据

> 分析：第一次调用创建**新的事务状态**，第二次调用因为是 `NEVER`, 所以会**抛出异常**不会继续**执行代码**。
> 第一次调用**没有异常**，事务状态要**提交**。

### REQUIRED_MANDATORY

```java
@Transactional(propagation = Propagation.REQUIRED)
public void REQUIRED_MANDATORY() {
    serviceA.REQUIRED(new User("111"), false);
    try {
        serviceA.MANDATORY(new User("222"), true);
    } catch (Exception ignored) {
    }
}
```

> 结论：不会插入数据, 会抛出异常

> 分析：第一次调用创建**新的事务状态**，第二次调用因为是 `REQUIRED`, 所以会**共用**之前的事务状态，这样两次调用**是同一个事务状态**。
> 第二次调用**发生异常**，事务状态要**回滚**，而第一次调用**没有异常**，事务状态要**提交**，导致事务状态**冲突**。

## 事务传播原理

源码位置: `org.springframework.transaction.support.AbstractPlatformTransactionManager#getTransaction`

```java
// 每一个 @Transactional 都会执行下面的方法，来获取事务状态
public final TransactionStatus getTransaction(@Nullable TransactionDefinition definition)
        throws TransactionException {
    ...
    // 获取当前事务
    Object transaction = doGetTransaction();
    // 判断事务是否存在
    if (isExistingTransaction(transaction)) {
        // 重点解析
        return handleExistingTransaction(def, transaction, debugEnabled);
    }
    // 下面是不存在事务的情况
    if (def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_MANDATORY) {
        throw new IllegalTransactionStateException(
                "No existing transaction found for transaction marked with propagation 'mandatory'");
    }
    else if (def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRED ||
            def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRES_NEW ||
            def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NESTED) {
        SuspendedResourcesHolder suspendedResources = suspend(null);
        ...
        try {
            // 开启新的事务
            return startTransaction(def, transaction, debugEnabled, suspendedResources);
        }
        catch (RuntimeException | Error ex) {
            resume(null, suspendedResources);
            throw ex;
        }
    }
    else {
        ...
        // 不开始事务
        return prepareTransactionStatus(def, null, true, newSynchronization, debugEnabled, null);
    }
}
```

源码位置: `org.springframework.transaction.support.AbstractPlatformTransactionManager#handleExistingTransaction`

```java
private TransactionStatus handleExistingTransaction(
        TransactionDefinition definition, Object transaction, boolean debugEnabled)
        throws TransactionException {
    // 下面是存在事务的情况
    if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NEVER) {
        throw new IllegalTransactionStateException(
                "Existing transaction found for transaction marked with propagation 'never'");
    }

    if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NOT_SUPPORTED) {
        ...
        // 挂起当前事务，以非事务来执行
        Object suspendedResources = suspend(transaction);
        boolean newSynchronization = (getTransactionSynchronization() == SYNCHRONIZATION_ALWAYS);
        return prepareTransactionStatus(
                definition, null, false, newSynchronization, debugEnabled, suspendedResources);
    }

    if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRES_NEW) {
        ...
        // 挂起当前事务
        SuspendedResourcesHolder suspendedResources = suspend(transaction);
        try {
            // 开启新事务
            return startTransaction(definition, transaction, debugEnabled, suspendedResources);
        }
        catch (RuntimeException | Error beginEx) {
            resumeAfterBeginException(transaction, suspendedResources, beginEx);
            throw beginEx;
        }
    }

    if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NESTED) {
        ...
        if (useSavepointForNestedTransaction()) {
            ...
            DefaultTransactionStatus status =
                    prepareTransactionStatus(definition, transaction, false, false, debugEnabled, null);
            // 在当前事务上，创建保存点
            status.createAndHoldSavepoint();
            return status;
        }
        else {
            // 不支持保存点，就开启新事务
            return startTransaction(definition, transaction, debugEnabled, null);
        }
    }

    ...
    // 继续使用当前事务
    return prepareTransactionStatus(definition, transaction, false, newSynchronization, debugEnabled, null);
}
```

> 说明：在 `startTransaction` 方法中，每次都会**获取新连接**来**开启事务**。

## 代码

[demo-spring-transaction-propagation](https://github.com/ooooo-youwillsee/demo-spring-transaction-propagation)