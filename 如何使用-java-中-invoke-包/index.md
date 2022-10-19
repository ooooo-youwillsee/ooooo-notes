# 如何使用 java 中 invoke 包?


## 1. methodHandle 调用

在过去，我们调用一个类的方法，除了**直接调用**，再就是使用**反射**来调用了。而今天我要说说 jdk 新引入的方式来调用。

比如我们有一个很简单的 UserService 类。

```java
public class UserService {

  public String getUsername(String id) {
    return "username" + id;
  }

}
```

**直接调用**和**反射调用**的方式比较简单，我就不说明了。

下面来演示 `invoke` 包的使用。

* 使用 `MethodHandles.lookup()` 来查找对应的方法
* 使用 `methodHandle` 来调用，分为几种不同的方式

```java
public class UserServiceTest {

  private MethodType methodType;
  private Lookup lookup;
  private MethodHandle methodHandle;

  @SneakyThrows
  @BeforeEach
  public void beforeEach() {
    methodType = MethodType.methodType(String.class, String.class);
    lookup = MethodHandles.lookup();
    methodHandle = lookup.findVirtual(UserService.class, "getUsername", methodType);
  }

  @SneakyThrows
  @Test
  public void invokeWithArguments() {
    UserService userService = new UserService();
    Object obj = methodHandle.bindTo(userService).invokeWithArguments("1");
    assertEquals("username1", obj);

  }

  @SneakyThrows
  @Test
  public void invoke() {
    UserService userService = new UserService();
    Object obj = methodHandle.invoke(userService, "1");
    assertEquals("username1", obj);
  }

  /**
   * 要求类型全匹配, 包括返回值类型
   */
  @SneakyThrows
  @Test
  public void invokeExact() {
    UserService userService = new UserService();
    String s = (String) methodHandle.invokeExact(userService, "1");
    assertEquals("username1", s);
  }

}
```

## 2. 代码实现位置

[github 地址](https://github.com/ooooo-youwillsee/java-framework-guide/blob/main/spring-boot-methodHandler)

