---
title: mybatis-plus 的自定义 mapper
date: 2023-06-08T08:00:00+08:00
draft: false
tags: [ spring, mybatis ]
categories: [ 随笔 ]
---

## 1. 问题

在真实的使用过程中，可能**不同的 mapper 接口**使用的 `sqlSessionFactory` 不一样。就比如下面这个例子。

```java
// 这个注解虽然可以指定 sqlSessionFactory, 但是最终使用的 configuration 对象是同一份。
@MapperScan("com.ooooo.**.mapper1")
@MapperScan("com.ooooo.**.mapper2")
public class DemoApplication {

  public static void main(String[] args) {
    SpringApplication.run(DemoApplication.class, args);
  }
}
```


## 2. 解决方式

可以使用 `MapperFactoryBean` 来扩展，下面我给出相应的**示例**代码。

```java
@Configuration
public class ComponentConfigMybatiPlusConfiguration {

  @Getter
  public static SqlSessionFactory sqlSessionFactory;
  
  @Bean
  public MapperFactoryBean<ComponentTreeMapper> componentTreeMapper() {
    return createMapper(ComponentTreeMapper.class);
  }

  private <T> MapperFactoryBean<T> createMapper(Class<T> clazz) {
    MapperFactoryBean<T> factoryBean = new MapperFactoryBean<>(clazz);
    factoryBean.setSqlSessionFactory(sqlSessionFactory());
    return factoryBean;
  }

  private synchronized SqlSessionFactory sqlSessionFactory() {
    if (sqlSessionFactory != null) {
      return sqlSessionFactory;
    }
    // 使用默认的dataSource
    DataSource dataSource = SpringUtil.getBean(DataSource.class);

    Environment environment = new Environment(COMPONENT_CONFIG, new SpringManagedTransactionFactory(), dataSource);
    // build configuration
    MybatisConfiguration configuration = new MybatisConfiguration();
    configuration.setEnvironment(environment);
    configuration.setCacheEnabled(false);
    configuration.setLocalCacheScope(LocalCacheScope.STATEMENT);
    setInterceptors(configuration);
    setMapperLocations(configuration, new String[]{"classpath*:/mapper/**/*.xml"});
    setGlobalConfig(configuration);
    // factory
    sqlSessionFactory = new MybatisSqlSessionFactoryBuilder().build(configuration);
    return sqlSessionFactory;
  }

  private void setInterceptors(MybatisConfiguration configuration) {
    MybatisPlusInterceptor mybatisPlusInterceptor = new MybatisPlusInterceptor();
    mybatisPlusInterceptor.addInnerInterceptor(new PaginationInnerInterceptor());
    configuration.addInterceptor(mybatisPlusInterceptor);
  }

  private void setMapperLocations(MybatisConfiguration configuration, String[] mapperLocations) {
    ResourcePatternResolver resourceResolver = new PathMatchingResourcePatternResolver();
    for (String mapperLocation : mapperLocations) {
      try {
        Resource[] resources = resourceResolver.getResources(mapperLocation);
        for (Resource resource : resources) {
          if (resource.exists()) {
            XMLMapperBuilder xmlMapperBuilder = new XMLMapperBuilder(resource.getInputStream(),
                configuration, resource.toString(), configuration.getSqlFragments());
            xmlMapperBuilder.parse();
          }
        }
      } catch (IOException ignored) {
      }
    }
  }

  private void setGlobalConfig(MybatisConfiguration configuration) {
    GlobalConfig globalConfig = GlobalConfigUtils.getGlobalConfig(configuration);
    // MetaObjectHandler
    globalConfig.setMetaObjectHandler(new ComponentMetaObjectHandler());
  }
}

```