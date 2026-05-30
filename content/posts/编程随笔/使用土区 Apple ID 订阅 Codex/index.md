---
title: 使用土区 Apple ID 订阅 Codex
date: 2026-05-30T08:00:00+08:00
draft: false
tags: [ ai, codex, apple-id ]
collections: [ 随笔 ]
---

> 目标：准备一个土耳其区 Apple ID，通过土区 App Store 礼品卡余额完成 Codex / ChatGPT App 内订阅。原文写的是订阅 ChatGPT Plus，这里记录为可复用到 Codex 订阅的流程摘要，实际价格和入口以 App 内展示为准。

## 核心流程

1. 先注册一个新的中国大陆区 Apple ID，不建议使用主力 iCloud 账号。
2. 在网页端从土耳其区域入口登录 Apple 账号，把国家或地区改成 Türkiye / Turkey / 土耳其。
3. 付款方式优先选择 `None / 无`，账单地址填写土耳其地址，手机号可以继续用 `+86`。
4. iPhone / iPad 上先退出当前 App Store 的“媒体与购买项目”账号。
5. 用土区 App Store Scheme 切换店面，再登录刚转区后的 Apple ID。
6. 登录后先下载一个免费 App，用来固定 App Store 店面。
7. 购买土耳其区 Apple / App Store 礼品卡，兑换到这个土区 Apple ID。
8. 打开 Codex / ChatGPT App，用 Apple 账户余额完成订阅。

## 准备内容

* 新邮箱，尽量不要用注册过 Apple ID 的邮箱。
* 一个手机号，国内 `+86` 通常可以尝试。
* iPhone 或 iPad，用于固定 App Store 区域、兑换礼品卡和订阅。
* 稳定的非大陆网络，转区和内购阶段建议全局代理，不要规则分流。
* 可在线支付的银行卡，用于购买土区 Apple 礼品卡。

## 关键操作

### 注册和转区

先在 Apple 账号页面注册国区 Apple ID：

```text
https://account.apple.com/
```

注册完成后不要急着登录 App Store。打开土耳其区域入口：

```text
https://account.apple.com/tr/
```

进入 `Personal Information / 个人信息`，修改 `Country/Region / 国家或地区` 为土耳其。付款方式选 `None / 无`，账单地址可用土耳其地址生成器准备：

```text
https://1ktools.com/zh-cn/tools/developer/turkey-address-generator
```

如果看不到 `None / 无`，优先检查是否从土区入口进入、是否使用稳定非大陆出口、是否开启全局代理、是否完整进入了国家或地区修改流程。

### 固定 App Store 土区店面

转区成功后，先在设备上退出当前 App Store 的“媒体与购买项目”账号，再用 Safari 打开土区 Scheme：

```text
itms-apps://itunes.apple.com/WebObjects/MZStore.woa/wa/resetAndRedirect?dsf=143480&cc=tr
```

打开后即使提示无法连接 App Store 也没关系，重点是触发店面切换。之后再登录已经转成土区的 Apple ID，并在账户设置里确认国家或地区显示为 Türkiye / Turkey。

登录后建议先下载任意免费 App，不要刚登录就退出或直接大额充值，这样能降低店面又回到国区的概率。

### 礼品卡充值和订阅

土区订阅通常通过 Apple 账户余额扣费，可以先购买小额土区 Apple 礼品卡测试。原文推荐 Oyunfor：

```text
https://www.oyunfor.com/apple-store/apple-store-itunes-gift-card
```

购买时注意：

* 第一次购买可能需要添加发票信息，国家可以填 China / 中国，手机号用 `+86`。
* 金额单位确认是 TL / 土耳其里拉。
* 支付通道可优先尝试 Iyzico，页面提示手续费约 2.49%，是否支持银联或具体银行卡以当时页面和银行风控为准。
* 不要勾选保存银行卡。
* 先小额测试，不要一开始就大额充值。

付款成功后，在 Oyunfor 的“我购买的产品”里查看礼品卡代码。然后在 iPhone / iPad 的 App Store 中进入头像页，选择 `Redeem Gift Card or Code / 兑换礼品卡或代码`，把礼品卡兑换到土区 Apple ID 余额。

余额到账后，再打开 Codex / ChatGPT App 的订阅页面，用 Apple 账户余额订阅。新号、刚转区、刚充值时不建议连续尝试高价订阅；如果提示 `your purchase could not be completed`，可以等 24 到 48 小时后再试。

## 常见问题

### 转区时报错

可能是先登录了 App Store，导致店面仍然停留在国区或旧区域。处理顺序是退出“媒体与购买项目”，用土区 Scheme 切店面，再登录已转区的 Apple ID。

### 没有 None / 无

重点检查网络环境和入口地址。需要从土区 Apple 账号入口进入，并使用稳定非大陆出口和全局代理。如果仍然没有，可以尝试用 Mac App Store 的账户设置修改国家或地区，但同样依赖干净稳定的网络。

### 内购失败

常见原因是账号太新、刚转区、刚充值、马上购买高价订阅。不要连续重试，可以先等待 24 到 48 小时，或先用小额充值 / 小额订阅测试。

### 设备选择

优先使用 iPhone 或 iPad 完成兑换和订阅。Mac 端可能搜不到 App，或者内购流程更容易失败。

## 参考链接

* [注册土耳其区 Apple ID 订阅 ChatGPT Plus 教程](https://weakyon.com/2026/04/25/How-to-Register-a-Turkey-Apple-ID-and-Subscribe-to-ChatGPT-Plus.html)
* [Apple 账号页面](https://account.apple.com/)
* [Apple 账号土耳其入口](https://account.apple.com/tr/)
* [土耳其地址生成器](https://1ktools.com/zh-cn/tools/developer/turkey-address-generator)
* [Oyunfor Apple Store 礼品卡](https://www.oyunfor.com/apple-store/apple-store-itunes-gift-card)
