# 在 Js 中统一设置请求参数的另一种方法


- 重写方法`XMLHttpRequest.prototype.send`

```javascript

XMLHttpRequest.prototype._send = XMLHttpRequest.prototype.send
XMLHttpRequest.prototype.send = function (params) {
	var attached_params = mdcUtil.MDC_DEVICE_ID &#43; &#34;=&#34; &#43; mdcUtil.getMdcDeviceId();
	if (params) {
		params &#43;= &#34;&amp;&#34; &#43; attached_params;
	} else {
		params = attached_params;
	}
	return this._send(params)
}

```


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/%E5%9C%A8-js-%E4%B8%AD%E7%BB%9F%E4%B8%80%E8%AE%BE%E7%BD%AE%E8%AF%B7%E6%B1%82%E5%8F%82%E6%95%B0%E7%9A%84%E5%8F%A6%E4%B8%80%E7%A7%8D%E6%96%B9%E6%B3%95/  

