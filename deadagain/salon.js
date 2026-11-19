'use strict'
;(() => {
  const $ = (id) => document.getElementById(id),
    H = window.Hall,
    B = window.RoomBoards,
    esc = (s) =>
      String(s ?? '').replace(
        /[&<>"']/g,
        (k) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[k],
      )
  const MAIN = ['choice', 'exchange', 'gems', 'bingo'],
    PRISON = ['heavy', 'dial', 'pig', 'wall'],
    HOME = ['vault', 'piece', 'fence', 'symmetry'],
    EXILE = ['glyph', 'difference', 'code', 'trial']
  const aliases = ['주홍', '청동', '호박', '자수정', '비취', '산호', '남옥', '석류'],
    ROOM = /^[A-HJ-NP-Z2-9]{5}$/
  const sessionKey = 'da.salon.v1',
    hostKey = 'da.host.v1',
    proto = 'DA-SALON-1',
    prefix = 'huk27-da3-v1-'
  const read = (k) => {
    try {
      return JSON.parse(sessionStorage.getItem(k))
    } catch {
      return null
    }
  }
  function save(k, v) {
    try {
      if (v === null) sessionStorage.removeItem(k)
      else sessionStorage.setItem(k, JSON.stringify(v))
    } catch {}
  }
  const uid = () => crypto.randomUUID(),
    codegen = () =>
      Array.from(
        crypto.getRandomValues(new Uint8Array(5)),
        (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32],
      ).join('')
  let session = null,
    room = null,
    peer = null,
    up = null,
    view = null,
    links = new Map(),
    timer = null,
    retry = null,
    closed = false,
    connected = false,
    pending = false,
    lastPanel = '',
    lastChat = '',
    recipient = null,
    muted = true,
    ac = null,
    lastMatch = '',
    networkTimer = null,
    waitingForAck = null
  const host = () => session?.role === 'host'
  function sound(notes) {
    if (muted) return
    try {
      ac ||= new AudioContext()
      if (ac.state === 'suspended') ac.resume().catch(() => {})
      notes.forEach((hz, i) => {
        let t = ac.currentTime + i * 0.08,
          o = ac.createOscillator(),
          g = ac.createGain()
        o.frequency.value = hz
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.04, t + 0.012)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
        o.connect(g)
        g.connect(ac.destination)
        o.start(t)
        o.stop(t + 0.32)
      })
    } catch {}
  }
  function note(t) {
    $('status').textContent = t
  }
  function entryBusy(on) {
    $('create').disabled = on
    $('join').disabled = on
  }
  function checkpoint() {
    if (host() && room) save(hostKey, room)
  }
  function makeRoom(code, name) {
    const seats = aliases.map((alias, id) => ({
      id,
      name: id === 0 ? name : alias,
      token: id === 0 ? 'host' : null,
      online: id === 0,
      away: 0,
      pos: [...H.lounge[id]],
      points: 0,
      seq: 0,
      emote: null,
      zone: '살롱',
    }))
    return {
      code,
      phase: 'lobby',
      day: 0,
      stage: 0,
      serial: 0,
      seats,
      groups: [],
      history: [],
      messages: [],
      roundLog: '',
      rank: [],
      exiles: [],
    }
  }
  const phaseName = {
    lobby: '대기 살롱',
    brief: '작전 회의',
    match: '메인매치',
    night: '두 개의 방',
    dawn: '새벽 작업대',
    results: '정산',
    finish: '시즌 종료',
  }
  function sys(text) {
    room.messages.push({ name: '딜러', text, at: Date.now(), to: null })
    room.messages = room.messages.slice(-40)
  }
  function groupOf(id) {
    return room.groups.find((g) => g.ids.includes(id))
  }
  function masked(id) {
    const g = groupOf(id)
    const active = ['match', 'night', 'dawn'].includes(room.phase)
    const match =
      g && active
        ? {
            key: g.key,
            title: B[g.key].name,
            rule: B[g.key].rule,
            ...B[g.key].view(g.board, id),
            done: g.board.done,
          }
        : null
    return {
      code: room.code,
      me: id,
      phase: room.phase,
      day: room.day,
      stage: room.stage,
      serial: room.serial,
      seq: room.seats[id].seq,
      seats: room.seats.map(({ id, name, online, token, pos, points, zone, emote }) => ({
        id,
        name,
        online,
        human: !!token,
        pos,
        points,
        zone,
        emote,
      })),
      match,
      history: room.history.slice(-12),
      messages: room.messages.filter((m) => m.to == null || m.to === id || m.from === id),
      roundLog: room.roundLog,
    }
  }
  function send(c, m) {
    if (c?.open) {
      try {
        c.send(m)
      } catch {}
    }
  }
  function broadcast() {
    checkpoint()
    draw(masked(0))
    for (const [id, c] of links) send(c, { t: 'state', v: masked(id) })
  }
  function group(key, ids, zone) {
    for (const i of ids) room.seats[i].zone = zone
    return { key, ids, board: B[key].start(ids) }
  }
  function standings(g) {
    return [...g.ids].sort(
      (a, b) => g.board.points[b] - g.board.points[a] || ((a + room.day) % 8) - ((b + room.day) % 8),
    )
  }
  function startStage() {
    const ids = room.seats.map((s) => s.id)
    room.serial++
    room.seats.forEach((s) => {
      s.pos = [...H.places[s.id]]
      s.emote = null
    })
    if (room.stage === 0) {
      room.phase = 'match'
      room.groups = [group(MAIN[room.day - 1], ids, '게임동')]
    }
    if (room.stage === 1) {
      room.phase = 'night'
      const top = room.rank.slice(0, 4),
        bottom = room.rank.slice(4)
      room.groups = [
        group(HOME[room.day - 1], top, '생활동'),
        group(PRISON[room.day - 1], bottom, '감옥동'),
      ]
    }
    if (room.stage === 2) {
      room.phase = 'dawn'
      room.groups = [group(EXILE[room.day - 1], ids, '유배지 작업대')]
    }
    sys(room.day + '일차 · ' + room.groups.map((g) => B[g.key].name).join(' / ') + ' 시작')
    broadcast()
  }
  function settle() {
    const rows = []
    for (const g of room.groups) {
      const ids = standings(g)
      if (room.stage === 0) room.rank = ids
      if (room.stage === 1 && room.seats[ids[0]].zone === '감옥동') room.exiles = ids.slice(-2)
      for (const i of ids) {
        const rank = 1 + ids.filter((j) => g.board.points[j] > g.board.points[i]).length
        let gain = room.stage === 0 ? 9 - rank : room.stage === 1 ? 5 - rank : rank <= 2 ? 2 : 1
        if (room.stage === 2 && room.exiles.includes(i) && rank <= 4) gain += 2
        room.seats[i].points += gain
        rows.push({ id: i, key: g.key, raw: g.board.points[i], rank, gain })
      }
    }
    room.history.push({ day: room.day, stage: room.stage, rows })
    room.roundLog = room.groups.map((g) => B[g.key].name).join(' · ') + ' 정산'
    room.phase = room.day === 4 && room.stage === 2 ? 'finish' : 'results'
    room.groups = []
    room.serial++
    sys(room.phase === 'finish' ? '네 번의 밤이 끝났습니다. 최종 순위를 확인하세요.' : room.roundLog)
    broadcast()
  }
  function advance() {
    if (room.phase === 'lobby') {
      room.day = 1
      room.stage = 0
      room.phase = 'brief'
      room.serial++
      sys('여덟 명의 자리가 확정됐습니다.')
      broadcast()
      return
    }
    if (room.phase === 'results') {
      if (room.stage === 2) {
        room.day++
        room.stage = 0
        room.exiles = []
      } else room.stage++
    }
    if (room.phase === 'brief' || room.phase === 'results') startStage()
  }
  function drive() {
    if (!room || !host()) return
    let changed = false
    const now = Date.now()
    if (room.groups.length) {
      for (const g of room.groups) {
        if (g.board.done) continue
        const onlyAI = g.ids.every((id) => !room.seats[id].online)
        for (let k = 0; k < (onlyAI ? 5 : 1) && !g.board.done; k++) {
          for (const i of g.ids) {
            const a = room.seats[i]
            if (a.online || (a.token && now - a.away < 18000) || g.board.done) continue
            const input = B[g.key].bot(g.board, i)
            if (input != null && B[g.key].act(g.board, i, input)) {
              a.seq++
              a.emote = { text: '생각을 마쳤어요', until: now + 1000 }
              changed = true
            }
          }
        }
      }
      if (room.groups.every((g) => g.board.done)) {
        settle()
        return
      }
    }
    if (room.phase === 'lobby' && Math.random() < 0.095) {
      const a = room.seats[Math.floor(Math.random() * 8)]
      if (!a.token) {
        let u = 1 + Math.random() * 8,
          v = 1 + Math.random() * 8
        if (H.clearFloor(u, v)) {
          a.pos = [u, v]
          changed = true
        }
      }
    }
    if (changed) broadcast()
  }
  function command(id, m) {
    const a = room.seats[id]
    if (!a || !m || typeof m !== 'object') return
    if (m.t === 'act') {
      const g = groupOf(id)
      if (
        g &&
        !g.board.done &&
        m.serial === room.serial &&
        m.seq === a.seq &&
        typeof m.key === 'string' &&
        m.key.length < 100 &&
        B[g.key].act(g.board, id, m.key)
      ) {
        a.seq++
        a.emote = { text: '선택 완료', until: Date.now() + 1300 }
        if (room.groups.every((g) => g.board.done)) {
          settle()
          return
        }
        broadcast()
      } else if (id) send(links.get(id), { t: 'state', v: masked(id) })
      return
    }
    if (m.t === 'move') {
      if (!Number.isFinite(m.u) || !Number.isFinite(m.v) || !H.clearFloor(m.u, m.v)) return
      a.pos = [Math.round(m.u * 10) / 10, Math.round(m.v * 10) / 10]
      broadcast()
      return
    }
    if (m.t === 'emoji' && ['반가워요!', '고민 중…'].includes(m.text)) {
      a.emote = { text: m.text, until: Date.now() + 3400 }
      broadcast()
      return
    }
    if (m.t === 'talk' && typeof m.text === 'string') {
      const text = m.text.trim().slice(0, 90)
      if (!text) return
      const to = Number.isInteger(m.to) && m.to >= 0 && m.to < 8 ? m.to : null
      if (to === id) return
      room.messages.push({ from: id, to, name: a.name, text, at: Date.now() })
      if (to == null) a.emote = { text: text.slice(0, 18), until: Date.now() + 4300 }
      if (to != null && !room.seats[to].token) {
        const buddy = room.seats[to],
          g = groupOf(to)
        const response = g
          ? '지금 ' + B[g.key].name + ' 중이에요. 공개된 결과를 보고 다음 수를 고를게요.'
          : '같은 테이블에서 만나요. 먼저 좋은 수를 찾아볼게요.'
        room.messages.push({ from: to, to: id, name: buddy.name, text: response, at: Date.now() })
      }
      room.messages = room.messages.slice(-40)
      broadcast()
    }
  }
  function act(m) {
    if (!session) return
    if (host()) command(0, m)
    else if (up?.open) send(up, m)
    else note('방장에게 다시 연결하는 중입니다.')
  }
  function greet(c) {
    const joinTimer = setTimeout(() => {
      if (![...links.values()].includes(c)) c.close()
    }, 10000)
    let seat = null
    let lastSeen = Date.now()
    const pulse = setInterval(() => {
      if (seat === null) return
      if (links.get(seat) !== c || Date.now() - lastSeen > 14000) {
        drop()
        c.close()
      } else send(c, { t: 'ping' })
    }, 3000)
    c.on('data', (m) => {
      if (closed || !room || !m || typeof m !== 'object') return
      if (seat !== null) {
        if (links.get(seat) !== c) return
        lastSeen = Date.now()
        if (m.t === 'pong') return
        if (m.t === 'away') {
          drop()
          c.close()
          return
        }
        if (m.t === 'vacate') {
          const a = room.seats[seat]
          links.delete(seat)
          a.token = null
          a.online = false
          a.away = 0
          a.name = aliases[seat]
          sys(seat + 1 + '번 자리를 AI가 이어받습니다.')
          broadcast()
          c.close()
          return
        }
        command(seat, m)
        return
      }
      if (
        m.t !== 'hello' ||
        m.protocol !== proto ||
        typeof m.token !== 'string' ||
        !/^[a-f0-9-]{36}$/.test(m.token) ||
        typeof m.name !== 'string'
      )
        return
      let a = room.seats.find((s) => s.token === m.token)
      if (!a) a = room.seats.find((s) => s.token === null)
      if (!a) {
        send(c, { t: 'full' })
        setTimeout(() => c.close(), 350)
        return
      }
      clearTimeout(joinTimer)
      seat = a.id
      const old = links.get(seat)
      links.set(seat, c)
      if (old && old !== c) old.close()
      const fresh = !a.token
      a.token = m.token
      a.name = m.name.trim().slice(0, 12) || '친구 ' + seat
      a.online = true
      a.away = 0
      a.emote = { text: fresh ? '안녕하세요!' : '돌아왔어요', until: Date.now() + 3000 }
      sys(a.name + (fresh ? ' 입장' : ' 재접속'))
      broadcast()
    })
    const drop = () => {
      clearInterval(pulse)
      clearTimeout(joinTimer)
      if (!room || links.get(seat) !== c) return
      links.delete(seat)
      let a = room.seats[seat]
      a.online = false
      a.away = Date.now()
      sys(a.name + ' 연결 대기 · 18초 뒤 AI 대행')
      broadcast()
    }
    c.on('close', drop)
    c.on('error', drop)
  }
  window.addEventListener('pagehide', () => {
    if (!host()) send(up, { t: 'away' })
  })
  function retryAfter(fn, delay = 1500) {
    clearTimeout(retry)
    retry = setTimeout(() => {
      if (!closed) fn()
    }, delay)
  }
  function connectGuest() {
    if (closed || !peer?.open || !session || host()) return
    const c = peer.connect(prefix + session.code, { reliable: true })
    up = c
    clearTimeout(networkTimer)
    networkTimer = setTimeout(() => {
      if (up === c && !connected) {
        c.close()
        note('방이 열려 있는지 확인하세요. 연결을 다시 시도합니다.')
        retryAfter(connectGuest)
      }
    }, 10000)
    c.on('open', () => {
      if (up === c) send(c, { t: 'hello', protocol: proto, token: session.token, name: session.name })
    })
    c.on('data', (m) => {
      if (up !== c || !m) return
      if (m.t === 'ping') {
        send(c, { t: 'pong' })
        clearTimeout(networkTimer)
        networkTimer = setTimeout(() => {
          if (up === c) {
            c.close()
            lost()
          }
        }, 18000)
        return
      }
      if (m.t === 'ended') {
        reset()
        note('방장이 시즌 방을 종료했습니다.')
        return
      }
      if (m.t === 'full') {
        reset()
        note('여덟 자리에 모두 친구가 앉아 있어요.')
        return
      }
      if (m.t === 'state') {
        if (!connected) clearTimeout(networkTimer)
        connected = true
        draw(m.v)
        note('')
      }
    })
    const lost = () => {
      if (up !== c || closed) return
      up = null
      connected = false
      pending = false
      note('연결이 끊겼습니다. 같은 자리로 다시 들어가는 중…')
      retryAfter(connectGuest)
    }
    c.on('close', lost)
    c.on('error', lost)
  }
  function boot(restored = false) {
    const s = session,
      hosting = host()
    closed = false
    entryBusy(true)
    note(hosting ? '살롱을 여는 중…' : '방장을 찾는 중…')
    $('cancel').hidden = false
    let p
    try {
      p = hosting ? new Peer(prefix + s.code) : new Peer()
      peer = p
    } catch {
      note('연결을 시작할 수 없습니다. 다시 시도해 주세요.')
      entryBusy(false)
      return
    }
    p.on('open', () => {
      if (p !== peer) return
      if (hosting) {
        connected = true
        clearInterval(timer)
        timer = setInterval(drive, 580)
        broadcast()
        note('')
      } else connectGuest()
    })
    p.on('connection', (c) => {
      if (hosting && p === peer) greet(c)
      else c.close()
    })
    p.on('disconnected', () => {
      if (p === peer && !closed) {
        note('연결 서버에 재접속 중…')
        retryAfter(() => {
          if (peer === p && !p.destroyed && p.disconnected) p.reconnect()
        })
      }
    })
    p.on('error', (e) => {
      if (p !== peer || closed) return
      const type = e.type
      if (type === 'unavailable-id' && hosting) {
        p.destroy()
        if (!restored) {
          s.code = codegen()
          room.code = s.code
          save(sessionKey, s)
          checkpoint()
        }
        retryAfter(() => boot(restored), 1800)
        return
      }
      if (type === 'peer-unavailable' && !hosting) {
        note('방장을 찾을 수 없습니다. 코드를 확인하거나 방장이 같은 방을 다시 열면 연결됩니다.')
        retryAfter(connectGuest, 2500)
        return
      }
      note('연결을 다시 시도합니다. (' + type + ')')
      if (p.destroyed) {
        retryAfter(() => boot(true), 2000)
      } else if (!hosting && !connected) {
        retryAfter(connectGuest)
      }
    })
  }
  function begin(role) {
    const code = role === 'host' ? codegen() : $('code').value.trim().toUpperCase(),
      name = $('nickname').value.trim().slice(0, 12) || (role === 'host' ? '방장' : '친구')
    if (!ROOM.test(code)) {
      note('다섯 자리 방 코드를 확인하세요.')
      return
    }
    if (session) reset()
    let token = uid()
    if (role === 'guest') {
      try {
        const k = 'da.seat.' + code
        token = localStorage.getItem(k) || token
        localStorage.setItem(k, token)
      } catch {}
    }
    session = { role, code, name, token }
    save(sessionKey, session)
    try {
      localStorage.setItem('da.salon.name', name)
    } catch {}
    if (host()) {
      room = makeRoom(code, name)
      checkpoint()
    }
    boot()
  }
  function reset() {
    closed = true
    H.setZoom(false)
    $('camera').setAttribute('aria-pressed', 'false')
    $('camera').textContent = '⌖ 가까이'
    clearTimeout(retry)
    clearTimeout(networkTimer)
    clearTimeout(waitingForAck)
    clearInterval(timer)
    const old = peer
    peer = null
    up = null
    links.clear()
    if (old) setTimeout(() => old.destroy(), 160)
    session = room = view = null
    recipient = null
    $('message').value = ''
    $('message').placeholder = '테이블에 한마디…'
    $('scope').hidden = true
    lastPanel = lastChat = lastMatch = ''
    connected = pending = false
    save(sessionKey, null)
    save(hostKey, null)
    H.drawState(null)
    $('entry').hidden = false
    $('cancel').hidden = true
    $('play').hidden = true
    $('arrival').hidden = false
    $('camera').hidden = true
    $('roomtag').hidden = true
    $('title').textContent = '친구 시즌'
    $('scenehint').textContent = ''
    entryBusy(false)
    note('')
  }
  function gridHTML(art, opts, key, used) {
    if (!art || !Array.isArray(art.cells)) return ''
    const cols = Math.max(1, Math.min(12, Number(art.cols) || 1))
    return (
      '<div class="slate ' +
      esc(key) +
      '" style="--cols:' +
      cols +
      '">' +
      art.cells
        .map((str, i) => {
          const pick = opts.find((o) => {
            const k = String(o.key).replace(/^\d+\./, '')
            if (key === 'choice') return k === 't' + i || k === 'p' + i
            if (key === 'wall') return k === 'm' + i
            if (key === 'trial') return k === 'h' + i
            if (key === 'difference') return k === 'd' + i
            if (key === 'fence' && cols === 9 && Math.floor(i / 9) % 2 === 0 && (i % 9) % 2 === 0)
              return k === 'v' + (Math.floor(i / 18) * 5 + (i % 9) / 2)
            return false
          })
          if (pick) {
            used.add(pick.key)
            return (
              '<button class="tilekey" data-key="' +
              esc(pick.key) +
              '" aria-label="' +
              esc(pick.label) +
              '">' +
              PrivateProps.tile(key, str, art) +
              '</button>'
            )
          }
          return '<span>' + PrivateProps.tile(key, str, art) + '</span>'
        })
        .join('') +
      '</div>'
    )
  }
  function portrait(id) {
    return (
      '<i aria-hidden="true" class="portrait" style="background-position:' +
      ((id % 4) * 100) / 3 +
      '% ' +
      (id < 4 ? 0 : 100) +
      '%"></i>'
    )
  }
  function roster(v) {
    return (
      '<div class="seats">' +
      v.seats
        .map(
          (s) =>
            '<button data-seat="' +
            s.id +
            '" class="seat ' +
            (s.id === v.me ? 'me' : '') +
            '">' +
            portrait(s.id) +
            '<span><b>' +
            esc(s.name) +
            '</b><small>' +
            (s.id === v.me ? '내 자리' : s.human ? (s.online ? '접속 중' : 'AI 대행') : 'AI') +
            '</small></span></button>',
        )
        .join('') +
      '</div>'
    )
  }
  function panel(v) {
    const m = v.match,
      me = v.seats[v.me]
    let html = ''
    if (!m) {
      html =
        '<small>' +
        esc(phaseName[v.phase]) +
        '</small><h2>' +
        esc(
          v.phase === 'lobby'
            ? '여덟 자리의 테이블'
            : v.phase === 'finish'
              ? '마지막 정산'
              : v.phase === 'brief'
                ? '시즌 입장 완료'
                : v.roundLog,
        ) +
        '</h2>' +
        roster(v)
      if (v.phase === 'lobby')
        html +=
          '<p class="sub">초대 링크를 보내거나 방 코드를 알려주세요. 친구는 빈 AI 자리에 앉습니다. 방장의 폰이 진행을 맡습니다.</p>'
      if (v.phase === 'brief')
        html +=
          '<p>네 번의 낮에는 여덟 명이 같은 메인매치를 치릅니다. 밤에는 상위 네 명이 생활동, 나머지는 감옥동에서 겨룹니다. 새벽에는 모두 유배지 과제에 참여하며 감옥 하위 두 명에게 복귀 보너스 기회가 있습니다. 4일 누적 피스가 가장 많은 참가자가 우승합니다.</p>'
      if (v.phase === 'finish') {
        let max = Math.max(...v.seats.map((s) => s.points))
        html +=
          '<p class="medal">' +
          v.seats
            .filter((s) => s.points === max)
            .map((s) => esc(s.name))
            .join(' · ') +
          ' 우승 · ' +
          max +
          ' 피스</p>'
      }
      if (['results', 'finish'].includes(v.phase)) {
        const h = v.history.at(-1)
        if (h)
          html += h.rows
            .map(
              (x) =>
                '<div class="history"><b>' +
                esc(v.seats[x.id].name) +
                '</b>　' +
                esc(B[x.key].name) +
                '　' +
                x.rank +
                '위 · ' +
                x.raw +
                '점　◆ +' +
                x.gain +
                '　누적 ' +
                v.seats[x.id].points +
                '</div>',
            )
            .join('')
      }
      if (v.phase !== 'finish')
        html +=
          v.me === 0
            ? '<button class="primary" data-next> ' +
              (v.phase === 'lobby' ? '시즌 시작' : v.phase === 'brief' ? '첫 매치로' : '다음 매치로') +
              '　→</button>'
            : '<p class="sub">방장이 다음 장면을 열면 함께 이동합니다.</p>'
    } else {
      const opts = Array.isArray(m.options) ? m.options : [],
        used = new Set()
      const grid = gridHTML(m.art, opts, m.key, used)
      html =
        '<div class="desk"><div><small>DAY 0' +
        v.day +
        '　/　' +
        esc(me.zone) +
        '</small><h2>' +
        esc(m.title) +
        '</h2><div class="sub">내 자리 ' +
        (me.id + 1) +
        '번　◆ ' +
        me.points +
        ' 피스</div><details><summary>규칙과 자리 보기</summary>' +
        esc(m.rule) +
        roster(v) +
        '</details></div><div class="tray"><div class="handhead">' +
        portrait(v.me) +
        '<div><small>PRIVATE HAND</small><b>' +
        esc(me.name) +
        '의 작업대</b></div></div><p class="brief">' +
        esc(m.text) +
        '</p>' +
        grid +
        '<div class="decisions">' +
        opts
          .filter((o) => !used.has(o.key))
          .map(
            (o) =>
              '<button data-key="' +
              esc(o.key) +
              '">' +
              (opts.length <= 8 ? PrivateProps.mini(m.key, String(o.label)) : '') +
              esc(o.label) +
              '</button>',
          )
          .join('') +
        '</div>' +
        (m.done ? '<p>다른 방의 경기를 기다립니다. 살롱에서 대화할 수 있어요.</p>' : '') +
        '</div></div>'
    }
    return html
  }
  function draw(v) {
    if (!v || !Array.isArray(v.seats) || v.seats.length !== 8 || !v.seats[v.me]) return
    if (!view || v.seq !== view.seq || v.serial !== view.serial) {
      pending = false
      clearTimeout(waitingForAck)
    }
    view = v
    H.drawState(v)
    $('entry').hidden = true
    $('cancel').hidden = true
    $('play').hidden = false
    $('arrival').hidden = true
    $('camera').hidden = false
    $('roomtag').hidden = false
    $('roomtag').textContent = 'ROOM　' + v.code
    $('title').textContent = v.day
      ? 'DAY ' + v.day + ' · ' + (v.phase === 'night' ? v.seats[v.me].zone : phaseName[v.phase])
      : '대기 살롱'
    $('scenehint').textContent = '바닥을 눌러 걷기　·　캐릭터를 눌러 귓속말　·　탁자를 눌러 경기 보기'
    const publicSeats = v.seats.map(({ id, name, human, online, points, zone }) => [
      id,
      name,
      human,
      online,
      points,
      zone,
    ])
    const sig = JSON.stringify([v.phase, v.serial, v.seq, v.match, publicSeats])
    if (sig !== lastPanel) {
      lastPanel = sig
      $('dossier').innerHTML = panel(v)
      if (v.match?.key !== lastMatch) {
        if (lastMatch) sound([294, 370, 494])
        lastMatch = v.match?.key || ''
      }
    }
    const chat = JSON.stringify(v.messages)
    if (chat !== lastChat) {
      lastChat = chat
      $('transcript').innerHTML = v.messages
        .slice(-12)
        .map(
          (m) =>
            '<div><b>' +
            esc(m.name) +
            '</b>　' +
            (m.to == null ? '' : '<small>귓속말 → ' + esc(v.seats[m.to]?.name) + '</small>　') +
            esc(m.text) +
            '</div>',
        )
        .join('')
      $('transcript').scrollTop = $('transcript').scrollHeight
    }
  }
  function whisper(id) {
    if (!view) return
    recipient = id === view.me ? null : id
    $('message').placeholder =
      recipient == null ? '테이블에 한마디…' : view.seats[id].name + '에게 귓속말…'
    $('scope').hidden = recipient == null
    $('message').focus()
  }
  $('dossier').onclick = (e) => {
    const b = e.target.closest('button')
    if (!b || !view) return
    if (b.hasAttribute('data-next') && host()) {
      advance()
      return
    }
    if (b.hasAttribute('data-seat')) {
      whisper(+b.dataset.seat)
      return
    }
    if (b.dataset.key != null && !pending && (host() || connected)) {
      pending = true
      waitingForAck = setTimeout(() => {
        pending = false
      }, 1700)
      act({ t: 'act', serial: view.serial, seq: view.seq, key: b.dataset.key })
      sound([310])
    }
  }
  $('say').onsubmit = (e) => {
    e.preventDefault()
    if (!$('message').value.trim()) return
    act({ t: 'talk', to: recipient, text: $('message').value })
    $('message').value = ''
  }
  $('scope').onclick = () => whisper(view.me)
  H.bind(
    (u, v) => act({ t: 'move', u, v }),
    () => $('dossier').scrollIntoView({ behavior: 'smooth', block: 'start' }),
    whisper,
  )
  $('wave').onclick = () => act({ t: 'emoji', text: '반가워요!' })
  $('think').onclick = () => act({ t: 'emoji', text: '고민 중…' })
  $('camera').onclick = () => {
    const zoom = $('camera').getAttribute('aria-pressed') !== 'true'
    H.setZoom(zoom)
    $('camera').setAttribute('aria-pressed', zoom)
    $('camera').textContent = zoom ? '⌖ 전체 보기' : '⌖ 가까이'
  }
  $('sound').onclick = () => {
    muted = !muted
    $('sound').textContent = muted ? '♫ 소리 켜기' : '♫ 소리 켜짐'
    $('sound').setAttribute('aria-pressed', !muted)
    sound([294, 370])
  }
  $('invite').onclick = async () => {
    if (!session) return
    const url = new URL(location.href)
    url.search = ''
    url.searchParams.set('room', session.code)
    try {
      await navigator.clipboard.writeText(url.href)
      note('초대 링크를 복사했습니다. 친구에게 보내세요.')
    } catch {
      prompt('초대 링크를 복사하세요.', url.href)
    }
  }
  $('create').onclick = () => begin('host')
  $('join').onclick = () => begin('guest')
  $('cancel').onclick = reset
  $('leave').onclick = () => {
    if (
      confirm(
        host()
          ? '이 폰에서 방을 종료할까요? 모두의 연결과 이 방의 진행 기록이 종료됩니다.'
          : '방에서 나갈까요? 내 자리는 AI가 이어받습니다.',
      )
    ) {
      if (!host()) {
        try {
          localStorage.removeItem('da.seat.' + session.code)
        } catch {}
        send(up, { t: 'vacate' })
      } else for (const c of links.values()) send(c, { t: 'ended' })
      reset()
    }
  }
  $('code').oninput = () => {
    $('code').value = $('code').value.toUpperCase()
  }
  $('code').onkeydown = (e) => {
    if (e.key === 'Enter') begin('guest')
  }
  try {
    $('nickname').value = localStorage.getItem('da.salon.name') || ''
  } catch {}
  const invited = new URLSearchParams(location.search).get('room')?.toUpperCase()
  if (invited && ROOM.test(invited)) $('code').value = invited
  const last = read(sessionKey)
  if (last && ROOM.test(last.code) && (!invited || invited === last.code)) {
    if (last.role === 'guest') {
      session = last
      boot(true)
    } else if (last.role === 'host') {
      const saved = read(hostKey)
      if (saved?.code === last.code) {
        session = last
        room = saved
        room.seats.slice(1).forEach((s) => {
          if (s.online) {
            s.online = false
            s.away = Date.now()
          }
        })
        boot(true)
      }
    }
  }
})()
