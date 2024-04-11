# 常见的限流算法


## 固定窗口算法

```go
type FixedWindowRateLimiter struct {
	// 固定窗口大小, 单位ms
	windowInterval time.Duration
	// 限制
	limit int
	// 窗口开始时间
	prevTime time.Time
	// 当前限制
	curLimit int
}

func (s *FixedWindowRateLimiter) acquire() (bool, error) {
	// 不在一个时间窗口，重置
	if time.Until(s.prevTime) &gt; s.windowInterval {
		s.curLimit = 0
	}
	s.curLimit&#43;&#43;
	s.prevTime = time.Now()
	return s.curLimit &lt; s.limit, nil
}
```

## 令牌桶算法

```go
type TokenBucketRateLimiter struct {
	// 桶大小
	bucketSize int
	// 速率，单位ms
	rate int
	// 剩余令牌数
	remainTokens int
	// 时间
	prevTime time.Time
}

func (t *TokenBucketRateLimiter) acquire() (bool, error) {
	// 计算新的令牌数
	newTokens := int(time.Until(t.prevTime).Milliseconds()) * t.rate
	t.remainTokens &#43;= newTokens
	if t.remainTokens &gt;= t.bucketSize {
		t.remainTokens = t.bucketSize
	}
	t.remainTokens--
	t.prevTime = time.Now()
	return t.remainTokens &gt; 0, nil
}
```

## 漏桶算法

```go
type LeakyBucketRateLimiter struct {
	// 速率，单位ms
	rate int
	// 剩余令牌数
	remainTokens int
	// 时间
	prevTime time.Time
}

func (l *LeakyBucketRateLimiter) acquire() (bool, error) {
	// 不是同一毫秒，重置令牌数
	if time.Now().UnixMilli() != l.prevTime.UnixMilli() {
		l.remainTokens = l.rate
	}
	l.remainTokens--
	l.prevTime = time.Now()
	return l.remainTokens &gt; 0, nil
}
```

## 示例代码

[demo-ratelimiter](https://github.com/ooooo-youwillsee/demo-ratelimiter)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%B8%B8%E8%A7%81%E7%9A%84%E9%99%90%E6%B5%81%E7%AE%97%E6%B3%95/  

