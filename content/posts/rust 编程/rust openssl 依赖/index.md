---
title: rust openssl 依赖
date: 2024-06-09T08:00:00+08:00
draft: false
tags: [ rust ]
collections: [ rust 编程 ]
---

> 在 window 上使用 openssl, 会遇到错误 **failed to run custom build command for `openssl-sys v0.9.102`**.

## 解决方法

1. 下载 [vcpkg](https://github.com/Microsoft/vcpkg), 打开 `powershell`
2. 执行 `./bootstrap-vcpkg.bat`
3. 执行 `./vcpkg.exe install openssl:x64-windows-static`
4. 配置环境变量 `OPENSSL_DIR=C:\Users\ooooo\Development\Vcpkg\installed\x64-windows-static`
5. 重新启动项目编译

## 参考

1. [stackoverflow](https://stackoverflow.com/questions/55912871/how-to-work-with-openssl-for-rust-within-a-windows-development-environment)
2. [github](https://github.com/sfackler/rust-openssl/issues/1086)
