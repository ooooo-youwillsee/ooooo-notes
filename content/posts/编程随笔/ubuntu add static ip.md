---
title: ubuntu add static ip 
date: 2023-04-01T08:00:00+08:00
draft: false
tags: [ubuntu, resolution]
collections: [随笔]
---



```shell
# open target dir
cd /etc/netplan

# edit config file, you must creat if not exist
sudo vim 00-installer-config.yaml

# network device setting template
network:
  ethernets:
    ens33:
      #dhcp4: yes
      dhcp4: no
      addresses:
        - 192.168.130.129/24
      routes:
        - to: default
          via: 192.168.130.2

      #nameservers:
      #  addresses: [192.168.130.2]
  version: 2
  
# netplan apply 
sudo netplan apply

# restart 
reboot 

```