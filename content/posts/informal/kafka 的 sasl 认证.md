---
title: kafka 的 SASL 认证
date: 2023-08-01T08:00:00+08:00
draft: false
tags: [ kafka ]
categories: [ 随笔 ]
---

## 1. 搭建 kafka 环境

这里使用 docker 来搭建。

`docker-compose.yml` 配置如下，**客户端端口:9094**

```yaml
version: "3"
services:
  kafka:
    image: 'bitnami/kafka:latest'
    ports:
      - '9092:9092'
      - '9094:9094'
    environment:
      - KAFKA_CFG_NODE_ID=0
      - KAFKA_CFG_PROCESS_ROLES=controller,broker
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:9094
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092,EXTERNAL://localhost:9094
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,EXTERNAL:SASL_PLAINTEXT,PLAINTEXT:PLAINTEXT
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@kafka:9093
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER
      - KAFKA_CLIENT_USERS=user
      - KAFKA_CLIENT_PASSWORDS=password
      - KAFKA_CLIENT_LISTENER_NAME=SASL_PLAINTEXT
```

启动kafka

```shell
docker-compose up -d
```

## 2. 客户端连接配置

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9094
    properties:
      security.protocol: SASL_PLAINTEXT
      sasl.jaas.config: org.apache.kafka.common.security.scram.ScramLoginModule required username='user' password='password';
      sasl.mechanism: SCRAM-SHA-512

```


## 3. 参考

> [docker kafka](https://hub.docker.com/r/bitnami/kafka)
> [kafka sasl](https://docs.confluent.io/platform/current/kafka/authentication_sasl/authentication_sasl_scram.html#sasl-scram-overview) 