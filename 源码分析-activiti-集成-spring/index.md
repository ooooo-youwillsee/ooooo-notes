# 源码分析 activiti 集成 spring


> activiti 基于 8.0.0 版本

在大多数情况下，`activiti` 都会与 `spring boot` 框架一起使用，所以这一节就来介绍 `activiti` 是如何集成 `spring` 的。

## activitiProperties 配置

配置类: `org.activiti.spring.boot.ActivitiProperties`

java

```java

@ConfigurationProperties("spring.activiti")
public class ActivitiProperties {

  private boolean checkProcessDefinitions = true;
  // 开启定时器
  private boolean asyncExecutorActivate = true;
  private String deploymentName = "SpringAutoDeployment";
  // 邮件相关的配置
  private String mailServerHost = "localhost";
  private int mailServerPort = 1025;
  private String mailServerUserName;
  private String mailServerPassword;
  private String mailServerDefaultFrom;
  private boolean mailServerUseSsl;
  private boolean mailServerUseTls;
  // 数据库相关配置
  private String databaseSchemaUpdate = "true";
  private String databaseSchema;
  private boolean dbHistoryUsed = false;
  // 本地测试，建议设置为 full
  private HistoryLevel historyLevel = HistoryLevel.NONE;
  // 流程定义的路径
  private String processDefinitionLocationPrefix = ResourcePatternResolver.CLASSPATH_ALL_URL_PREFIX + "**/processes/";
  private List<String> processDefinitionLocationSuffixes = asList("**.bpmn20.xml", "**.bpmn");
  // 自定义的 mapper 文件
  private List<String> customMybatisMappers;
  private List<String> customMybatisXMLMappers;
  private boolean useStrongUuids = true;
  private boolean copyVariablesToLocalForTasks = true;
  // 有不同的部署策略
  private String deploymentMode = "default";
  private boolean serializePOJOsInVariablesToJson = true;
  private String javaClassFieldForJackson = JsonTypeInfo.Id.CLASS.getDefaultPropertyName()
}
```

## springBoot 自动配置

源码位置: `org.activiti.spring.boot.ProcessEngineAutoConfiguration`

```java
// 主要构建了 SpringProcessEngineConfiguration, ProcessEngineConfigurationConfigurer, 还有一些事件监听器
// SpringProcessEngineConfiguration: 流程引擎的配置类，贯彻全局，非常重要
// ProcessEngineConfigurationConfigurer: 配置流程引擎，我们可以实现这个接口来自定义配置
// 它的父类 AbstractProcessEngineAutoConfiguration，里面定义了一些常用的 service 类，比如 RuntimeService
@AutoConfiguration
@AutoConfigureAfter(name = {"org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
        "org.springframework.boot.autoconfigure.task.TaskExecutionAutoConfiguration"})
@EnableConfigurationProperties({ActivitiProperties.class, AsyncExecutorProperties.class})
public class ProcessEngineAutoConfiguration extends AbstractProcessEngineAutoConfiguration {

    ...
  
    @Bean
    @ConditionalOnMissingBean
    @DependsOnDatabaseInitialization
    public SpringProcessEngineConfiguration springProcessEngineConfiguration(
            DataSource dataSource,
            PlatformTransactionManager transactionManager,
            SpringAsyncExecutor springAsyncExecutor,
            ActivitiProperties activitiProperties,
            ResourceFinder resourceFinder,
            List<ResourceFinderDescriptor> resourceFinderDescriptors,
            ApplicationUpgradeContextService applicationUpgradeContextService,
            @Autowired(required = false) List<ProcessEngineConfigurationConfigurer> processEngineConfigurationConfigurers,
            @Autowired(required = false) List<ProcessEngineConfigurator> processEngineConfigurators) throws IOException {

        SpringProcessEngineConfiguration conf = new SpringProcessEngineConfiguration(applicationUpgradeContextService);
        conf.setConfigurators(processEngineConfigurators);
        ...
        if (processEngineConfigurationConfigurers != null) {
            for (ProcessEngineConfigurationConfigurer processEngineConfigurationConfigurer : processEngineConfigurationConfigurers) {
                processEngineConfigurationConfigurer.configure(conf);
            }
        }
        springAsyncExecutor.applyConfig(conf);
        return conf;
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public ProcessEngineConfigurationConfigurer asyncExecutorPropertiesConfigurer(AsyncExecutorProperties properties) {
        return (configuration) -> {
            configuration.setAsyncExecutorMessageQueueMode(properties.isMessageQueueMode());
            ...
            configuration.setAsyncFailedJobWaitTime(properties.getRetryWaitTimeInMillis());
        };
    }
}
```

