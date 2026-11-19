/* Shared-table adaptations of the first two days. The engine stays on the host.
   Visitors receive only their own view. Every action carries a seat-local revision. */
;(() => {
  'use strict'
  const boards = (window.RoomBoards ||= {})
  const indices = (n) => Array.from({ length: n }, (_, i) => i)
  const random = (n) => Math.floor(Math.random() * n)
  const total = (xs) => xs.reduce((a, b) => a + b, 0)
  const shuffle = (xs) => {
    const a = xs.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = random(i + 1)
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const record = (ids, fn) => Object.fromEntries(ids.map((id, i) => [id, fn(id, i)]))
  const seat = (id) => id + 1 + '번'
  const choice = (key, label) => ({ key, label: String(label) })
  const grid = (cols, cells) => ({ kind: 'grid', cols, cells: cells.map(String) })
  const view = (text, options = [], art) => (art ? { text, options, art } : { text, options })
  const base = (ids) => ({
    ids: ids.slice(),
    points: record(ids, () => 0),
    revs: record(ids, () => 0),
    round: 0,
    done: false,
    log: '',
    pending: {},
  })
  const ranking = (s) => s.ids.map((id) => seat(id) + ' ' + s.points[id] + '점').join('  ·  ')
  const pending = (s, id) => Object.hasOwn(s.pending, id)
  const everyone = (s) => s.ids.every((id) => pending(s, id))
  const waiting = (s) =>
    view('내 선택을 봉인했습니다. ' + Object.keys(s.pending).length + ' / ' + s.ids.length + '명 제출')
  const ranker = (s, a, b) => s.points[b] - s.points[a] || s.ids.indexOf(a) - s.ids.indexOf(b)
  function expose(name, rule, create, privateView, update, think) {
    return {
      name,
      rule,
      start(ids) {
        if (
          !Array.isArray(ids) ||
          ids.length < 2 ||
          ids.length > 8 ||
          ids.some((id) => !Number.isInteger(id) || id < 0) ||
          new Set(ids).size !== ids.length
        )
          throw new Error('2~8개의 서로 다른 자리가 필요합니다.')
        return create(base(ids))
      },
      view(s, id) {
        if (!s.ids.includes(id)) return view('참가자 전용 판입니다.')
        if (s.done) return view((s.log ? s.log + '\n' : '') + ranking(s))
        const v = privateView(s, id)
        const log = s.log ? s.log + '\n' : ''
        const keyPrefix = s.revs[id] + '.'
        return {
          ...v,
          text: log + v.text,
          options: v.options.map((o) => choice(keyPrefix + o.key, o.label)),
        }
      },
      act(s, id, key) {
        if (s.done || !s.ids.includes(id) || typeof key !== 'string') return false
        const start = s.revs[id] + '.'
        if (!key.startsWith(start)) return false
        const bare = key.slice(start.length),
          options = privateView(s, id).options
        if (!options.some((o) => o.key === bare)) return false
        s.revs[id]++
        update(s, id, bare)
        return true
      },
      bot(s, id) {
        if (s.done || !s.ids.includes(id)) return null
        const v = privateView(s, id)
        if (!v.options.length) return null
        const action = think ? think(s, id, v) : v.options[random(v.options.length)].key
        return s.revs[id] + '.' + (v.options.find((o) => o.key === action) || v.options[0]).key
      },
    }
  }

  const suit = '♠♥♦♣',
    faceRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  const face = (v) => suit[Math.floor(v / 13)] + faceRanks[v % 13]
  const families = [
    '하이카드',
    '원페어',
    '투페어',
    '트리플',
    '스트레이트',
    '플러시',
    '풀하우스',
    '포카드',
    '스트레이트 플러시',
  ]
  function hand(cards) {
    const vals = cards.map((c) => 2 + (c % 13)).sort((a, b) => b - a),
      freq = {}
    vals.forEach((v) => (freq[v] = (freq[v] || 0) + 1))
    const groups = Object.keys(freq)
      .map(Number)
      .sort((a, b) => freq[b] - freq[a] || b - a)
    const flush = cards.every((c) => Math.floor(c / 13) === Math.floor(cards[0] / 13))
    const straight =
      groups.length === 5
        ? vals[0] - vals[4] === 4
          ? vals[0]
          : vals.join() === '14,5,4,3,2'
            ? 5
            : 0
        : 0
    const a = freq[groups[0]],
      b = freq[groups[1]]
    const family =
      flush && straight
        ? 8
        : a === 4
          ? 7
          : a === 3 && b === 2
            ? 6
            : flush
              ? 5
              : straight
                ? 4
                : a === 3
                  ? 3
                  : a === 2 && b === 2
                    ? 2
                    : a === 2
                      ? 1
                      : 0
    const kicks = [4, 8].includes(family) ? [straight] : groups
    let value = family
    for (let k = 0; k < 5; k++) value = value * 15 + (kicks[k] || 0)
    return { family, value }
  }
  const mission = ['큐브 세기', '네모 세기', '잔디 깔기', '기억 포커']
  const choices = [
    ['성과금', '보험금', '정답 +4. 상위 절반(동률 포함)은 성과금 +2, 나머지는 보험금 +3.'],
    [
      '팀',
      '개인',
      '팀은 한 줄 네모 개수를 공유하고 팀원 중 한 명이라도 맞히면 전원 +3. 개인은 정답 +6, 오답 −2.',
    ],
    [
      '공공의 이익',
      '개인의 이익',
      '공공이 과반이면 전원 +4. 개인을 고른 사람은 추가 +2. 뒤이어 한 잔디판에 번갈아 두 장씩 놓습니다.',
    ],
    [
      '지목',
      '계단',
      '계단이 과반이면 현재 순위순으로 이웃과 맞붙고, 그 외에는 각자 상대를 지목합니다. 같은 16장으로 겨루며 승리 +5, 동률 +2.',
    ],
  ]
  function setupChoice(s) {
    s.phase = 'vote'
    s.pending = {}
    s.votes = {}
    s.privatePick = {}
    if (s.round === 0) {
      s.cubes = indices(9).map(() => 1 + random(4))
      s.answer = total(s.cubes)
    }
    if (s.round === 1) {
      s.matrix = indices(12).map(() => 1 + random(4))
      s.target = 5 + random(4)
      s.answer = 0
      s.rowHint = 0
      for (let y = 0; y < 3; y++)
        for (let x = 0; x < 4; x++)
          for (let y1 = y; y1 < 3; y1++)
            for (let x1 = x; x1 < 4; x1++) {
              let t = 0
              for (let j = y; j <= y1; j++) for (let i = x; i <= x1; i++) t += s.matrix[j * 4 + i]
              if (t === s.target) {
                s.answer++
                if (y1 === y) s.rowHint++
              }
            }
    }
    if (s.round <= 1)
      s.answers = shuffle([
        ...new Set([s.answer, s.answer + 1, Math.max(0, s.answer - 1), s.answer + 2]),
      ])
    if (s.round === 2) {
      s.side = Math.ceil(Math.sqrt(5 * s.ids.length + 3))
      s.cells = indices(s.side * s.side).map(() => '.')
      const mixed = shuffle(indices(s.cells.length))
      mixed.slice(0, 2).forEach((i) => (s.cells[i] = '×'))
      mixed.slice(2, 2 + s.ids.length).forEach((i) => (s.cells[i] = '+'))
      s.first = -1
    }
    if (s.round === 3) {
      const pack = shuffle(indices(52))
      s.cards = pack.slice(0, 16)
      s.shared = pack.slice(16, 19)
      s.recall = record(s.ids, () => shuffle(indices(16)).slice(0, 8))
      s.picks = record(s.ids, () => [])
      s.rivals = {}
    }
    return s
  }
  function adjacent(s, i) {
    const n = s.side
    return [i - n, i + n, ...(i % n ? [i - 1] : []), ...(i % n < n - 1 ? [i + 1] : [])].filter(
      (j) => j >= 0 && j < s.cells.length && ['.', '+'].includes(s.cells[j]),
    )
  }
  const blanks = (s) =>
    indices(s.cells.length).filter((i) => ['.', '+'].includes(s.cells[i]) && adjacent(s, i).length)
  function nextMission(s, message) {
    s.log = message
    s.round++
    if (s.round > 3) {
      s.done = true
      return
    }
    setupChoice(s)
  }
  function processVotes(s) {
    s.votes = s.pending
    s.pending = {}
    const n = s.ids.filter((id) => s.votes[id] === 'B').length,
      major = n > s.ids.length / 2
    s.log =
      choices[s.round][0] + ' ' + (s.ids.length - n) + '명 · ' + choices[s.round][1] + ' ' + n + '명'
    if (s.round <= 1) {
      s.phase = 'answer'
      return
    }
    if (s.round === 2) {
      s.ids.forEach(
        (id) =>
          (s.points[id] +=
            (s.ids.length - n > s.ids.length / 2 ? 4 : 0) + (s.votes[id] === 'B' ? 2 : 0)),
      )
      s.order = s.ids.slice().sort((a, b) => ranker(s, b, a))
      s.order = s.order.concat(s.order.slice().reverse())
      s.turn = 0
      s.phase = 'turf'
      return
    }
    if (!major) {
      s.phase = 'nominate'
      return
    }
    const ladder = s.ids.slice().sort((a, b) => ranker(s, a, b))
    ladder.forEach((id, i) => (s.rivals[id] = i % 2 ? ladder[i - 1] : (ladder[i + 1] ?? ladder[i - 1])))
    s.phase = 'memory'
  }
  function answerChoice(s) {
    const correct = record(s.ids, (id) => Number(s.pending[id]) === s.answer),
      wins = s.ids.filter((id) => correct[id])
    const okTeam = s.ids.some((id) => s.votes[id] === 'A' && correct[id])
    s.ids.forEach((id) => {
      if (s.round === 1) {
        s.points[id] += s.votes[id] === 'A' ? (okTeam ? 3 : 0) : correct[id] ? 6 : -2
        return
      }
      const upper = correct[id] || wins.length < Math.ceil(s.ids.length / 2)
      s.points[id] +=
        (correct[id] ? 4 : 0) +
        (upper && s.votes[id] === 'A' ? 2 : !upper && s.votes[id] === 'B' ? 3 : 0)
    })
    nextMission(
      s,
      mission[s.round] +
        ' 정답 ' +
        s.answer +
        ' · 적중 ' +
        (wins.map(seat).join(', ') || '없음') +
        ' · ' +
        ranking(s),
    )
  }
  function resolvePoker(s) {
    const hands = record(s.ids, (id) => hand(s.shared.concat(s.picks[id].map((i) => s.cards[i]))))
    const records = s.ids.map((id) => {
      const diff = Math.sign(hands[id].value - hands[s.rivals[id]].value)
      s.points[id] += diff === 1 ? 5 : diff === 0 ? 2 : 0
      return (
        seat(id) +
        ' ' +
        s.picks[id].map((i) => face(s.cards[i])).join(' ') +
        ' ' +
        families[hands[id].family] +
        ' / 상대 ' +
        seat(s.rivals[id]) +
        ' ' +
        (diff > 0 ? '승' : diff < 0 ? '패' : '무')
      )
    })
    nextMission(s, '공유 ' + s.shared.map(face).join(' ') + ' · ' + records.join('　'))
  }
  const submit = (s, id, key) => {
    s.pending[id] = key
    return everyone(s)
  }
  function choiceView(s, id) {
    if (pending(s, id)) return waiting(s)
    const title = mission[s.round] + ' · '
    if (s.phase === 'vote')
      return view(title + choices[s.round][2], [
        choice('A', choices[s.round][0]),
        choice('B', choices[s.round][1]),
      ])
    if (s.phase === 'answer') {
      const cubic = s.round === 0
      const clue = cubic
        ? '각 기둥의 돌을 모두 더하세요.'
        : '숫자 합이 ' +
          s.target +
          '인 직사각형은 몇 개일까요?' +
          (s.votes[id] === 'A' ? ' 팀 단서 · 한 줄 정답 ' + s.rowHint + '개.' : '')
      return view(
        title + clue,
        s.answers.map((n) => choice(String(n), n + '개')),
        grid(cubic ? 3 : 4, cubic ? s.cubes.map((n) => '▧'.repeat(n)) : s.matrix),
      )
    }
    if (s.phase === 'turf') {
      const p = s.order[s.turn],
        free = blanks(s)
      const active = s.first >= 0 ? adjacent(s, s.first) : free
      const art = grid(
        s.side,
        s.cells.map((v, i) => (i === s.first ? '◆' : v === '.' ? '·' : v)),
      )
      return view(
        title +
          seat(p) +
          ' 차례 · 번호가 작은 칸부터 왼쪽에서 오른쪽으로 셉니다. 인접한 두 칸을 이어 +1, 보너스(+) 칸마다 +1.',
        p !== id
          ? []
          : active
              .map((i) => choice('t' + i, i + 1 + '번 ' + (s.cells[i] === '+' ? '✦' : '칸')))
              .concat(s.first >= 0 ? [choice('cancel', '다시 고르기')] : []),
        art,
      )
    }
    if (s.phase === 'nominate')
      return view(
        title + '내 패와 겨룰 상대를 고르세요.',
        s.ids.filter((p) => id !== p).map((p) => choice('n' + p, seat(p) + ' · ' + s.points[p] + '점')),
      )
    if (s.phase === 'memory')
      return view(
        title +
          '상대 ' +
          seat(s.rivals[id]) +
          ' · 16장의 숫자, 무늬, 위치를 기억하세요. 모두 덮은 후 공유패가 열립니다.',
        [choice('cover', '외웠습니다 · 카드 덮기')],
        grid(
          4,
          s.cards.map((v, i) => i + 1 + '. ' + face(v)),
        ),
      )
    const picks = s.picks[id]
    return view(
      title +
        '공유 ' +
        s.shared.map(face).join(' ') +
        ' · 골라둔 자리 ' +
        (picks.map((i) => i + 1).join(', ') || '없음'),
      indices(16)
        .filter((i) => picks.includes(i) || picks.length < 2)
        .map((i) => choice('p' + i, (picks.includes(i) ? '✓ ' : '') + (i + 1) + '번'))
        .concat(picks.length === 2 ? [choice('seal', '두 장 확정')] : []),
      grid(
        4,
        indices(16).map((i) => (picks.includes(i) ? '◆ ' + (i + 1) : i + 1)),
      ),
    )
  }
  function updateChoice(s, id, key) {
    if (s.phase === 'vote') {
      if (submit(s, id, key)) processVotes(s)
      return
    }
    if (s.phase === 'answer') {
      if (submit(s, id, key)) answerChoice(s)
      return
    }
    if (s.phase === 'turf') {
      if (key === 'cancel') {
        s.first = -1
        return
      }
      const i = Number(key.slice(1))
      if (s.first === -1) {
        s.first = i
        return
      }
      const pts = 1 + Number(s.cells[i] === '+') + Number(s.cells[s.first] === '+')
      s.cells[i] = s.cells[s.first] = seat(id)
      s.first = -1
      s.points[id] += pts
      s.turn++
      s.log = seat(id) + ' 잔디 +' + pts
      if (s.turn === s.order.length || !blanks(s).length)
        nextMission(s, '잔디 배치 마감 · ' + ranking(s))
      return
    }
    if (s.phase === 'nominate') {
      s.rivals[id] = Number(key.slice(1))
      if (submit(s, id, key)) {
        s.pending = {}
        s.phase = 'memory'
      }
      return
    }
    if (s.phase === 'memory') {
      if (submit(s, id, key)) {
        s.pending = {}
        s.phase = 'poker'
      }
      return
    }
    if (key === 'seal') {
      if (submit(s, id, key)) resolvePoker(s)
      return
    }
    const pos = Number(key.slice(1)),
      picked = s.picks[id],
      i = picked.indexOf(pos)
    if (i >= 0) picked.splice(i, 1)
    else picked.push(pos)
  }
  function choiceBot(s, id, v) {
    if (s.phase === 'turf') {
      const options = v.options.filter((o) => o.key !== 'cancel')
      return (options.find((o) => o.label.includes('✦')) || options[random(options.length)]).key
    }
    if (s.phase === 'poker') {
      if (s.picks[id].length === 2) return 'seal'
      const memory = s.recall[id]
      let best = [],
        value = -1
      for (let a = 0; a < memory.length; a++)
        for (let b = a + 1; b < memory.length; b++) {
          const pair = [memory[a], memory[b]],
            rank = hand(s.shared.concat(pair.map((i) => s.cards[i]))).value
          if (rank > value) {
            value = rank
            best = pair
          }
        }
      return 'p' + best.find((i) => !s.picks[id].includes(i))
    }
    if (s.phase === 'answer' && Math.random() < 0.62) {
      if (s.round === 0) return String(total(s.cubes))
      // A bot sometimes counts only narrow rectangles; on a good read it scans the public grid.
      let hits = 0
      for (let y = 0; y < 3; y++)
        for (let x = 0; x < 4; x++)
          for (let h = 1; y + h <= 3; h++)
            for (let w = 1; x + w <= 4; w++) {
              let t = 0
              for (let dy = 0; dy < h; dy++)
                for (let dx = 0; dx < w; dx++) t += s.matrix[(y + dy) * 4 + x + dx]
              if (t === s.target) hits++
            }
      return String(hits)
    }
    return v.options[random(v.options.length)].key
  }
  boards.choice = expose(
    '양자택일',
    '네 번 비밀 투표하고 큐브 세기, 네모 세기, 잔디 깔기, 기억 포커를 함께 플레이합니다. 가장 높은 누적 승점이 승리합니다.',
    setupChoice,
    choiceView,
    updateChoice,
    choiceBot,
  )

  const stones = ['홍옥', '비취', '남옥']
  function heavyStart(s) {
    s.hands = record(s.ids, () => indices(7))
    s.chips = record(s.ids, () => [2, 2, 2, 1])
    s.piles = [[], [], []]
    s.selected = {}
    s.moves = {}
    s.phase = 'choose'
    return s
  }
  const heavyOrder = (s) =>
    s.ids.slice().sort((a, b) => {
      const base = s.round % s.ids.length
      return (
        Number(s.moves[b].wild) - Number(s.moves[a].wild) ||
        s.moves[b].n - s.moves[a].n ||
        ((s.ids.indexOf(a) - base + s.ids.length) % s.ids.length) -
          ((s.ids.indexOf(b) - base + s.ids.length) % s.ids.length)
      )
    })
  function heavyView(s, id) {
    const art = grid(
      3,
      s.piles.map(
        (p, i) => stones[i] + ' ' + total(p) + '/13 · ' + (p.length ? p.join('+') : '빈 자리'),
      ),
    )
    if (pending(s, id)) return { ...waiting(s), art }
    const intro = s.round + 1 + '/7라운드 · '
    if (s.phase === 'reveal') {
      const msg = heavyOrder(s)
        .map(
          (p) =>
            seat(p) + ' ' + (s.moves[p].wild ? '◇' : '') + stones[s.moves[p].t] + ' ' + s.moves[p].n,
        )
        .join(' → ')
      return view(
        intro + msg + ' · 미룬 사람들은 역순으로 나중에 배치됩니다.',
        [choice('now', '지금 놓기'), choice('later', '뒤로 미루기')],
        art,
      )
    }
    if (!Object.hasOwn(s.selected, id))
      return view(
        intro + '손에 든 돌 하나를 고르세요.',
        s.hands[id].map((n) => choice('s' + n, n + ' 돌')),
        art,
      )
    const opts = []
    stones.forEach((v, i) => {
      if (s.chips[id][i]) opts.push(choice('t' + i, v + ' 인장 ×' + s.chips[id][i]))
      if (s.chips[id][3]) opts.push(choice('w' + i, '◇ 우선권 → ' + v))
    })
    return view(
      intro + '선택한 돌 ' + s.selected[id] + ' · 인장을 골라 제출하세요.',
      opts.concat(choice('back', '돌 다시 고르기')),
      art,
    )
  }
  function heavyAct(s, id, key) {
    if (s.phase === 'choose') {
      if (key === 'back') {
        delete s.selected[id]
        return
      }
      if (key[0] === 's') {
        s.selected[id] = Number(key.slice(1))
        return
      }
      s.moves[id] = { n: s.selected[id], t: Number(key.slice(1)), wild: key[0] === 'w' }
      if (submit(s, id, key)) {
        s.pending = {}
        s.phase = 'reveal'
      }
      return
    }
    if (!submit(s, id, key)) return
    const order = heavyOrder(s),
      now = order.filter((p) => s.pending[p] === 'now'),
      later = order.filter((p) => s.pending[p] === 'later').reverse(),
      events = []
    now.concat(later).forEach((p) => {
      const { n, t, wild } = s.moves[p],
        pile = s.piles[t]
      let lose = 0
      if (total(pile) + n >= 13) {
        lose = pile.length
        s.points[p] -= lose
        pile.length = 0
      }
      pile.push(n)
      s.hands[p].splice(s.hands[p].indexOf(n), 1)
      s.chips[p][wild ? 3 : t]--
      if (lose) events.push(seat(p) + ' −' + lose)
    })
    s.log = s.round + 1 + '회 배치 · ' + (events.join(' / ') || '전원 무벌점')
    s.round++
    s.pending = {}
    s.selected = {}
    s.moves = {}
    s.phase = 'choose'
    if (s.round === 7) s.done = true
  }
  function heavyBot(s, id, v) {
    if (s.phase === 'reveal')
      return total(s.piles[s.moves[id].t]) + s.moves[id].n >= 13 ? 'later' : 'now'
    if (!Object.hasOwn(s.selected, id)) return v.options[random(v.options.length)].key
    const n = s.selected[id]
    const good = v.options
      .filter((o) => o.key !== 'back')
      .map((o) => {
        const i = Number(o.key.slice(1)),
          sum = total(s.piles[i]) + n
        return [
          o.key,
          (sum >= 13 ? -s.piles[i].length * 2 : sum * 0.1) +
            (o.key[0] === 'w' ? -0.6 : 0) +
            Math.random() * 2,
        ]
      })
    return good.sort((a, b) => b[1] - a[1])[0][0]
  }
  boards.heavy = expose(
    '무거운 13',
    '같은 받침대 세 곳에 0~6 돌을 한 번씩 놓습니다. 우선권 인장, 큰 숫자 순으로 배치합니다. 합계가 13 이상이면 기존 돌 개수만큼 벌점을 받고 그 돌들을 치웁니다. 7회 후 벌점이 적은 사람이 이깁니다.',
    heavyStart,
    heavyView,
    heavyAct,
    heavyBot,
  )

  const stocks = ['유리공방', '은하전력', '철새우편']
  const rules = ['순매수 양수 +4, 음수 −2', '이웃 종목의 직전 상승 +3, 하락 −2', '햇빛 +3, 달빛 −2']
  const hint = ['순매수에 반응', '이웃 시세에 반응', '장 표식에 반응']
  const wealth = (s, id) => s.cash[id] + total(s.hold[id].map((n, i) => n * s.prices[i]))
  function marketStart(s) {
    s.rules = shuffle(indices(3))
    s.cash = record(s.ids, () => 28)
    s.hold = record(s.ids, () => [1, 1, 1])
    s.prices = [8, 8, 8]
    s.hist = [s.prices.slice()]
    s.flow = [0, 0, 0]
    s.sun = random(2) === 0
    s.points = record(s.ids, (id) => wealth(s, id))
    return s
  }
  function marketView(s, id) {
    const art = grid(
      3,
      stocks.map((n, i) => n + ' ' + s.prices[i] + ' · 순매수 ' + s.flow[i]),
    )
    if (pending(s, id)) return { ...waiting(s), art }
    const report = stocks
      .map(
        (n, i) =>
          n +
          ' ' +
          s.hold[id][i] +
          '주 · ' +
          (s.round >= 5 ? rules[s.rules[i]] : s.round >= 2 ? hint[s.rules[i]] : '규칙 미공개'),
      )
      .join(' / ')
    const opts = [choice('hold', '보유 · 마감')]
    stocks.forEach((n, i) => {
      if (s.cash[id] >= s.prices[i]) opts.push(choice('b' + i, n + ' 매수'))
      if (s.hold[id][i]) opts.push(choice('s' + i, n + ' 매도'))
    })
    return view(
      s.round +
        1 +
        '/8장 ' +
        (s.sun ? '☀ 햇빛' : '☾ 달빛') +
        ' · 현금 ' +
        s.cash[id] +
        ' · 내 자산 ' +
        wealth(s, id) +
        '\n' +
        report +
        '\n시세 기록 ' +
        s.hist.map((p) => p.join('/')).join(' → '),
      opts,
      art,
    )
  }
  function marketAct(s, id, key) {
    if (!submit(s, id, key)) return
    const flow = [0, 0, 0],
      old = s.prices.slice(),
      past = s.hist.at(-2) || old
    for (const p of s.ids) {
      const order = s.pending[p]
      if (order === 'hold') continue
      const i = Number(order.slice(1)),
        q = order[0] === 'b' ? 1 : -1
      s.cash[p] -= old[i] * q
      s.hold[p][i] += q
      flow[i] += q
    }
    s.prices = old.map((v, i) => {
      const next = (i + 1) % 3
      const signal = [Math.sign(flow[i]), Math.sign(old[next] - past[next]), s.sun ? 1 : -1][s.rules[i]]
      return Math.max(2, v + (signal > 0 ? (s.rules[i] === 0 ? 4 : 3) : signal < 0 ? -2 : 0))
    })
    s.flow = flow
    s.hist.push(s.prices.slice())
    s.ids.forEach((p) => (s.points[p] = wealth(s, p)))
    s.log =
      s.round + 1 + '장 마감 · ' + stocks.map((n, i) => n + ' ' + old[i] + '→' + s.prices[i]).join(' / ')
    s.round++
    s.pending = {}
    if (s.round === 8) s.done = true
    else s.sun = random(2) === 0
  }
  function marketBot(s, id, v) {
    const prev = s.hist.at(-2) || s.prices
    const score = (k) => {
      if (k === 'hold') return Math.random()
      const i = Number(k[1]),
        next = (i + 1) % 3,
        latest = s.prices[i] - prev[i]
      const signal =
        s.round < 2
          ? Math.sign(latest) * 0.4
          : s.rules[i] === 1
            ? Math.sign(s.prices[next] - prev[next])
            : s.rules[i] === 2
              ? s.sun
                ? 1
                : -1
              : 0.2
      return signal * (k[0] === 'b' ? 1 : -1) + Math.random() * 1.8
    }
    return v.options.map((o) => [o.key, score(o.key)]).sort((a, b) => b[1] - a[1])[0][0]
  }
  boards.exchange = expose(
    '미스터리 거래소',
    '모두 같은 장에 주문합니다. 세 종목은 수급, 이웃 종목, 날씨 중 서로 다른 규칙으로 움직입니다. 8장 후 총자산이 가장 큰 사람이 이깁니다.',
    marketStart,
    marketView,
    marketAct,
    marketBot,
  )

  const sigils = ['해', '별', '탑', '달', '잎', '물']
  const mod = (x) => (x + 6) % 6
  function dialStart(s) {
    s.secret = random(6)
    s.labels = shuffle(sigils)
    s.paid = {}
    const neighbor = mod(s.secret + (random(2) ? 1 : -1))
    s.candidates = [mod(neighbor - 1), mod(neighbor + 1)]
    s.hint =
      '봉인의 양옆 중 한 자리에 ' +
      s.labels[neighbor] +
      '. 봉인은 ' +
      (s.secret % 2 ? '홀수' : '짝수') +
      ' 방위.'
    return s
  }
  function dialView(s, id) {
    if (pending(s, id)) return waiting(s)
    const opts = indices(6).map((i) => choice('d' + i, i + '번 ' + s.labels[i]))
    if (!s.paid[id]) opts.push(choice('peek', '추가 단서 열기'))
    return view(
      s.round +
        1 +
        '/4 원판 · ' +
        s.hint +
        (s.paid[id] ? ' 내 열람 · 정반대에 ' + s.labels[mod(s.secret + 3)] : '') +
        '\n나만 적중하면 추가 +2. 모두 같은 봉인을 풉니다.',
      opts,
      grid(
        3,
        s.labels.map((n, i) => i + ' · ' + n),
      ),
    )
  }
  function dialAct(s, id, key) {
    if (key === 'peek') {
      s.paid[id] = true
      return
    }
    if (!submit(s, id, Number(key.slice(1)))) return
    const winners = s.ids.filter((p) => s.pending[p] === s.secret)
    s.ids.forEach(
      (p) =>
        (s.points[p] += winners.includes(p) ? (s.paid[p] ? 3 : 5) + (winners.length === 1 ? 2 : 0) : -2),
    )
    s.log =
      s.round +
      1 +
      '번 봉인 · ' +
      s.secret +
      ' ' +
      s.labels[s.secret] +
      ' · 적중 ' +
      (winners.map(seat).join(', ') || '없음')
    s.round++
    s.pending = {}
    if (s.round === 4) s.done = true
    else dialStart(s)
  }
  boards.dial = expose(
    '러시안 룰렛 · 봉인 원판',
    '여섯 방위를 가진 봉인에서 같은 단서를 읽고 정답을 숨겨 제출합니다. 적중 +5, 오답 −2. 추가 단서를 열면 적중은 +3. 혼자만 성공하면 +2입니다. 네 판 누적 점수로 승부합니다.',
    dialStart,
    dialView,
    dialAct,
    (s, id) => {
      if (s.paid[id]) return 'd' + s.secret
      return Math.random() < 0.44 ? 'peek' : 'd' + s.candidates[random(2)]
    },
  )
})()
