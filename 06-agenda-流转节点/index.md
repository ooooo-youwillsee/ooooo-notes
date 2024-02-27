# 06 Agenda 流转节点


&gt; activiti 基于 8.0.0 版本

&gt; `Agenda` 类是工作流框架中**非常重要**的类，它控制着**节点怎么流转**。这部分的代码比较复杂，建议多**调试**几遍。下面的代码实际上是**一个闭环**，从开始的代码，经过流转一个节点，又回到了开始的代码。

## 流转节点

源码位置: `org.activiti.engine.impl.agenda.DefaultActivitiEngineAgenda#planContinueProcessOperation`

```java
// 流转 startEvent 节点，在启动流程之后，就会调用这个方法
@Override
public void planContinueProcessOperation(ExecutionEntity execution) {
    // 最终会执行 ContinueProcessOperation#run 方法
    planOperation(new ContinueProcessOperation(commandContext, execution));
}
```

源码位置: `org.activiti.engine.impl.agenda.ContinueProcessOperation#run`

```java
// 执行 ContinueProcessOperation#run 方法
@Override
public void run() {
    // 获取当前节点
    FlowElement currentFlowElement = getCurrentFlowElement(execution);
    if (currentFlowElement instanceof FlowNode) {
        // 处理节点
        continueThroughFlowNode((FlowNode) currentFlowElement);
    } else if (currentFlowElement instanceof SequenceFlow) {
        // 处理连线
        continueThroughSequenceFlow((SequenceFlow) currentFlowElement);
    } else {
        throw new ActivitiException(&#34;Programmatic error: no current flow element found or invalid type: &#34; &#43; currentFlowElement &#43; &#34;. Halting.&#34;);
    }
}
```

源码位置: `org.activiti.engine.impl.agenda.ContinueProcessOperation#continueThroughFlowNode`

```java
// 处理节点
protected void continueThroughFlowNode(FlowNode flowNode) {

    // Check if it&#39;s the initial flow element. If so, we must fire the execution listeners for the process too
    if (flowNode.getIncomingFlows() != null
            &amp;&amp; flowNode.getIncomingFlows().size() == 0
            &amp;&amp; flowNode.getSubProcess() == null) {
        // 发布 StartExecution 事件
        executeProcessStartExecutionListeners();
    }
  
    ...
    if (isMultiInstance(flowNode)) {
        // the multi instance execution will look at async
        executeMultiInstanceSynchronous(flowNode);
    } else if (forceSynchronousOperation || !flowNode.isAsynchronous()) {
        // 同步执行，这里会等待流转节点完成, 重点分析这个，默认都是同步执行
        executeSynchronous(flowNode);
    } else {
        // 异步执行, 不会等待
        executeAsynchronous(flowNode);
    }
}
```

源码位置: `org.activiti.engine.impl.agenda.ContinueProcessOperation#executeSynchronous`

```java
// 同步执行，这里会等待流转节点完成
protected void executeSynchronous(FlowNode flowNode) {
    // 会插入到历史节点表 ACT_HI_ACTINST
    commandContext.getHistoryManager().recordActivityStart(execution);
  
    // Execution listener: event &#39;start&#39;
    // 执行监听器，默认为空
    if (CollectionUtil.isNotEmpty(flowNode.getExecutionListeners())) {
        executeExecutionListeners(flowNode,
                                  ExecutionListener.EVENTNAME_START);
    }
    
    // Execute any boundary events, sub process boundary events will be executed from the activity behavior
    if (!inCompensation &amp;&amp; flowNode instanceof Activity) { // Only activities can have boundary events
        List&lt;BoundaryEvent&gt; boundaryEvents = ((Activity) flowNode).getBoundaryEvents();
        if (CollectionUtil.isNotEmpty(boundaryEvents)) {
            // 执行 BoundaryEvent，这个很重要，会在以后的章节解析
            // 这里会新增一条 ACT_RU_EXECUTION 表的数据
            executeBoundaryEvents(boundaryEvents, execution);
        }
    }
  
    // Execute actual behavior
    // 获取 behavior, 在【解析流程】章节说过的
    ActivityBehavior activityBehavior = (ActivityBehavior) flowNode.getBehavior();
  
    if (activityBehavior != null) {
        // 执行 behavior
        // 当前的 flowNode 是 StartEvent，所以 behavior 为 NoneStartEventActivityBehavior
        executeActivityBehavior(activityBehavior,
                                flowNode);
    } else {
        logger.debug(&#34;No activityBehavior on activity &#39;{}&#39; with execution {}&#34;,
                     flowNode.getId(),
                     execution.getId());
        // behavior 为 null，会流转到下个节点
        Context.getAgenda().planTakeOutgoingSequenceFlowsOperation(execution, true);
    }
}
```

源码位置: `org.activiti.engine.impl.bpmn.behavior.FlowNodeActivityBehavior#execute`

```java
// NoneStartEventActivityBehavior 没有实现 execute 方法，所以会调用父类的方法
public void execute(DelegateExecution execution) {
    // 离开当前节点
    leave(execution);
}

// 离开当前节点
public void leave(DelegateExecution execution) {
    // 执行 outgoing
    bpmnActivityBehavior.performDefaultOutgoingBehavior((ExecutionEntity) execution);
}

// 执行 outgoing
protected void performOutgoingBehavior(ExecutionEntity execution,
                                       boolean checkConditions,
                                       boolean throwExceptionIfExecutionStuck) {
    // 执行 TakeOutgoingSequenceFlowsOperation#run 方法
    getAgenda().planTakeOutgoingSequenceFlowsOperation(execution, true);
}
```

源码位置: `org.activiti.engine.impl.agenda.TakeOutgoingSequenceFlowsOperation#run`

