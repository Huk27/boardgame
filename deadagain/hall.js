/* The salon is drawn as an isometric stage. All positions are floor coordinates. */
;(() => {
  'use strict'
  const canvas = document.querySelector('#hall')
  let c = canvas.getContext('2d')
  const pigments = [
    '#cc6554',
    '#518fa3',
    '#ba9452',
    '#967cae',
    '#668f69',
    '#ca947a',
    '#8192c1',
    '#b3718d',
  ]
  const places = [
    [3, 3.9],
    [3.8, 3.1],
    [5.65, 3.1],
    [6.9, 3.85],
    [6.9, 5.95],
    [5.8, 6.85],
    [3.95, 6.85],
    [3, 6.15],
  ]
  const lounge = [
    [2.05, 4.1],
    [4.05, 1.65],
    [6.6, 2.05],
    [8.2, 3.65],
    [8.05, 6.65],
    [6.15, 8.2],
    [3.8, 8.0],
    [1.8, 6.6],
  ]
  const faces = ['#edbb99', '#bf8767', '#e5c5a2', '#a86e51', '#d49a75', '#e4bb92', '#b78b78', '#f0c7ab']
  let state = null,
    actors = new Map(),
    moveFn = null,
    tableFn = null,
    hitFn = null,
    clock = 0,
    prev = 0,
    plate = null,
    plateKey = '',
    mobile = false
  const xy = (u, v, z = 0) => [480 + 43 * (u - v), 109 + 19.8 * (u + v) - z]
  function path(pts, fill, line, width = 1) {
    c.beginPath()
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
    c.closePath()
    if (fill) {
      c.fillStyle = fill
      c.fill()
    }
    if (line) {
      c.strokeStyle = line
      c.lineWidth = width
      c.stroke()
    }
  }
  const tile = (pts, col, edge, w) =>
    path(
      pts.map((p) => xy(...p)),
      col,
      edge,
      w,
    )
  function line(a, b, col, w = 1) {
    c.strokeStyle = col
    c.lineWidth = w
    c.beginPath()
    c.moveTo(...a)
    c.lineTo(...b)
    c.stroke()
  }
  function oval(x, y, rx, ry, col) {
    c.fillStyle = col
    c.beginPath()
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    c.fill()
  }
  function block(a, b, d, e, z, h, cols) {
    tile(
      [
        [a, e, z],
        [d, e, z],
        [d, e, h],
        [a, e, h],
      ],
      cols[1],
    )
    tile(
      [
        [d, b, z],
        [d, e, z],
        [d, e, h],
        [d, b, h],
      ],
      cols[2],
    )
    tile(
      [
        [a, b, h],
        [d, b, h],
        [d, e, h],
        [a, e, h],
      ],
      cols[0],
      '#171e1c',
      1,
    )
  }
  function wallpanel(side, i) {
    const p = (x, z) => (side ? xy(0, x, z) : xy(x, 0, z)),
      col = side ? '#293f3b' : '#354642'
    path([p(i + 0.08, 0), p(i + 0.92, 0), p(i + 0.92, 154), p(i + 0.08, 154)], col, '#92774c', 1.2)
    const v = i % 3
    if (v === 1) {
      path(
        [p(i + 0.17, 55), p(i + 0.83, 55), p(i + 0.83, 113), p(i + 0.52, 135), p(i + 0.17, 113)],
        side ? '#759188' : '#657d7d',
        '#c6b68b',
        2,
      )
      for (let k = 0; k < 3; k++)
        line(p(i + 0.2 + k * 0.21, 58), p(i + 0.2 + k * 0.21, 115), '#32463e', 2)
      line(p(i + 0.16, 84), p(i + 0.82, 84), '#b6aa83', 2)
    } else if (v === 2) {
      for (let h = 48; h < 119; h += 21) {
        for (let j = 0; j < 7; j++) {
          let x = i + 0.17 + j * 0.09
          path(
            [
              p(x, h),
              p(x + 0.066, h),
              p(x + 0.066, h + 11 + ((j * 3 + i) % 8)),
              p(x, h + 12 + ((j * 3 + i) % 7)),
            ],
            ['#a78a67', '#61756a', '#906c58', '#c4ad7e'][(j + i) % 4],
          )
        }
        line(p(i + 0.13, h - 1), p(i + 0.86, h - 1), '#b09a70', 2)
      }
    } else {
      path(
        [p(i + 0.16, 40), p(i + 0.84, 40), p(i + 0.84, 112), p(i + 0.16, 112)],
        '#25362e',
        '#756d56',
        2,
      )
      path([p(i + 0.5, 62), p(i + 0.71, 80), p(i + 0.5, 98), p(i + 0.29, 80)], '#aa9066')
    }
    line(p(i + 0.04, 25), p(i + 0.96, 25), '#b19b70', 2)
  }
  function brassLamp(u, v, z) {
    const [x, y] = xy(u, v, z),
      g = c.createRadialGradient(x, y, 0, x, y, 59)
    g.addColorStop(0, '#ffdb8e88')
    g.addColorStop(1, '#f5ac4e00')
    c.fillStyle = g
    c.fillRect(x - 59, y - 59, 118, 118)
    line([x, y - 50], [x, y - 7], '#c4aa76', 2)
    path(
      [
        [x - 10, y + 1],
        [x - 5, y - 8],
        [x + 5, y - 8],
        [x + 10, y + 1],
        [x + 5, y + 10],
        [x - 5, y + 10],
      ],
      '#ffdc89',
      '#b08e59',
      1.5,
    )
    line([x - 9, y], [x + 9, y], '#eedab3', 2)
  }
  function paintStage(phase) {
    const grad = c.createLinearGradient(0, 0, 0, 520)
    grad.addColorStop(0, '#111c21')
    grad.addColorStop(1, '#283333')
    c.fillStyle = grad
    c.fillRect(0, 0, 960, 520)
    for (let i = 0; i < 10; i++) {
      wallpanel(1, i)
      wallpanel(0, i)
    }
    for (let u = 0; u < 10; u++)
      for (let v = 0; v < 10; v++) {
        let s = (u * 13 + v * 37) % 6
        tile(
          [
            [u, v],
            [u + 1, v],
            [u + 1, v + 1],
            [u, v + 1],
          ],
          ['#514f42', '#565449', '#4a4c42', '#605d50', '#55584c', '#525246'][s],
          '#6c6958',
          1,
        )
      }
    for (let n = 0; n < 3; n++) {
      let a = 0.28 + n * 0.095,
        b = 10 - a
      tile(
        [
          [a, a],
          [b, a],
          [b, b],
          [a, b],
        ],
        null,
        n === 1 ? '#352f29' : '#b29a6a',
        1.4,
      )
    }
    tile(
      [
        [3, 1],
        [7, 1],
        [7, 9],
        [3, 9],
      ],
      phase === 'night' ? '#423c50' : '#673e37',
      '#ac8b62',
      3,
    )
    tile(
      [
        [3.18, 1.18],
        [6.82, 1.18],
        [6.82, 8.82],
        [3.18, 8.82],
      ],
      null,
      '#c3a074',
      1.5,
    )
    for (let j = 0; j < 10; j++) {
      let u = 3.46 + (j % 2) * 3,
        v = 1.65 + Math.floor(j / 2) * 1.65
      tile(
        [
          [u, v - 0.16],
          [u + 0.13, v],
          [u, v + 0.16],
          [u - 0.13, v],
        ],
        '#c09869',
      )
    }
    for (const [u, v] of [
      [0.47, 3.6],
      [0.47, 7.4],
      [3.5, 0.46],
      [7.4, 0.46],
    ]) {
      block(u - 0.2, v - 0.2, u + 0.2, v + 0.2, 0, 46, ['#afa183', '#635a43', '#434c3e'])
      brassLamp(u, v, 70)
    }
    for (const [u, v] of [
      [0.7, 9.1],
      [9.1, 0.75],
    ]) {
      block(u - 0.2, v - 0.2, u + 0.2, v + 0.2, 0, 23, ['#b99a70', '#735f48', '#8c7853'])
      const [x, y] = xy(u, v, 20)
      for (let i = 0; i < 18; i++) {
        let a = i * 2.4,
          r = 10 + (i % 6)
        path(
          [
            [x, y],
            [x + Math.cos(a) * r - 3, y - 20 + Math.sin(a) * r],
            [x + Math.cos(a) * r * 1.7, y - 31 + Math.sin(a) * r],
            [x + Math.cos(a) * r + 3, y - 18 + Math.sin(a) * r],
          ],
          ['#70846b', '#506857', '#819277'][i % 3],
        )
      }
    }
    block(0, 9.99, 10, 10.19, -8, 0, ['#b59a71', '#433e31', '#554c3a'])
    block(10, 0, 10.18, 10, -8, 0, ['#a7976e', '#514735', '#423f35'])
  }
  function table(key, t) {
    for (const [a, b] of [
      [3.9, 3.86],
      [6.05, 3.86],
      [3.9, 6.02],
      [6.05, 6.02],
    ])
      block(a - 0.1, b - 0.1, a + 0.1, b + 0.1, 0, 29, ['#caaa7e', '#524334', '#7b6448'])
    block(3.56, 3.53, 6.46, 6.44, 25, 33, ['#c6a678', '#6f5039', '#503e32'])
    block(3.64, 3.61, 6.38, 6.36, 32, 34, ['#33554b', '#716c4e', '#4a5647'])
    tile(
      [
        [3.84, 3.82, 35],
        [6.18, 3.82, 35],
        [6.18, 6.17, 35],
        [3.84, 6.17, 35],
      ],
      null,
      '#bdac79',
      1.6,
    )
    const [tx, ty] = xy(5, 5, 38)
    window.TableArt(key || 'vault', c, tx, ty, 1.35, t)
  }
  function avatar(a, t) {
    const { id } = a
    let [x, y] = xy(a.u, a.v)
    const scale = mobile ? 1.4 : 1.19
    const walk = a.walk,
      step = walk ? Math.sin(t * 13 + id) : 0,
      bob = walk ? Math.abs(step) * 2 : Math.sin(t * 2 + id) * 0.6
    c.save()
    c.translate(x, y)
    c.scale(scale, scale)
    oval(0, 0, 15, 5, '#0a151a68')
    if (a.me) {
      c.strokeStyle = '#f6d691'
      c.lineWidth = 1.8
      c.beginPath()
      c.ellipse(0, 0, 17, 6, 0, 0, 7)
      c.stroke()
    }
    if (a.human && state) {
      oval(12, -44, 4.5, 4.5, '#233c38')
      oval(12, -44, 3, 3, a.online ? '#9defb7' : '#9b9181')
    }
    c.translate(0, -bob)
    c.save()
    if (walk && a.left) c.scale(-1, 1)
    line([-5, -10], [-5 + step * 4, -1], '#252827', 5)
    line([5, -10], [5 - step * 4, -1], '#252827', 5)
    const cl = pigments[id]
    path(
      [
        [-8, -27],
        [7, -27],
        [12, -9],
        [3, -6],
        [-12, -9],
      ],
      cl,
      '#28292a',
      1.4,
    )
    path(
      [
        [-4, -26],
        [5, -26],
        [1, -16],
      ],
      '#efe0b6',
    )
    line([0, -22], [1, -9], '#cbaa7e', 1.2)
    const wave = a.emote && a.emote.until > Date.now()
    line([-7, -23], [-12, -15 + step * 2], cl, 5)
    line([7, -23], [wave ? 15 : 12, wave ? -33 : -15 - step * 2], cl, 5)
    oval(0, -34, 9.6, 10.1, faces[id])
    const hair = [
      '#3a3430',
      '#483634',
      '#5c4b3f',
      '#393332',
      '#302f2c',
      '#987460',
      '#463b3a',
      '#54413d',
    ][id]
    path(
      [
        [-10, -34],
        [-11, -41],
        [-6, -46],
        [3, -46],
        [9, -42],
        [11, -36],
        [5, -38],
        [1, -40],
        [-5, -36],
      ],
      hair,
    )
    if (id % 4 === 0) {
      oval(-1, -42, 13, 3, hair)
      path(
        [
          [-8, -43],
          [-6, -50],
          [4, -51],
          [8, -42],
        ],
        hair,
      )
    }
    if (id % 4 === 1) {
      oval(-8, -42, 4.5, 5.5, hair)
      oval(7, -43, 4.8, 5, hair)
    }
    if (id % 4 === 2) {
      line([-7, -34], [-2, -34], '#3a3934', 2)
      line([2, -34], [7, -34], '#3a3934', 2)
    }
    if (walk && a.back) {
      oval(0, -36, 9.5, 8, hair)
    } else {
      oval(-3, -33, 1.1, 1.3, '#312824')
      oval(4, -33, 1.1, 1.3, '#312824')
    }
    c.restore()
    if (wave && a.human) {
      const str = a.emote.text.slice(0, 18)
      c.font = 'bold 12px sans-serif'
      let w = c.measureText(str).width + 12
      c.fillStyle = '#f5e9c8'
      c.fillRect(-w / 2, -73, w, 18)
      c.fillStyle = '#28302c'
      c.textAlign = 'center'
      c.fillText(str, 0, -60)
    }
    c.restore()
  }
  let zoom = false,
    mag = 1,
    focus = [480, 260],
    span = 960
  let showLabels = []
  function label(a) {
    let [x, y] = xy(a.u, a.v)
    c.font = (mobile ? 'bold 21px' : 'bold 14px') + ' sans-serif'
    const name = (a.me ? '◆ ' : '') + a.name.slice(0, mobile ? 5 : 8)
    let w = c.measureText(name).width + 10
    let h = mobile ? 25 : 19
    let rect = { x: x - w / 2, y: y + 5, w, h }
    for (
      let pass = 0;
      pass < 4 &&
      showLabels.some(
        (r) => r.x < rect.x + w && rect.x < r.x + r.w && r.y < rect.y + h && rect.y < r.y + r.h,
      );
      pass++
    )
      rect.y += h
    showLabels.push(rect)
    c.fillStyle = a.me ? '#4a3d26f0' : '#13211edb'
    c.fillRect(rect.x, rect.y, w, h)
    c.fillStyle = a.me ? '#ffe3a4' : '#ece4cc'
    c.textAlign = 'center'
    c.fillText(name, x, rect.y + h - 4)
  }
  function render(ms) {
    let t = ms / 1000,
      dt = Math.min(0.08, t - prev)
    prev = t
    let w = canvas.clientWidth,
      h = canvas.clientHeight
    if (!w || !h) {
      requestAnimationFrame(render)
      return
    }
    let d = Math.min(2, devicePixelRatio || 1)
    if (canvas.width !== Math.round(w * d) || canvas.height !== Math.round(h * d)) {
      canvas.width = Math.round(w * d)
      canvas.height = Math.round(h * d)
    }
    mobile = w < 670
    const phase = state?.phase || 'entry'
    let key = (phase === 'night' ? 'night' : 'day') + '-' + canvas.width
    if (plateKey !== key) {
      plate = document.createElement('canvas')
      plate.width = 960
      plate.height = 520 // static engraved architecture rendered once per lighting change
      const live = c
      c = plate.getContext('2d')
      paintStage(phase)
      c = live
      plateKey = key
    }
    span = Math.min(960, (w / h) * 520)
    const me = actors.get(state?.me)
    mag += ((zoom ? 1.72 : 1) - mag) * Math.min(1, dt * 8)
    const loc = me ? xy(me.u, me.v, 18) : [480, 260]
    const aim = zoom
      ? loc
      : [Math.max(480, loc[0] - span * 0.34) + Math.min(0, loc[0] + span * 0.34 - 480), 260]
    focus[0] +=
      (Math.max(span / (2 * mag), Math.min(960 - span / (2 * mag), aim[0])) - focus[0]) *
      Math.min(1, dt * 8)
    focus[1] += (Math.max(260 / mag, Math.min(520 - 260 / mag, aim[1])) - focus[1]) * Math.min(1, dt * 8)
    c.setTransform(canvas.width / span, 0, 0, canvas.height / 520, 0, 0)
    c.translate(span / 2, 260)
    c.scale(mag, mag)
    c.translate(-focus[0], -focus[1])
    c.drawImage(plate, 0, 0)
    const list = [...actors.values()]
    for (const a of list) {
      const target = a.path[0]
      a.walk = false
      if (target) {
        const dx = target[0] - a.u,
          dy = target[1] - a.v,
          dist = Math.hypot(dx, dy),
          speed = dt * 3
        if (dist > 0.03) {
          a.left = dx - dy < 0
          a.back = dx + dy < 0
        }
        if (dist <= speed) {
          a.u = target[0]
          a.v = target[1]
          a.path.shift()
        } else {
          a.u += (dx / dist) * speed
          a.v += (dy / dist) * speed
        }
        a.walk = true
      }
    }
    if (me?.path.length && state) {
      const [gx, gy] = xy(...me.path.at(-1)),
        radius = 8 + Math.sin(t * 7) * 2
      c.strokeStyle = '#f3d299bb'
      c.lineWidth = 2
      c.beginPath()
      c.ellipse(gx, gy, radius, radius * 0.5, 0, 0, Math.PI * 2)
      c.stroke()
    }
    list.sort((a, b) => a.u + a.v - b.u - b.v)
    for (const a of list.filter((a) => a.u + a.v < 9.6)) avatar(a, t)
    table(state?.match?.key, t)
    for (const a of list.filter((a) => a.u + a.v >= 9.6)) avatar(a, t)
    if (state?.match)
      for (const a of list) {
        const f = (t - a.flash) / 0.72
        if (f >= 0 && f < 1) {
          const [u, v] = xy(a.u, a.v, 22),
            [x, y] = xy(5, 5, 40),
            xx = u + (x - u) * f,
            yy = v + (y - v) * f - Math.sin(f * Math.PI) * 48
          c.save()
          c.translate(xx, yy)
          c.rotate(f * 1.5)
          c.fillStyle = '#efcc8c'
          c.fillRect(-5, -7, 10, 14)
          c.strokeStyle = '#a56c50'
          c.strokeRect(-3, -5, 6, 10)
          c.restore()
        }
      }
    showLabels = []
    if (state) list.forEach(label)
    clock = t
    requestAnimationFrame(render)
  }
  function clearFloor(u, v) {
    return (
      u >= 0.5 && v >= 0.5 && u <= 9.5 && v <= 9.5 && !(u > 3.35 && u < 6.65 && v > 3.35 && v < 6.65)
    )
  }
  function route(a, b, toU, toV) {
    // Four clear corridors around the central table, searched on a half-tile mesh.
    const node = (u, v) => Math.round(u * 2) * 21 + Math.round(v * 2),
      coords = (n) => [Math.floor(n / 21) / 2, (n % 21) / 2]
    let start = node(a, b),
      end = node(toU, toV),
      queue = [start],
      seen = new Map([[start, null]])
    if (!clearFloor(...coords(end))) return []
    for (let i = 0; i < queue.length && !seen.has(end); i++) {
      let n = queue[i]
      for (const off of [-21, 21, -1, 1]) {
        let k = n + off
        if (!seen.has(k) && clearFloor(...coords(k))) {
          queue.push(k)
          seen.set(k, n)
        }
      }
    }
    if (!seen.has(end)) return []
    let path = []
    for (let n = end; n !== start; n = seen.get(n)) path.push(coords(n))
    return path.reverse().concat([[toU, toV]])
  }
  function drawState(s) {
    state = s
    let seats =
      s?.phase === 'night'
        ? s.seats.filter((a) => a.zone === s.seats[s.me].zone)
        : s?.seats || places.map((p, id) => ({ id, name: '', pos: p }))
    actors.forEach((_, k) => {
      if (!seats.some((p) => p.id === k)) actors.delete(k)
    })
    for (const sh of seats) {
      const p = sh.pos || places[sh.id]
      let a = actors.get(sh.id)
      if (!a) {
        a = { id: sh.id, u: p[0], v: p[1], path: [] }
        actors.set(a.id, a)
      }
      if (a.dest !== p.join(',')) {
        a.path = route(a.u, a.v, ...p)
        a.dest = p.join(',')
      }
      if (
        sh.emote?.until !== a.emote?.until &&
        ['선택 완료', '생각을 마쳤어요'].includes(sh.emote?.text) &&
        s?.match
      )
        a.flash = clock
      Object.assign(a, {
        human: sh.human,
        online: sh.online,
        name: sh.name,
        me: sh.id === s?.me,
        emote: sh.emote,
      })
    }
  }
  canvas.onpointerdown = (e) => {
    if (!state) return
    const r = canvas.getBoundingClientRect(),
      x = (((e.clientX - r.left) * span) / r.width - span / 2) / mag + focus[0],
      y = (((e.clientY - r.top) * 520) / r.height - 260) / mag + focus[1]
    const actor = [...actors.values()]
      .sort((a, b) => b.u + b.v - a.u - a.v)
      .find((a) => {
        const [px, py] = xy(a.u, a.v)
        return Math.abs(x - px) < (mobile ? 23 : 18) && y > py - (mobile ? 72 : 60) && y < py
      })
    if (actor && hitFn) {
      hitFn(actor.id)
      return
    }
    const u = ((x - 480) / 43 + (y - 109) / 19.8) / 2,
      v = ((y - 109) / 19.8 - (x - 480) / 43) / 2
    if (u > 2.65 && v > 2.65 && u < 6.55 && v < 6.55 && !clearFloor(u + 0.65, v + 0.65)) {
      tableFn?.()
      return
    }
    if (clearFloor(u, v)) moveFn?.(u, v)
    canvas.focus({ preventScroll: true })
  }
  canvas.onkeydown = (e) => {
    if (!state) return
    let d = {
      ArrowLeft: [-0.5, 0.5],
      ArrowRight: [0.5, -0.5],
      ArrowUp: [-0.5, -0.5],
      ArrowDown: [0.5, 0.5],
    }[e.key]
    if (!d) return
    e.preventDefault()
    const a = actors.get(state.me)
    if (a) {
      const u = a.u + d[0],
        v = a.v + d[1]
      if (clearFloor(u, v)) moveFn?.(u, v)
    }
  }
  window.Hall = {
    drawState,
    places,
    lounge,
    setZoom(on) {
      zoom = !!on
    },
    clearFloor,
    pigments,
    bind(move, table, hit) {
      moveFn = move
      tableFn = table
      hitFn = hit
    },
  }
  drawState(null)
  requestAnimationFrame(render)
})()
