# 02 ExtensionLoader


&gt; dubbo 基于 3.2.6 版本

&gt; 在 dubbo 中，ExtensionLoader 是很重要的类，实现了 dubbo 的扩展机制，主要有三个方法，getExtension、getActivateExtension、getAdaptiveExtension。

## getExtension 方法

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#getExtension`

```java
// 根据 name 来获取扩展
public T getExtension(String name) {
    T extension = getExtension(name, true);
    if (extension == null) {
        throw new IllegalArgumentException(&#34;Not find extension: &#34; &#43; name);
    }
    return extension;
}

// 根据 name 来获取扩展
public T getExtension(String name, boolean wrap) {
    checkDestroyed();
    if (StringUtils.isEmpty(name)) {
        throw new IllegalArgumentException(&#34;Extension name == null&#34;);
    }
    // 获取默认扩展
    if (&#34;true&#34;.equals(name)) {
        return getDefaultExtension();
    }
    String cacheKey = name;
    if (!wrap) {
        cacheKey &#43;= &#34;_origin&#34;;
    }
    final Holder&lt;Object&gt; holder = getOrCreateHolder(cacheKey);
    Object instance = holder.get();
    if (instance == null) {
        synchronized (holder) {
            instance = holder.get();
            if (instance == null) {
                // 创建 extension
                instance = createExtension(name, wrap);
                holder.set(instance);
            }
        }
    }
    return (T) instance;
}
```

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#createExtension`

```java
// 创建 extension
private T createExtension(String name, boolean wrap) {
    // 获取扩展的 class, 读取 META-INF/dubbo/internal, META-INF/services, META-INF/dubbo 目录下
    Class&lt;?&gt; clazz = getExtensionClasses().get(name);
    if (clazz == null || unacceptableExceptions.contains(name)) {
        throw findException(name);
    }
    try {
        // 从缓存中获取对象
        T instance = (T) extensionInstances.get(clazz);
        if (instance == null) {
            // 创建 extension 实例
            extensionInstances.putIfAbsent(clazz, createExtensionInstance(clazz));
            instance = (T) extensionInstances.get(clazz);
            instance = postProcessBeforeInitialization(instance, name);
            // 注入属性
            injectExtension(instance);
            instance = postProcessAfterInitialization(instance, name);
        }

        if (wrap) {
            List&lt;Class&lt;?&gt;&gt; wrapperClassesList = new ArrayList&lt;&gt;();
            if (cachedWrapperClasses != null) {
                wrapperClassesList.addAll(cachedWrapperClasses);
                wrapperClassesList.sort(WrapperComparator.COMPARATOR);
                Collections.reverse(wrapperClassesList);
            }

            if (CollectionUtils.isNotEmpty(wrapperClassesList)) {
                // 遍历包装类
                for (Class&lt;?&gt; wrapperClass : wrapperClassesList) {
                    Wrapper wrapper = wrapperClass.getAnnotation(Wrapper.class);
                    boolean match = (wrapper == null) || ((ArrayUtils.isEmpty(
                        wrapper.matches()) || ArrayUtils.contains(wrapper.matches(),
                        name)) &amp;&amp; !ArrayUtils.contains(wrapper.mismatches(), name));
                    if (match) {
                        // 注入类
                        instance = injectExtension(
                            (T) wrapperClass.getConstructor(type).newInstance(instance));
                        instance = postProcessAfterInitialization(instance, name);
                    }
                }
            }
        }

        // Warning: After an instance of Lifecycle is wrapped by cachedWrapperClasses, it may not still be Lifecycle instance, this application may not invoke the lifecycle.initialize hook.
        // 初始化 extension
        initExtension(instance);
        return instance;
    } catch (Throwable t) {
        throw new IllegalStateException(
            &#34;Extension instance (name: &#34; &#43; name &#43; &#34;, class: &#34; &#43; type &#43; &#34;) couldn&#39;t be instantiated: &#34; &#43; t.getMessage(),
            t);
    }
}
```

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#getExtensionClasses`

