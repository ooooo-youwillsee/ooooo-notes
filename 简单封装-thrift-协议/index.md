# 简单封装 Thrift 协议


## build.gradle 文件

```shell
plugins {
    id(&#34;com.linecorp.thrift-gradle-plugin&#34;) version &#34;0.5.0&#34;
}

dependencies {
    api(&#39;org.apache.thrift:libthrift:0.19.0&#39;)
    api(&#39;org.springframework.boot:spring-boot-starter-logging&#39;)
    api(&#39;cn.hutool:hutool-all&#39;)

    testImplementation(&#39;org.springframework.boot:spring-boot-starter-test&#39;)
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
 *  map&lt;t1,t2&gt;  Map from one type to another
 *  list&lt;t1&gt;    Ordered list of one type
 *  set&lt;t1&gt;     Set of unique elements of one type
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

  private static final String CLASS_NAME_SUFFIX_IFACE = &#34;$Iface&#34;;

  private static final String CLASS_NAME_SUFFIX_PROCESSOR = &#34;$Processor&#34;;

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
      log.error(&#34;start thrift server&#34;, e);
      throw new RuntimeException(e);
    }
    TThreadedSelectorServer.Args args = new TThreadedSelectorServer.Args(serverSocket).processor(multiplexedProcessor);
    TServer server = new TThreadedSelectorServer(args);

    new Thread(() -&gt; {
      log.info(&#34;start thrift server on port {}&#34;,port);
      server.serve();
      log.info(&#34;stop thrift server on port {}&#34;, port);
    }, &#34;thrift-server&#34;).start();
  }


  public void addService(Object service) {
    Class&lt;?&gt; interfaceClass = findInterfaceClass(service);
    addProcessor(interfaceClass, service);
  }

  private synchronized void addProcessor(Class&lt;?&gt; interfaceClass, Object service) {
    String processorClassName = interfaceClass.getName().replace(CLASS_NAME_SUFFIX_IFACE, CLASS_NAME_SUFFIX_PROCESSOR);
    Class&lt;?&gt; processorClass;
    try {
      processorClass = Class.forName(processorClassName, true, interfaceClass.getClassLoader());
    } catch (ClassNotFoundException e) {
      throw new RuntimeException(e);
    }
    TProcessor processor = (TProcessor) ReflectUtil.newInstance(processorClass, service);
    log.info(&#34;add thrift interface {}&#34;, interfaceClass);
    multiplexedProcessor.registerProcessor(interfaceClass.getName(), processor);
  }

  private static Class&lt;?&gt; findInterfaceClass(Object service) {
    Assert.notNull(service);
    Class&lt;?&gt; clazz = service.getClass();
    Class&lt;?&gt; interfaceClazz = null;
    for (Class&lt;?&gt; c : clazz.getInterfaces()) {
      if (c.getName().contains(CLASS_NAME_SUFFIX_IFACE)) {
        interfaceClazz = c;
        break;
      }
    }
    if (interfaceClazz == null) {
      throw new IllegalArgumentException(&#34;service is not thrift implement object&#34;);
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

  private static final String CLASS_NAME_SUFFIX_IFACE = &#34;$Iface&#34;;

  private static final String CLASS_NAME_SUFFIX_CLIENT = &#34;$Client&#34;;

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
      log.info(&#34;connect thrift error&#34;, e);
      throw new RuntimeException(e);
    }
  }

  public &lt;T extends TServiceClient&gt; T getClient(String interfaceClassName) {
    log.info(&#34;add thrift interface {}&#34;, interfaceClassName);
    String clientClassName = interfaceClassName.replace(CLASS_NAME_SUFFIX_IFACE, CLASS_NAME_SUFFIX_CLIENT);
    Class&lt;T&gt; clientClass = ClassUtil.loadClass(clientClassName);
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
    System.out.println(&#34;num1: &#34; &#43; num1 &#43; &#34;, num2: &#34; &#43; num2);
    return num1 &#43; num2;
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

    @Cleanup ThriftClient thriftClient = new ThriftClient(&#34;localhost&#34;, 9090);
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
    TTransport transport = new TSocket(&#34;localhost&#34;, 9090);
    transport.open();
    TTransport framedTransport = new TFramedTransport(transport, Integer.MAX_VALUE);
    TProtocol protocol = new TBinaryProtocol(framedTransport);
    TMultiplexedProtocol multiplexedProtocol = new TMultiplexedProtocol(protocol, Calculator.Iface.class.getName());
    Calculator.Client client = new Calculator.Client(multiplexedProtocol);

    int add = client.add(1, 2);
    System.out.println(&#34;add: &#34; &#43; add);

    transport.close();
  }

  private void startServer() {
    CalculatorHandler handler = new CalculatorHandler();
    Calculator.Processor&lt;CalculatorHandler&gt; processor = new Calculator.Processor&lt;&gt;(handler);
    TNonblockingServerSocket serverSocket;
    try {
      serverSocket = new TNonblockingServerSocket(9090);
    } catch (TTransportException e) {
      throw new RuntimeException(e);
    }
    TMultiplexedProcessor multiplexedProcessor = new TMultiplexedProcessor();
    multiplexedProcessor.registerProcessor(Calculator.Iface.class.getName(), processor);
    TServer server = new TThreadedSelectorServer(new TThreadedSelectorServer.Args(serverSocket).processor(multiplexedProcessor));
    new Thread(() -&gt; {
      System.out.println(&#34;Starting the simple server...&#34;);
      server.serve();
    }).start();
  }

}
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E7%AE%80%E5%8D%95%E5%B0%81%E8%A3%85-thrift-%E5%8D%8F%E8%AE%AE/  

