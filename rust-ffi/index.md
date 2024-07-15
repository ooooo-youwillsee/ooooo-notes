# Rust Ffi


&gt; 实现一个简单的 ffi 绑定, 分为**C函数调用**和**lib函数调用**。

## C 函数调用

&gt; 函数是 C 内置的，无需任何额外处理。

```rust
use std::ffi::{c_char, CString};

extern {
    // 计算字符串长度
    fn strlen(ptr: *const c_char) -&gt; usize;
}

fn main() {
    let s = CString::new(&#34;123&#34;).unwrap();
    let len = unsafe { strlen(s.as_ptr()) };
    println!(&#34;len: {}&#34;, len);
}

```

## lib 函数调用

&gt; 外部函数绑定, 主要分为这几步，详情见 [README.md](https://github.com/ooooo-youwillsee/demo-rust-ffi/blob/main/README.md)) &lt;br/&gt;
&gt; 1. 声明 link name &lt;br/&gt;
&gt; 2. 编译处理 &lt;br/&gt;
&gt; 3. 环境变量配置 &lt;br/&gt;

```rust
#[link(name = &#34;git2&#34;)]
extern {
    // const git_error * giterr_last();
    pub fn giterr_last() -&gt; *const git_error;
    ...
}
```

```rust
// build.rs
fn main() {
    println!(&#34;cargo:rustc-link-search=native={}&#34;, &#34;./libgit2/build&#34;);
}
```

```shell
# 配置环境变量

# macos 
export DYLD_LIBRARY_PATH=./libgit2/build/:$DYLD_LIBRARY_PATH

# linux
export LD_LIBRARY_PATH=./libgit2/build/:$LD_LIBRARY_PATH
```

## 代码示例

[github](https://github.com/ooooo-youwillsee/demo-rust-ffi)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/rust-ffi/  

