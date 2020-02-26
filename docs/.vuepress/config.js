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
              { text: 'MySQL实战 45 讲', link: '/gk/mysql-45/' },
              { text: 'Java核心技术 36 讲', link: '/gk/java-core-36/' }
            ]
          }
        ]
      },
      { text: 'Guide', link: '/guide/' },
      { text: 'Home', link: '/' }
    ],
    sidebar: {
      '/gk/mysql-45/': [
        '',
        ['01', '01、一条SQL查询语句是如何执行的？']
      ],
      '/gk/java-core-36/': [
        '',
        ['01', '01、谈谈你对 Java 的理解'],
        ['02', '02、Exception 和 Error 的区别'],
        ['03', '03、final、finally、finalize 的区别'],
        ['04', 'Kafka入门指南']
      ]
    }
  },
  markdown: {
    extractHeaders: ['h2', 'h3'],
    toc: {
      includeLevel: [2, 3]
    }
  }
}
