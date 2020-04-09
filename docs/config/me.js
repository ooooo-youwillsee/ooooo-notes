const me = (dir) => '/pages/me' + dir

const nav = {
  text: 'Me',
  ariaLabel: 'Me',
  items: [
    { text: 'Plan', link: me('/plan/2020') },
    { text: 'Resolution', link: me('/resolution/2020') }
  ]
}

const sidebar = {
  [me('/plan/')]: [
    '',
    ['2020', '2020 年度计划'],
    ['2021', '2021 年度计划']
  ],
  [me('/resolution/')]: [
    ['2020', '2020 解决问题']
  ]
}

module.exports = {
  nav,
  sidebar
}
