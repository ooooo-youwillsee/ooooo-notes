# 在 java 中如何解决类冲突问题


## 1. 自定义 classloader

有时候，我们在项目开发的时候，会遇到比较恶心的问题，存在两个不同 jar 包，但是**类的全限定名**是一样的，而这两个包都不能删除，这时候调用可能就会出问题。

如何解决上面的问题？ 我的答案就是**自定义类加载器**。

场景模拟

* `module-a`: 表示 a.jar
* `module-b`: 表示 b.jar
* `module-main`: 表示 程序入口

由于在 `module-main` 项目中同时引入了 `module-a` 和 `module-b` 这两个 jar 包，但是存在冲突类 `HelloService`, 最终导致**程序运行错误**。

如何自定义 classloader，来解决问题？

* 重新定义 `loadClass` 方法，打破**父类委托机制**
* 使用 `getResources` 方法来获取所有的 class 文件，然后判断

```java
  @SneakyThrows
  public String test1(String message) {
    // 查找类
    ClassLoader classLoader = new ModuleAClassLoader();
    Class<?> clazz = classLoader.loadClass("com.ooooo.HelloService");

    // 执行
    Method test1 = ReflectionUtils.findMethod(clazz, "test1", String.class);
    Object result = test1.invoke(null, message);

    return (String) result;
  }

  @SneakyThrows
  public String test2(String message) {
    // 查找类
    ClassLoader classLoader = new ModuleBClassLoader();
    Class<?> clazz = classLoader.loadClass("com.ooooo.HelloService");

    // 执行
    Method test2 = ReflectionUtils.findMethod(clazz, "test2", String.class);
    Object result = test2.invoke(null, message);

    return (String) result;
  }


  private static class ModuleAClassLoader extends ClassLoader {

    public ModuleAClassLoader() {
      super(ModuleAClassLoader.class.getClassLoader());
    }

    @SneakyThrows
    @Override
    protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
      Class<?> c = findLoadedClass(name);

      if (c == null) {
        // 当前路径下去找
        if (name.contains("com.ooooo")) {
          String path = name.replace(".", "/") + ".class";
          Enumeration<URL> resources = getResources(path);

          URL targetUrl = null;
          while (resources.hasMoreElements()) {
            targetUrl = resources.nextElement();
            if (targetUrl.toString().contains("module-a")) {
              break;
            }
          }

          // 读取 class 文件
          InputStream in = targetUrl.openStream();
          byte[] bytes = StreamUtils.copyToByteArray(in);
          in.close();

          c = defineClass(name, bytes, 0, bytes.length);
        }
      }

      if (c == null) {
        c = getParent().loadClass(name);
      }

      if (resolve) {
        resolveClass(c);
      }
      return c;
    }
  }


  private static class ModuleBClassLoader extends ClassLoader {

    public ModuleBClassLoader() {
      super(ModuleAClassLoader.class.getClassLoader());
    }

    @SneakyThrows
    @Override
    protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
      Class<?> c = findLoadedClass(name);

      if (c == null) {
        // 当前路径下去找
        if (name.contains("com.ooooo")) {
          String path = name.replace(".", "/") + ".class";
          Enumeration<URL> resources = getResources(path);

          URL targetUrl = null;
          while (resources.hasMoreElements()) {
            targetUrl = resources.nextElement();
            if (targetUrl.toString().contains("module-b")) {
              break;
            }
          }

          // 读取 class 文件
          InputStream in = targetUrl.openStream();
          byte[] bytes = StreamUtils.copyToByteArray(in);
          in.close();

          c = defineClass(name, bytes, 0, bytes.length);
        }
      }

      if (c == null) {
        c = getParent().loadClass(name);
      }

      if (resolve) {
        resolveClass(c);
      }
      return c;
    }
  }

}
```

## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/spring-boot-classloader)

