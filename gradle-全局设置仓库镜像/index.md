# gradle 全局设置仓库镜像


在 `~\.gradle` 目录下新建文件 `init.gradle`, 内容如下

```
allprojects {
    repositories {
        mavenLocal()
			maven { name &#34;Alibaba&#34; ; url &#34;https://maven.aliyun.com/repository/public&#34; }
			maven { name &#34;Bstek&#34; ; url &#34;http://nexus.bsdn.org/content/groups/public/&#34; }
    }

	buildscript {
		repositories {
			maven { name &#34;Alibaba&#34; ; url &#39;https://maven.aliyun.com/repository/public&#39; }
			maven { name &#34;Bstek&#34; ; url &#39;https://nexus.bsdn.org/content/groups/public/&#39; }
			maven { name &#34;M2&#34; ; url &#39;https://plugins.gradle.org/m2/&#39; }
		}
	}
}
```


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/gradle-%E5%85%A8%E5%B1%80%E8%AE%BE%E7%BD%AE%E4%BB%93%E5%BA%93%E9%95%9C%E5%83%8F/  

