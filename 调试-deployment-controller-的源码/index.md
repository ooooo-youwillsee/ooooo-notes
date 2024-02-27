# 调试 deployment-controller 的源码


&gt; 1. `deployment` 资源是我们经常需要使用的，也是我们最应该熟悉的源码.
&gt; 2. 对于调试源码，我使用是 `deployment_controller_test.go` 测试类， `TestSyncDeploymentCreatesReplicaSet` 方法.

## TestSyncDeploymentCreatesReplicaSet 测试方法的结构

源码路径：`kubernetes\pkg\controller\deployment\deployment_controller_test.go`

1. 测试配置对象

```go
f := newFixture(t)
```

创建一个 fixture 对象， 里面有 **objects** 属性，这个用来**模拟 clientSet**, 也就是**请求 etcd 的接口**，后面将会详细描述。

2. 创建一个 **Deployment** 对象， 标签为 &#34;foo&#34;: &#34;bar&#34;

```go
d := newDeployment(&#34;foo&#34;, 1, nil, nil, nil, map[string]string{&#34;foo&#34;: &#34;bar&#34;})
```

3. 添加缓存对象，用于后续的**List**接口

```go
f.dLister = append(f.dLister, d)
f.objects = append(f.objects, d)
```

4. 创建一个 **ReplicaSet** 对象

```go
rs := newReplicaSet(d, &#34;deploymentrs-4186632231&#34;, 1)
```

5. 希望的测试结果

```go
f.expectCreateRSAction(rs)
f.expectUpdateDeploymentStatusAction(d)
f.expectUpdateDeploymentStatusAction(d)
```

从上面的语句就可以发现，kubernetes 的测试类，意图非常明确。

也就是说 **我创建一个 Deployment ** 对象，肯定会产生一个 ReplicaSet 对象，并且 DeploymentStatus 会被更新两次**, 接下来，我们来看看是**kubernetes如何做到的**。


## 测试方法的执行 f.run(testutil.GetKey(d, t))

1. 获取 Deployment 的 key 属性

代码
```go
testutil.GetKey(d, t) 

func GetKey(obj interface{}, t *testing.T) string {
    // 每个删除的对象都是这个类型, 这里取出了真实的对象
	tombstone, ok := obj.(cache.DeletedFinalStateUnknown)
	if ok {
		// if tombstone , try getting the value from tombstone.Obj
		obj = tombstone.Obj
	}
	// 取出指针类型中 value，获取 Name 属性
	val := reflect.ValueOf(obj).Elem()
	name := val.FieldByName(&#34;Name&#34;).String()
	if len(name) == 0 {
		t.Errorf(&#34;Unexpected object %v&#34;, obj)
	}

	// 获取key, 结果就是 {namespace}/{name}
	key, err := keyFunc(obj)
	if err != nil {
		t.Errorf(&#34;Unexpected error getting key for %T %v: %v&#34;, val.Interface(), name, err)
		return &#34;&#34;
	}
	return key
}
```

2. 调用 fixture.run_() 方法

这个函数有三个入参：`run_(deploymentName string, startInformers bool, expectError bool)`.

当前的测试方法 **TestSyncDeploymentCreatesReplicaSet** 的 `startInformers` 参数为 **false**, 表示不启动 Informer, 后续会用**另外一个测试类**来说明 **Informer 的启动过程**.

接下来详细看看 `fixture.run_()` 方法都干了啥。

3. 创建一个 controller 

`c, informers, err := f.newController()`

```go
func (f *fixture) newController() (*DeploymentController, informers.SharedInformerFactory, error) {
	// 这个也就是之前说的，objects 会用来构建 模拟的 clientSet
	f.client = fake.NewSimpleClientset(f.objects...)
	// 创建了 informer 和 deploymentController
	informers := informers.NewSharedInformerFactory(f.client, controller.NoResyncPeriodFunc())
	c, err := NewDeploymentController(informers.Apps().V1().Deployments(), informers.Apps().V1().ReplicaSets(), informers.Core().V1().Pods(), f.client)
	if err != nil {
		return nil, nil, err
	}
	// 模拟一个 recorder
	c.eventRecorder = &amp;record.FakeRecorder{}
	// 所有状态默认为 synced
	c.dListerSynced = alwaysReady
	c.rsListerSynced = alwaysReady
	c.podListerSynced = alwaysReady
	// 下面这个代码很关键
	// 先前在 fixture 对象中加入了相应的 Lister，在这里遍历这些 Lister, 就是为了模拟 Informer 的本地缓存
	// kube_controller_manager 程序启动之后，会请求 kube_apiserver 来获取相应的资源，从而更新到自己的缓存中
	for _, d := range f.dLister {
		informers.Apps().V1().Deployments().Informer().GetIndexer().Add(d)
	}
	for _, rs := range f.rsLister {
		informers.Apps().V1().ReplicaSets().Informer().GetIndexer().Add(rs)
	}
	for _, pod := range f.podLister {
		informers.Core().V1().Pods().Informer().GetIndexer().Add(pod)
	}
	return c, informers, nil
}
```

