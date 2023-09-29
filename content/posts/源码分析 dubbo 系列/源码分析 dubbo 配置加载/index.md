---
title: 源码分析 dubbo 配置加载
date: 2023-09-28T08:00:00+08:00
draft: false
tags: [ dubbo, source code, 源码分析 dubbo 系列 ]
categories: [ 源码分析 dubbo 系列 ]
---

> dubbo 基于 3.2.6 版本

> 在 `dubbo` 中支持**配置中心**，如果没有配置，则会检查**注册中心**能否当作**配置中心**。

## 启动配置中心

源码位置: `org.apache.dubbo.config.deploy.DefaultApplicationDeployer#startConfigCenter`

```java
// 启动配置中心
private void startConfigCenter() {

    // load application config
    // 加载配置
    configManager.loadConfigsOfTypeFromProps(ApplicationConfig.class);

    // try set model name
    if (StringUtils.isBlank(applicationModel.getModelName())) {
        applicationModel.setModelName(applicationModel.tryGetApplicationName());
    }

    // load config centers
    // 加载配置
    configManager.loadConfigsOfTypeFromProps(ConfigCenterConfig.class);
    
    // 使用注册中心来作为配置中心, 默认情况下 zk 和 nacos 都是支持的
    // 可以通过属性 RegistryConfig#useAsConfigCenter 来配置
    useRegistryAsConfigCenterIfNecessary();

    // check Config Center
    Collection<ConfigCenterConfig> configCenters = configManager.getConfigCenters();
    if (CollectionUtils.isEmpty(configCenters)) {
        // 没有配置中心，new 一个空的
        ConfigCenterConfig configCenterConfig = new ConfigCenterConfig();
        configCenterConfig.setScopeModel(applicationModel);
        configCenterConfig.refresh();
        ConfigValidationUtils.validateConfigCenterConfig(configCenterConfig);
        if (configCenterConfig.isValid()) {
            configManager.addConfigCenter(configCenterConfig);
            configCenters = configManager.getConfigCenters();
        }
    } else {
        // 遍历配置中心
        for (ConfigCenterConfig configCenterConfig : configCenters) {
            // 配置中心执行 refresh
            configCenterConfig.refresh();
            // 校验
            ConfigValidationUtils.validateConfigCenterConfig(configCenterConfig);
        }
    }

    if (CollectionUtils.isNotEmpty(configCenters)) {
        CompositeDynamicConfiguration compositeDynamicConfiguration = new CompositeDynamicConfiguration();
        // 遍历配置中心
        for (ConfigCenterConfig configCenter : configCenters) {
            // Pass config from ConfigCenterBean to environment
            // 更新配置到 externalConfig，全局配置
            environment.updateExternalConfigMap(configCenter.getExternalConfiguration());
            // 更新配置到 appExternalConfig, 应用级别配置
            environment.updateAppExternalConfigMap(configCenter.getAppExternalConfiguration());

            // Fetch config from remote config center
            // 从配置中心拉取配置
            compositeDynamicConfiguration.addConfiguration(prepareEnvironment(configCenter));
        }
        // 设置动态配置
        environment.setDynamicConfiguration(compositeDynamicConfiguration);
    }
}
```

## 加载配置

源码位置: `org.apache.dubbo.config.context.AbstractConfigManager#loadConfigsOfTypeFromProps`

```java
public <T extends AbstractConfig> List<T> loadConfigsOfTypeFromProps(Class<T> cls) {
    List<T> tmpConfigs = new ArrayList<>();
    // dubbo.properties 文件配置
    PropertiesConfiguration properties = environment.getPropertiesConfiguration();

    // load multiple configs with id
    Set<String> configIds = this.getConfigIdsFromProps(cls);
    // 加载多配置，比如 key: dubbo.protocols.id-xxx.name 
    configIds.forEach(id -> {
        if (!this.getConfig(cls, id).isPresent()) {
            T config;
            try {
                config = createConfig(cls, scopeModel);
                config.setId(id);
            } catch (Exception e) {
                throw new IllegalStateException("create config instance failed, id: " + id + ", type:" + cls.getSimpleName());
            }

            String key = null;
            boolean addDefaultNameConfig = false;
            try {
                // add default name config (same as id), e.g. dubbo.protocols.rest.port=1234
                key = DUBBO + "." + AbstractConfig.getPluralTagName(cls) + "." + id + ".name";
                if (properties.getProperty(key) == null) {
                    properties.setProperty(key, id);
                    addDefaultNameConfig = true;
                }

                config.refresh();
                this.addConfig(config);
                tmpConfigs.add(config);
            } catch (Exception e) {
                logger.error(COMMON_PROPERTY_TYPE_MISMATCH, "", "", "load config failed, id: " + id + ", type:" + cls.getSimpleName(), e);
                throw new IllegalStateException("load config failed, id: " + id + ", type:" + cls.getSimpleName());
            } finally {
                if (addDefaultNameConfig && key != null) {
                    properties.remove(key);
                }
            }
        }
    });

    // If none config of the type, try load single config
    // 加载单配置，也就是说单配置和多配置同时存在，多配置优先
    if (this.getConfigs(cls).isEmpty()) {
        // load single config
        // configurationMaps 中包含多个配置，比如环境变量，dubbo.properies 文件配置，系统参数等
        List<Map<String, String>> configurationMaps = environment.getConfigurationMaps();
        if (ConfigurationUtils.hasSubProperties(configurationMaps, AbstractConfig.getTypePrefix(cls))) {
            T config;
            try {
                config = createConfig(cls, scopeModel);
                config.refresh();
            } catch (Exception e) {
                throw new IllegalStateException("create default config instance failed, type:" + cls.getSimpleName());
            }

            this.addConfig(config);
            tmpConfigs.add(config);
        }
    }

    return tmpConfigs;
}
```

