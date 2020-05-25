const geektime = (dir) => '/pages/notes/geektime' + dir
const books = (dir) => '/pages/notes/books' + dir

const nav = {
  text: 'Notes',
  ariaLabel: 'Notes',
  items: [
    {
      text: '极客时间',
      items: [
        { text: 'MySQL 实战 45 讲', link: geektime('/mysql-45/') },
        { text: 'Java 核心技术 36 讲', link: geektime('/java-core-36/') },
        { text: 'Kafka 核心技术与实战', link: geektime('/kafka-core-tech/') },
        { text: 'Java 并发编程实战', link: geektime('/java-con-practice/') }
      ]
    },
    {
      text: '书籍',
      items: [
        { text: 'Redis 开发与运维', link: books('/redis-development-and-operation-and-maintenance/') },
        { text: 'Java 并发编程的艺术', link: books('/the-art-of-java-concurrent-programming/') }
      ]
      // },
      // {
      //   text: '源码系列',
      //   items: []
    }
  ]
}

const sidebar = {
  [geektime('/mysql-45/')]: [
    '',
    ['01', '01、SQL 查询语句的执行过程'],
    ['02', '02、SQL 更新语句的执行过程'],
    ['03', '03、事务的隔离性'],
    ['04', '04、深入浅出索引（上）'],
    ['05', '05、深入浅出索引（下）'],
    ['06', '06、全局锁和表锁'],
    ['07', '07、行锁'],
    ['08', '08、事务的隔离性'],
    ['09', '09、普通索引和唯一索引'],
    ['10', '10、选错索引'],
    ['11', '11、字符串索引'],
    ['12', '12、数据库发生"抖动"']
  ],
  [geektime('/java-core-36/')]: [
    '',
    ['01', '01、谈谈你对 Java 的理解'],
    ['02', '02、Exception 和 Error 的区别'],
    ['03', '03、final、finally、finalize 的区别'],
    ['04', 'Kafka入门指南']
  ],
  [geektime('/kafka-core-tech/')]: [
    '',
    ['01', '01、消息引擎系统'],
    ['02', '02、Kafka 术语'],
    ['03', '03、Kafka 是流处理平台'],
    ['04', '04、Kafka 不同的"发行版"'],
    ['05', '05、Kafka 的版本号'],
    ['06', '06、Kafka 线上部署方案'],
    ['07', '07、最重要的集群参数配置（上）'],
    ['08', '08、最重要的集群参数配置（下）'],
    ['09', '09、生产者消息分区机制原理'],
    ['10', '10、Kafka 的压缩算法']
  ],
  [geektime('/java-con-practice/')]: [
    ''
  ],
  [books('/redis-development-and-operation-and-maintenance/')]: [
    '',
    ['01', '第一章 初识 Redis'],
    ['02', '第二章 API 的理解和使用'],
    ['03', '第三章 小功能大用处'],
    ['04', '第四章 客户端'],
    ['05', '第五章 持久化'],
  ],
  [books('/the-art-of-java-concurrent-programming/')]: [
    '',
    ['01', '第一章 并发编程的挑战'],
    ['02', '第二章 Java 并发机制的底层实现原理'],
    ['03', '第三章 Java 内存模型']
  ]
}

module.exports = {
  nav,
  sidebar
}
