# 在 Java 中如何解决类冲突问题


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
    Class&lt;?&gt; clazz = classLoader.loadClass(&#34;com.ooooo.HelloService&#34;);

    // 执行
    Method test1 = ReflectionUtils.findMethod(clazz, &#34;test1&#34;, String.class);
    Object result = test1.invoke(null, message);

    return (String) result;
  }

  @SneakyThrows
  public String test2(String message) {
    // 查找类
    ClassLoader classLoader = new ModuleBClassLoader();
    Class&lt;?&gt; clazz = classLoader.loadClass(&#34;com.ooooo.HelloService&#34;);

    // 执行
    Method test2 = ReflectionUtils.findMethod(clazz, &#34;test2&#34;, String.class);
    Object result = test2.invoke(null, message);

    return (String) result;
  }


  private static class ModuleAClassLoader extends ClassLoader {

    public ModuleAClassLoader() {
      super(ModuleAClassLoader.class.getClassLoader());
    }

    @SneakyThrows
    @Override
    protected Class&lt;?&gt; loadClass(String name, boolean resolve) throws ClassNotFoundException {
      Class&lt;?&gt; c = findLoadedClass(name);

      if (c == null) {
        // 当前路径下去找
        if (name.contains(&#34;com.ooooo&#34;)) {
          String path = name.replace(&#34;.&#34;, &#34;/&#34;) &#43; &#34;.class&#34;;
          Enumeration&lt;URL&gt; resources = getResources(path);

          URL targetUrl = null;
          while (resources.hasMoreElements()) {
            targetUrl = resources.nextElement();
            if (targetUrl.toString().contains(&#34;module-a&#34;)) {
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
    protected Class&lt;?&gt; loadClass(String name, boolean resolve) throws ClassNotFoundException {
      Class&lt;?&gt; c = findLoadedClass(name);

      if (c == null) {
        // 当前路径下去找
        if (name.contains(&#34;com.ooooo&#34;)) {
          String path = name.replace(&#34;.&#34;, &#34;/&#34;) &#43; &#34;.class&#34;;
          Enumeration&lt;URL&gt; resources = getResources(path);

          URL targetUrl = null;
          while (resources.hasMoreElements()) {
            targetUrl = resources.nextElement();
            if (targetUrl.toString().contains(&#34;module-b&#34;)) {
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


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-java-%E4%B8%AD%E5%A6%82%E4%BD%95%E8%A7%A3%E5%86%B3%E7%B1%BB%E5%86%B2%E7%AA%81%E9%97%AE%E9%A2%98/  

