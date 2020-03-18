const geektime = (dir) => '/notes/geektime' + dir
const books = (dir) => '/notes/books' + dir
module.exports = {
  title: 'ooooo-notes',
  description: 'ooooo-notes',
  base: '/ooooo-notes/',
  host: '0.0.0.0',
  port: 8080,
  plugins: ['@vuepress/back-to-top', '@vuepress/nprogress'],
  themeConfig: {
    search: true,
    searchMaxSuggestions: 20,
    smoothScroll: true,
    lastUpdated: 'Last Updated',
    repo: 'https://github.com/ooooo-youwillsee/ooooo-notes',
    repoLabel: 'GitHub',
    docsRepo: 'https://github.com/ooooo-youwillsee/ooooo-notes',
    docsDir: 'docs',
    docsBranch: 'master',
    editLinks: true,
    editLinkText: '在 GitHub 上编辑此页',
    nav: [
      {
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
          }
        ]
      },
      { text: 'Guide', link: '/GUIDE' },
      { text: 'Home', link: '/' },
      { text: 'Me', link: '/ME' }
    ],
    sidebar: {
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
      ],
      [geektime('/java-con-practice/')]: [
        '',
      ],
      [books('/redis-development-and-operation-and-maintenance/')]: [
        '',
        ['01', '第一章 初识 Redis'],
        ['02', '第二章 API 的理解和使用'],
        ['03', '第三章 小功能大用处']
      ],
      // fallback
      '/': [
        ''
      ]
    }
  },
  markdown: {
    extractHeaders: ['h2', 'h3', 'h4'],
    toc: {
      includeLevel: [2, 3, 4]
    }
  }
}
