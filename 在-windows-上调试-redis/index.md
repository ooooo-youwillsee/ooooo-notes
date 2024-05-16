# 在 Windows 上调试 Redis


## 1. install wsl

open **Microsoft Store**, then search `ubuntu`  and click to install it.

open terminal

```shell
# list all linux subsystem
wsl --list
# set default linux subsystem, then you can input &#39;wsl&#39; to inter system
wsl --set-default ubuntu
# enter default linux subsystem
wsl 
# install cmake, g&#43;&#43;, gcc，gdb
cd /usr/local
wget https://cmake.org/files/v3.22/cmake-3.22.0-linux-x86_64.tar.gz
tar xf cmake-3.22.0-linux-x86_64.tar.gz
ln -s /usr/local/cmake-3.22.0-linux-x86_64/bin/cmake /usr/bin
sudo apt install build-essential
```

## 2. setting clion

1. open `File | Settings | Build, Execution, Deployment | Toolchains` menu.
2. add **new toolchains** and select **wsl**.

![clion toolchains](/ooooo-notes/images/debug-redis-with-windows-01.png &#34;在 clion 中创建工具链&#34;)

3. setting wsl configuration, you maybe install **cmake, gcc, g&#43;&#43;, gdb**.

4. you must execute command `git config core.autocrlf input` in your terminal, because windows is CRLF, then `git clone`
   .

5. select **wsl** in `File | Settings | Build, Execution, Deployment | Makefile`, because building redis by using
   makefile.

6. login wsl and enter redis directory, `for example: cd /mnt/c/Users/ooooo/Development/code/Demo/redis`

7. execute command `make`, you maybe need to execute `cd src &amp;&amp; ls | grep .sh | xargs chmod a&#43;x`

![makefile application](/ooooo-notes/images/debug-redis-with-windows-02.png &#34;选择可执行文件&#34;)


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-windows-%E4%B8%8A%E8%B0%83%E8%AF%95-redis/  