## 从配置中心拉取配置

源码位置: `org.apache.dubbo.config.deploy.DefaultApplicationDeployer#prepareEnvironment`

```java
// 从配置中心拉取配置
private DynamicConfiguration prepareEnvironment(ConfigCenterConfig configCenter) {
    if (configCenter.isValid()) {
        ...
        DynamicConfiguration dynamicConfiguration;
        try {
            // 获取动态配置
            dynamicConfiguration = getDynamicConfiguration(configCenter.toUrl());
        } catch (Exception e) {
          ...
        }
        ApplicationModel applicationModel = getApplicationModel();

        // 配置文件就是 key
        if (StringUtils.isNotEmpty(configCenter.getConfigFile())) {
            // 获取配置内容, 全局级别的
            String configContent = dynamicConfiguration.getProperties(configCenter.getConfigFile(), configCenter.getGroup());
            if (StringUtils.isNotEmpty(configContent)) {
                logger.info(String.format("Got global remote configuration from config center with key-%s and group-%s: \n %s", configCenter.getConfigFile(), configCenter.getGroup(), configContent));
            }
            String appGroup = getApplication().getName();
            String appConfigContent = null;
            String appConfigFile = null;
            if (isNotEmpty(appGroup)) {
                appConfigFile = isNotEmpty(configCenter.getAppConfigFile()) ? configCenter.getAppConfigFile() : configCenter.getConfigFile();
                // 获取配置内容, 应用级别的
                appConfigContent = dynamicConfiguration.getProperties(appConfigFile, appGroup);
                if (StringUtils.isNotEmpty(appConfigContent)) {
                    logger.info(String.format("Got application specific remote configuration from config center with key %s and group %s: \n %s", appConfigFile, appGroup, appConfigContent));
                }
            }
            try {
                // 解析配置
                Map<String, String> configMap = parseProperties(configContent);
                Map<String, String> appConfigMap = parseProperties(appConfigContent);

                // 更新配置
                environment.updateExternalConfigMap(configMap);
                environment.updateAppExternalConfigMap(appConfigMap);

                ...
            } catch (IOException e) {
                throw new IllegalStateException("Failed to parse configurations from Config Center.", e);
            }
        }
        return dynamicConfiguration;
    }
    return null;
}
```

## Environment 初始化

源码位置: `org.apache.dubbo.common.config.Environment#initialize`

```java
@Override
public void initialize() throws IllegalStateException {
    if (initialized.compareAndSet(false, true)) {
        // 属性配置，后面会说
        this.propertiesConfiguration = new PropertiesConfiguration(scopeModel);
        // 系统配置
        this.systemConfiguration = new SystemConfiguration();
        // 环境变量
        this.environmentConfiguration = new EnvironmentConfiguration();
        // 配置中心的全局配置
        this.externalConfiguration = new InmemoryConfiguration("ExternalConfig");
        // 配置中心的应用配置
        this.appExternalConfiguration = new InmemoryConfiguration("AppExternalConfig");
        // 本地的应用配置
        this.appConfiguration = new InmemoryConfiguration("AppConfig");
        
        loadMigrationRule();
    }
}

// external config, such as config-center global/default config
private InmemoryConfiguration externalConfiguration;

// external app config, such as config-center app config
private InmemoryConfiguration appExternalConfiguration;

// local app config , such as Spring Environment/PropertySources/application.properties
private InmemoryConfiguration appConfiguration;
```

## PropertiesConfiguration 初始化

源码位置: `org.apache.dubbo.common.config.PropertiesConfiguration#refresh`

```java
// PropertiesConfiguration 构造函数
public PropertiesConfiguration(ScopeModel scopeModel) {
    this.scopeModel = scopeModel;
    // 刷新配置
    refresh();
}

// 刷新配置
public void refresh() {
    properties = ConfigUtils.getProperties(scopeModel.getClassLoaders());
}

// ConfigUtils#getProperties
public static Properties getProperties(Set<ClassLoader> classLoaders) {
    String path = System.getProperty(CommonConstants.DUBBO_PROPERTIES_KEY);
    if (StringUtils.isEmpty(path)) {
        path = System.getenv(CommonConstants.DUBBO_PROPERTIES_KEY);
        if (StringUtils.isEmpty(path)) {
            // dubbo.properties 文件
            path = CommonConstants.DEFAULT_DUBBO_PROPERTIES;
        }
    }
    return ConfigUtils.loadProperties(classLoaders, path, false, true);
}
```

## 测试类

`org.apache.dubbo.config.context.ConfigManagerTest#testLoadConfigsOfTypeFromProps`

`org.apache.dubbo.configcenter.support.nacos.NacosDynamicConfigurationTest#testGetConfig`: 需要启动一个 `nacos` 服务

`org.apache.dubbo.configcenter.support.zookeeper.ZookeeperDynamicConfigurationTest#testGetConfig`: 需要启动一个 `zk` 服务