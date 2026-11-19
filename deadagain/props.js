/* Private physical pieces shown to the player holding this handset. */
window.PrivateProps = (() => {
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (k) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[k],
    )
  const svg = (body, w = 86, h = 62) =>
    '<svg aria-hidden="true" viewBox="0 0 ' + w + ' ' + h + '">' + body + '</svg>'
  function cubes(n) {
    let out = ''
    for (let i = 0; i < n; i++) {
      let y = 43 - i * 8
      out +=
        '<g transform="translate(43 ' +
        y +
        ')"><path d="M-13 0 0-7 13 0 0 7z" fill="#f2d3a0"/><path d="M-13 0 0 7v9l-13-7z" fill="#b58d66"/><path d="M13 0 0 7v9l13-7z" fill="#7a614d"/></g>'
    }
    return svg(out)
  }
  function chip(n) {
    return svg(
      '<ellipse cx="43" cy="38" rx="25" ry="16" fill="#815a36"/><ellipse cx="43" cy="33" rx="25" ry="16" fill="#d6b373" stroke="#f6dfa3" stroke-width="2"/><ellipse cx="43" cy="33" rx="19" ry="12" fill="none" stroke="#886338"/><text x="43" y="37" fill="#503d2c" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="15">' +
        esc(n) +
        '</text>',
    )
  }
  function cards() {
    return svg(
      '<g transform="rotate(-13 42 33)"><rect x="19" y="9" width="24" height="35" rx="3" fill="#ad8057" stroke="#504034"/></g><rect x="31" y="11" width="25" height="35" rx="3" fill="#e7cda0" stroke="#574737"/><path d="m44 18 7 10-7 11-7-11z" fill="#a45346"/>',
    )
  }
  function crystal() {
    return svg(
      '<path d="m16 30 12-15h29l12 15-26 24z" fill="#689e9c" stroke="#384f4b"/><path d="m16 30 27 24-11-24 10-15 13 15-12 24 26-24z" fill="#b2dbcc" stroke="#537e76"/>',
    )
  }
  function stamp() {
    return svg(
      '<path d="M20 49h46v-8H20z" fill="#976d4c"/><path d="M25 41c2-9 13-10 13-15l-4-8q0-10 9-10t9 10l-4 8c0 5 12 7 13 15z" fill="#a98d67" stroke="#624936"/><path d="M23 45h40" stroke="#e5c398"/>',
    )
  }
  function mini(key, label) {
    if (/피스|동전|입찰|원$/.test(label)) return chip((label.match(/\d+/) || ['◆'])[0])
    if (key === 'gems') return crystal()
    if (['choice', 'bingo', 'dial', 'exchange'].includes(key)) return cards()
    return stamp()
  }
  function tile(key, str, art) {
    str = String(str)
    if (/^▧+$/.test(str)) return cubes(str.length)
    if (key === 'choice' && art.cols === 4 && art.cells.length === 16) {
      const suit = str.match(/[♠♥♦♣]/)
      if (suit) {
        return (
          '<i class="facecard ' +
          (/[♦♥]/.test(str) ? 'red' : '') +
          '">' +
          esc(str.split('.').pop()) +
          '</i>'
        )
      }
      if (/^\d+$|^◆/.test(str)) return '<i class="backcard">' + esc(str) + '</i>'
    }
    if (key === 'wall') {
      const [cell, ...rest] = str.trim().split(' ')
      const val = rest.join(' ')
      return '<small>' + esc(cell) + '</small><b>' + esc(val || '·') + '</b>'
    }
    return esc(str || '·')
  }
  return { mini, tile }
})()
