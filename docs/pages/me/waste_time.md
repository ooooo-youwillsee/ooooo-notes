### 2020.04.08 

晚上搞 anaconda 环境 (30min)

### 2020.04.17

后台返回的数据结构最好是
```json
{
  "ids": [1, 2, 3]
}
```
而不是，**这种可能导致 `ids = null`**
```json
{
  "ids": "1,2,3"
}
```



