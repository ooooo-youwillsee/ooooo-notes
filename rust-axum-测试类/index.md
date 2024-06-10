# Rust Axum 测试类


## multipart 测试类

```rust
const BOUNDARY: &amp;str = &#34;BOUNDARY&#34;;

#[tokio::test]
async fn test_import_proc_def() -&gt; anyhow::Result&lt;()&gt; {
    let bytes = fs::read(&#34;./examples/test01.xml&#34;).await?;
    let request = Request::builder()
        .header(
            CONTENT_TYPE,
            format!(&#34;multipart/form-data; boundary={}&#34;, BOUNDARY),
        )
        .body::&lt;Body&gt;(generate_multipart_data(&#34;file&#34;, &amp;bytes)?.into())
        .unwrap();
    let multipart = Multipart::from_request(request, &amp;State(())).await?;

    let (db, ..) = setup().await?;
    let proc_def_ids = import_proc_def(State(db), multipart).await?;

    info!(&#34;{:?}&#34;, proc_def_ids);
    Ok(())
}

fn generate_multipart_data(name: &amp;str, bytes: &amp;[u8]) -&gt; anyhow::Result&lt;Vec&lt;u8&gt;&gt; {
    let mut data = Vec::new();
    write!(data, &#34;--{}\r\n&#34;, BOUNDARY)?;
    write!(data, &#34;Content-Disposition: form-data; name=\&#34;{}\&#34;;\r\n&#34;, name)?;
    write!(data, &#34;\r\n&#34;)?;
    std::io::Write::write_all(&amp;mut data, bytes)?;
    write!(data, &#34;\r\n&#34;)?;

    write!(data, &#34;--{}--\r\n&#34;, BOUNDARY)?;
    Ok(data)
}
 ```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/rust-axum-%E6%B5%8B%E8%AF%95%E7%B1%BB/  

