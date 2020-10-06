const { notes, english, me } = require('../config')

module.exports = {
  title: 'ooooo-notes',
  description: 'ooooo-notes',
  base: '/ooooo-notes/',
  host: '0.0.0.0',
  port: 9527,
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
      // notes.nav,
      english.nav,
      me.nav,
      // { text: 'Guide', link: '/GUIDE' },
      { text: 'Home', link: '/' }
      // { text: 'Me', link: '/ME' }
    ],
    sidebar: {
      // ...notes.sidebar,
      ...english.sidebar,
      ...me.sidebar,
      '/': ['']  // fallback
    }
  },
  markdown: {
    extractHeaders: ['h2', 'h3', 'h4'],
    toc: {
      includeLevel: [2, 3, 4]
    }
  }
}
