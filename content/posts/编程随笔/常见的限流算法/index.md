---
title: 常见的限流算法
date: 2024-04-12T08:00:00+08:00
draft: false
tags: [ rateLimiter ]
collections: [ 随笔 ]
---

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
	if time.Until(s.prevTime) > s.windowInterval {
		s.curLimit = 0
	}
	s.curLimit++
	s.prevTime = time.Now()
	return s.curLimit < s.limit, nil
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
	t.remainTokens += newTokens
	if t.remainTokens >= t.bucketSize {
		t.remainTokens = t.bucketSize
	}
	t.remainTokens--
	t.prevTime = time.Now()
	return t.remainTokens > 0, nil
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
	return l.remainTokens > 0, nil
}
```

## 示例代码

[demo-ratelimiter](https://github.com/ooooo-youwillsee/demo-ratelimiter)