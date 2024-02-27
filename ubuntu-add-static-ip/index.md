# ubuntu add static ip




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

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/ubuntu-add-static-ip/  

