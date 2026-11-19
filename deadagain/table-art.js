/* Original miniature props. The world axes on the tabletop project down-left and
   down-right; the third axis is height above the felt. Angles are in radians. */
;(() => {
  'use strict'
  const TAU = Math.PI * 2
  const brass = ['#e8c886', '#a9824e', '#6a543e']
  const walnut = ['#805e4b', '#563f36', '#382e2b']
  const slate = ['#626f78', '#3c4854', '#28343f']
  const ebony = ['#3a4045', '#292a30', '#1e2127']
  function paint(key, c, cx, cy, scale = 1, time = 0) {
    c.save()
    c.translate(cx, cy)
    c.scale(scale, scale)
    c.lineJoin = 'round'
    c.lineCap = 'round'
    const project = (x, y, z = 0) => [(x - y) * 0.9, (x + y) * 0.34 - z + 5]
    const path = (pts, fill, stroke = '#25252a', width = 0.65) => {
      c.beginPath()
      c.moveTo(...pts[0])
      for (let k = 1; k < pts.length; k++) c.lineTo(...pts[k])
      if (fill) {
        c.closePath()
        c.fillStyle = fill
        c.fill()
      }
      if (stroke) {
        c.strokeStyle = stroke
        c.lineWidth = width
        c.stroke()
      }
    }
    const line = (a, b, ink = '#e6c990', width = 0.6) => path([a, b], null, ink, width)
    const wl = (a, b, ink, width) => line(project(...a), project(...b), ink, width)
    const ellipse = (x, y, rx, ry, fill, stroke = null, width = 0.65) => {
      c.beginPath()
      c.ellipse(x, y, rx, ry, 0, 0, TAU)
      if (fill) {
        c.fillStyle = fill
        c.fill()
      }
      if (stroke) {
        c.strokeStyle = stroke
        c.lineWidth = width
        c.stroke()
      }
    }
    function gradient(y1, y2, stops) {
      const g = c.createLinearGradient(0, y1, 0, y2)
      stops.forEach(([offset, tone]) => g.addColorStop(offset, tone))
      return g
    }
    const prism = (x, y, z, w, d, h, pal, edge = true) => {
      const a = project(x, y, z + h),
        b = project(x + w, y, z + h),
        lower = project(x + w, y + d, z),
        cc = project(x + w, y + d, z + h),
        dd = project(x, y + d, z + h)
      path([dd, cc, lower, project(x, y + d, z)], pal[1])
      path([b, cc, lower, project(x + w, y, z)], pal[2])
      path([a, b, cc, dd], pal[0])
      if (edge) line(dd, cc, 'rgba(251,234,186,.65)', 0.5)
    }
    const surface = (x, y, z, w, d, col, stroke) =>
      path(
        [project(x, y, z), project(x + w, y, z), project(x + w, y + d, z), project(x, y + d, z)],
        col,
        stroke,
      )
    function drum(x, y, z, rx, ht, col) {
      const [sx, sy] = project(x, y, z),
        ry = rx * 0.42
      ellipse(sx, sy, rx, ry, col[2])
      c.fillStyle = gradient(sy - ht - ry, sy + ry, [
        [0, col[0]],
        [0.5, col[1]],
        [1, col[2]],
      ])
      c.fillRect(sx - rx, sy - ht, rx * 2, ht)
      ellipse(sx, sy - ht, rx, ry, col[0], '#343039')
      c.beginPath()
      c.ellipse(sx, sy - ht, rx - 0.6, Math.max(0.3, ry - 0.5), 0, 0, Math.PI)
      c.strokeStyle = '#ecd8aa'
      c.lineWidth = 0.55
      c.stroke()
    }
    function axes(x, y, z, rx, angle, len, color, width) {
      const [sx, sy] = project(x, y, z)
      line(
        [sx + Math.cos(angle) * rx, sy + Math.sin(angle) * rx * 0.42],
        [sx + Math.cos(angle) * (rx + len), sy + Math.sin(angle) * (rx + len) * 0.42],
        color,
        width,
      )
    }
    function gem(x, y, z, sz, pal) {
      const [sx, sy] = project(x, y, z),
        hi = sz * 0.94
      const a = [sx - sz, sy],
        b = [sx - sz * 0.58, sy - hi * 0.67],
        cc = [sx + sz * 0.3, sy - hi],
        d = [sx + sz, sy - hi * 0.24],
        e = [sx + sz * 0.35, sy + sz * 0.54],
        f = [sx - sz * 0.44, sy + sz * 0.35],
        mid = [sx - sz * 0.05, sy - hi * 0.15]
      path([a, b, cc, d, e, f], pal[2])
      path([a, b, mid, f], pal[1], null)
      path([b, cc, mid], pal[0], null)
      path([cc, d, mid], pal[1], null)
      path([d, e, mid], pal[2], null)
      path([f, mid, e], pal[0], null)
      line(b, cc, '#fff4d2', 0.68)
      line(cc, mid, 'rgba(255,242,214,.7)', 0.45)
    }
    function highlight(x, y, r = 1) {
      line([x - r * 1.4, y], [x + r * 1.4, y], '#fff3c9', 0.45)
      line([x, y - r], [x, y + r], '#fff3c9', 0.45)
    }
    function card(x, y, z, angle, rank) {
      const [px, py] = project(x, y, z)
      c.save()
      c.translate(px, py)
      c.rotate(angle)
      c.transform(1, 0.11, -0.23, 0.62, 0, 0)
      c.fillStyle = '#a29175'
      c.fillRect(-6.4, -10.4, 13.1, 21.8)
      c.fillStyle = gradient(-10, 11, [
        [0, '#f7ebce'],
        [1, '#c7b899'],
      ])
      c.fillRect(-6.2, -10.3, 12.7, 21)
      c.strokeStyle = '#564b48'
      c.lineWidth = 0.62
      c.strokeRect(-5.2, -9.4, 10.7, 19.1)
      const col = rank ? '#a34e4c' : '#344e54'
      for (const yy of rank ? [-3.6, 3.6] : [0])
        path(
          [
            [0, yy - 2.7],
            [1.9, yy],
            [0, yy + 2.6],
            [-1.9, yy],
          ],
          col,
          null,
        )
      ellipse(-3.45, -7.1, 0.7, 1, col)
      c.restore()
    }
    function base(w = 51, d = 32) {
      prism(-w / 2, -d / 2, 0, w, d, 1.7, walnut)
      surface(-w / 2 + 1.5, -d / 2 + 1.5, 1.75, w - 3, d - 3, '#354a47', '#ad8f60')
    }
    ellipse(0, 9, 41, 9, 'rgba(11,12,16,.22)')
    if (key === 'choice') {
      base(58, 28)
      const bone = ['#decba6', '#b8a582', '#89775b'],
        teal = ['#88b7ac', '#5b8882', '#43625f']
      for (let r = 0; r < 2; r++)
        for (let i = 0; i < 3; i++) {
          const x = -23 + i * 8,
            y = -8 + r * 8,
            n = [
              [2, 3, 2],
              [1, 2, 1],
            ][r][i]
          for (let k = 0; k < n; k++)
            prism(x, y, 2 + k * 6.2, 7.9, 7.9, 6.2, (r + i + k) % 4 === 0 ? teal : bone)
        }
      card(12, -8, 2.5, -0.49, 1)
      card(16, -5, 2.9, -0.18, 0)
      card(19, -3, 3.4, 0.2, 1)
      drum(23, 8, 2.3, 3.1, 2, brass)
      drum(16, 10, 2.2, 3.1, 1.4, brass)
    } else if (key === 'heavy') {
      base(62, 28)
      const tones = [
        ['#e3a295', '#9b5f55', '#623c3b'],
        ['#9bb998', '#64896f', '#405e57'],
        ['#97b9ce', '#627f9d', '#425c74'],
      ]
      for (let i = 0; i < 3; i++) {
        const x = -19 + i * 19
        drum(x, -1, 2, 8.3, 2, ebony)
        drum(x, -1, 4, 2.6, 5, brass)
        drum(x, -1, 9, 8.5, 2, tones[i])
        for (let j = 0; j < [2, 1, 3][i]; j++)
          prism(x - 3 + (j === 1 ? 3 : -1), -3 + (j === 1 ? -2 : 1), 11 + j * 3.6, 6.1, 5.6, 3.6, slate)
        const [dx, dy] = project(x, 4, 6)
        ellipse(dx, dy, 1.6, 1.6, '#dbbe83', '#6a553a')
        line([dx, dy], [dx + 0.8, dy - 0.7], '#393737', 0.5)
      }
    } else if (key === 'exchange') {
      base(52, 28)
      prism(-20, -7, 2, 34, 16, 4, brass)
      prism(-17, -6, 6, 23, 14, 8, ebony)
      // A vertical price strip emerging from gilt rollers.
      const [x, y] = project(1, -2, 13)
      path(
        [
          [x - 15, y + 1],
          [x - 15, y - 13],
          [x + 7, y - 20],
          [x + 9, y - 6],
        ],
        '#dacbac',
        '#534c43',
      )
      for (let i = 0; i < 3; i++) line([x - 13, y - i * 3 - 3], [x + 6, y - i * 3 - 9], '#a6a28c', 0.42)
      path(
        [
          [x - 13, y - 4],
          [x - 10, y - 6],
          [x - 7, y - 5],
          [x - 4, y - 10],
          [x - 1, y - 9],
          [x + 2, y - 15],
          [x + 5, y - 16],
        ],
        null,
        '#8b443d',
        1.1,
      )
      for (let i = 0; i < 3; i++)
        prism(4 + i * 5, -7, 6, 4, 6, 3 + i * 3, ['#a9bd9b', '#77937b', '#526a61'])
      drum(11, 5, 5, 4.6, 2.2, brass)
      wl([14, 5, 7], [21, 5, 10], '#c4a66d', 1.7)
      const [k, l] = project(22, 5, 10)
      ellipse(k, l, 2, 1.5, '#ceb277')
    } else if (key === 'dial') {
      drum(0, 0, 0, 29.4, 4, walnut)
      drum(0, 0, 4, 27.5, 1.8, brass)
      drum(0, 0, 5.8, 24.5, 1.4, ['#344753', '#334450', '#263746'])
      const [x, y] = project(0, 0, 7.4)
      ellipse(x, y, 16.8, 7, null, '#c9aa72', 0.8)
      ellipse(x, y, 10.4, 4.4, null, '#b39869', 0.55)
      for (let i = 0; i < 24; i++)
        axes(
          0,
          0,
          7.2,
          21.5,
          (i * TAU) / 24,
          i % 4 === 0 ? -3.2 : -1.4,
          '#dcca9e',
          i % 4 === 0 ? 0.8 : 0.45,
        )
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6
        const xx = x + Math.cos(a) * 18.2,
          yy = y + Math.sin(a) * 7.65
        path(
          [
            [xx, yy - 1.65],
            [xx + 1.45, yy],
            [xx, yy + 1.4],
            [xx - 1.25, yy],
          ],
          i === 4 ? '#e8b379' : '#9dbdb5',
          null,
        )
      }
      const a = 0.1 * Math.sin(time * 0.45) - 0.9
      c.save()
      c.translate(x, y - 0.7)
      c.scale(1, 0.43)
      c.rotate(a)
      path(
        [
          [20, 0],
          [1, 3],
          [-10, 0],
          [1, -3],
        ],
        '#dec48d',
        '#66553b',
      )
      path(
        [
          [20, 0],
          [1, 3],
          [1, 0],
        ],
        '#a48454',
        null,
      )
      c.restore()
      drum(0, 0, 7.5, 2.8, 1.3, brass)
      highlight(x + 1, y - 2)
    } else if (key === 'gems') {
      base(57, 26)
      const stones = [
        ['#b9ece0', '#68bbb6', '#397978'],
        ['#edd497', '#d9aa55', '#9e6a3d'],
        ['#e6aac1', '#bb7e99', '#80596f'],
      ]
      for (let i = 0; i < 3; i++) {
        const x = -19 + i * 18
        prism(x - 7, -9, 2, 15.5, 17, 3, walnut)
        surface(x - 6, -8, 5, 13.5, 15, '#273436', '#bc9d68')
        const a = project(x - 6, -8, 5),
          b = project(x + 7.5, -8, 5)
        path([a, b, [b[0] + 2, b[1] - 9], [a[0] + 2, a[1] - 9]], '#445152', '#b39565')
        line([a[0] + 2, a[1] - 8], [b[0] + 1, b[1] - 8], '#84948c', 0.65)
        gem(x + 1, 0, 6.8, i === 1 ? 5.8 : 5, stones[i])
        const [xx, yy] = project(x + 1, 0, 8)
        highlight(xx, yy - 3, 0.95)
      }
    } else if (key === 'pig') {
      base(53, 28)
      const [sx, sy] = project(-1, -1, 10)
      // Lacquered ceramic body, four little feet, saddle-shaped coin slot.
      for (const dx of [-11, 8]) {
        ellipse(sx + dx + 3, sy + 6, 3.4, 3.5, '#9a7167')
        ellipse(sx + dx, sy + 9, 3, 3.8, '#b98c7c', '#775d58')
      }
      const glaze = c.createRadialGradient(sx - 4, sy - 7, 1, sx - 2, sy, 21)
      glaze.addColorStop(0, '#ffe3c7')
      glaze.addColorStop(0.45, '#e5b9a2')
      glaze.addColorStop(0.87, '#b98b7e')
      glaze.addColorStop(1, '#937073')
      ellipse(sx, sy, 16.5, 11.4, glaze, '#775958')
      path(
        [
          [sx + 5, sy - 7],
          [sx + 6, sy - 16],
          [sx + 13, sy - 10],
        ],
        '#dcac97',
        '#936f68',
      )
      path(
        [
          [sx + 7, sy - 9],
          [sx + 7, sy - 14],
          [sx + 11, sy - 10],
        ],
        '#b68273',
        null,
      )
      ellipse(sx + 15, sy + 0.5, 7.2, 7.7, glaze, '#a87a6d')
      ellipse(sx + 20, sy + 2.8, 4.2, 3.45, '#dba996', '#9c7367')
      ellipse(sx + 19.3, sy + 2.8, 0.6, 1, '#735754')
      ellipse(sx + 21.8, sy + 2.3, 0.6, 0.95, '#735754')
      ellipse(sx + 14.7, sy - 0.9, 1.07, 1.27, '#363438')
      highlight(sx + 14.8, sy - 1.42, 0.35)
      line([sx - 8, sy - 8], [sx - 1, sy - 9.4], '#634f50', 1.6)
      c.beginPath()
      c.moveTo(sx - 16, sy)
      c.bezierCurveTo(sx - 25, sy - 1, sx - 21, sy - 10, sx - 18.5, sy - 7)
      c.bezierCurveTo(sx - 16, sy - 5, sx - 21, sy - 4, sx - 23, sy - 7)
      c.strokeStyle = '#b08b79'
      c.lineWidth = 1.4
      c.stroke()
      drum(16, 10, 2, 3.4, 1.3, brass)
      drum(21, 11, 2, 2.9, 1.5, brass)
    } else if (key === 'bingo') {
      base(60, 27)
      const x = -22,
        y = -9
      surface(x, y, 2.2, 23, 22, '#decba1', '#947c58')
      for (let i = 1; i < 5; i++) {
        wl([x + i * 4.6, y, 2.3], [x + i * 4.6, y + 22, 2.3], '#9a8062', 0.45)
        wl([x, y + i * 4.4, 2.3], [x + 23, y + i * 4.4, 2.3], '#9a8062', 0.45)
      }
      ;[
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 3],
        [1, 0],
      ].forEach(([col, row]) =>
        drum(x + 2.3 + col * 4.6, y + 2.2 + row * 4.4, 2.5, 1.65, 0.65, [
          '#8eafa0',
          '#728c79',
          '#566f65',
        ]),
      )
      drum(14, 0, 2, 7.6, 2.5, walnut)
      drum(14, 0, 4.5, 6.3, 0.9, brass)
      const a = project(11, -4, 12),
        b = project(26, 10, 4)
      line(a, b, '#3b302b', 4)
      line(a, b, '#b38956', 2.4)
      c.save()
      c.translate(...a)
      c.rotate(-0.45)
      c.fillStyle = gradient(-4, 4, [
        [0, '#e2c58d'],
        [0.4, '#99754e'],
        [1, '#534236'],
      ])
      c.fillRect(-7, -3, 14, 6)
      for (const i of [-7, 6]) {
        c.fillStyle = '#caa66f'
        c.fillRect(i, -4, 2.5, 8)
        line([i, -4], [i + 2, -4], '#f1d9a1')
      }
      c.restore()
    } else if (key === 'wall') {
      base(42, 38)
      surface(-19, -17, 2.1, 38, 34, '#a79b78', '#6d644e')
      for (let i = 1; i < 6; i++) {
        wl([-19 + (i * 38) / 6, -17, 2.2], [-19 + (i * 38) / 6, 17, 2.2], '#5d6556', 0.55)
        wl([-19, -17 + (i * 34) / 6, 2.2], [19, -17 + (i * 34) / 6, 2.2], '#5d6556', 0.55)
      }
      for (const [x, y, w, d] of [
        [-15, -9, 12, 1.6],
        [-3, -9, 1.8, 9],
        [4, -13, 1.6, 9],
        [4, -4, 10, 1.6],
        [-9, 3, 1.7, 11],
        [-9, 14, 14, 1.6],
      ]) {
        prism(x, y, 2.4, w, d, 5.5, ['#ddc9a3', '#a69479', '#7f7967'])
      }
      drum(-11, -3, 2.4, 2.4, 2, ['#e2b485', '#bc906a', '#856347'])
      drum(11, 7, 2.4, 2.4, 2, ['#66777a', '#4a5659', '#333f43'])
    } else {
      base(39, 30)
      prism(-13, -10, 2, 26, 20, 12, walnut)
      for (const x of [-10, 7]) {
        prism(x, -10.3, 2, 2.7, 20.5, 12.6, brass)
      }
      prism(-12.5, -9.5, 14.1, 25, 19, 1.8, ['#9e7753', '#7a5943', '#624936'])
      const [px, py] = project(0, 0, 16)
      path(
        [
          [px, py - 4.2],
          [px + 9, py],
          [px, py + 4.2],
          [px - 9, py],
        ],
        '#424541',
        '#c3a371',
      )
      path(
        [
          [px, py - 2.7],
          [px + 5.6, py],
          [px, py + 2.8],
          [px - 5.6, py],
        ],
        null,
        '#d9bc8d',
        0.55,
      )
      prism(-1.8, 9.5, 7, 3.6, 1.2, 6, brass)
      const [kx, ky] = project(0, 11, 10)
      ellipse(kx, ky, 0.75, 1.1, '#4d4339')
    }
    c.restore()
  }
  window.TableArt = paint
})()
