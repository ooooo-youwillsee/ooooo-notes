# mysql 间隙锁


## 1. 准备数据

```shell
# create new schema
create schema test;
use test;

# create table test
create table user
(
    id   int primary key,
    age  int
);

alter table user
    add index age_idx (age);

# insert some test data
insert into user
values (3, 10),
       (5, 20),
       (8, 30);
       
```

## 2. 间隙锁测试

### 1. 使用主键索引，指定行存在

```shell
# session 1, the row is exist for id = 3 , so it doesn&#39;t lock.
begin;

select * from user where id = 3 for update;

# session 2, execute successful.
begin;

insert into user value (1, 20);
```

### 2. 使用主键索引，指定行不存在

```shell
# session 1, the row isn&#39;t exist for id = 2, so it locks range (,3]
begin;

select * from user where id = 2 for update;

# session 2, execute block.
begin;

insert into user value (1, 20);
```

### 3. 使用主键索引，范围查找

```shell
# session 1, it locks range [1,5] 
begin;

select * from user where id &gt;= 1 and id &lt;= 5 for update;

# session 2, execute block
begin;

insert into user value (2, 20);
```

### 4. 使用二级索引，指定行存在

```shell
# session 1, it locks range [3,8]
begin;

select * from user where age = 20 for update;

# session 2, execute block.
begin;

insert into user value (4, 20);
```

### 5. 使用二级索引，指定行不存在

```shell
# session 1, it locks range [3,5]
begin;

select * from user where age = 15 for update;

# session 2, execute block.
begin;

insert into user value (4, 20);
```

### 6. 使用二级索引，范围查询

```shell
# session 1, it locks range [3,8]
begin;

select * from user where age &gt;= 12 and age &lt;= 28 for update;

# session 2, execute block.
begin;

insert into user value (4, 20);
```

### 7. 结论

&gt; 使用主键索引，行存在时，才只会锁定这一行。
&gt; 其他情况都是使用**范围锁定**

## 3. 恢复数据

```shell
drop schame test;
```

---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/mysql-%E9%97%B4%E9%9A%99%E9%94%81/  

