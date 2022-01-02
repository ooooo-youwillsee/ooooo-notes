const {notes, english, me, tours} = require('../config')

module.exports = {
	title: 'ooooo-notes',
	description: 'ooooo-notes',
	base: '/ooooo-notes/',
	host: '0.0.0.0',
	port: 9527,
	plugins: ['@vuepress/back-to-top', '@vuepress/nprogress', '@vuepress/active-header-links'],
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
			// english.nav,
			tours.nav,
			me.nav,
			// { text: 'Guide', link: '/GUIDE' },
			{text: 'Home', link: '/'},
			{text: 'LeetCode', link: 'https://github.com/ooooo-youwillsee/leetcode', target: '_blank', rel: ''}
		],
		sidebar: {
			// ...notes.sidebar,
			// ...english.sidebar,
			...tours.sidebar,
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
