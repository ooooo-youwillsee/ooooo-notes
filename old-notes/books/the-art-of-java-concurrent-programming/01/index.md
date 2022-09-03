# 

## 1、上下文切换

> CPU 通过时间片分配算法来循环执行任务，当前任务执行完一个时间片后会切换到下一个任务。但是在切换前会保存上一个任务的状态，以便下次切换回这个任务时，再次加载该任务状态。**这就是上下文切换**。

创建过多的线程，会使**上下文切换**频繁，执行效率也可能不如单线程。

![vmstat](./imgs/01_01.png)

上图的 cs (context switch) 表示上下文切换次数。

减少上下文切换的方法：
- **无锁并发编程**，多线程处理数据时，可以用一个方法来避免锁。如将数据的 ID 按照 Hash 算法取余分段，不同的线程处理不同段的数据。
- **CAS 算法**，Java 的 Atomic 包。
- **使用最少线程**，避免创建不需要的线程，比如任务很少，创建的线程较多。
- **协程**，单线程实现多任务的调度，并维持多任务状态切换。

**减少上下文切换示例**
1. jstack 命令来 dump 线程
```shell script
jstack 31177 > /home/xxx/dump-31177 
```
2. 统计线程都处于什么状态
```shell script
grep java.lang.Thread.State dump-31177 | awk '{print $2$3$4$5}' | sort | uniq -c
```
3. 查看这些 waiting 的线程，根据需要合理配置线程数。

## 2、死锁

死锁示例：
```java
  public static void main(String[] args) {
    Object lockA = new Object();
    Object lockB = new Object();
    Thread t1 = new Thread(() -> {
      synchronized (lockA) {
        System.out.println("get lockA");
        timeSleep(2);
        synchronized (lockB) {
          System.out.println("get lockB");
        }
      }
    });
    Thread t2 = new Thread(() -> {
      synchronized (lockB) {
        System.out.println("get lockB");
        synchronized (lockA) {
          System.out.println("get lockA");
        }
      }
    });

    t1.start();
    t2.start();
  }
```

避免死锁的方法：
- 避免一个线程同时获取多个锁，也就是同时申请所有的资源。
- 尝试使用定时锁，如 `lock.tryLock(timeout)` 来替换内部锁。
- 对于数据库锁，加锁和加锁必须在一个数据库连接里。

## 3、资源限制的挑战

- 带宽，比如带宽只有 20M, 一个线程最多只能使用 10M，也就是说线程数最大只能是 2，多余的线程没有资源可以使用。
- 磁盘


## 4、总结

强烈建议使用 JDK 并发包提供的并发容器和工具类来解决并发问题。 

