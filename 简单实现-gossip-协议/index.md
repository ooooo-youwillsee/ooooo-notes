# 简单实现 gossip 协议


&gt; `gossip` 协议是为实现**最终一致性**提出的。

## 实现思路

&gt; 每个节点都有**基本属性**，如 `id`, `addr`, `port`。 &lt;br/&gt;
&gt; 每个节点都有**成员列表** `members`，存储**一部分数据** `data`。 &lt;br/&gt;
&gt; 通过**定时**向**随机节点**发送请求，**同步**成员列表给**随机节点**，这样就能达到**成员列表最终一致性**。 &lt;br/&gt;
&gt; 客户端访问数据，先根据 `key` 来计算 `hash` 值，对成员列表**取余**，确定是哪个节点上，要么**返回数据**要么**转发请求**。 &lt;br/&gt;

## 实现代码

每个节点的定义:

```go
type Node struct {
	Id   ID
	Addr string
	Port int
	// 上次联系时间
	lastContact time.Time
	// 所有的节点列表
	members map[ID]*Node
	// 每个节点都会携带一部分数据
	data map[string]string
}
```

向随机节点发送同步请求：

```go
func (n *Node) sync() {
	// 随机选择一个节点
	targetNode := n.selectRandomNode()
	if targetNode == nil {
		log.Printf(&#34;%s, not sync, targetNode is nil&#34;, n)
		return
	}

	// 发送请求
	err := n.call(targetNode, n.members)
	if err != nil {
		// 节点超时, 应该加入失败节点列表，然后广播所有节点判断是否应该剔除
		log.Printf(&#34;self: %s call fail, targetNode is %v&#34;, n, targetNode)
		return
	}
	log.Printf(&#34;self: %s sync success, targetNode is %v&#34;, n, targetNode)
	targetNode.lastContact = time.Now()
}
```

随机节点处理请求：

```go
// 模拟被调用方的逻辑
func (n *Node) call(targetNode *Node, members map[ID]*Node) error {
	// 更新成员
	for id, m := range members {
		if _, ok := targetNode.members[id]; !ok {
			targetNode.members[id] = m
		}
	}
	// 更新时间
	targetNode.members[n.Id] = n
	targetNode.members[n.Id].lastContact = time.Now()
	return nil
}
```

## 示例代码

[demo-gossip-protocol](https://github.com/ooooo-youwillsee/demo-gossip-protocol)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E7%AE%80%E5%8D%95%E5%AE%9E%E7%8E%B0-gossip-%E5%8D%8F%E8%AE%AE/  

