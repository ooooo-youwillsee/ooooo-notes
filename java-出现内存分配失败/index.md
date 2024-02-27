# java 出现内存分配失败


[问题](https://community.cloudera.com/t5/Support-Questions/Storm-quot-Cannot-allocate-memory-quot-quot-insufficient/td-p/144449)

If you see that the storm process is getting crashed even though you have enough memory (swap/free) available then you should also check the &#34;`/proc/sys/vm/overcommit_memory`&#34;

- This switch knows 3 different settings:

=&gt; 0: The Linux kernel is free to over commit memory(this is the default), a heuristic algorithm is applied to figure out if enough memory is available.

=&gt; 1: The Linux kernel will always over commit memory, and never check if enough memory is available. This increases the risk of out-of-memory situations, but also improves memory-intensive workloads.

=&gt; 2: The Linux kernel will not over commit memory, and only allocate as much memory as defined in over commit_ratio.

As sometimes OS kills /crashes a process due to a system OS setting, the system OS memory overcommit setting was 2 (when it should have been set to 0) -

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/java-%E5%87%BA%E7%8E%B0%E5%86%85%E5%AD%98%E5%88%86%E9%85%8D%E5%A4%B1%E8%B4%A5/  

