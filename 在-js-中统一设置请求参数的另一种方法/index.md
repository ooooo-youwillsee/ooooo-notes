# 在 js 中统一设置请求参数的另一种方法


- 重写方法`XMLHttpRequest.prototype.send`

```javascript

XMLHttpRequest.prototype._send = XMLHttpRequest.prototype.send
XMLHttpRequest.prototype.send = function (params) {
	var attached_params = mdcUtil.MDC_DEVICE_ID + "=" + mdcUtil.getMdcDeviceId();
	if (params) {
		params += "&" + attached_params;
	} else {
		params = attached_params;
	}
	return this._send(params)
}

```

