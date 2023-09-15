# 简单封装 thrift 协议


## build.gradle 文件

```shell
plugins {
    id("com.linecorp.thrift-gradle-plugin") version "0.5.0"
}

dependencies {
    api('org.apache.thrift:libthrift:0.19.0')
    api('org.springframework.boot:spring-boot-starter-logging')
    api('cn.hutool:hutool-all')

    testImplementation('org.springframework.boot:spring-boot-starter-test')
}
```

## example.thrift 文件

文件放在路径: `src/main/thrift`, 运行 `gradle` 命令 `compileThrift`

```thrift
/**
 * The first thing to know about are types. The available types in Thrift are:
 *
 *  bool        Boolean, one byte
 *  i8 (byte)   Signed 8-bit integer
 *  i16         Signed 16-bit integer
 *  i32         Signed 32-bit integer
 *  i64         Signed 64-bit integer
 *  double      64-bit floating point value
 *  string      String
 *  binary      Blob (byte array)
 *  map<t1,t2>  Map from one type to another
 *  list<t1>    Ordered list of one type
 *  set<t1>     Set of unique elements of one type
 *
 * Did you also notice that Thrift supports C style comments?
 */

/**
 * Thrift files can namespace, package, or prefix their output in various
 * target languages.
 */

namespace cl example
namespace cpp example
namespace d example
namespace dart example
namespace java example
namespace php example
namespace perl example
namespace haxe example
namespace netstd example

service Calculator {

   i32 add(1:i32 num1, 2:i32 num2),

}
```

## thrift server 代码 


```java
@Slf4j
public class ThriftServer implements Closeable {

  private static final String CLASS_NAME_SUFFIX_IFACE = "$Iface";

  private static final String CLASS_NAME_SUFFIX_PROCESSOR = "$Processor";

  private final TMultiplexedProcessor multiplexedProcessor = new TMultiplexedProcessor();

  private final AtomicBoolean started = new AtomicBoolean(false);

  private int port;

  private TNonblockingServerSocket serverSocket;

  public ThriftServer(int port) {
    this.port = port;
  }

  public void startServer() {
    if (!started.compareAndSet(false, true)) {
      return;
    }
    try {
      serverSocket = new TNonblockingServerSocket(port);
    } catch (TTransportException e) {
      log.error("start thrift server", e);
      throw new RuntimeException(e);
    }
    TThreadedSelectorServer.Args args = new TThreadedSelectorServer.Args(serverSocket).processor(multiplexedProcessor);
    TServer server = new TThreadedSelectorServer(args);

    new Thread(() -> {
      log.info("start thrift server on port {}",port);
      server.serve();
      log.info("stop thrift server on port {}", port);
    }, "thrift-server").start();
  }


  public void addService(Object service) {
    Class<?> interfaceClass = findInterfaceClass(service);
    addProcessor(interfaceClass, service);
  }

  private synchronized void addProcessor(Class<?> interfaceClass, Object service) {
    String processorClassName = interfaceClass.getName().replace(CLASS_NAME_SUFFIX_IFACE, CLASS_NAME_SUFFIX_PROCESSOR);
    Class<?> processorClass;
    try {
      processorClass = Class.forName(processorClassName, true, interfaceClass.getClassLoader());
    } catch (ClassNotFoundException e) {
      throw new RuntimeException(e);
    }
    TProcessor processor = (TProcessor) ReflectUtil.newInstance(processorClass, service);
    log.info("add thrift interface {}", interfaceClass);
    multiplexedProcessor.registerProcessor(interfaceClass.getName(), processor);
  }

  private static Class<?> findInterfaceClass(Object service) {
    Assert.notNull(service);
    Class<?> clazz = service.getClass();
    Class<?> interfaceClazz = null;
    for (Class<?> c : clazz.getInterfaces()) {
      if (c.getName().contains(CLASS_NAME_SUFFIX_IFACE)) {
        interfaceClazz = c;
        break;
      }
    }
    if (interfaceClazz == null) {
      throw new IllegalArgumentException("service is not thrift implement object");
    }
    return interfaceClazz;
  }

  @Override
  public void close() throws IOException {
    if (serverSocket != null) {
      serverSocket.close();
    }
  }
}
```

