# 在 spring 中如何设计一个获取配置的接口?


## 1. 需求

希望根据 `propertyName` 来获取相应的 `propertyValue`, 这个接口需要支持**多种数据来源**。

## 2. 设计接口

很明显这个接口应该设计为这样, 有一个方法为 `Object getProperty(String name)` 来获取属性。

因为是在 spring 中，所以我就直接复用了 `org.springframework.core.env.PropertySource`, 但这个类需要**泛型**，所以我就随便实现了一个 `Map<String, String>` 的泛型，也不会用到这个。

抽象类的设计如下：

```java
public abstract class AbstractSimplePropertySource extends PropertySource<Map<String, String>> implements EnvironmentAware {
	
	protected Environment environment;
	
	public AbstractSimplePropertySource(String name) {
		super(name, Collections.emptyMap());
	}
	
	public void setEnvironment(@NonNull Environment environment) {
		this.environment = environment;
	}
	
	public Environment getEnvironment() {
		return environment;
	}
	
}
```

## 3. 具体类的实现


### 3.1 根据请求参数来获取配置

1. 先从请求参数中获取
2. 再从请求头中获取

代码逻辑是比较简单的，我就不解释了。

> 这种形式，解决了**前端可以传入相应的配置**，来改变后端的执行逻辑。

```java
@Order(0)
public class RequestParamsPropertySource extends AbstractSimplePropertySource {
	
	public RequestParamsPropertySource() {
		super(ENV_PREFIX + "request_params");
	}
	
	@Override
	public Object getProperty(String name) {
		String propertyKey = ENV_PREFIX + name.replace(".", "_");
		String propertyValue = null;
		try {
			// 先请求参数中获取
			ServletRequestAttributes attr = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
      HttpServletRequest request = attr.getRequest();
      propertyValue = request.getParameter(propertyKey);
			if (StringUtils.isBlank(propertyValue)) {
				// 再从请求头中获取
				propertyValue = request.getHeader(propertyKey);
			}
		} catch (Throwable ignored) {
		}
		// 空字符也当做null
		propertyValue = defaultIfBlank(propertyValue, null);
		return propertyValue;
	}
	
}
```

### 3.2 根据环境变量来获取配置

代码逻辑是比较简单的，我就不解释了。

```java
@Order(2)
public class EnvironmentPropertySource extends AbstractSimplePropertySource {
	
	public EnvironmentPropertySource() {
		super(ENV_PREFIX + "environment");
	}
	
	@Override
	public Object getProperty(String name) {
		String env_property_key = ENV_PREFIX + name.replace(".", "_");
		return System.getenv(env_property_key.toUpperCase());
	}
}
```

### 3.3 根据本地配置文件来获取参数

> 在实际开发过程，大家可能是**共用一套数据库环境**，在这个情况下，如果某一个人改了**数据库配置**，这样会对其他人造成影响，所以必须要设计出一个**用于开发**的配置类。

1. 使用 `apache 的 configuration` 包，来实现**配置文件**的动态刷新 
2. 从 `builder.getConfiguration()` 对象中获取配置

大致代码如下：

```java
@Order(1)
public class LocalPropertiesPropertySource extends AbstractSimplePropertySource implements InitializingBean {
	
	@Autowired
	private ApplicationEventPublisher publisher;
	
	private ReloadingFileBasedConfigurationBuilder<PropertiesConfiguration> builder;
	
	private static final String DEFAULT_LOCAL_PROPERTIES_PATH = "sysoptions.properties";
	
	public LocalPropertiesPropertySource() {
		super(ENV_PREFIX + "local_properties");
		log.debug("开发环境，启用[{}]配置", getClass());
	}
	
	@Override
	public void afterPropertiesSet() {
		Integer sysOptionsLoadInterval = getEnvironment().getProperty("dev.localPropertiesLoadInterval", Integer.class, 1);
		String sysOptionsPath = getEnvironment().getProperty("dev.localPropertiesPath", DEFAULT_LOCAL_PROPERTIES_PATH);
		File propertiesFile = new File(sysOptionsPath);
		if (!propertiesFile.exists()) {
			return;
		}
		
		// server boot will publish event
		publisher.publishEvent(new LocalProperitesReReloadingEvent(new Object(), propertiesFile.getAbsolutePath()));
		builder = new ReloadingFileBasedConfigurationBuilder<>(PropertiesConfiguration.class).configure(new Parameters().fileBased().setFile(propertiesFile));
		ReloadingController reloadingController = builder.getReloadingController();
		reloadingController.addEventListener(ReloadingEvent.ANY, e -> publisher.publishEvent(new LocalProperitesReReloadingEvent(e, propertiesFile.getAbsolutePath())));
		
		PeriodicReloadingTrigger trigger = new PeriodicReloadingTrigger(reloadingController, null, sysOptionsLoadInterval, SECONDS);
		trigger.start();
	}
	
	@Override
	public Object getProperty(@NonNull String name) {
		if (builder == null) return null;
		Configuration configuration = null;
		try {
			configuration = builder.getConfiguration();
			String config_value = configuration.getString(name);
			if (config_value != null) {
				return config_value;
			}
		} catch (ConfigurationException e) {
			log.error(e.getMessage(), e);
		}
		return null;
	}
}
```

### 3.4 其他的扩展

到这里，你就应该很清楚的知道**怎么去扩展其他的类了**，比如**数据库的实现**， **redis 的实现**

## 4. 使用的入口

上面只是定义了**一个接口**和**几个实现类**，统一的入口类，实际上还没有。

1. 使用**构造函数的方式**来注入**所有的 AbstractSimplePropertySource** 。
2. 对于每个获取配置的类，肯定有**优先级**，所以要**排序**。
3. 使用 `MutablePropertySources` 这个类做辅助。

大致代码如下：

```java
@Slf4j
@Order
public class CompositePropertySources implements PropertySources {
	
	private final MutablePropertySources mutablePropertySources = new MutablePropertySources();
	
	public CompositePropertySources(List<AbstractSimplePropertySource> sources) {
		if (sources == null) return;
		AnnotationAwareOrderComparator.sort(sources);
		for (AbstractSimplePropertySource source : sources) {
			mutablePropertySources.addLast(source);
		}
	}
	
	public boolean containsProperty(String name) {
		return stream().anyMatch(p -> p.containsProperty(name));
	}
	
	public String getProperty(String name) {
		return isBlank(name) ? name : getProperty(name, null);
	}
	
	public String getProperty(String propertyName, String defaultValue) {
		String value = null;
		for (PropertySource<?> ps : mutablePropertySources) {
			value = (String) ps.getProperty(propertyName);
			if (value != null) {
				return value;
			}
		}
		return defaultValue;
	}
	
	public Map<String, String> getProperties(String... propertyNames) {
		if (propertyNames != null) {
			Map<String, String> map = new HashMap<>();
			for (String key : propertyNames) {
				map.put(key, getProperty(key, null));
			}
			return map;
		}
		return null;
	}
}
```

## 5. 完整代码实现

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/spring-boot-compositePropertySources)

