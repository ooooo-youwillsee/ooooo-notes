# 08 CommandExecutor 执行命令


> activiti 基于 8.0.0 版本

> 从之前的分析可以发现，工作流的**每个操作**都是一个 `Command`, 所以有必要看看**内部的实现机制**。

## Command 类

源码位置: `org.activiti.engine.impl.interceptor.Command`

```java
// 接口非常简单，执行过程的参数都从 commandContext 中获取
public interface Command<T> {

    T execute(CommandContext commandContext);

}
```

## CommandExecutor 类

源码位置: `org.activiti.engine.impl.interceptor.CommandExecutor`

```java
// 接口非常简单，用来执行一个 Command
// 实现类为 CommandExecutorImpl
public interface CommandExecutor {

    /**
     * @return the default {@link CommandConfig}, used if none is provided.
     */
    CommandConfig getDefaultConfig();
  
    /**
     * Execute a command with the specified {@link CommandConfig}.
     */
    <T> T execute(CommandConfig config, Command<T> command);
  
    /**
     * Execute a command with the default {@link CommandConfig}.
     */
    <T> T execute(Command<T> command);

}
```

## CommandConfig 类

源码位置: `org.activiti.engine.impl.interceptor.CommandConfig`

```java
// 这个类非常重要，控制命令的事务级别和Context复用
public class CommandConfig {
    private boolean contextReusePossible;
    private TransactionPropagation propagation;
}
```

## 执行命令

源码位置: `org.activiti.engine.impl.cfg.CommandExecutorImpl#execute`

```java
// 执行命令
@Override
public <T> T execute(CommandConfig config, Command<T> command) {
    // 开始执行第一个拦截器
    return first.execute(config, command);
}
```

运行 `org.activiti.examples.bpmn.receivetask.ReceiveTaskTest#testWaitStateBehavior`

{{< image src="./commandExecutor.png" caption="CommandInterceptor 顺序" >}}

从上图可以看出，有四个拦截器，`LogInterceptor`、`CommandContextInterceptor`、`TransactionContextInterceptor`、`CommandInvoker`。

## CommandContextInterceptor 类

源码位置: `org.activiti.engine.impl.interceptor.CommandContextInterceptor#execute`

```java
// 这个拦截器用来创建 context
public <T> T execute(CommandConfig config, Command<T> command) {
    CommandContext context = Context.getCommandContext();
  
    boolean contextReused = false;
    // We need to check the exception, because the transaction can be in a
    // rollback state, and some other command is being fired to compensate (eg. decrementing job retries)
    // context 不复用, 需要创建新的 context
    if (!config.isContextReusePossible() || context == null || context.getException() != null) {
        context = commandContextFactory.createCommandContext(command);
    } else {
        log.debug("Valid context found. Reusing it for the current command '{}'", command.getClass().getCanonicalName());
        // 设置复用
        contextReused = true;
        context.setReused(true);
    }
  
    try {
        // Push on stack
        // 放入栈中，可以通过 Context 来获取
        Context.setCommandContext(context);
        Context.setProcessEngineConfiguration(processEngineConfiguration);
        // 执行下一个拦截器
        return next.execute(config, command);
    } catch (Throwable e) {
        // 设置异常
        // 需要注意的是，如果执行有异常，异常会保留在 context 中
        // 当有多个 context 时，后面 context 的异常，不会传递到前面的 context
        context.exception(e);
    } finally {
        try {
            // 如果不复用，关闭 context
            if (!contextReused) {
                // 执行语句，但不会提交事务
                context.close();
            }
        } finally {
            // Pop from stack
            // 从栈中移除
            Context.removeCommandContext();
            Context.removeProcessEngineConfiguration();
            Context.removeBpmnOverrideContext();
        }
    }
    return null;
}
```

## TransactionContextInterceptor 类

源码位置: `org.activiti.engine.impl.interceptor.TransactionContextInterceptor#execute`

```java
// 这个拦截器用来创建 transactionContext
// 与 spring 集成时，会有另外一个拦截器 SpringTransactionInterceptor 来开启事务
public <T> T execute(CommandConfig config, Command<T> command) {

    CommandContext commandContext = Context.getCommandContext();
    // Storing it in a variable, to reference later (it can change during command execution)
    boolean isReused = commandContext.isReused();
  
    try {
  
        if (transactionContextFactory != null && !isReused) {
            // 创建 transactionContext
            TransactionContext transactionContext = transactionContextFactory.openTransactionContext(commandContext);
            Context.setTransactionContext(transactionContext);
            // 添加关闭监听器，在关闭时会提交事务，在异常时会回滚事务
            commandContext.addCloseListener(new TransactionCommandContextCloseListener(transactionContext));
        }
        // 执行下一个拦截器
        return next.execute(config, command);
  
    } finally {
        if (transactionContextFactory != null && !isReused) {
            Context.removeTransactionContext();
        }
    }
}
```

## SpringTransactionInterceptor 类

源码位置: `org.activiti.spring.SpringTransactionInterceptor#execute`

拦截器顺序参考: `org.activiti.engine.impl.cfg.ProcessEngineConfigurationImpl#getDefaultCommandInterceptors`

```java
// 与 spring 集成时，这个拦截器会自动激活，负责开始事务
// 这个拦截器在 CommandContextInterceptor 之前
public <T> T execute(final CommandConfig config, final Command<T> command) {
    LOGGER.debug("Running command with propagation {}", config.getTransactionPropagation());
  
    TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
    // 设置事务传播行为
    transactionTemplate.setPropagationBehavior(getPropagation(config));
    
    // 开启事务
    T result = transactionTemplate.execute(new TransactionCallback<T>() {
        public T doInTransaction(TransactionStatus status) {
            return next.execute(config, command);
        }
    });
  
    return result;
}
```

## CommandInvoker 类

源码位置: `org.activiti.engine.impl.interceptor.CommandInvoker#execute`

```java
// 这个拦截器负责执行命令
public <T> T execute(final CommandConfig config, final Command<T> command) {
    final CommandContext commandContext = Context.getCommandContext();
  
    // Execute the command.
    // This will produce operations that will be put on the agenda.
    // 添加命令到 Agenda 中, 这里的设计很精妙，可以在一个命令中执行另外的命令
    commandContext.getAgenda().planOperation(new Runnable() {
      @Override
        public void run() {
            commandContext.setResult(command.execute(commandContext));
        }
    });
  
    // Run loop for agenda
    // 取出命令来执行
    executeOperations(commandContext);
  
    // At the end, call the execution tree change listeners.
    // TODO: optimization: only do this when the tree has actually changed (ie check dbSqlSession).
    if (commandContext.hasInvolvedExecutions()) {
        Context.getAgenda().planExecuteInactiveBehaviorsOperation();
        executeOperations(commandContext);
    }
  
    // 获取结果
    return (T) commandContext.getResult();
}

// 取出命令来执行
protected void executeOperations(final CommandContext commandContext) {
    while (!commandContext.getAgenda().isEmpty()) {
        Runnable runnable = commandContext.getAgenda().getNextOperation();
        executeOperation(runnable);
    }
}
```

## 测试类

`org.activiti.examples.bpmn.receivetask.ReceiveTaskTest#testWaitStateBehavior`




