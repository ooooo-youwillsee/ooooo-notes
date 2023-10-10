---
title: 源码分析 activiti 启动流程
date: 2023-10-12T08:00:00+08:00
draft: false
tags: [ activiti, source code, 源码分析 activiti 系列 ]
categories: [ 源码分析 activiti 系列 ]
---

> activiti 基于 8.0.0 版本

> 启动流程的方法有多个，这里以 `startProcessInstanceByKey` 为入口来分析

## 启动流程

源码位置: `org.activiti.engine.impl.RuntimeServiceImpl#startProcessInstanceByKey`
    
```java
// 启动流程
public ProcessInstance startProcessInstanceByKey(String processDefinitionKey) {
    // 执行 StartProcessInstanceCmd
    return commandExecutor.execute(new StartProcessInstanceCmd<ProcessInstance>(processDefinitionKey, null, null, null));
}
```

源码位置: `org.activiti.engine.impl.cmd.StartProcessInstanceCmd#execute`

```java
// 执行 StartProcessInstanceCmd
public ProcessInstance execute(CommandContext commandContext) {
    // 在部署流程时，会将流程定义加入到缓存
    DeploymentManager deploymentCache = commandContext.getProcessEngineConfiguration().getDeploymentManager();

    ProcessDefinitionRetriever processRetriever = new ProcessDefinitionRetriever(this.tenantId, deploymentCache);
    // 获取流程定义
    ProcessDefinition processDefinition = processRetriever.getProcessDefinition(this.processDefinitionId, this.processDefinitionKey);

    processInstanceHelper = commandContext.getProcessEngineConfiguration().getProcessInstanceHelper();
    // 创建和启动流程实例
    ProcessInstance processInstance = createAndStartProcessInstance(processDefinition, businessKey, processInstanceName, variables, transientVariables);
    return processInstance;
}
```

源码位置: `org.activiti.engine.impl.util.ProcessInstanceHelper#createAndStartProcessInstance`

```java
// 创建和启动流程实例
protected ProcessInstance createAndStartProcessInstance(ProcessDefinition processDefinition,
                                                        String businessKey, String processInstanceName,
                                                        Map<String, Object> variables, Map<String, Object> transientVariables, boolean startProcessInstance) {

    // 获取主流程
    Process process = this.getActiveProcess(processDefinition);

    // 获取开始元素，就是 StartEvent 对象
    FlowElement initialFlowElement = this.getInitialFlowElement(process, processDefinition.getId());

    // 创建和启动流程
    return createAndStartProcessInstanceWithInitialFlowElement(processDefinition, businessKey,
        processInstanceName, initialFlowElement, process, variables, transientVariables, startProcessInstance);
}
```

源码位置: `org.activiti.engine.impl.util.ProcessInstanceHelper#createAndStartProcessInstanceWithInitialFlowElement`

```java
public ProcessInstance createAndStartProcessInstanceWithInitialFlowElement(ProcessDefinition processDefinition,
                                                                         String businessKey, String processInstanceName, FlowElement initialFlowElement,
                                                                         Process process, Map<String, Object> variables, Map<String, Object> transientVariables, boolean startProcessInstance) {

  // 创建流程实例
  ExecutionEntity processInstance = createProcessInstanceWithInitialFlowElement(processDefinition,
      businessKey,
      processInstanceName,
      initialFlowElement,
      process);
  if (startProcessInstance) {
      CommandContext commandContext = Context.getCommandContext();
      // 启动流程实例
      startProcessInstance(processInstance, commandContext, variables, initialFlowElement, transientVariables);
  }
  // 返回
  return processInstance;
}
```

## 创建流程实例

源码位置: `org.activiti.engine.impl.util.ProcessInstanceHelper#createProcessInstanceWithInitialFlowElement`

```java
// 创建流程实例
public ExecutionEntity createProcessInstanceWithInitialFlowElement(ProcessDefinition processDefinition,
                                                                   String businessKey,
                                                                   String processInstanceName,
                                                                   FlowElement initialFlowElement,
                                                                   Process process) {
    CommandContext commandContext = Context.getCommandContext();

    // Create the process instance
    String initiatorVariableName = null;
    if (initialFlowElement instanceof StartEvent) {
        initiatorVariableName = ((StartEvent) initialFlowElement).getInitiator();
    }

    // 创建父节点，这里会新增一条 ACT_RU_EXECUTION 表的数据
    // scope 为 true，processInstanceId 就是自己的Id
    ExecutionEntity processInstance = commandContext.getExecutionEntityManager()
        .createProcessInstanceExecution(processDefinition,
            businessKey,
            processDefinition.getTenantId(),
            initiatorVariableName);

    ...
    // Create the first execution that will visit all the process definition elements
    // 创建子节点，这里会新增一条 ACT_RU_EXECUTION 表的数据
    // scope 为 false, processInstanceId 是父节点的 Id
    ExecutionEntity execution = commandContext.getExecutionEntityManager().createChildExecution(processInstance);
    execution.setCurrentFlowElement(initialFlowElement);

    // 启动流程，一般就会创建两条数据在 ACT_RU_EXECUTION 表中，这个很重要
    return processInstance;
}
```

## 启动流程实例

源码位置: `org.activiti.engine.impl.util.ProcessInstanceHelper#startProcessInstance`

```java
// 启动流程实例
public void startProcessInstance(ExecutionEntity processInstance, CommandContext commandContext, Map<String, Object> variables, FlowElement initialFlowElement, Map<String, Object> transientVariables) {
  Process process = ProcessDefinitionUtil.getProcess(processInstance.getProcessDefinitionId());
  createProcessVariables(processInstance, variables, transientVariables, process);
  recordStartProcessInstance(commandContext, initialFlowElement, processInstance);

  ...省略了事件子流程的代码
  // 在创建流程时，会将子节点加入到父节点的节点列表中, 这样就可以从流程实例中获取子节点
  // There will always be one child execution created
  ExecutionEntity execution = processInstance.getExecutions().get(0); 

  execution.setAppVersion(processInstance.getAppVersion());

  // 流转节点，这个非常重要, 会在下一节继续分析
  commandContext.getAgenda().planContinueProcessOperation(execution);
}
```

## 测试类

`org.activiti.examples.bpmn.receivetask.ReceiveTaskTest#testWaitStateBehavior`
