# Rust 镜像配置


&gt; 解决 rust 依赖加载太慢的问题。

## 配置文件

文件路径：`用户名/.cargo/config.toml`

```toml
[source.crates-io]
registry = &#34;https://github.com/rust-lang/crates.io-index&#34;
# 指定镜像
replace-with = &#39;ustc&#39;

# rustcc 1号源
#[source.rustcc]
#registry = &#34;git://crates.rustcc.com/crates.io-index&#34;

# rustcc 2号源
[source.rustcc2]
registry = &#34;git://crates.rustcc.cn/crates.io-index&#34;

# 清华大学
[source.tuna]
registry = &#34;https://mirrors.tuna.tsinghua.edu.cn/git/crates.io-index.git&#34;

# 中国科学技术大学
[source.ustc]
registry = &#34;git://mirrors.ustc.edu.cn/crates.io-index&#34;

# 上海交通大学
[source.sjtu]
registry = &#34;https://mirrors.sjtug.sjtu.edu.cn/git/crates.io-index&#34;

# 阿里云
[source.rustcc]
registry = &#34;https://code.aliyun.com/rustcc/crates.io-index.git&#34;


[http]
check-revoke = false

[net]
git-fetch-with-cli = true
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/rust-%E9%95%9C%E5%83%8F%E9%85%8D%E7%BD%AE/  

