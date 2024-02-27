# 搭建 tomcat 源码调试环境


## 1. 下载代码

```shell
git clone  git@github.com:apache/tomcat.git
```

## 2. 安装ant

1. 我本地安装的是 `1.10.12` 版本, [ant 下载地址](https://ant.apache.org/bindownload.cgi)
2. 配置环境变量 `ANT_HOME`, 加入到 `PATH` 环境变量中
3. 执行命令验证 `ant -version`

## 3. 导入到 idea 中

```shell
# 进入 tomcat 根目前
cd tomcat 

# 复制配置文件 build.properties
cp build.properties.default build.properties

# 更改 build.properties 中的配置
base.path=第三方jar的下载目录

# 设置 idea
ant ide-intellij

# 执行编译命令, 会生成 output 目录
ant deploy
```

然后用 idea 打开项目，idea 会弹出让你配置**下面的变量**

```shell
ANT_HOME          = ${ant.home}
TOMCAT_BUILD_LIBS = ${base.path}
```

## 4. idea 中 配置

* 检查你的**项目依赖**有没有问题


![项目依赖配置](/ooooo-notes/images/tomcat-source-code-env-dependencies.png &#34;项目依赖配置&#34;)

上面的**三个依赖**，其实就是 **ServletContainerInitializer** 的实现, 比如 `res/META-INF/jasper.jar/services/jakarta.servlet.ServletContainerInitializer`.

* 更改配置文件 conf/server.xml

```shell
# 改为编译输出目录
appBase=&#34;output/build/webapps&#34;
```

* 运行程序 

`org.apache.catalina.startup.Bootstrap#main`

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E6%90%AD%E5%BB%BA-tomcat-%E6%BA%90%E7%A0%81%E8%B0%83%E8%AF%95%E7%8E%AF%E5%A2%83/  

