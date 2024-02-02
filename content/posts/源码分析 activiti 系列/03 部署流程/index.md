---
title: 03 部署流程
date: 2023-10-10T08:00:00+08:00
draft: false
tags: [ activiti, source code, 源码分析 activiti 系列 ]
categories: [ 源码分析 activiti 系列 ]
---

> activiti 基于 8.0.0 版本

## 部署流程

源码位置: `org.activiti.engine.impl.repository.DeploymentBuilderImpl#deploy`

```java
// 部署流程
public Deployment deploy() {
    return repositoryService.deploy(this);
}

// org.activiti.engine.impl.RepositoryServiceImpl#deploy
public Deployment deploy(DeploymentBuilderImpl deploymentBuilder) {
    // 执行 DeployCmd, 最终会执行 DeployCmd#execute 方法
    return commandExecutor.execute(new DeployCmd<Deployment>(deploymentBuilder));
}
```

源码位置: `org.activiti.engine.impl.cmd.DeployCmd#execute`

```java
// 执行 DeployCmd#execute 方法
public Deployment execute(CommandContext commandContext) {
      // 执行部署
      return executeDeploy(commandContext);
}

protected Deployment executeDeploy(CommandContext commandContext) {
    // DeploymentEntity 表示部署, 里面包含了流程文件
    DeploymentEntity newDeployment = setUpNewDeploymentFromContext(commandContext);

    // 判断是否过滤重复的
    // 每次部署流程，可能只有一部分的流程发生了改变，所以不需要部署所有的流程
    if (deploymentBuilder.isDuplicateFilterEnabled()) {
        ...
        if (!existingDeployments.isEmpty()) {
            DeploymentEntity existingDeployment = (DeploymentEntity) existingDeployments.get(0);

            // 对比流程文件是否发生改动
            if (deploymentsDiffer(newDeployment, existingDeployment)) {
                applyUpgradeLogic(newDeployment, existingDeployment);
            } else {
                LOGGER.info("An existing deployment of version {} matching the current one was found, no need to deploy again.",
                    existingDeployment.getVersion());
                return existingDeployment;
            }
        }
    }

    // 持久化部署，会把流程文件插入到数据库中，也会返回 deploymentId 和 version
    persistDeploymentInDatabase(commandContext, newDeployment);

    ...
    LOGGER.info("Launching new deployment with version: " + newDeployment.getVersion());
    // 部署流程
    commandContext.getProcessEngineConfiguration().getDeploymentManager().deploy(newDeployment, deploymentSettings);

    ...
    return newDeployment;
}
```

源码位置: `org.activiti.engine.impl.persistence.deploy.DeploymentManager#deploy`

```java
// 部署流程
public void deploy(DeploymentEntity deployment, Map<String, Object> deploymentSettings) {
    // deployers 默认只有一个实现 BpmnDeployer
    for (Deployer deployer : deployers) {
        deployer.deploy(deployment, deploymentSettings);
    }
}
```

源码位置: `org.activiti.engine.impl.bpmn.deployer.BpmnDeployer#deploy`

```java
// 部署流程
@Override
public void deploy(DeploymentEntity deployment,
                   Map<String, Object> deploymentSettings) {
    log.debug("Processing deployment {}",
              deployment.getName());

    // The ParsedDeployment represents the deployment, the process definitions, and the BPMN
    // resource, parse, and model associated with each process definition.
    // 这里会解析流程文件，很重要, 会在下一节继续解析
    ParsedDeployment parsedDeployment = parsedDeploymentBuilderFactory
            .getBuilderForDeploymentAndSettings(deployment,
                                                deploymentSettings)
            .build();

    // 校验 processDefinitionKey 是否重复
    bpmnDeploymentHelper.verifyProcessDefinitionsDoNotShareKeys(parsedDeployment.getAllProcessDefinitions());
    ...
    // 设置一些属性，然后会持久化到数据库中
    if (deployment.isNew()) {
        Map<ProcessDefinitionEntity, ProcessDefinitionEntity> mapOfNewProcessDefinitionToPreviousVersion =
                getPreviousVersionsOfProcessDefinitions(parsedDeployment);
        setProcessDefinitionVersionsAndIds(parsedDeployment,
                                           mapOfNewProcessDefinitionToPreviousVersion);
        setProcessDefinitionAppVersion(parsedDeployment);

        persistProcessDefinitionsAndAuthorizations(parsedDeployment);
        updateTimersAndEvents(parsedDeployment,
                              mapOfNewProcessDefinitionToPreviousVersion);
        dispatchProcessDefinitionEntityInitializedEvent(parsedDeployment);
    } else {
        makeProcessDefinitionsConsistentWithPersistedVersions(parsedDeployment);
    }

    // 流程定义更新到缓存中
    cachingAndArtifactsManager.updateCachingAndArtifacts(parsedDeployment);

    // 这里不是主要逻辑，可以不用关心
    for (ProcessDefinitionEntity processDefinition : parsedDeployment.getAllProcessDefinitions()) {
        BpmnModel bpmnModel = parsedDeployment.getBpmnModelForProcessDefinition(processDefinition);
        createLocalizationValues(processDefinition.getId(),
                                 bpmnModel.getProcessById(processDefinition.getKey()));
    }
}
```

## 测试类

`org.activiti.examples.processdefinitions.ProcessDefinitionsTest#testProcessDefinitionDescription`