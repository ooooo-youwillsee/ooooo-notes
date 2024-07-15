---
title: rust ffi
date: 2024-07-10T08:00:00+08:00
draft: false
tags: [ rust ]
collections: [ rust 编程 ]
---

> 实现一个简单的 ffi 绑定, 分为**C函数调用**和**lib函数调用**。

## C 函数调用

> 函数是 C 内置的，无需任何额外处理。

```rust
use std::ffi::{c_char, CString};

extern {
    // 计算字符串长度
    fn strlen(ptr: *const c_char) -> usize;
}

fn main() {
    let s = CString::new("123").unwrap();
    let len = unsafe { strlen(s.as_ptr()) };
    println!("len: {}", len);
}

```

## lib 函数调用

> 外部函数绑定, 主要分为这几步，详情见 [README.md](https://github.com/ooooo-youwillsee/demo-rust-ffi/blob/main/README.md)) <br/>
> 1. 声明 link name <br/>
> 2. 编译处理 <br/>
> 3. 环境变量配置 <br/>

```rust
#[link(name = "git2")]
extern {
    // const git_error * giterr_last();
    pub fn giterr_last() -> *const git_error;
    ...
}
```

```rust
// build.rs
fn main() {
    println!("cargo:rustc-link-search=native={}", "./libgit2/build");
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