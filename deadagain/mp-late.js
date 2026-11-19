/* Room games keep the authoritative state on the host; only view() is sent to a seat. */
;(() => {
  'use strict'
  const boards = window.RoomBoards || (window.RoomBoards = {})
  const seq = (n) => Array.from({ length: n }, (_, i) => i)
  const pick = (a) => a[Math.floor(Math.random() * a.length)]
  function shuffle(a) {
    const out = a.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  const sum = (a) => a.reduce((v, n) => v + n, 0)
  const opt = (key, label) => ({ key: String(key), label })
  const screen = (text, options = [], art) => (art ? { text, options, art } : { text, options })
  const wait = (t) => screen(t + '\n다른 참가자 차례입니다.')
  const grid = (cols, cells) => ({ kind: 'grid', cols, cells })
  const obj = (ids, make) => Object.fromEntries(ids.map((id, i) => [id, make(i)]))
  const who = (id) => id + 1 + '번'
  const next = (s, id) => s.ids[(s.ids.indexOf(id) + 1) % s.ids.length]
  const list = (s, fn) => s.ids.map((id) => who(id) + ' ' + fn(id)).join(' · ')
  const base = (ids) => ({ ids: ids.slice(), points: obj(ids, () => 0), done: false, log: '' })
  function register(key, game) {
    boards[key] = {
      ...game,
      view(s, id) {
        if (!s.ids.includes(id)) return screen('관전 중입니다.')
        return game.view(s, id)
      },
      act(s, id, k) {
        if (s.done || !s.ids.includes(id) || typeof k !== 'string') return false
        if (!game.view(s, id).options.some((o) => o.key === k)) return false
        game.move(s, id, k)
        return true
      },
      bot(s, id) {
        if (s.done || !s.ids.includes(id)) return null
        const options = game.view(s, id).options
        if (!options.length) return null
        return game.choose ? game.choose(s, id, options) : pick(options).key
      },
    }
    delete boards[key].move
    delete boards[key].choose
  }

  const gemType = ['다이아', '금', '은', '동', '폭탄']
  const gems = [
    [0, 5],
    [0, 6],
    [1, 4],
    [1, 5],
    [2, 2],
    [2, 3],
    [2, 4],
    [3, 1],
    [3, 1],
    [3, 2],
    [3, 2],
    [4, -6],
    [4, -4],
  ]
  const cardName = (c) => gemType[gems[c][0]] + ' ' + gems[c][1]
  function gemLabel(s, slot) {
    return slot < s.ids.length
      ? who(s.ids[slot])
      : slot === s.ids.length + 3
        ? '폐기함'
        : '구매자 ' + (slot - s.ids.length + 1)
  }
  function deal(s) {
    s.phase = 'swap'
    s.slots = shuffle(seq(13)).slice(0, s.ids.length + 4)
    s.mem = obj(s.ids, () => s.slots.map(() => null))
    const order = seq(s.ids.length).map((i) => s.ids[(i + s.ids.indexOf(s.first)) % s.ids.length])
    s.order = order.concat(order.slice().reverse())
    s.turn = 0
    s.mem[s.order[0]][s.ids.indexOf(s.order[0])] = s.slots[s.ids.indexOf(s.order[0])]
  }
  function marketScore(s) {
    const n = s.ids.length,
      buy = s.slots.slice(n, n + 3).map((c) => gems[c][0])
    const round = s.ids.map((id, i) => {
      const [t, v] = gems[s.slots[i]],
        p = t === 4 ? v : v * buy.filter((b) => b === t).length
      if (t === 0 && p > 0) s.pieces[id]++
      s.points[id] += p
      return who(id) + ' ' + cardName(s.slots[i]) + ' (' + (p > 0 ? '+' : '') + p + ')'
    })
    s.log =
      s.round +
      '회 정산 · 구매자 ' +
      s.slots
        .slice(n, n + 3)
        .map(cardName)
        .join(' / ') +
      '\n' +
      round.join(' · ')
    const bomb = [11, 12].map((c) => s.slots.indexOf(c)).find((i) => i >= 0 && i < n)
    if (bomb !== undefined) s.first = s.ids[bomb]
    if (s.round === 3) {
      s.done = true
      if (n > 2) {
        const raw = { ...s.points }
        s.ids.forEach((id) => {
          s.points[id] = raw[id] * raw[s.partner[id]]
        })
        s.log +=
          '\n마니또 공개 · ' +
          s.ids.map((id) => who(id) + ' × ' + who(s.partner[id]) + ' = ' + s.points[id]).join(' · ')
      }
      return
    }
    s.phase = 'summary'
    s.ready = {}
  }
  register('gems', {
    name: '보석 암시장',
    rule: '3회 동안 정순·역순으로 한 장씩 교환합니다. 구매자와 같은 보석은 값×일치 수, 폭탄은 감점입니다. 상대가 내 폭탄을 가져가면 나는 +3점. 3인 이상은 마지막에 내 점수와 비밀 마니또 점수를 곱하고 2인은 개인 점수로 겨룹니다. 적은 인원에서는 남는 카드를 봉인합니다. 선 경매는 3피스씩 시작하며 3차 동률이면 추첨합니다.',
    start(ids) {
      const chain = shuffle(ids)
      return {
        ...base(ids),
        phase: 'auction',
        round: 1,
        bidders: ids.slice(),
        bids: {},
        auction: 1,
        first: ids[0],
        pieces: obj(ids, () => 3),
        peek: obj(ids, () => true),
        partner: Object.fromEntries(chain.map((id, i) => [id, chain[(i + 1) % ids.length]])),
        log: '선 플레이어는 첫 교환과 마지막 교환을 모두 합니다.',
      }
    },
    view(s, id) {
      if (s.done) return screen(s.log + '\n최종 점수 · ' + list(s, (i) => s.points[i]))
      const n = s.ids.length,
        header = '제' + s.round + '회 · 보유 ' + s.pieces[id] + '피스 · 내 승점 ' + s.points[id]
      if (s.phase === 'auction') {
        const text = header + '\n' + s.auction + '차 선 경매 · ' + s.log
        return s.bidders.includes(id) && s.bids[id] === undefined
          ? screen(
              text,
              seq(s.pieces[id] + 1).map((v) => opt('b' + v, v + '피스 봉인 입찰')),
            )
          : wait(text)
      }
      if (s.phase === 'summary')
        return screen(s.log, s.ready[id] ? [] : [opt('ready', '다음 라운드 준비')])
      const owner = s.ids.indexOf(id),
        me = s.order[s.turn] === id,
        mem = s.mem[id],
        visible = (i) => (mem[i] === null ? '◇ 비공개' : cardName(mem[i]))
      let t =
        header +
        '\n' +
        s.log +
        '\n이번 차례 ' +
        who(s.order[s.turn]) +
        ' · ' +
        (s.turn < n ? '정순' : '역순') +
        '\n' +
        (n > 2 ? '내 점수가 곱해지는 사람 ' + who(s.ids.find((i) => s.partner[i] === id)) + ' · ' : '') +
        '마지막으로 추적한 내 패 ' +
        visible(owner)
      const cells = s.slots.map((_, i) => gemLabel(s, i) + ' ' + visible(i))
      if (!me) return screen(t, [], grid(3, cells))
      const bomb = gems[s.slots[owner]][0] === 4
      const options = seq(bomb ? n : s.slots.length)
        .filter((i) => i !== owner)
        .map((i) => opt('x' + i, gemLabel(s, i) + ' 교환'))
      if (s.peek[id] && s.pieces[id] > 0)
        for (let i = n; i < n + 4; i++)
          options.push(opt('p' + i, '1피스 · ' + gemLabel(s, i) + ' 엿보기'))
      return screen(t, options, grid(3, cells))
    },
    move(s, id, k) {
      if (s.phase === 'auction') {
        s.bids[id] = +k.slice(1)
        if (!s.bidders.every((i) => s.bids[i] !== undefined)) return
        const high = Math.max(...Object.values(s.bids)),
          tied = s.bidders.filter((i) => s.bids[i] === high)
        s.bids = {}
        if (tied.length > 1 && s.auction < 3) {
          s.auction++
          s.bidders = tied
          s.log = high + '피스 동률 · ' + tied.map(who).join(', ') + ' 재입찰'
          return
        }
        s.first = pick(tied)
        s.pieces[s.first] -= high
        s.log = who(s.first) + ' 선 낙찰 · ' + high + '피스'
        deal(s)
        return
      }
      if (s.phase === 'summary') {
        s.ready[id] = true
        if (s.ids.every((i) => s.ready[i])) {
          s.round++
          deal(s)
        }
        return
      }
      const from = s.ids.indexOf(id),
        to = +k.slice(1),
        mem = s.mem[id]
      if (k[0] === 'p') {
        s.peek[id] = false
        s.pieces[id]--
        mem[to] = s.slots[to]
        return
      }
      const a = s.slots[from],
        b = s.slots[to]
      if (to < s.ids.length && gems[b][0] === 4) s.points[s.ids[to]] += 3
      ;[s.slots[from], s.slots[to]] = [b, a]
      Object.values(s.mem).forEach((m) => {
        ;[m[from], m[to]] = [m[to], m[from]]
      })
      mem[from] = b
      mem[to] = a
      s.log = who(id) + ' ↔ ' + gemLabel(s, to) + ' 교환'
      s.turn++
      if (s.turn === s.order.length) {
        marketScore(s)
        return
      }
      const upcoming = s.order[s.turn],
        slot = s.ids.indexOf(upcoming)
      s.mem[upcoming][slot] = s.slots[slot]
    },
    choose(s, id, opts) {
      if (s.phase === 'swap') {
        const peek = opts.filter((o) => o.key[0] === 'p')
        if (peek.length && Math.random() < 0.13) return pick(peek).key
        return opts
          .filter((o) => o.key[0] === 'x')
          .map((o) => {
            const known = s.mem[id][+o.key.slice(1)]
            return [o.key, known === null ? 2 + Math.random() * 2 : gems[known][1] + Math.random()]
          })
          .sort((a, b) => b[1] - a[1])[0][0]
      }
      return pick(opts).key
    },
  })

  const banks = ['자개', '청자', '유리', '황동'],
    coinColor = ['흑', '백']
  function pigNext(s) {
    s.turn++
    if (s.turn === s.limit) {
      s.done = true
      return
    }
    s.actor = s.ids[s.turn % s.ids.length]
    s.phase = 'bank'
    s.bank = null
    s.deposit = null
  }
  register('pig', {
    name: '돼지 저금통',
    rule: '네 저금통은 흑·백 1개씩으로 시작합니다. 내 차례에는 저금통·입금 조합·받을 사람을 고릅니다. 수신자가 동전 수를 말하면 발신자는 인정하거나 의심합니다. 인정하면 수신자 +1. 의심 성공은 발신자 +1과 수신자 −1, 실패는 발신자 −1. 개봉한 통은 초기화합니다. 각자 두 번 보내는 방 대전입니다.',
    start(ids) {
      return {
        ...base(ids),
        phase: 'bank',
        turn: 0,
        limit: ids.length * 2,
        actor: ids[0],
        pots: banks.map(() => [1, 1]),
        log: '각 저금통에는 흑과 백 동전이 1개씩 있습니다.',
      }
    },
    view(s, id) {
      if (s.done) return screen(s.log + '\n최종 · ' + list(s, (i) => s.points[i] + '점'))
      const t = s.turn + 1 + ' / ' + s.limit + '회 · 발신자 ' + who(s.actor) + '\n' + s.log,
        cells = banks.map((b, i) => b + ' 저금통' + (s.bank === i ? ' ◉' : ''))
      let opts = []
      if (s.phase === 'bank' && id === s.actor) opts = banks.map((n, i) => opt('b' + i, n + ' 선택'))
      if (s.phase === 'deposit' && id === s.actor)
        opts = [
          [1, 0],
          [0, 2],
          [2, 1],
          [1, 3],
          [3, 2],
        ].map(([b, w]) => opt('d' + b + w, '흑 ' + b + ' · 백 ' + w + ' 넣기'))
      if (s.phase === 'send' && id === s.actor)
        opts = s.ids.filter((i) => i !== id).map((i) => opt('s' + i, who(i) + '에게 전달'))
      if (s.phase === 'declare' && id === s.receiver)
        opts = [opt('less', '−1개'), opt('more', '+1개'), opt('seal', s.guess + '개로 선언')]
      if (s.phase === 'check' && id === s.actor)
        opts = [opt('trust', '인정'), opt('doubt', '의심 · 개봉')]
      return screen(
        t +
          (s.phase === 'declare'
            ? '\n' +
              who(s.receiver) +
              ' · ' +
              banks[s.bank] +
              '의 ' +
              coinColor[s.turn % 2] +
              ' 동전 수를 선언하세요.' +
              (id === s.receiver ? ' 현재 ' + s.guess + '개' : '')
            : '') +
          (s.phase === 'check'
            ? '\n' + who(s.receiver) + '의 선언 · ' + coinColor[s.turn % 2] + ' ' + s.guess + '개.'
            : '') +
          '\n' +
          list(s, (i) => s.points[i] + '점'),
        opts,
        grid(2, cells),
      )
    },
    move(s, id, k) {
      if (s.phase === 'bank') {
        s.bank = +k.slice(1)
        s.phase = 'deposit'
        return
      }
      if (s.phase === 'deposit') {
        const [b, w] = k.slice(1).split('').map(Number)
        s.pots[s.bank][0] += b
        s.pots[s.bank][1] += w
        s.log = banks[s.bank] + '에 흑 ' + b + '개, 백 ' + w + '개 입금.'
        s.phase = 'send'
        return
      }
      if (s.phase === 'send') {
        s.receiver = +k.slice(1)
        s.phase = 'declare'
        s.guess = 1
        return
      }
      if (s.phase === 'declare') {
        if (k === 'less') s.guess = Math.max(0, s.guess - 1)
        else if (k === 'more') s.guess = Math.min(1 + 5 * s.limit, s.guess + 1)
        else s.phase = 'check'
        return
      }
      if (k === 'trust') {
        s.points[s.receiver]++
        s.log = who(s.actor) + ' 인정 · ' + who(s.receiver) + ' +1점.'
      } else {
        const truth = s.pots[s.bank][s.turn % 2],
          caught = truth !== s.guess
        s.points[s.actor] += caught ? 1 : -1
        if (caught) s.points[s.receiver]--
        s.log =
          banks[s.bank] +
          ' 개봉 · 실제 ' +
          truth +
          '개, 선언 ' +
          s.guess +
          '개. ' +
          (caught ? '의심 성공.' : '의심 실패.') +
          ' 이 통에 흑·백 1개씩을 다시 넣었습니다.'
        s.pots[s.bank] = [1, 1]
      }
      pigNext(s)
    },
    choose(s, id, opts) {
      if (s.phase === 'declare') {
        const target = s.pots[s.bank][s.turn % 2]
        if (s.guess < target && (Math.random() > 0.16 || s.guess === 1)) return 'more'
        return 'seal'
      }
      if (s.phase === 'check') {
        return Math.random() < 0.75
          ? s.guess === s.pots[s.bank][s.turn % 2]
            ? 'trust'
            : 'doubt'
          : pick(opts).key
      }
      return pick(opts).key
    },
  })

  const shapes = ['● 원', '▲ 세모', '★ 별'],
    pattern = [0, 1, 2, 2, 0, 1, 1, 2, 0]
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]
  function arrange(available) {
    let best = { mask: 0, lines: 0, cells: 0 }
    for (let mask = 1; mask < 512; mask++) {
      const used = [0, 0, 0]
      for (let i = 0; i < 9; i++) if (mask & (1 << i)) used[pattern[i]]++
      if (used.some((v, i) => v > available[i])) continue
      const lines = wins.filter((line) => line.every((i) => mask & (1 << i))).length,
        cells = sum(used)
      if (lines > best.lines || (lines === best.lines && cells > best.cells))
        best = { mask, lines, cells }
    }
    return best
  }
  function auctionActive(s) {
    return s.ids.filter((i) => !s.out.includes(i))
  }
  function showTickets(s) {
    return shapes
      .map(
        (t, k) =>
          t +
          ' · ' +
          auctionActive(s)
            .filter((i) => s.picks[i] === k)
            .map(who)
            .join(', '),
      )
      .join('\n')
  }
  function closeBingo(s) {
    s.done = true
    s.result = {}
    for (const id of s.ids) {
      const a = arrange(s.gains[id])
      s.result[id] = a
      s.points[id] = s.out.includes(id) ? -1 : a.lines * 1000 + a.cells * 20 + s.purses[id].length
    }
    s.log +=
      '\n최종 공개 · ' +
      list(s, (id) =>
        s.out.includes(id)
          ? '입찰 불가'
          : s.result[id].lines + '줄 ' + s.result[id].cells + '칸, 동전 ' + s.purses[id].length + '개',
      )
  }
  function nextBingo(s) {
    s.round++
    s.phase = 'ticket'
    s.picks = {}
    s.bids = {}
    s.selected = obj(s.ids, () => [])
    s.ready = {}
    s.ids.forEach((i) => {
      if (!s.purses[i].length && !s.out.includes(i)) s.out.push(i)
    })
    if (!auctionActive(s).length) closeBingo(s)
  }
  register('bingo', {
    name: '경매 빙고',
    rule: '네임 티켓 7장, 1·1·1·2·2·2·3·3·5·10원 동전으로 시작합니다. 도형을 동시에 고르고, 인원이 공개되면 비밀 입찰합니다. 1등이 참가자 수만큼 도형을 얻으며 공동 1등이면 나머지는 버리고 나눕니다. 최고 낙찰가는 비밀, 얻은 도형은 7회 후 공개. 입찰 불가는 최하위이며 완성 줄→칸→남은 동전 개수로 겨룹니다.',
    start(ids) {
      return {
        ...base(ids),
        phase: 'ticket',
        round: 1,
        purses: obj(ids, () => [1, 1, 1, 2, 2, 2, 3, 3, 5, 10]),
        gains: obj(ids, () => [0, 0, 0]),
        tickets: obj(ids, () => 7),
        picks: {},
        bids: {},
        ready: {},
        selected: obj(ids, () => []),
        out: [],
        log: '도형 티켓을 제출하세요.',
        history: [],
      }
    },
    view(s, id) {
      const a = s.done ? s.result[id] : null,
        art = grid(
          3,
          pattern.map((t, i) => (a && a.mask & (1 << i) ? '✓ ' : '') + shapes[t]),
        )
      if (s.done)
        return screen(
          s.log + '\n내 획득 · ' + shapes.map((v, i) => v + ' ' + s.gains[id][i] + '개').join(' · '),
          [],
          art,
        )
      let text =
        s.round +
        ' / 7회 · 네임 티켓 ' +
        s.tickets[id] +
        '장 · 지갑 ' +
        s.purses[id].length +
        '개 (' +
        sum(s.purses[id]) +
        '원)\n' +
        s.log
      const opts = []
      if (s.out.includes(id)) return screen(text + '\n입찰 불가로 관전 중.', [], art)
      if (s.phase === 'ticket' && s.picks[id] === undefined)
        shapes.forEach((v, i) => opts.push(opt('t' + i, v + ' 티켓 제출')))
      if (s.phase === 'bid') {
        text += '\n공개 티켓\n' + showTickets(s) + '\n내 도형 ' + shapes[s.picks[id]]
        if (s.bids[id] === undefined) {
          const sel = s.selected[id]
          s.purses[id].forEach((v, i) =>
            opts.push(opt('c' + i, (sel.includes(i) ? '✓ ' : '') + v + '원')),
          )
          if (sel.length) opts.push(opt('pay', sum(sel.map((i) => s.purses[id][i])) + '원 입찰 확정'))
        } else text += ' · 입찰 완료'
      }
      if (s.phase === 'result' && !s.ready[id]) opts.push(opt('next', '다음 경매 준비'))
      if (s.history.length) text += '\n공개 장부\n' + s.history.join('\n')
      return screen(text, opts, art)
    },
    move(s, id, k) {
      const active = auctionActive(s)
      if (s.phase === 'ticket') {
        s.tickets[id]--
        s.picks[id] = +k.slice(1)
        if (active.every((i) => s.picks[i] !== undefined)) s.phase = 'bid'
        return
      }
      if (s.phase === 'result') {
        s.ready[id] = true
        if (active.every((i) => s.ready[i])) nextBingo(s)
        return
      }
      const chosen = s.selected[id]
      if (k !== 'pay') {
        const i = +k.slice(1)
        s.selected[id] = chosen.includes(i) ? chosen.filter((j) => j !== i) : chosen.concat(i)
        return
      }
      s.bids[id] = sum(chosen.map((i) => s.purses[id][i]))
      s.purses[id] = s.purses[id].filter((_, i) => !chosen.includes(i))
      if (!active.every((i) => s.bids[i] !== undefined)) return
      const prices = shapes.map((_, t) => {
        const ids = active.filter((i) => s.picks[i] === t)
        if (!ids.length) return 0
        const high = Math.max(...ids.map((i) => s.bids[i])),
          w = ids.filter((i) => s.bids[i] === high)
        w.forEach((i) => (s.gains[i][t] += Math.floor(ids.length / w.length)))
        return high
      })
      const top = Math.max(...prices)
      s.history.push(
        s.round +
          '회 ' +
          shapes
            .map((t, i) => t + ' ' + (prices[i] === top ? '비밀' : prices[i] ? prices[i] + '원' : '—'))
            .join(' / '),
      )
      s.log = '입찰 마감. 최고가와 낙찰자 신원은 비밀입니다.'
      s.phase = 'result'
      if (s.round === 7) closeBingo(s)
    },
    choose(s, id, opts) {
      if (s.phase === 'bid') {
        if (s.selected[id].length) return 'pay'
        const rivals = auctionActive(s).filter((i) => s.picks[i] === s.picks[id]).length
        const coins = seq(s.purses[id].length).sort((a, b) => s.purses[id][a] - s.purses[id][b])
        return 'c' + (rivals === 1 ? coins[0] : coins[Math.floor(Math.random() * coins.length)])
      }
      return pick(opts).key
    },
  })

  const delta = [
      [-1, 0],
      [0, 1],
      [1, 0],
      [0, -1],
    ],
    arrows = ['↑ 위', '→ 오른쪽', '↓ 아래', '← 왼쪽']
  const position = (s, i) => 'ABCDEFGHI'[i % s.side] + (Math.floor(i / s.side) + 1)
  function neighbour(s, cell, d) {
    const y = Math.floor(cell / s.side) + delta[d][0],
      x = (cell % s.side) + delta[d][1]
    return y >= 0 && x >= 0 && y < s.side && x < s.side ? y * s.side + x : -1
  }
  const edgeKey = (a, b) => Math.min(a, b) * 100 + Math.max(a, b)
  function open(s, i, d) {
    const b = neighbour(s, i, d)
    return b >= 0 && !s.wallSet[edgeKey(i, b)]
  }
  function paths(s, start, type) {
    const dest = new Set(),
      occupied = s.units
    for (let d = 0; d < 4; d++) {
      const a = neighbour(s, start, d)
      if (!open(s, start, d) || occupied.includes(a)) continue
      dest.add(a)
      const turns = type ? [(d + 1) % 4, (d + 3) % 4] : [d]
      for (const e of turns) {
        const b = neighbour(s, a, e)
        if (open(s, a, e) && !occupied.includes(b)) dest.add(b)
      }
    }
    return [...dest]
  }
  function domains(s) {
    const seen = new Set(),
      scores = obj(s.ids, () => 0),
      largest = obj(s.ids, () => 0)
    let mixed = false
    for (let i = 0; i < s.side * s.side; i++) {
      if (seen.has(i)) continue
      const q = [i],
        owners = new Set()
      seen.add(i)
      for (let j = 0; j < q.length; j++) {
        const u = q[j],
          idx = s.units.indexOf(u)
        if (idx !== -1) owners.add(s.ids[Math.floor(idx / 2)])
        for (let d = 0; d < 4; d++) {
          const v = neighbour(s, u, d)
          if (open(s, u, d) && !seen.has(v)) {
            seen.add(v)
            q.push(v)
          }
        }
      }
      if (owners.size === 1) {
        const id = [...owners][0]
        scores[id] += q.length
        largest[id] = Math.max(largest[id], q.length)
      }
      if (owners.size > 1) mixed = true
    }
    return { scores, largest, mixed }
  }
  function camps(n, side) {
    const last = side - 1,
      ring = []
    for (let x = 0; x < side; x++) ring.push(x)
    for (let y = 1; y < side; y++) ring.push(y * side + last)
    for (let x = last - 1; x >= 0; x--) ring.push(last * side + x)
    for (let y = last - 1; y > 0; y--) ring.push(y * side)
    const cells = []
    for (let i = 0; i < n; i++) {
      const j = Math.floor((ring.length * i) / n)
      cells.push(ring[j], ring[(j + 1) % ring.length])
    }
    return cells
  }
  function wallEndTurn(s) {
    s.turn++
    s.unit = null
    s.dest = null
    const a = domains(s)
    s.points = a.scores
    if (!a.mixed || s.passes >= s.ids.length) {
      s.done = true
      s.log += '\n종료 · ' + list(s, (id) => a.scores[id] + '칸')
    }
  }
  register('wall', {
    name: '벽바둑 II',
    rule: '사각은 직선 1~2칸, 원형은 1칸 또는 직각 2칸 이동합니다. 이동을 마치면 인접한 면에 벽 하나를 놓습니다. 내 말만 들어 있는 연결 구역이 내 영토입니다. 방 인원에 맞춘 5·7·9칸 고정 배치 단판입니다. 전원이 분리되거나 한 바퀴 동안 움직일 수 없으면 독점한 면적을 합산합니다.',
    start(ids) {
      const side = ids.length <= 2 ? 5 : ids.length <= 5 ? 7 : 9
      return {
        ...base(ids),
        side,
        units: camps(ids.length, side),
        wallSet: {},
        unit: null,
        dest: null,
        turn: 0,
        passes: 0,
        log: '사각과 원형 중 움직일 말을 선택하세요.',
      }
    },
    view(s, id) {
      const active = s.ids[s.turn % s.ids.length],
        k = s.ids.indexOf(id) * 2,
        opts = [],
        pathsFor = s.unit === null ? [] : paths(s, s.units[s.unit], s.unit % 2)
      const cells = seq(s.side * s.side).map((i) => {
        const unit = s.units.indexOf(i),
          borders = delta
            .map((_, d) => {
              const j = neighbour(s, i, d)
              return j >= 0 && s.wallSet[edgeKey(i, j)] ? ['↑', '→', '↓', '←'][d] : ''
            })
            .join('')
        return (
          position(s, i) +
          ' ' +
          (unit === -1
            ? active === id && s.dest === null && pathsFor.includes(i)
              ? '·'
              : ''
            : who(s.ids[Math.floor(unit / 2)]) + (unit % 2 ? '●' : '■')) +
          (borders ? ' ⛨' + borders : '')
        )
      })
      const t =
        s.log +
        '\n영역 · ' +
        list(s, (i) => s.points[i] + '칸') +
        '\n' +
        (s.done ? '대국 종료' : who(active) + ' 차례') +
        '　⛨ 화살표는 막힌 면입니다.'
      if (s.done || id !== active) return screen(t, [], grid(s.side, cells))
      if (s.unit === null) {
        for (const u of [k, k + 1])
          if (paths(s, s.units[u], u % 2).length)
            opts.push(opt('u' + u, (u % 2 ? '● 원형' : '■ 사각') + ' ' + position(s, s.units[u])))
        if (!opts.length) opts.push(opt('pass', '이동 불가 · 넘기기'))
      } else if (s.dest === null) {
        pathsFor.forEach((i) => opts.push(opt('m' + i, position(s, i) + ' 이동')))
        opts.push(opt('back', '말 다시 선택'))
      } else {
        for (let d = 0; d < 4; d++)
          if (open(s, s.dest, d)) opts.push(opt('w' + d, position(s, s.dest) + ' ' + arrows[d] + ' 벽'))
        opts.push(opt('back', '이동 다시 선택'))
      }
      return screen(t, opts, grid(s.side, cells))
    },
    move(s, id, k) {
      if (k === 'back') {
        if (s.dest !== null) s.dest = null
        else s.unit = null
        return
      }
      if (k === 'pass') {
        s.passes++
        s.log = who(id) + ' 이동 불가 · 차례 넘김'
        wallEndTurn(s)
        return
      }
      const v = +k.slice(1)
      if (k[0] === 'u') {
        s.unit = v
        return
      }
      if (k[0] === 'm') {
        s.dest = v
        return
      }
      s.units[s.unit] = s.dest
      s.wallSet[edgeKey(s.dest, neighbour(s, s.dest, v))] = true
      s.passes = 0
      s.log = who(id) + ' ' + position(s, s.dest) + ' ' + arrows[v] + ' 벽 설치'
      wallEndTurn(s)
    },
    choose(s, id, opts) {
      const options = opts.filter((o) => o.key !== 'back')
      if (s.dest !== null) {
        let top = -Infinity,
          chosen = null
        for (const o of options) {
          const d = +o.key.slice(1),
            edge = edgeKey(s.dest, neighbour(s, s.dest, d)),
            test = { ...s, units: s.units.slice(), wallSet: { ...s.wallSet, [edge]: true } }
          test.units[s.unit] = s.dest
          const a = domains(test),
            v =
              a.scores[id] -
              Math.max(...s.ids.filter((i) => i !== id).map((i) => a.scores[i])) +
              Math.random() * 1.5
          if (v > top) {
            top = v
            chosen = o.key
          }
        }
        return chosen
      }
      return pick(options).key
    },
  })
})()
