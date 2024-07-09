---
title: rust axum 测试类
date: 2024-06-10T08:00:00+08:00
draft: false
tags: [ rust ]
collections: [ rust 编程 ]
---

## multipart 测试类

```rust
const BOUNDARY: &str = "BOUNDARY";

#[tokio::test]
async fn test_import_proc_def() -> anyhow::Result<()> {
    let bytes = fs::read("./examples/test01.xml").await?;
    let request = Request::builder()
        .header(
            CONTENT_TYPE,
            format!("multipart/form-data; boundary={}", BOUNDARY),
        )
        .body::<Body>(generate_multipart_data("file", &bytes)?.into())
        .unwrap();
    let multipart = Multipart::from_request(request, &State(())).await?;

    let (db, ..) = setup().await?;
    let proc_def_ids = import_proc_def(State(db), multipart).await?;

    info!("{:?}", proc_def_ids);
    Ok(())
}

fn generate_multipart_data(name: &str, bytes: &[u8]) -> anyhow::Result<Vec<u8>> {
    let mut data = Vec::new();
    write!(data, "--{}\r\n", BOUNDARY)?;
    write!(data, "Content-Disposition: form-data; name=\"{}\";\r\n", name)?;
    write!(data, "\r\n")?;
    std::io::Write::write_all(&mut data, bytes)?;
    write!(data, "\r\n")?;

    write!(data, "--{}--\r\n", BOUNDARY)?;
    Ok(data)
}
 ```