```java
// 获取扩展的 class, 读取 META-INF/dubbo/internal, META-INF/services, META-INF/dubbo 目录下
private Map&lt;String, Class&lt;?&gt;&gt; getExtensionClasses() {
    // 单例延迟加载
    Map&lt;String, Class&lt;?&gt;&gt; classes = cachedClasses.get();
    if (classes == null) {
        synchronized (cachedClasses) {
            classes = cachedClasses.get();
            if (classes == null) {
                try {
                    // 加载 extension class
                    classes = loadExtensionClasses();
                } catch (InterruptedException e) {
                    logger.error(COMMON_ERROR_LOAD_EXTENSION, &#34;&#34;, &#34;&#34;,
                        &#34;Exception occurred when loading extension class (interface: &#34; &#43; type &#43; &#34;)&#34;,
                        e);
                    throw new IllegalStateException(
                        &#34;Exception occurred when loading extension class (interface: &#34; &#43; type &#43; &#34;)&#34;,
                        e);
                }
                cachedClasses.set(classes);
            }
        }
    }
    return classes;
}
```

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#loadExtensionClasses`

```java
// 加载 extension class
private Map&lt;String, Class&lt;?&gt;&gt; loadExtensionClasses() throws InterruptedException {
    checkDestroyed();
    cacheDefaultExtensionName();

    Map&lt;String, Class&lt;?&gt;&gt; extensionClasses = new HashMap&lt;&gt;();

    // 遍历 strategies
    for (LoadingStrategy strategy : strategies) {
        // 加载目录中类, 最终会调用 loadClass 方法
        loadDirectory(extensionClasses, strategy, type.getName());

        // compatible with old ExtensionFactory
        if (this.type == ExtensionInjector.class) {
            loadDirectory(extensionClasses, strategy, ExtensionFactory.class.getName());
        }
    }

    return extensionClasses;
}
```

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#loadClass`

```java
// loadClass 
private void loadClass(ClassLoader classLoader, Map&lt;String, Class&lt;?&gt;&gt; extensionClasses,
                       java.net.URL resourceURL, Class&lt;?&gt; clazz, String name,
                       boolean overridden) {
    if (!type.isAssignableFrom(clazz)) {
        throw new IllegalStateException(
            &#34;Error occurred when loading extension class (interface: &#34; &#43; type &#43; &#34;, class line: &#34; &#43; clazz.getName() &#43; &#34;), class &#34; &#43; clazz.getName() &#43; &#34; is not subtype of interface.&#34;);
    }

    boolean isActive = loadClassIfActive(classLoader, clazz);

    if (!isActive) {
        return;
    }

    if (clazz.isAnnotationPresent(Adaptive.class)) {
        // 缓存 Adaptive class
        cacheAdaptiveClass(clazz, overridden);
    } else if (isWrapperClass(clazz)) {
        // 缓存 Wrapper class
        cacheWrapperClass(clazz);
    } else {
        if (StringUtils.isEmpty(name)) {
            name = findAnnotationName(clazz);
            if (name.length() == 0) {
                throw new IllegalStateException(
                    &#34;No such extension name for the class &#34; &#43; clazz.getName() &#43; &#34; in the config &#34; &#43; resourceURL);
            }
        }

        String[] names = NAME_SEPARATOR.split(name);
        if (ArrayUtils.isNotEmpty(names)) {
            // 缓存 Activate class
            cacheActivateClass(clazz, names[0]);
            for (String n : names) {
                cacheName(clazz, n);
                saveInExtensionClass(extensionClasses, clazz, n, overridden);
            }
        }
    }
}
```

## getActivateExtension 方法

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#getActivateExtension`

```java
// 获取 Activate Extension
public List&lt;T&gt; getActivateExtension(URL url, String key, String group) {
    String value = url.getParameter(key);
    // 获取 Activate
    return getActivateExtension(url,
        StringUtils.isEmpty(value) ? null : COMMA_SPLIT_PATTERN.split(value), group);
}
```

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#getActivateExtension`

