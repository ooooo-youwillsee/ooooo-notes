---
title: rust 镜像配置
date: 2024-05-24T08:00:00+08:00
draft: false
tags: [rust]
collections: [rust 编程]
---

> 解决 rust 依赖加载太慢的问题。

## 配置文件

文件路径：`用户名/.cargo/config.toml`

```toml
[source.crates-io]
registry = "https://github.com/rust-lang/crates.io-index"
# 指定镜像
replace-with = 'ustc'

# rustcc 1号源
#[source.rustcc]
#registry = "git://crates.rustcc.com/crates.io-index"

# rustcc 2号源
[source.rustcc2]
registry = "git://crates.rustcc.cn/crates.io-index"

# 清华大学
[source.tuna]
registry = "https://mirrors.tuna.tsinghua.edu.cn/git/crates.io-index.git"

# 中国科学技术大学
[source.ustc]
registry = "git://mirrors.ustc.edu.cn/crates.io-index"

# 上海交通大学
[source.sjtu]
registry = "https://mirrors.sjtug.sjtu.edu.cn/git/crates.io-index"

# 阿里云
[source.rustcc]
registry = "https://code.aliyun.com/rustcc/crates.io-index.git"


[http]
check-revoke = false

[net]
git-fetch-with-cli = true
```