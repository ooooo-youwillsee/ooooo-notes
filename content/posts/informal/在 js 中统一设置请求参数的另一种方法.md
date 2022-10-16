---
title: 在 js 中统一设置请求参数的另一种方法
date: 2020-01-05T08:00:00+08:00
draft: false
tags: [resolution]
categories: [随笔]
---

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
