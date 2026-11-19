/* Private puzzle sheets and group workbenches for the connected season. */
;(() => {
  'use strict'
  const boards = (window.RoomBoards ||= {})
  const copy = (v) => JSON.parse(JSON.stringify(v))
  const seq = (n) => Array.from({ length: n }, (_, i) => i)
  const opt = (key, label) => ({ key, label })
  const grid = (cols, cells) => ({ kind: 'grid', cols, cells: cells.map(String) })
  const cell = (i, w) => String.fromCharCode(65 + Math.floor(i / w)) + ((i % w) + 1)
  const distance = (a, b, w) =>
    Math.abs((a % w) - (b % w)) + Math.abs(Math.floor(a / w) - Math.floor(b / w))
  const setEnds = (s, ids) => Object.fromEntries(ids.map((id) => [id, s]))
  const inventory = [
    '왕관',
    '성배',
    '열쇠',
    '돛배',
    '보석',
    '시계',
    '깃펜',
    '종',
    '피라미드',
    '모래시계',
    '뚜껑',
    '체스말',
  ]
  const symbols = ['☉', '☾', '⌁', '◉', '⟐', '⌂', 'ϟ']
  const sigils = ['해', '달', '새', '눈', '연다', '가린다', '깨운다']
  const phrases = [
    [1, 5, 0],
    [2, 6, 0],
    [0, 4, 3],
    [1, 4, 3],
    [0, 6, 2],
    [2, 5, 1],
  ]
  const statements = [
    '달이 해를 가린다',
    '새가 해를 깨운다',
    '해가 눈을 연다',
    '달이 눈을 연다',
    '해가 새를 깨운다',
    '새가 달을 가린다',
  ]
  const outlines = {
    piece: ['0011', '0213', '2213', '2333'],
    symmetry: ['.000.', '30111', '33221', '.322.', '..2..'],
  }
  function shapeOf(rows, piece, rot) {
    let pts = []
    rows.forEach((row, y) =>
      [...row].forEach((v, x) => {
        if (v === String(piece)) pts.push([x, y])
      }),
    )
    for (let a = 0; a < rot; a++) pts = pts.map(([x, y]) => [-y, x])
    const l = Math.min(...pts.map((p) => p[0])),
      t = Math.min(...pts.map((p) => p[1]))
    return pts.map(([x, y]) => [x - l, y - t])
  }
  function renderTiles(k, p) {
    const rows = outlines[k],
      w = rows[0].length,
      flat = rows.join(''),
      pts = shapeOf(rows, p.pick, p.rots[p.pick])
    const width = 1 + Math.max(...pts.map((p) => p[0])),
      height = 1 + Math.max(...pts.map((p) => p[1]))
    const preview = seq(height)
      .map((y) =>
        seq(width)
          .map((x) => (pts.some(([a, b]) => a === x && b === y) ? '■' : '·'))
          .join(''),
      )
      .join(' / ')
    const art = grid(
      w,
      p.board.map((v, i) =>
        flat[i] === '.' ? ' ' : v < 0 ? cell(i, w) : '▣ ' + String.fromCharCode(65 + v),
      ),
    )
    const placed = p.rots.filter((_, i) => p.board.includes(i)).length
    const options = p.rots.map((_, i) =>
      opt('p' + i, String.fromCharCode(65 + i) + (p.board.includes(i) ? ' · 배치됨' : ' 조각')),
    )
    options.push(opt('rotate', '↻ 90° 회전'))
    flat.split('').forEach((v, i) => {
      if (v !== '.') options.push(opt('c' + i, cell(i, w) + (p.board[i] < 0 ? ' 놓기' : ' 꺼내기')))
    })
    return {
      text:
        placed +
        '/4개 배치 · 선택 ' +
        String.fromCharCode(65 + p.pick) +
        '\n미리보기 (한 줄씩) ' +
        preview +
        '\n첫 줄의 맨 왼쪽 ■가 선택한 칸에 놓입니다.',
      options,
      art,
    }
  }
  function renderPuzzle(kind, p) {
    switch (kind) {
      case 'vault': {
        const labels = ['바깥', '가운데', '안쪽']
        return {
          text: '잠금쇠의 표식을 전부 12시로 맞추세요. 선택한 고리와 바로 안쪽 고리가 2시간씩 움직입니다.',
          art: grid(
            3,
            p.rings.map((n, i) => labels[i] + ' ' + (n * 2 || 12) + '시'),
          ),
          options: labels.map((l, i) => opt('r' + i, l + ' 고리 돌리기')),
        }
      }
      case 'glyph': {
        const which = p.order[p.turn]
        return {
          text:
            '문장 ' +
            (p.turn + 1) +
            '/3 · 주체 → 동작 → 대상\n' +
            symbols.map((s, i) => s + ' ' + sigils[i]).join(' ／ '),
          art: grid(
            3,
            phrases[which].map((i) => symbols[i]),
          ),
          options: seq(6)
            .filter((i) => [which, (which + 2) % 6, (which + 5) % 6].includes(i))
            .map((i) => opt('g' + i, statements[i])),
        }
      }
      case 'piece':
      case 'symmetry':
        return renderTiles(kind, p)
      case 'difference': {
        const items = p.closed ? p.after : p.initial
        return {
          text: p.closed
            ? '바뀐 자리 ' + p.found.length + '/3 · 기억해 둔 물건과 달라진 칸을 누르세요.'
            : '진열장에 놓인 물건과 위치를 기억하세요. 준비되면 덮개를 닫으세요.',
          art: grid(
            3,
            items.map((v, i) => cell(i, 3) + ' ' + inventory[v] + (p.found.includes(i) ? ' ✓' : '')),
          ),
          options: p.closed
            ? seq(9)
                .filter((i) => !p.found.includes(i))
                .map((i) => opt('d' + i, cell(i, 3) + ' ' + inventory[items[i]]))
            : [opt('cover', '덮개 닫기')],
        }
      }
      case 'code': {
        const record = p.history.map(
          (h, i) => i + 1 + '차 ' + h.g.join('') + ' · 자리 ' + h.exact + ' / 숫자만 ' + h.rest,
        )
        const options = seq(6)
          .filter((i) => p.guess.length < 3 && !p.guess.includes(i + 1))
          .map((i) => opt('n' + i, String(i + 1)))
        if (p.guess.length) options.push(opt('back', '끝자리 지우기'))
        if (p.guess.length === 3) options.push(opt('test', '제출'))
        return {
          text: '서로 다른 숫자 3개 · 제출 ' + p.history.length + '/6\n' + record.join('\n'),
          art: grid(
            3,
            seq(3).map((i) => p.guess[i] || '—'),
          ),
          options,
        }
      }
      case 'fence': {
        const path = p.path,
          edges = new Set(path.slice(1).map((n, i) => edge(n, path[i])))
        // Use an interleaved 9-column map so clues lie inside the fence, between vertex labels.
        const cells = seq(81).map((i) => {
          const x = i % 9,
            y = Math.floor(i / 9),
            base = Math.floor(y / 2) * 5 + Math.floor(x / 2)
          if (x % 2 && y % 2) return String(p.clues[Math.floor(y / 2) * 4 + Math.floor(x / 2)])
          if (!((x + y) % 2)) return base === path.at(-1) ? '●' : base === path[0] ? '◎' : cell(base, 5)
          return edges.has(edge(base, base + (x % 2 ? 1 : 5))) ? (x % 2 ? '━' : '┃') : ' '
        })
        let picks = seq(25).filter(
          (i) =>
            !path.length ||
            (distance(i, path.at(-1), 5) === 1 &&
              (!path.includes(i) || (i === path[0] && path.length >= 4))),
        )
        const options = picks.map((i) => opt('v' + i, (i === path[0] ? '닫기 · ' : '') + cell(i, 5)))
        if (path.length) options.push(opt('undo', '한 점 되돌리기'), opt('clear', '모두 지우기'))
        return {
          text:
            (path.length
              ? '시작 ' + cell(path[0], 5) + ' · 현재 ' + cell(path.at(-1), 5)
              : '첫 점을 고르세요.') + '\n칸 안의 수만큼 변을 두르는 한 줄 울타리를 만드세요.',
          art: grid(9, cells),
          options,
        }
      }
      case 'trial': {
        const available = p.pool.filter((v) => !p.board.includes(v)),
          options = available.map((v) => opt('t' + v, String(v)))
        p.holes
          .filter((i) => p.selected !== null || p.board[i])
          .forEach((i) =>
            options.push(opt('h' + i, cell(i, 7) + (p.selected === null ? ' 꺼내기' : ' 놓기'))),
          )
        if (!p.board.includes(0)) options.push(opt('sum', '16줄 검산'))
        return {
          text:
            '모든 가로·세로·두 대각선의 합은 175입니다.\n' +
            (p.selected
              ? '선택 ' + p.selected + ' · 빈칸 좌표를 고르세요.'
              : '숫자를 고르고 해당 위치에 놓으세요.'),
          art: grid(
            7,
            p.board.map((v, i) => v || cell(i, 7)),
          ),
          options,
        }
      }
    }
  }
  const edge = (a, b) => (a < b ? a + '-' + b : b + '-' + a)
  function countWalls(path) {
    const e = new Set(path.slice(1).map((n, i) => edge(n, path[i])))
    return seq(16).map((i) => {
      let x = (i % 4) + Math.floor(i / 4) * 5
      return [
        [x, x + 1],
        [x, x + 5],
        [x + 1, x + 6],
        [x + 5, x + 6],
      ].filter(([a, b]) => e.has(edge(a, b))).length
    })
  }
  const fenceLayouts = [
    [0, 1, 2, 7, 8, 9, 14, 13, 18, 17, 22, 21, 16, 11, 10, 5, 0],
    [1, 2, 3, 8, 9, 14, 19, 18, 17, 22, 21, 16, 15, 10, 11, 6, 1],
    [0, 1, 6, 7, 2, 3, 8, 13, 14, 19, 18, 23, 22, 21, 16, 11, 10, 5, 0],
  ]
  function fencePlan(clues) {
    for (let path of fenceLayouts) {
      for (let r = 0; r < 4; r++) {
        if (countWalls(path).every((c, i) => c === clues[i])) return path
        path = path.map((i) => 5 * (i % 5) + 4 - Math.floor(i / 5))
      }
    }
    return []
  }
  const trials = seq(49)
  const lines = [
    ...seq(7).map((y) => seq(7).map((x) => y * 7 + x)),
    ...seq(7).map((x) => seq(7).map((y) => y * 7 + x)),
    seq(7).map((i) => i * 8),
    seq(7).map((i) => 6 * (i + 1)),
  ]
  function trialPlan(p) {
    const values = p.board.slice()
    p.holes.forEach((i) => (values[i] = 0))
    const pool = new Set(p.pool),
      holeSet = new Set(p.holes)
    function fill() {
      const empty = trials.filter((i) => !values[i] && holeSet.has(i))
      if (!empty.length) return true
      const freedom = (i) =>
        Math.min(...lines.filter((l) => l.includes(i)).map((l) => l.filter((c) => !values[c]).length))
      const i = empty.sort((a, b) => freedom(a) - freedom(b))[0],
        ls = lines.filter((l) => l.includes(i))
      for (const n of [...pool]) {
        values[i] = n
        pool.delete(n)
        if (
          ls.every((l) => l.some((c) => !values[c]) || l.reduce((t, c) => t + values[c], 0) === 175) &&
          fill()
        )
          return true
        pool.add(n)
        values[i] = 0
      }
      return false
    }
    return fill() ? values : []
  }
  const candidates = []
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++)
      for (let c = 1; c <= 6; c++) if (new Set([a, b, c]).size === 3) candidates.push([a, b, c])
  function codePlan(p, id) {
    const viable = candidates.filter((c) =>
      p.history.every((h) => {
        const exact = c.filter((v, i) => h.g[i] === v).length
        return exact === h.exact && c.filter((v) => h.g.includes(v)).length - exact === h.rest
      }),
    )
    const prefix = viable.filter((c) => p.guess.every((v, i) => c[i] === v))
    if (!prefix.length) return 'back'
    return 'n' + (prefix[Math.abs(Number(id)) % prefix.length][p.guess.length] - 1)
  }
  function automated(kind, p, id) {
    switch (kind) {
      case 'vault':
        return 'r' + p.rings.findIndex((n) => n !== 0)
      case 'glyph':
        return 'g' + p.order[p.turn]
      case 'piece':
      case 'symmetry': {
        const rows = outlines[kind],
          i = p.rots.findIndex((_, j) => !p.board.includes(j))
        if (i < 0) return 'clear'
        if (p.pick !== i) return 'p' + i
        if (p.rots[i]) return 'rotate'
        const anchor = rows.join('').indexOf(String(i))
        if (p.board[anchor] >= 0) return 'clear'
        return 'c' + anchor
      }
      case 'difference': {
        if (!p.closed) return 'cover'
        const i = p.after.findIndex((v, j) => v !== p.initial[j] && !p.found.includes(j))
        return 'd' + i
      }
      case 'code':
        return p.guess.length === 3 ? 'test' : codePlan(p, id)
      case 'fence': {
        const plan = fencePlan(p.clues)
        if (!p.path.every((n, i) => n === plan[i])) return 'clear'
        return 'v' + plan[p.path.length]
      }
      case 'trial': {
        const plan = trialPlan(p)
        const i = p.holes.find((j) => p.board[j] !== plan[j])
        if (i === undefined) return 'sum'
        const n = plan[i]
        if (p.selected === n) return 'h' + i
        if (p.board.includes(n)) return 'h' + p.board.indexOf(n)
        return 't' + n
      }
    }
  }
  function make(kind) {
    const engine = window.Matches[kind],
      coop = kind === 'vault' || kind === 'glyph'
    return {
      name: engine.name,
      rule:
        engine.rule +
        ' ' +
        (coop
          ? '한 작업대를 돌아가며 조작합니다. 팀 전체가 같은 결과를 얻습니다.'
          : '모두 같은 문제를 개별 풀이합니다. 오답과 제출 결과로 점수를 정합니다.'),
      start(ids) {
        const base = engine.start(),
          s = { ids: ids.slice(), turn: 0, done: false, points: setEnds(0, ids), steps: setEnds(0, ids) }
        if (coop) s.work = base
        else s.sheets = Object.fromEntries(ids.map((id) => [id, copy(base)]))
        return s
      },
      view(s, id) {
        const seated = s.ids.includes(id),
          finished = coop ? (s.done ? s.ids.length : 0) : s.ids.filter((n) => s.sheets[n].done).length
        if (!seated)
          return { text: '참가자 ' + finished + ' / ' + s.ids.length + '명 완료', options: [] }
        const p = coop ? s.work : s.sheets[id]
        if (p.done)
          return {
            text:
              (p.score ? '풀이 완료' : '도전 종료') +
              ' · 내 점수 ' +
              s.points[id] +
              '점\n참가자 ' +
              finished +
              ' / ' +
              s.ids.length +
              '명 완료',
            options: [],
          }
        const v = renderPuzzle(kind, p)
        if (coop && id !== s.ids[s.turn % s.ids.length]) {
          v.options = []
          v.text += '\n다른 참가자가 작업대를 조작하고 있습니다.'
        } else if (!coop) {
          if (p.confirmYield) {
            v.options = [opt('keep', '계속 풀기'), opt('yield', '0점으로 마치기')]
            v.text = '풀이를 중단하면 이 종목의 점수는 0점입니다.'
          } else v.options.push(opt('yield', '풀이 중단'))
        }
        if (p.log) v.text += '\n' + p.log
        if (!coop) v.text += '\n풀이 완료 ' + finished + ' / ' + s.ids.length + '명'
        return v
      },
      act(s, id, key) {
        if (s.done || !s.ids.includes(id) || (coop && s.ids[s.turn % s.ids.length] !== id)) return false
        const p = coop ? s.work : s.sheets[id]
        if (p.done) return false
        if (!coop && key === 'yield') {
          if (!p.confirmYield) {
            p.confirmYield = true
            return true
          }
          p.done = true
          p.score = 0
          p.log = '이번 문제의 풀이를 중단했습니다.'
        } else if (p.confirmYield) {
          if (key !== 'keep') return false
          p.confirmYield = false
          return true
        } else {
          if (!renderPuzzle(kind, p).options.some((o) => o.key === key)) return false
          engine.act(p, key)
          s.steps[id]++
          s.turn++
        }
        if (coop && p.done) {
          s.ids.forEach((n) => (s.points[n] = p.score))
          s.done = true
        } else if (!coop) {
          if (p.done) s.points[id] = p.score
          s.done = s.ids.every((n) => s.sheets[n].done)
        }
        return true
      },
      bot(s, id) {
        if (s.done || !s.ids.includes(id) || (coop && s.ids[s.turn % s.ids.length] !== id)) return null
        const p = coop ? s.work : s.sheets[id]
        if (p.done) return null
        if (!coop && (p.confirmYield || s.steps[id] > 100)) return 'yield'
        return automated(kind, p, id)
      },
    }
  }
  ;['vault', 'piece', 'difference', 'glyph', 'code', 'fence', 'symmetry', 'trial'].forEach(
    (kind) => (boards[kind] = make(kind)),
  )
})()