```java
// 获取 Activate
public List&lt;T&gt; getActivateExtension(URL url, String[] values, String group) {
    checkDestroyed();
    // solve the bug of using @SPI&#39;s wrapper method to report a null pointer exception.
    Map&lt;Class&lt;?&gt;, T&gt; activateExtensionsMap = new TreeMap&lt;&gt;(activateComparator);
    List&lt;String&gt; names = values == null ?
        new ArrayList&lt;&gt;(0) :
        Arrays.stream(values).map(StringUtils::trim).collect(Collectors.toList());
    Set&lt;String&gt; namesSet = new HashSet&lt;&gt;(names);
    // 判断是否移除默认的
    if (!namesSet.contains(REMOVE_VALUE_PREFIX &#43; DEFAULT_KEY)) {
        if (cachedActivateGroups.size() == 0) {
            synchronized (cachedActivateGroups) {
                // cache all extensions
                if (cachedActivateGroups.size() == 0) {
                    // 确保 extension 已经加载，这个方法上面已经分析过了
                    getExtensionClasses();
                    // 遍历所有的 activate class
                    for (Map.Entry&lt;String, Object&gt; entry : cachedActivates.entrySet()) {
                        String name = entry.getKey();
                        Object activate = entry.getValue();

                        String[] activateGroup, activateValue;
                        
                        // 获取 @Activate 的 group 和 value
                        if (activate instanceof Activate) {
                            activateGroup = ((Activate) activate).group();
                            activateValue = ((Activate) activate).value();
                        } else if (activate instanceof com.alibaba.dubbo.common.extension.Activate) {
                            activateGroup = ((com.alibaba.dubbo.common.extension.Activate) activate).group();
                            activateValue = ((com.alibaba.dubbo.common.extension.Activate) activate).value();
                        } else {
                            continue;
                        }
                        cachedActivateGroups.put(name,
                            new HashSet&lt;&gt;(Arrays.asList(activateGroup)));
                        String[][] keyPairs = new String[activateValue.length][];
                        for (int i = 0; i &lt; activateValue.length; i&#43;&#43;) {
                            if (activateValue[i].contains(&#34;:&#34;)) {
                                keyPairs[i] = new String[2];
                                String[] arr = activateValue[i].split(&#34;:&#34;);
                                keyPairs[i][0] = arr[0];
                                keyPairs[i][1] = arr[1];
                            } else {
                                keyPairs[i] = new String[1];
                                keyPairs[i][0] = activateValue[i];
                            }
                        }
                        // 加入到缓存中
                        cachedActivateValues.put(name, keyPairs);
                    }
                }
            }
        }

        // traverse all cached extensions
        cachedActivateGroups.forEach((name, activateGroup) -&gt; {
            // 判断 group 和 name 是否匹配
            if (isMatchGroup(group, activateGroup) &amp;&amp; !namesSet.contains(
                name) &amp;&amp; !namesSet.contains(REMOVE_VALUE_PREFIX &#43; name) &amp;&amp; isActive(
                cachedActivateValues.get(name), url)) {

                // 保存默认的 activate
                activateExtensionsMap.put(getExtensionClass(name), getExtension(name));
            }
        });
    }

    // 有默认的配置, 组合 activate
    if (namesSet.contains(DEFAULT_KEY)) {
        // will affect order
        // `ext1,default,ext2` means ext1 will happens before all of the default extensions while ext2 will after them
        ArrayList&lt;T&gt; extensionsResult = new ArrayList&lt;&gt;(
            activateExtensionsMap.size() &#43; names.size());
        for (String name : names) {
            if (name.startsWith(REMOVE_VALUE_PREFIX) || namesSet.contains(
                REMOVE_VALUE_PREFIX &#43; name)) {
                continue;
            }
            if (DEFAULT_KEY.equals(name)) {
                extensionsResult.addAll(activateExtensionsMap.values());
                continue;
            }
            if (containsExtension(name)) {
                extensionsResult.add(getExtension(name));
            }
        }
        return extensionsResult;
    } else {
        // add extensions, will be sorted by its order
        for (String name : names) {
            if (name.startsWith(REMOVE_VALUE_PREFIX) || namesSet.contains(
                REMOVE_VALUE_PREFIX &#43; name)) {
                continue;
            }
            if (DEFAULT_KEY.equals(name)) {
                continue;
            }
            if (containsExtension(name)) {
                activateExtensionsMap.put(getExtensionClass(name), getExtension(name));
            }
        }
        return new ArrayList&lt;&gt;(activateExtensionsMap.values());
    }
}
```

