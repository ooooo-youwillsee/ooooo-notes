const english = (dir) => '/pages/english' + dir

const nav = {
  text: 'English',
  ariaLabel: 'English',
  items: [
    { text: 'Friends', link: english('/friends/') }
  ]
}

const sidebar = {
  [english('/friends/')]: [
    '',
    ['01', 'Q1']
  ]
}

module.exports = {
  nav,
  sidebar
}
