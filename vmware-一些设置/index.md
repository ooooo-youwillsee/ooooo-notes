# vmware 一些设置


## 1. enable enhanced keyboard

![vmware-enhanced-keyboard](/ooooo-notes/images/vmware-enhanced-keyboard.png)

## 2. enable back/forward mouse buttons in vmware

`path : somepath/Virtual Machines/Ubuntu 64-bit/*.vmx`

```
usb.generic.allowHID = &#34;TRUE&#34;
mouse.vusb.enable = &#34;TRUE&#34;
```

reference

1. [Back / Forward mouse buttons do not work in VMWare](https://superuser.com/questions/35830/back-forward-mouse-buttons-do-not-work-in-vmware-workstation-6-5-guest-os)


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/vmware-%E4%B8%80%E4%BA%9B%E8%AE%BE%E7%BD%AE/  

