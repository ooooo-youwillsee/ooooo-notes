const tours = (dir) => '/pages/tours' + dir

const nav = {
	text: 'Tours',
	ariaLabel: 'Tours',
	items: [
		{text: 'kubernetes', link: tours('/kubernetes/')},
	]
}

const sidebar = {
	[tours('/kubernetes/')]: [
		'',
		['01', '01、install k8s'],
	],
    [tours('/tmp')]: [
        '',
        ['01'],
        ['02'],
        ['03'],
        ['04'],
        ['05'],
    ]
}

module.exports = {
	nav,
	sidebar
}
