# mybatis-plus 自定义 mapper


## 1. 问题

在真实的使用过程中，可能**不同的 mapper 接口**使用的 `sqlSessionFactory` 不一样。就比如下面这个例子。

```java
// 这个注解虽然可以指定 sqlSessionFactory, 但是最终使用的 configuration 对象是同一份。
@MapperScan(&#34;com.ooooo.**.mapper1&#34;)
@MapperScan(&#34;com.ooooo.**.mapper2&#34;)
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
  public MapperFactoryBean&lt;ComponentTreeMapper&gt; componentTreeMapper() {
    return createMapper(ComponentTreeMapper.class);
  }

  private &lt;T&gt; MapperFactoryBean&lt;T&gt; createMapper(Class&lt;T&gt; clazz) {
    MapperFactoryBean&lt;T&gt; factoryBean = new MapperFactoryBean&lt;&gt;(clazz);
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
    setMapperLocations(configuration, new String[]{&#34;classpath*:/mapper/**/*.xml&#34;});
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

## 手动创建 Mapper


```java
// 用法
DataSource dataSource = DBUtil.buildDataSource(dbProperties);
SqlSession sqlSession = DBUtil.buildSqlSession(dbProperties.getName(), dataSource,
        MockInfoMapper.class);
mockInfoMapper = sqlSession.getMapper(MockInfoMapper.class);

// 工具类
public class DBUtil {

    public static DataSource buildDataSource(AbstractDBProperties dbProperties) {
        HikariConfig config = new HikariConfig();
        config.setPoolName(&#34;pool-&#34; &#43; dbProperties.getName());
        config.setDriverClassName(dbProperties.getDriverClassName());
        config.setJdbcUrl(dbProperties.getUrl());
        config.setUsername(dbProperties.getUsername());
        config.setPassword(dbProperties.getPassword());
        return new HikariDataSource(config);
    }

    public static SqlSessionTemplate buildSqlSession(String id, DataSource dataSource, Class&lt;?&gt;... mapperClazz) {
        Environment environment = new Environment(id, new SpringManagedTransactionFactory(), dataSource);
        MybatisConfiguration configuration = new MybatisConfiguration(environment);
        if (ArrayUtil.isNotEmpty(mapperClazz)) {
            for (Class&lt;?&gt; clazz : mapperClazz) {
                configuration.addMapper(clazz);
            }
        }
        configuration.addInterceptor(buildInterceptor());
        SqlSessionFactory sqlSessionFactory = new MybatisSqlSessionFactoryBuilder().build(configuration);
        return new SqlSessionTemplate(sqlSessionFactory);
    }

    private static MybatisPlusInterceptor buildInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor());
        return interceptor;
    }
}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/mybatis-plus-%E8%87%AA%E5%AE%9A%E4%B9%89-mapper/  