源码位置: `org.activiti.spring.boot.AbstractProcessEngineAutoConfiguration#processEngine`

```java
// 根据流程引擎配置生成对应的 FactoryBean, 在初始化时，就会调用 FactoryBean#getObject 方法。
@Bean
public ProcessEngineFactoryBean processEngine(SpringProcessEngineConfiguration configuration) {
  return super.springProcessEngineBean(configuration);
}

// FactoryBean#getObject
public ProcessEngine getObject() throws Exception {
  // 配置表达式管理器, 可以从表达式执行 spring bean 的方法
  configureExpressionManager();
  // 配置事务管理，就是 spring 事务
  configureExternallyManagedTransactions();

  if (processEngineConfiguration.getBeans() == null) {
    processEngineConfiguration.setBeans(new SpringBeanFactoryProxyMap(applicationContext));
  }
  
  // 构建流程引擎, 这里的 processEngineConfiguration 是 SpringProcessEngineConfiguration 类
  this.processEngine = processEngineConfiguration.buildProcessEngine();
  return this.processEngine;
}
```

源码位置: `org.activiti.engine.impl.cfg.SpringProcessEngineConfiguration#buildProcessEngine`

```java
// 构建流程引擎
@Override
public ProcessEngine buildProcessEngine() {
  // 调用父类的方法 super#buildProcessEngine
  ProcessEngine processEngine = super.buildProcessEngine();
  ProcessEngines.setInitialized(true);
  // 自动部署流程文件
  autoDeployResources(processEngine);
  return processEngine;
}

// super#buildProcessEngine
@Override
public ProcessEngine buildProcessEngine() {
  // 初始化，这里有很多组件需要初始化
  init();
  // 创建流程引擎
  ProcessEngineImpl processEngine = new ProcessEngineImpl(this);
  postProcessEngineInitialisation();
  return processEngine;
}
```

源码位置: `org.activiti.spring.SpringProcessEngineConfiguration#autoDeployResources`

```java
// 自动部署流程文件
protected void autoDeployResources(ProcessEngine processEngine) { 
    // 获取自动部署策略, 默认是 DefaultAutoDeploymentStrategy
    final AutoDeploymentStrategy strategy = getAutoDeploymentStrategy(deploymentMode);
    // 部署流程
    strategy.deployResources(deploymentName, deploymentResources, processEngine.getRepositoryService());
}

// DefaultAutoDeploymentStrategy 
public void deployResources(final String deploymentNameHint,
                          final Resource[] resources,
                          final RepositoryService repositoryService) {
  DeploymentBuilder deploymentBuilder = repositoryService.createDeployment().enableDuplicateFiltering().name(deploymentNameHint);

  // 所有的流程文件作为一个整体，一次性部署
  for (final Resource resource : resources) {
      final String resourceName = determineResourceName(resource);

      deploymentBuilder.addInputStream(resourceName,
                                       resource);
  }

  // 部署，会执行 DeployCmd, 会在下一节继续解析
  loadApplicationUpgradeContext(deploymentBuilder).deploy();
}
```

## 测试类

启动示例程序 `activiti-examples/activiti-api-basic-full-example-bean`
