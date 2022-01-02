const me = (dir) => '/pages/me' + dir

const nav = {
	text: 'Me',
	ariaLabel: 'Me',
	items: [
		{text: 'Plan', link: me('/plan/2022')},
		{text: 'Resolution', link: me('/resolution/2022')}
	]
}

const sidebar = {
	[me('/plan/')]: [
		'',
		['2020', '2020 Plan'],
		['2021', '2021 Plan'],
		['2022', '2022 Plan']
	],
	[me('/resolution/')]: [
		['2019', '2019 Resolution'],
		['2020', '2020 Resolution'],
		['2021', '2021 Resolution'],
		['2022', '2022 Resolution']
	]
}

module.exports = {
	nav,
	sidebar
}