```java
// TakeOutgoingSequenceFlowsOperation
@Override
public void run() {
    // 当前节点元素，此时是 startEvent
    FlowElement currentFlowElement = getCurrentFlowElement(execution);
  
    ...
    // When leaving the current activity, we need to delete any related execution (eg active boundary events)
    // 这里会清除 BoundaryEvent, 也就是删除表中的数据
    cleanupExecutions(currentFlowElement);
  
    if (currentFlowElement instanceof FlowNode) {
        // 处理节点，最终会执行 leaveFlowNode 方法
        handleFlowNode((FlowNode) currentFlowElement);
    } else if (currentFlowElement instanceof SequenceFlow) {
        // 处理连线, 会执行 planContinueProcessOperation
        handleSequenceFlow();
    }
}
```

源码位置: `org.activiti.engine.impl.agenda.TakeOutgoingSequenceFlowsOperation#leaveFlowNode`

```java
// leaveFlowNode, 离开节点
protected void leaveFlowNode(FlowNode flowNode) {
    ...
    // Get default sequence flow (if set)
    // 计算默认的连线，当所有的条件都不满足时，会选择默认的连线
    String defaultSequenceFlowId = null;
    if (flowNode instanceof Activity) {
        defaultSequenceFlowId = ((Activity) flowNode).getDefaultFlow();
    } else if (flowNode instanceof Gateway) {
        defaultSequenceFlowId = ((Gateway) flowNode).getDefaultFlow();
    }

    // Determine which sequence flows can be used for leaving
    List&lt;SequenceFlow&gt; outgoingSequenceFlows = new ArrayList&lt;SequenceFlow&gt;();
    // 计算每个连线的条件表达式
    for (SequenceFlow sequenceFlow : flowNode.getOutgoingFlows()) {

        String skipExpressionString = sequenceFlow.getSkipExpression();
        if (!SkipExpressionUtil.isSkipExpressionEnabled(execution, skipExpressionString)) {
            if (!evaluateConditions
                    || (evaluateConditions &amp;&amp; ConditionUtil.hasTrueCondition(sequenceFlow,
                                                                             execution) &amp;&amp; (defaultSequenceFlowId == null || !defaultSequenceFlowId.equals(sequenceFlow.getId())))) {
                outgoingSequenceFlows.add(sequenceFlow);
            }
        } else if (flowNode.getOutgoingFlows().size() == 1 || SkipExpressionUtil.shouldSkipFlowElement(commandContext,
                                                                                                       execution,
                                                                                                       skipExpressionString)) {
            // The &#39;skip&#39; for a sequence flow means that we skip the condition, not the sequence flow.
            outgoingSequenceFlows.add(sequenceFlow);
        }
    }

    ...
    // No outgoing found. Ending the execution
    if (outgoingSequenceFlows.size() == 0) {
        if (flowNode.getOutgoingFlows() == null || flowNode.getOutgoingFlows().size() == 0) {
            logger.debug(&#34;No outgoing sequence flow found for flow node &#39;{}&#39;.&#34;,
                         flowNode.getId());
            // 没有连线，直接结束当前流程
            Context.getAgenda().planEndExecutionOperation(execution);
        } else {
            throw new ActivitiException(&#34;No outgoing sequence flow of element &#39;&#34; &#43; flowNode.getId() &#43; &#34;&#39; could be selected for continuing the process&#34;);
        }
    } else {
         ...
        // Executions for all the other one
        // 工作流框架支持多节点并行，所有这里会存在多个连线
        if (outgoingSequenceFlows.size() &gt; 1) {
            for (int i = 1; i &lt; outgoingSequenceFlows.size(); i&#43;&#43;) {
                ExecutionEntity parent = execution.getParentId() != null ? execution.getParent() : execution;
                ExecutionEntity outgoingExecutionEntity = commandContext.getExecutionEntityManager().createChildExecution(parent);

                SequenceFlow outgoingSequenceFlow = outgoingSequenceFlows.get(i);
                // 设置当前流程元素为连线
                outgoingExecutionEntity.setCurrentFlowElement(outgoingSequenceFlow);

                // 每个连线都要插入到 ACT_RU_EXECUTION 表
                executionEntityManager.insert(outgoingExecutionEntity);
                outgoingExecutions.add(outgoingExecutionEntity);
            }
        }

        // Leave (only done when all executions have been made, since some queries depend on this)
        for (ExecutionEntity outgoingExecution : outgoingExecutions) {
            // 每一个连线，最终执行 continueThroughSequenceFlow 方法
            Context.getAgenda().planContinueProcessOperation(outgoingExecution);
        }
    }
}
```

源码位置: `org.activiti.engine.impl.agenda.ContinueProcessOperation#continueThroughSequenceFlow`

```java
// 流转到第二个节点
protected void continueThroughSequenceFlow(SequenceFlow sequenceFlow) {
    ...
    // 获取目标节点，也就是第二个节点
    FlowElement targetFlowElement = sequenceFlow.getTargetFlowElement();
    execution.setCurrentFlowElement(targetFlowElement);
  
    logger.debug(&#34;Sequence flow &#39;{}&#39; encountered. Continuing process by following it using execution {}&#34;,
                 sequenceFlow.getId(),
                 execution.getId());
    // 继续执行 ContinueProcessOperation，这里就回到了第一个方法调用的逻辑
    Context.getAgenda().planContinueProcessOperation(execution);
}
```

## 测试类

`org.activiti.examples.bpmn.receivetask.ReceiveTaskTest#testWaitStateBehavior`





---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/06-agenda-%E6%B5%81%E8%BD%AC%E8%8A%82%E7%82%B9/  