## getAdaptiveExtension 方法

源码位置: ``

```java
public T getAdaptiveExtension() {
    checkDestroyed();
    // 延迟获取
    Object instance = cachedAdaptiveInstance.get();
    if (instance == null) {
        if (createAdaptiveInstanceError != null) {
            throw new IllegalStateException(
                &#34;Failed to create adaptive instance: &#34; &#43; createAdaptiveInstanceError.toString(),
                createAdaptiveInstanceError);
        }

        synchronized (cachedAdaptiveInstance) {
            instance = cachedAdaptiveInstance.get();
            if (instance == null) {
                try {
                    // 创建 Adaptive 
                    instance = createAdaptiveExtension();
                    cachedAdaptiveInstance.set(instance);
                } catch (Throwable t) {
                    createAdaptiveInstanceError = t;
                    throw new IllegalStateException(
                        &#34;Failed to create adaptive instance: &#34; &#43; t.toString(), t);
                }
            }
        }
    }

    return (T) instance;
}
```

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#createAdaptiveExtension`

```java
// 创建 Adaptive
private T createAdaptiveExtension() {
    try {
        // 获取 AdaptiveExtensionClass, 如果不存在，就会动态创建
        T instance = (T) getAdaptiveExtensionClass().newInstance();
        instance = postProcessBeforeInitialization(instance, null);
        injectExtension(instance);
        instance = postProcessAfterInitialization(instance, null);
        initExtension(instance);
        return instance;
    } catch (Exception e) {
        throw new IllegalStateException(
            &#34;Can&#39;t create adaptive extension &#34; &#43; type &#43; &#34;, cause: &#34; &#43; e.getMessage(), e);
    }
}
```

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#createAdaptiveExtensionClass`

```java
// 动态创建
private Class&lt;?&gt; createAdaptiveExtensionClass() {
    // Adaptive Classes&#39; ClassLoader should be the same with Real SPI interface classes&#39; ClassLoader
    ClassLoader classLoader = type.getClassLoader();
    try {
        if (NativeUtils.isNative()) {
            return classLoader.loadClass(type.getName() &#43; &#34;$Adaptive&#34;);
        }
    } catch (Throwable ignore) {

    }
    // 生成代码
    String code = new AdaptiveClassCodeGenerator(type, cachedDefaultName).generate();
    org.apache.dubbo.common.compiler.Compiler compiler = extensionDirector.getExtensionLoader(
        org.apache.dubbo.common.compiler.Compiler.class).getAdaptiveExtension();
    // 编译代码，然后加载
    return compiler.compile(type, code, classLoader);
}
```

## 测试类

`org.apache.dubbo.common.extension.ExtensionLoaderTest#test_getExtension`

`org.apache.dubbo.common.extension.ExtensionLoaderTest#test_getExtension_WithWrapper`

`org.apache.dubbo.common.extension.ExtensionLoaderTest#test_getActivateExtension_WithWrapper1`

`org.apache.dubbo.common.extension.ExtensionLoader_Adaptive_Test#test_getAdaptiveExtension_customizeAdaptiveKey`

`org.apache.dubbo.common.extension.ExtensionLoader_Adaptive_Test#test_getAdaptiveExtension_protocolKey`

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/02-extensionloader/  

