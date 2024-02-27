# 在 java 中如何添加 SQL 日志


## 1. 添加打印 SQL 的方式

打印 SQL 的方式有很多，比如有 **idea 插件**，有 **mybatis 拦截器**，有**代理 datasource**, 有**代理 driver**.

我比较认可的方式就是**代理 driver**. 这种无任何侵入性。

下面来介绍如何使用 p6spy Driver。

示例代码：

* 使用 `BeanPostProcessor` 来动态扩展 `bean`。
* 判断 `bean` 是否为 `DataSource` 类型，并判断开发配置 `dev.sql-log.enabled`。
* 根据现有的 `driver` 配置来创建新的 `datasource`，并设置 `url`。
* 实际开启，还需要 `spy.properties` 配置文件

```java
@Slf4j
@Configuration
public class DevDataSourceConfiguration implements BeanPostProcessor, EnvironmentAware {

	@Setter
	private Environment environment;

	@Override
	public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
		if (bean instanceof DataSource &amp;&amp; parseBoolean(environment.resolvePlaceholders(&#34;${dev.sql-log.enabled:false}&#34;))) {
			log.info(&#34;已开启日志打印，将使用[P6SpyDriver]&#34;);
			if (environment.acceptsProfiles(Profiles.of(&#34;run&#34;))) {
				log.warn(&#34;在生产环境一定要关闭配置[dev.sql-log.enabled]&#34;);
			}
			return proxyDataSource((DataSource) bean);
		}
		return bean;
	}

	public DataSource proxyDataSource(DataSource dataSource) {
		if (dataSource instanceof AbstractRoutingDataSource) {
			AbstractRoutingDataSource abstractRoutingDataSource = (AbstractRoutingDataSource) dataSource;

			// resolvedDataSources
			Field resolvedDataSourcesField = findField(AbstractRoutingDataSource.class, &#34;resolvedDataSources&#34;);
			makeAccessible(resolvedDataSourcesField);

			@SuppressWarnings(&#34;unchecked&#34;)
			Map&lt;Object, DataSource&gt; resolvedDataSources = (Map&lt;Object, DataSource&gt;) getField(resolvedDataSourcesField, abstractRoutingDataSource);
			if (resolvedDataSources != null) {
				resolvedDataSources.forEach((k, v) -&gt; resolvedDataSources.put(k, convertToProxyDataSource(v)));
			}

			// resolvedDefaultDataSource
			Field resolvedDefaultDataSourceField = findField(AbstractRoutingDataSource.class, &#34;resolvedDefaultDataSource&#34;);
			makeAccessible(resolvedDefaultDataSourceField);

			DataSource resolvedDefaultDataSource = (DataSource) getField(resolvedDefaultDataSourceField, abstractRoutingDataSource);
			if (resolvedDefaultDataSource != null) {
				ReflectionUtils.setField(resolvedDefaultDataSourceField, abstractRoutingDataSource, convertToProxyDataSource(resolvedDefaultDataSource));
			}

			return abstractRoutingDataSource;
		}

		return convertToProxyDataSource(dataSource);
	}


	public DataSource convertToProxyDataSource(DataSource dataSource) {
		if (dataSource instanceof HikariDataSource) {
			HikariConfig oldConfig = (HikariDataSource) dataSource;

			// jdbc:h2:mem:test to  jdbc:p6spy:h2:mem:test
			String jdbcUrl = oldConfig.getJdbcUrl();
			if (!jdbcUrl.contains(&#34;p6spy&#34;)) {
				jdbcUrl = &#34;jdbc:p6spy&#34; &#43; jdbcUrl.substring(4);
			}

			HikariConfig newConfig = new HikariConfig();
			newConfig.setPoolName(&#34;proxy-P6SpyDriver&#34;);
			newConfig.setDriverClassName(&#34;com.p6spy.engine.spy.P6SpyDriver&#34;);
			newConfig.setJdbcUrl(jdbcUrl);
			newConfig.setUsername(oldConfig.getUsername());
			newConfig.setPassword(oldConfig.getPassword());
			return new HikariDataSource(newConfig);
		}
		return dataSource;
	}

}
```

## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/spring-boot-devDataSource)


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-java-%E4%B8%AD%E5%A6%82%E4%BD%95%E6%B7%BB%E5%8A%A0-sql-%E6%97%A5%E5%BF%97/  

