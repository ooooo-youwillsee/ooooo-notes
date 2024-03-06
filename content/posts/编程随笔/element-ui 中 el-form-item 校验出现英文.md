---
title: element-ui 中 el-form-item 校验出现英文
date: 2020-01-03T08:00:00+08:00
draft: false
tags: [resolution]
collections: [随笔]
---

> 去掉属性 required，添加 rules 规则 `{ required: true, message: '请输入姓名', trigger: 'blur' }`
