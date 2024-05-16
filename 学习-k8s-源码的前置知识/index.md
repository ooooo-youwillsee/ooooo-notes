# 学习 K8s 源码的前置知识


## 1. GVK 定义

GVK(group version kind): 资源组、资源版本、资源类型

表示 apps 组下 v1 版本 Deployment 类型的资源。

```yaml
apiVersion: apps/v1
kind: Deployment
```

表示 core 组下 v1 版本 Pod 类型的资源。(没有组信息表示**核心组**)

```yaml
apiVersion: v1
kind: Pod
```

## 2. kubernetes 对象结构

每个对象都可以分为**四个部分**。

例如 **Deployment** 资源：

* `TypeMeta`: GVK 信息
* `ObjectMeta`: 对象元数据，比如有属性 name、namespace
* `DeploymentSpec`: 对象定义规范，比如有属性 replicas(控制副本数量)、template(定义 Pod 的模板)、selector(标签选择器，与 Pod 标签一样)、strategy(Pod 升级策略)
* `DeploymentStatus`: 对象运行时状态， 比如有属性 replicas(总的副本数)

代码路径：`kubernetes\vendor\k8s.io\api\apps\v1\types.go`

```go
type Deployment struct {
metav1.TypeMeta `json:&#34;,inline&#34;`
// Standard object&#39;s metadata.
// More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata
// &#43;optional
metav1.ObjectMeta `json:&#34;metadata,omitempty&#34; protobuf:&#34;bytes,1,opt,name=metadata&#34;`

// Specification of the desired behavior of the Deployment.
// &#43;optional
Spec DeploymentSpec `json:&#34;spec,omitempty&#34; protobuf:&#34;bytes,2,opt,name=spec&#34;`

// Most recently observed status of the Deployment.
// &#43;optional
Status DeploymentStatus `json:&#34;status,omitempty&#34; protobuf:&#34;bytes,3,opt,name=status&#34;`
}
```

## 3. kubernetes 源码目录结构

* `cmd`: 可执行程序包， 例如 kubelet 的入口为 `kubernetes\cmd\kubelet\kubelet.go`
* `pkg`: kubernetes 包路径, 有些子目录与 cmd 目录一样，就是**入口文件**依赖的包
* `vendor`: 第三方包，其中也有 kubernetes 的包
* `plugin`: 准入插件和认证插件
* `hack`: 脚本路径，非常有用
* `api`: OpenAPI 定义

上述,只是简单的描述了，目前只需要知道 `cmd`, `pkg`, `vendor` 是非常重要的，也是我们经常看的。

## 4. 如何去阅读源码，真的需要把整个项目都运行起来吗？

我个人认为是完全不需要。

一般来说看源码，只需要**了解主线代码，知道哪些类是怎么配合的，一起完成了什么样的功能**，即使你把整个程序都运行起来了，有些分支条件的代码，需要特殊的输入数据，在你不熟悉代码的情况下，你也很难去模拟，这时候我们只能看**代码的测试类**
，来了解**代码是怎样处理这个特殊数据的**。

特意说明一下：

以后的阅读代码的部分，我基本以**测试类**来带领大家阅读。



---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%AD%A6%E4%B9%A0-k8s-%E6%BA%90%E7%A0%81%E7%9A%84%E5%89%8D%E7%BD%AE%E7%9F%A5%E8%AF%86/  