## thrift client 代码

```java
@Slf4j
public class ThriftClient implements Closeable {

  private static final String CLASS_NAME_SUFFIX_IFACE = "$Iface";

  private static final String CLASS_NAME_SUFFIX_CLIENT = "$Client";

  private TTransport transport;

  private TProtocol protocol;

  private final AtomicBoolean started = new AtomicBoolean(false);

  private String host;

  private int port;

  public ThriftClient(String host, int port) {
    this.host = host;
    this.port = port;
  }

  public void startClient() {
    if (!started.compareAndSet(false, true)) {
      return;
    }
    try {
      transport = new TSocket(host, port);
      transport.open();
      TTransport framedTransport = new TFramedTransport(transport, Integer.MAX_VALUE);
      protocol = new TBinaryProtocol(framedTransport);
    } catch (TTransportException e) {
      log.info("connect thrift error", e);
      throw new RuntimeException(e);
    }
  }

  public <T extends TServiceClient> T getClient(String interfaceClassName) {
    log.info("add thrift interface {}", interfaceClassName);
    String clientClassName = interfaceClassName.replace(CLASS_NAME_SUFFIX_IFACE, CLASS_NAME_SUFFIX_CLIENT);
    Class<T> clientClass = ClassUtil.loadClass(clientClassName);
    TMultiplexedProtocol multiplexedProtocol = new TMultiplexedProtocol(protocol, interfaceClassName);
    return ReflectUtil.newInstance(clientClass, multiplexedProtocol);
  }

  public void close() {
    if (transport != null) {
      transport.close();
    }
  }
}
```

## 测试类相关代码

实现类: `CalculatorHandler`

```java
public class CalculatorHandler implements Calculator.Iface {
  @Override
  public int add(int num1, int num2) throws TException {
    System.out.println("num1: " + num1 + ", num2: " + num2);
    return num1 + num2;
  }
}
```

测试类: `MultiThriftExampleTest`

```java
public class MultiThriftExampleTest {

  @Test
  void test1() throws Exception {
    @Cleanup ThriftServer thriftServer = new ThriftServer(9090);
    thriftServer.addService(new CalculatorHandler());
    thriftServer.startServer();

    @Cleanup ThriftClient thriftClient = new ThriftClient("localhost", 9090);
    thriftClient.startClient();
    Calculator.Client client = thriftClient.getClient(Calculator.Iface.class.getName());
    int sum = client.add(1, 2);
    assertEquals(3, sum);
  }

  @Test
  void test2() throws TException {
    startServer();
    startClient();
  }

  private void startClient() throws TException {
    try {
      TimeUnit.SECONDS.sleep(3);
    } catch (InterruptedException e) {
      throw new RuntimeException(e);
    }
    TTransport transport = new TSocket("localhost", 9090);
    transport.open();
    TTransport framedTransport = new TFramedTransport(transport, Integer.MAX_VALUE);
    TProtocol protocol = new TBinaryProtocol(framedTransport);
    TMultiplexedProtocol multiplexedProtocol = new TMultiplexedProtocol(protocol, Calculator.Iface.class.getName());
    Calculator.Client client = new Calculator.Client(multiplexedProtocol);

    int add = client.add(1, 2);
    System.out.println("add: " + add);

    transport.close();
  }

  private void startServer() {
    CalculatorHandler handler = new CalculatorHandler();
    Calculator.Processor<CalculatorHandler> processor = new Calculator.Processor<>(handler);
    TNonblockingServerSocket serverSocket;
    try {
      serverSocket = new TNonblockingServerSocket(9090);
    } catch (TTransportException e) {
      throw new RuntimeException(e);
    }
    TMultiplexedProcessor multiplexedProcessor = new TMultiplexedProcessor();
    multiplexedProcessor.registerProcessor(Calculator.Iface.class.getName(), processor);
    TServer server = new TThreadedSelectorServer(new TThreadedSelectorServer.Args(serverSocket).processor(multiplexedProcessor));
    new Thread(() -> {
      System.out.println("Starting the simple server...");
      server.serve();
    }).start();
  }

}
```
