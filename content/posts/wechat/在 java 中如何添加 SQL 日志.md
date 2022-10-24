---
title: 在 java 中如何添加 SQL 日志
date: 2022-10-22T09:00:00+08:00
draft: false
tags: [java]
categories: [微信文章]
---

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
		if (bean instanceof DataSource && parseBoolean(environment.resolvePlaceholders("${dev.sql-log.enabled:false}"))) {
			log.info("已开启日志打印，将使用[P6SpyDriver]");
			if (environment.acceptsProfiles(Profiles.of("run"))) {
				log.warn("在生产环境一定要关闭配置[dev.sql-log.enabled]");
			}
			return proxyDataSource((DataSource) bean);
		}
		return bean;
	}

	public DataSource proxyDataSource(DataSource dataSource) {
		if (dataSource instanceof AbstractRoutingDataSource) {
			AbstractRoutingDataSource abstractRoutingDataSource = (AbstractRoutingDataSource) dataSource;

			// resolvedDataSources
			Field resolvedDataSourcesField = findField(AbstractRoutingDataSource.class, "resolvedDataSources");
			makeAccessible(resolvedDataSourcesField);

			@SuppressWarnings("unchecked")
			Map<Object, DataSource> resolvedDataSources = (Map<Object, DataSource>) getField(resolvedDataSourcesField, abstractRoutingDataSource);
			if (resolvedDataSources != null) {
				resolvedDataSources.forEach((k, v) -> resolvedDataSources.put(k, convertToProxyDataSource(v)));
			}

			// resolvedDefaultDataSource
			Field resolvedDefaultDataSourceField = findField(AbstractRoutingDataSource.class, "resolvedDefaultDataSource");
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
			if (!jdbcUrl.contains("p6spy")) {
				jdbcUrl = "jdbc:p6spy" + jdbcUrl.substring(4);
			}

			HikariConfig newConfig = new HikariConfig();
			newConfig.setPoolName("proxy-P6SpyDriver");
			newConfig.setDriverClassName("com.p6spy.engine.spy.P6SpyDriver");
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