详细分析是怎么模拟 clientSet 的？

`f.client = fake.NewSimpleClientset(f.objects...)`

```go
func NewSimpleClientset(objects ...runtime.Object) *Clientset {
	// 这个是模拟的最终实现对象，所有操作都是依赖它来完成的
	o := testing.NewObjectTracker(scheme, codecs.UniversalDecoder())
	// 遍历对象，依次添加
	for _, obj := range objects {
		if err := o.Add(obj); err != nil {
			panic(err)
		}
	}

	// 创建一个 clientSet
	cs := &amp;Clientset{tracker: o}
	// 下面三个都是依赖 tracker 来实现的， 通过不同的 Action, 比如 ListActionImpl、GetActionImpl 等
	cs.discovery = &amp;fakediscovery.FakeDiscovery{Fake: &amp;cs.Fake}
	cs.AddReactor(&#34;*&#34;, &#34;*&#34;, testing.ObjectReaction(o))
	cs.AddWatchReactor(&#34;*&#34;, func(action testing.Action) (handled bool, ret watch.Interface, err error) {
		gvr := action.GetResource()
		ns := action.GetNamespace()
		watch, err := o.Watch(gvr, ns)
		if err != nil {
			return false, nil, err
		}
		return true, watch, nil
	})

	return cs
}
```

ObjectTracker 如果添加对象的？ 

`testing.NewObjectTracker(scheme, codecs.UniversalDecoder())`

```go
func (t *tracker) Add(obj runtime.Object) error {
	// 添加 List
	if meta.IsListType(obj) {
		return t.addList(obj, false)
	}
	// 用来获取 namespace
	objMeta, err := meta.Accessor(obj)
	// 获取 gvk
	gvks, _, err := t.scheme.ObjectKinds(obj)
	for _, gvk := range gvks {
		// NOTE: UnsafeGuessKindToResource is a heuristic and default match. The
		// actual registration in apiserver can specify arbitrary route for a
		// gvk. If a test uses such objects, it cannot preset the tracker with
		// objects via Add(). Instead, it should trigger the Create() function
		// of the tracker, where an arbitrary gvr can be specified.
		gvr, _ := meta.UnsafeGuessKindToResource(gvk)
		// Resource doesn&#39;t have the concept of &#34;__internal&#34; version, just set it to &#34;&#34;.
		if gvr.Version == runtime.APIVersionInternal {
			gvr.Version = &#34;&#34;
		}

		// 添加这个
		err := t.add(gvr, obj, objMeta.GetNamespace(), false)
		if err != nil {
			return err
		}
	}
	return nil
}
```

```go
func (t *tracker) add(gvr schema.GroupVersionResource, obj runtime.Object, ns string, replaceExisting bool) error {
	t.lock.Lock()
	defer t.lock.Unlock()

	gr := gvr.GroupResource()

	// To avoid the object from being accidentally modified by caller
	// after it&#39;s been added to the tracker, we always store the deep
	// copy.
	obj = obj.DeepCopyObject()

	newMeta, err := meta.Accessor(obj)

	_, ok := t.objects[gvr]
	if !ok {
		t.objects[gvr] = make(map[types.NamespacedName]runtime.Object)
	}

	// replaceExisting 策略来放入新对象
	namespacedName := types.NamespacedName{Namespace: newMeta.GetNamespace(), Name: newMeta.GetName()}
	if _, ok = t.objects[gvr][namespacedName]; ok {
		if replaceExisting {
			for _, w := range t.getWatches(gvr, ns) {
				// To avoid the object from being accidentally modified by watcher
				// 最终操作： f.result &lt;- Event{Modified, obj}
				w.Modify(obj.DeepCopyObject())
			}
			// 覆盖原先的对象
			t.objects[gvr][namespacedName] = obj
			return nil
		}
		return errors.NewAlreadyExists(gr, newMeta.GetName())
	}

	if replaceExisting {
		// Tried to update but no matching object was found.
		return errors.NewNotFound(gr, newMeta.GetName())
	}

	// 最终也就是放到这个 map 中
	t.objects[gvr][namespacedName] = obj

	// 实现 objectTracker, 每添加一个新的对象，就会向 chan 中放入这个新对象
	// 最终操作： f.result &lt;- Event{Added, obj)
	for _, w := range t.getWatches(gvr, ns) {
		// To avoid the object from being accidentally modified by watcher
		w.Add(obj.DeepCopyObject())
	}

	return nil
}
```


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E8%B0%83%E8%AF%95-deployment-controller-%E7%9A%84%E6%BA%90%E7%A0%81/  

