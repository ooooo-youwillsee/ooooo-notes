---
title: java 出现内存分配失败
date: 2020-01-02T08:00:00+08:00
draft: false
tags: [resolution]
collections: [随笔]
---

[问题](https://community.cloudera.com/t5/Support-Questions/Storm-quot-Cannot-allocate-memory-quot-quot-insufficient/td-p/144449)

If you see that the storm process is getting crashed even though you have enough memory (swap/free) available then you should also check the "`/proc/sys/vm/overcommit_memory`"

- This switch knows 3 different settings:

=> 0: The Linux kernel is free to over commit memory(this is the default), a heuristic algorithm is applied to figure out if enough memory is available.

=> 1: The Linux kernel will always over commit memory, and never check if enough memory is available. This increases the risk of out-of-memory situations, but also improves memory-intensive workloads.

=> 2: The Linux kernel will not over commit memory, and only allocate as much memory as defined in over commit_ratio.

As sometimes OS kills /crashes a process due to a system OS setting, the system OS memory overcommit setting was 2 (when it should have been set to 0) -