---
title: rust 自定义 macro
date: 2024-07-09T08:00:00+08:00
draft: false
tags: [ rust ]
collections: [ rust 编程 ]
---

> 实现一个 `json!`

## 实现

```rust
#[derive(Debug, PartialEq)]
pub enum Json {
    Null,
    Number(f64),
    Str(String),
    Array(Vec<Json>),
    Object(HashMap<String, Json>),
}

impl From<String> for Json {
    fn from(value: String) -> Self {
        Str(value)
    }
}

impl From<&str> for Json {
    fn from(value: &str) -> Self {
        Str(value.into())
    }
}

impl From<i32> for Json {
    fn from(value: i32) -> Self {
        Number(value as f64)
    }
}

#[macro_export]
macro_rules! json {
    (null) => {Json::Null};
    ([ $( $value:tt ),* ]) => {
        Json::Array(
            vec![$( json!($value) ),*]
        )
    };
    ({ $( $key:tt : $value:tt ),* }) => {
        Json::Object(
            vec![$( ($key.to_string(), json!($value)) ),*].into_iter().collect()
        )
    };
    ($value:tt) => {
        Json::from($value)
    }
}
```

## 调试方法

* 在项目下执行命令，切换为 `nightly toolchain`

```shell
rustup override set nightly-x86_64-apple-darwin
```

* 在 `main.rs` 中开启 `trace_macros`。

```rust
#![feature(trace_macros)]

trace_macros!(true);
```

* 在编译时，控制台就会输出**宏展开**信息。

```rust
note: trace_macro
  --> src/main.rs:23:13
   |
23 |     let v = json!(["1", "2", "3"]);
   |             ^^^^^^^^^^^^^^^^^^^^^^
   |
   = note: expanding `json! { ["1", "2", "3"] }`
   = note: to `Json :: Array(vec! [json! ("1"), json! ("2"), json! ("3")])`
   = note: expanding `vec! { json! ("1"), json! ("2"), json! ("3") }`
   = note: to `< [_] > ::
           into_vec(#[rustc_box] $crate :: boxed :: Box ::
           new([json! ("1"), json! ("2"), json! ("3")]))`
   = note: expanding `json! { "1" }`
   = note: to `Json :: from("1")`
   = note: expanding `json! { "2" }`
   = note: to `Json :: from("2")`
   = note: expanding `json! { "3" }`
   = note: to `Json :: from("3")`
```

## 示例代码

[github](https://github.com/ooooo-youwillsee/demo-rust-macro)