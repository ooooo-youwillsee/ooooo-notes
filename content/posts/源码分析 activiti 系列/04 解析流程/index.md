---
title: 04 解析流程
date: 2023-10-11T08:00:00+08:00
draft: false
tags: [ activiti, source code, 源码分析 activiti 系列 ]
categories: [ 源码分析 activiti 系列 ]
---

> activiti 基于 8.0.0 版本

> 每次部署**新的流程**，必定会**解析流程**来检查文件是否**正确**，并将 `xml` 元素**映射**到 `java` 对象上。

## 解析流程

源码位置: `org.activiti.engine.impl.bpmn.deployer.ParsedDeploymentBuilder#createBpmnParseFromResource`

```java
// 在部署流程的过程中，就会调用该方法来解析流程
protected BpmnParse createBpmnParseFromResource(ResourceEntity resource) {
    String resourceName = resource.getName();
    // 流程文件的字节流
    ByteArrayInputStream inputStream = new ByteArrayInputStream(resource.getBytes());
  
    // 创建解析对象，设置字节流
    BpmnParse bpmnParse = bpmnParser.createParse()
        .sourceInputStream(inputStream)
        .setSourceSystemId(resourceName)
        .deployment(deployment)
        .name(resourceName);
  
    // 设置校验参数
    if (deploymentSettings != null) {
  
      // Schema validation if needed
      if (deploymentSettings.containsKey(DeploymentSettings.IS_BPMN20_XSD_VALIDATION_ENABLED)) {
          bpmnParse.setValidateSchema((Boolean) deploymentSettings.get(DeploymentSettings.IS_BPMN20_XSD_VALIDATION_ENABLED));
      }
  
      // Process validation if needed
      if (deploymentSettings.containsKey(DeploymentSettings.IS_PROCESS_VALIDATION_ENABLED)) {
          bpmnParse.setValidateProcess((Boolean) deploymentSettings.get(DeploymentSettings.IS_PROCESS_VALIDATION_ENABLED));
      }
  
    } else {
        // On redeploy, we assume it is validated at the first deploy
        bpmnParse.setValidateSchema(false);
        bpmnParse.setValidateProcess(false);
    }
  
    // 执行解析流程
    bpmnParse.execute();
    return bpmnParse;
}
```

源码位置: `org.activiti.engine.impl.bpmn.parser.BpmnParse#execute`

```java
// 执行解析流程
public BpmnParse execute() {
    try {
        ProcessEngineConfigurationImpl processEngineConfiguration = Context.getProcessEngineConfiguration();
        BpmnXMLConverter converter = new BpmnXMLConverter();
    
        boolean enableSafeBpmnXml = false;
        String encoding = null;
        if (processEngineConfiguration != null) {
            enableSafeBpmnXml = processEngineConfiguration.isEnableSafeBpmnXml();
            encoding = processEngineConfiguration.getXmlEncoding();
        }
    
        // 解析 xml 元素，转换为 java 对象，会调用 convertToBpmnModel 方法
        bpmnModel = converter.convertToBpmnModel(streamSource, validateSchema, enableSafeBpmnXml, encoding);
    
        ...
        // Attach logic to the processes (eg. map ActivityBehaviors to bpmn model elements)
        // 应用解析器，这个很重要
        applyParseHandlers();
    
        // Finally, process the diagram interchange info
        processDI();
  
    } catch (Exception e) {
      ...
    }
    return this;
}
```

源码位置: `org.activiti.bpmn.converter.BpmnXMLConverter#convertToBpmnModel`

```java
// 解析 xml 元素，转换为 java 对象
public BpmnModel convertToBpmnModel(XMLStreamReader xtr) {
    BpmnModel model = new BpmnModel();
    model.setStartEventFormTypes(startEventFormTypes);
    model.setUserTaskFormTypes(userTaskFormTypes);
    try {
        Process activeProcess = null;
        List<SubProcess> activeSubProcessList = new ArrayList<SubProcess>();
        while (xtr.hasNext()) {
            try {
                xtr.next();
            } catch (Exception e) {
                LOGGER.debug("Error reading XML document", e);
                throw new XMLException("Error reading XML", e);
            }
            ...省略了一堆的判断代码
            } else if (ELEMENT_DI_EDGE.equals(xtr.getLocalName())) {
                bpmnEdgeParser.parse(xtr, model);
      
            } else {
    
                if (!activeSubProcessList.isEmpty() && ELEMENT_MULTIINSTANCE.equalsIgnoreCase(xtr.getLocalName())) {
      
                    multiInstanceParser.parseChildElement(xtr, activeSubProcessList.get(activeSubProcessList.size() - 1), model);
      
                } else if (convertersToBpmnMap.containsKey(xtr.getLocalName())) {
                    if (activeProcess != null) {
                        // 获取XML转换器, 将 XML 元素转换为 java 对象
                        // 当你需要扩展流程文件时，这里的代码很有用
                        BaseBpmnXMLConverter converter = convertersToBpmnMap.get(xtr.getLocalName());
                        converter.convertToBpmnModel(xtr, model, activeProcess, activeSubProcessList);
                    }
                }
            }
        }

        for (Process process : model.getProcesses()) {
            for (Pool pool : model.getPools()) {
                if (process.getId().equals(pool.getProcessRef())) {
                    pool.setExecutable(process.isExecutable());
                }
            }
            // 处理流程元素，设置节点之间的连线
            processFlowElements(process.getFlowElements(), process);
        }

    } catch (XMLException e) {
        throw e;

    } catch (Exception e) {
        LOGGER.error("Error processing BPMN document", e);
        throw new XMLException("Error processing BPMN document", e);
    }
    return model;
}
```

源码位置: `org.activiti.engine.impl.bpmn.parser.BpmnParse#applyParseHandlers`

```java
// 应用解析器，会对流程元素设置 behavior, 这个很重要
protected void applyParseHandlers() {
    sequenceFlows = new HashMap<String, SequenceFlow>();
    // 遍历每个流程
    for (Process process : bpmnModel.getProcesses()) {
        currentProcess = process;
        if (process.isExecutable()) {
            // 解析元素
            bpmnParserHandlers.parseElement(this, process);
        }
    }
}

// 解析元素
public void parseElement(BpmnParse bpmnParse, BaseElement element) {
    ...
    if (element instanceof FlowElement) {
        bpmnParse.setCurrentFlowElement((FlowElement) element);
    }
  
    // Execute parse handlers
    // 获取解析器
    List<BpmnParseHandler> handlers = parseHandlers.get(element.getClass());
  
    if (handlers == null) {
        LOGGER.warn("Could not find matching parse handler for + " + element.getId() + " this is likely a bug.");
    } else {
        for (BpmnParseHandler handler : handlers) {
            // 解析元素，以 ReceiveTaskParseHandler 为例子
            handler.parse(bpmnParse, element);
        }
    }
}
```

源码位置: `org.activiti.engine.impl.bpmn.parser.handler.ReceiveTaskParseHandler`

```java
// 解析 receiveTask 
public class ReceiveTaskParseHandler extends AbstractActivityBpmnParseHandler<ReceiveTask> {
  
    public Class<? extends BaseElement> getHandledType() {
        return ReceiveTask.class;
    }
  
    protected void executeParse(BpmnParse bpmnParse, ReceiveTask receiveTask) {
        // 设置 behavior，表示到达这个节点时，会干什么
        receiveTask.setBehavior(bpmnParse.getActivityBehaviorFactory().createReceiveTaskActivityBehavior(receiveTask));
    }
}
```

## 测试类

`org.activiti.examples.bpmn.receivetask.ReceiveTaskTest#testWaitStateBehavior`

