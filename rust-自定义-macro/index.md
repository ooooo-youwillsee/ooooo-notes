# Rust 自定义 Macro


&gt; 实现一个 `json!`

## 实现

```rust
#[derive(Debug, PartialEq)]
pub enum Json {
    Null,
    Number(f64),
    Str(String),
    Array(Vec&lt;Json&gt;),
    Object(HashMap&lt;String, Json&gt;),
}

impl From&lt;String&gt; for Json {
    fn from(value: String) -&gt; Self {
        Str(value)
    }
}

impl From&lt;&amp;str&gt; for Json {
    fn from(value: &amp;str) -&gt; Self {
        Str(value.into())
    }
}

impl From&lt;i32&gt; for Json {
    fn from(value: i32) -&gt; Self {
        Number(value as f64)
    }
}

#[macro_export]
macro_rules! json {
    (null) =&gt; {Json::Null};
    ([ $( $value:tt ),* ]) =&gt; {
        Json::Array(
            vec![$( json!($value) ),*]
        )
    };
    ({ $( $key:tt : $value:tt ),* }) =&gt; {
        Json::Object(
            vec![$( ($key.to_string(), json!($value)) ),*].into_iter().collect()
        )
    };
    ($value:tt) =&gt; {
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
  --&gt; src/main.rs:23:13
   |
23 |     let v = json!([&#34;1&#34;, &#34;2&#34;, &#34;3&#34;]);
   |             ^^^^^^^^^^^^^^^^^^^^^^
   |
   = note: expanding `json! { [&#34;1&#34;, &#34;2&#34;, &#34;3&#34;] }`
   = note: to `Json :: Array(vec! [json! (&#34;1&#34;), json! (&#34;2&#34;), json! (&#34;3&#34;)])`
   = note: expanding `vec! { json! (&#34;1&#34;), json! (&#34;2&#34;), json! (&#34;3&#34;) }`
   = note: to `&lt; [_] &gt; ::
           into_vec(#[rustc_box] $crate :: boxed :: Box ::
           new([json! (&#34;1&#34;), json! (&#34;2&#34;), json! (&#34;3&#34;)]))`
   = note: expanding `json! { &#34;1&#34; }`
   = note: to `Json :: from(&#34;1&#34;)`
   = note: expanding `json! { &#34;2&#34; }`
   = note: to `Json :: from(&#34;2&#34;)`
   = note: expanding `json! { &#34;3&#34; }`
   = note: to `Json :: from(&#34;3&#34;)`
```

## 示例代码

[github](https://github.com/ooooo-youwillsee/demo-rust-macro)

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/rust-%E8%87%AA%E5%AE%9A%E4%B9%89-macro/  

