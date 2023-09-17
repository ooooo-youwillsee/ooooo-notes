# 源码分析 dubbo ExtensionLoader


> dubbo 基于 3.2.6 版本

> 在 dubbo 中，ExtensionLoader 是很重要的类，实现了 dubbo 的扩展机制，主要有三个方法，getExtension、getActivateExtension、getAdaptiveExtension。

## getExtension 方法

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#getExtension`

```java
// 根据 name 来获取扩展
public T getExtension(String name) {
    T extension = getExtension(name, true);
    if (extension == null) {
        throw new IllegalArgumentException("Not find extension: " + name);
    }
    return extension;
}

// 根据 name 来获取扩展
public T getExtension(String name, boolean wrap) {
    checkDestroyed();
    if (StringUtils.isEmpty(name)) {
        throw new IllegalArgumentException("Extension name == null");
    }
    // 获取默认扩展
    if ("true".equals(name)) {
        return getDefaultExtension();
    }
    String cacheKey = name;
    if (!wrap) {
        cacheKey += "_origin";
    }
    final Holder<Object> holder = getOrCreateHolder(cacheKey);
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
    Class<?> clazz = getExtensionClasses().get(name);
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
            List<Class<?>> wrapperClassesList = new ArrayList<>();
            if (cachedWrapperClasses != null) {
                wrapperClassesList.addAll(cachedWrapperClasses);
                wrapperClassesList.sort(WrapperComparator.COMPARATOR);
                Collections.reverse(wrapperClassesList);
            }

            if (CollectionUtils.isNotEmpty(wrapperClassesList)) {
                // 遍历包装类
                for (Class<?> wrapperClass : wrapperClassesList) {
                    Wrapper wrapper = wrapperClass.getAnnotation(Wrapper.class);
                    boolean match = (wrapper == null) || ((ArrayUtils.isEmpty(
                        wrapper.matches()) || ArrayUtils.contains(wrapper.matches(),
                        name)) && !ArrayUtils.contains(wrapper.mismatches(), name));
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
            "Extension instance (name: " + name + ", class: " + type + ") couldn't be instantiated: " + t.getMessage(),
            t);
    }
}
```

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#getExtensionClasses`

```java
// 获取扩展的 class, 读取 META-INF/dubbo/internal, META-INF/services, META-INF/dubbo 目录下
private Map<String, Class<?>> getExtensionClasses() {
    // 单例延迟加载
    Map<String, Class<?>> classes = cachedClasses.get();
    if (classes == null) {
        synchronized (cachedClasses) {
            classes = cachedClasses.get();
            if (classes == null) {
                try {
                    // 加载 extension class
                    classes = loadExtensionClasses();
                } catch (InterruptedException e) {
                    logger.error(COMMON_ERROR_LOAD_EXTENSION, "", "",
                        "Exception occurred when loading extension class (interface: " + type + ")",
                        e);
                    throw new IllegalStateException(
                        "Exception occurred when loading extension class (interface: " + type + ")",
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
private Map<String, Class<?>> loadExtensionClasses() throws InterruptedException {
    checkDestroyed();
    cacheDefaultExtensionName();

    Map<String, Class<?>> extensionClasses = new HashMap<>();

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
private void loadClass(ClassLoader classLoader, Map<String, Class<?>> extensionClasses,
                       java.net.URL resourceURL, Class<?> clazz, String name,
                       boolean overridden) {
    if (!type.isAssignableFrom(clazz)) {
        throw new IllegalStateException(
            "Error occurred when loading extension class (interface: " + type + ", class line: " + clazz.getName() + "), class " + clazz.getName() + " is not subtype of interface.");
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
                    "No such extension name for the class " + clazz.getName() + " in the config " + resourceURL);
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
public List<T> getActivateExtension(URL url, String key, String group) {
    String value = url.getParameter(key);
    // 获取 Activate
    return getActivateExtension(url,
        StringUtils.isEmpty(value) ? null : COMMA_SPLIT_PATTERN.split(value), group);
}
```

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#getActivateExtension`

```java
// 获取 Activate
public List<T> getActivateExtension(URL url, String[] values, String group) {
    checkDestroyed();
    // solve the bug of using @SPI's wrapper method to report a null pointer exception.
    Map<Class<?>, T> activateExtensionsMap = new TreeMap<>(activateComparator);
    List<String> names = values == null ?
        new ArrayList<>(0) :
        Arrays.stream(values).map(StringUtils::trim).collect(Collectors.toList());
    Set<String> namesSet = new HashSet<>(names);
    // 判断是否移除默认的
    if (!namesSet.contains(REMOVE_VALUE_PREFIX + DEFAULT_KEY)) {
        if (cachedActivateGroups.size() == 0) {
            synchronized (cachedActivateGroups) {
                // cache all extensions
                if (cachedActivateGroups.size() == 0) {
                    // 确保 extension 已经加载，这个方法上面已经分析过了
                    getExtensionClasses();
                    // 遍历所有的 activate class
                    for (Map.Entry<String, Object> entry : cachedActivates.entrySet()) {
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
                            new HashSet<>(Arrays.asList(activateGroup)));
                        String[][] keyPairs = new String[activateValue.length][];
                        for (int i = 0; i < activateValue.length; i++) {
                            if (activateValue[i].contains(":")) {
                                keyPairs[i] = new String[2];
                                String[] arr = activateValue[i].split(":");
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
        cachedActivateGroups.forEach((name, activateGroup) -> {
            // 判断 group 和 name 是否匹配
            if (isMatchGroup(group, activateGroup) && !namesSet.contains(
                name) && !namesSet.contains(REMOVE_VALUE_PREFIX + name) && isActive(
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
        ArrayList<T> extensionsResult = new ArrayList<>(
            activateExtensionsMap.size() + names.size());
        for (String name : names) {
            if (name.startsWith(REMOVE_VALUE_PREFIX) || namesSet.contains(
                REMOVE_VALUE_PREFIX + name)) {
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
                REMOVE_VALUE_PREFIX + name)) {
                continue;
            }
            if (DEFAULT_KEY.equals(name)) {
                continue;
            }
            if (containsExtension(name)) {
                activateExtensionsMap.put(getExtensionClass(name), getExtension(name));
            }
        }
        return new ArrayList<>(activateExtensionsMap.values());
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
                "Failed to create adaptive instance: " + createAdaptiveInstanceError.toString(),
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
                        "Failed to create adaptive instance: " + t.toString(), t);
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
            "Can't create adaptive extension " + type + ", cause: " + e.getMessage(), e);
    }
}
```

源码位置: `org.apache.dubbo.common.extension.ExtensionLoader#createAdaptiveExtensionClass`

```java
// 动态创建
private Class<?> createAdaptiveExtensionClass() {
    // Adaptive Classes' ClassLoader should be the same with Real SPI interface classes' ClassLoader
    ClassLoader classLoader = type.getClassLoader();
    try {
        if (NativeUtils.isNative()) {
            return classLoader.loadClass(type.getName() + "$Adaptive");
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
