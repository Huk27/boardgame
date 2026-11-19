// A seat sees the same table from its own edge. Only the host can turn over the cards.
window.ChoiceTable = function (root, { esc, portrait, gridHTML, playKey, sound }) {
  const at = (selector) => root.querySelector(selector)
  let current = null,
    picked = null,
    drag = null,
    previousHand = '',
    previousScene = ''
  let showingSalon = false,
    ignoreClick = false
  const handCard = (button, face, label, cls) =>
    '<button type="button" class="ct-card ' +
    cls +
    '" data-card="' +
    esc(button) +
    '" aria-pressed="false" aria-label="' +
    esc(face + ' ' + label + ' 카드 집기') +
    '"><i>' +
    esc(face) +
    '</i><strong>' +
    esc(label) +
    '</strong></button>'

  function mount() {
    root.innerHTML = `<article class="ct" aria-labelledby="ct-title">
      <header class="ct-head"><div><div class="ct-eyebrow">DAY 01　/　메인매치</div><h2 id="ct-title">양자택일</h2></div>
      <div class="ct-round"></div><button type="button" class="ct-salon">살롱 보기</button></header>
      <div class="ct-lead"><b class="ct-mission"></b><span class="ct-beat"></span><span class="ct-score"></span></div>
      <div class="ct-arena"><div class="ct-rim"><div class="ct-felt">
        <div class="ct-ring"></div><button class="ct-drop" type="button" aria-label="선택한 카드 탁자에 내기"><i>◇</i><b></b><span></span></button>
        <div class="ct-seats"></div></div></div></div>
      <div class="ct-work"></div><div class="ct-handarea"><div class="ct-instruction" role="status"></div><div class="ct-hand"></div></div>
      <details class="ct-rule"><summary>이번 라운드 규칙과 기록</summary><p></p></details>
    </article>`
    at('.ct-salon').onclick = () => {
      showingSalon = !showingSalon
      document.body.classList.toggle('ct-salon-open', showingSalon)
      at('.ct-salon').textContent = showingSalon ? '탁자로 돌아가기' : '살롱 보기'
      if (showingSalon) document.querySelector('#theatre').scrollIntoView({ block: 'start' })
      else root.scrollIntoView({ block: 'start' })
    }
    const work = at('.ct-work')
    work.addEventListener('pointerdown', (e) => {
      if (current?.match.table.step === 'poker' && e.target.closest('.tilekey')) startDrag(e)
    })
    work.addEventListener('pointermove', moveDrag)
    work.addEventListener('pointerup', endDrag)
    work.addEventListener('pointercancel', clearDrag)
    work.addEventListener('lostpointercapture', clearDrag)
    work.addEventListener(
      'click',
      (e) => {
        if (ignoreClick && e.target.closest('.tilekey')) {
          e.preventDefault()
          e.stopPropagation()
        }
      },
      true,
    )
    at('.ct-hand').addEventListener('pointerdown', startDrag)
    at('.ct-hand').addEventListener('pointermove', moveDrag)
    at('.ct-hand').addEventListener('pointerup', endDrag)
    at('.ct-hand').addEventListener('pointercancel', () => clearDrag())
    at('.ct-hand').addEventListener('lostpointercapture', () => clearDrag())
    at('.ct-hand').onclick = (e) => {
      if (ignoreClick) return
      const card = e.target.closest('[data-card]')
      if (card) select(picked === card.dataset.card ? null : card.dataset.card)
    }
    at('.ct-drop').onclick = () => {
      if (picked) playKey(picked)
    }
  }
  function select(key) {
    picked = key
    root
      .querySelectorAll('[data-card]')
      .forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.card === key)))
    at('.ct').classList.toggle('ct-picked', !!key)
    describe()
  }
  function clearDrag() {
    if (!drag) return
    const { card, ghost, pointer } = drag
    drag = null
    ghost?.remove()
    card.classList.remove('ct-lifted')
    at('.ct')?.classList.remove('ct-dragging', 'ct-over')
    if (card.hasPointerCapture(pointer)) card.releasePointerCapture(pointer)
  }
  function startDrag(e) {
    const card = e.target.closest('[data-card], .tilekey')
    if (!card || drag || !e.isPrimary || e.button !== 0) return
    drag = { card, pointer: e.pointerId, x: e.clientX, y: e.clientY, ghost: null }
    card.setPointerCapture(e.pointerId)
  }
  function overTable(x, y) {
    const target = document.elementFromPoint(x, y)
    if (drag?.card.classList.contains('tilekey')) return !!target?.closest('.ct-sleeve')
    return !!target?.closest('.ct-arena, .ct-work .slate')
  }
  function moveDrag(e) {
    if (!drag || e.pointerId !== drag.pointer) return
    if (!drag.ghost) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return
      drag.ghost = drag.card.cloneNode(true)
      drag.ghost.removeAttribute('data-card')
      drag.ghost.setAttribute('aria-hidden', 'true')
      drag.ghost.tabIndex = -1
      const box = drag.card.getBoundingClientRect()
      drag.ghost.style.width = box.width + 'px'
      drag.ghost.style.height = box.height + 'px'
      drag.ghost.classList.add('ct-ghost')
      if (drag.card.classList.contains('tilekey')) drag.ghost.classList.add('ct-card', 'ct-memory-ghost')
      document.body.appendChild(drag.ghost)
      drag.card.classList.add('ct-lifted')
      at('.ct').classList.add('ct-dragging')
    }
    drag.ghost.style.left = e.clientX + 'px'
    drag.ghost.style.top = e.clientY + 'px'
    at('.ct').classList.toggle('ct-over', overTable(e.clientX, e.clientY))
    e.preventDefault()
  }
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.pointer) return
    const { card, ghost } = drag
    const release = ghost?.getBoundingClientRect()
    const drop = ghost && overTable(e.clientX, e.clientY)
    if (ghost) {
      ignoreClick = true
      setTimeout(() => {
        ignoreClick = false
      }, 0)
    }
    clearDrag()
    if (!ghost || !release) return
    const home = card.getBoundingClientRect()
    const memory = card.classList.contains('tilekey')
    const ok = drop && playKey(card.dataset.card || card.dataset.key)
    const landing = memory
      ? [...root.querySelectorAll('.ct-sleeve .filled')].at(-1) || at('.ct-sleeve i')
      : at('.ct-self .ct-pocket')
    const destination = ok ? landing?.getBoundingClientRect() : home
    if (!destination || matchMedia('(prefers-reduced-motion: reduce)').matches || !ghost.animate) return
    document.body.append(ghost)
    ghost.style.left = release.x + 'px'
    ghost.style.top = release.y + 'px'
    ghost.style.transformOrigin = 'top left'
    if (ok) ghost.classList.add('ct-travel-back')
    const dx = destination.x - release.x,
      dy = destination.y - release.y
    const flight = ghost.animate(
      [
        { transform: 'rotate(-5deg)' },
        {
          transform:
            'translate(' + dx + 'px,' + dy + 'px) scale(' + destination.width / ghost.offsetWidth + ')',
          opacity: ok ? 0.45 : 1,
        },
      ],
      { duration: ok ? 310 : 190, easing: 'cubic-bezier(.19,.72,.28,1)', fill: 'forwards' },
    )
    flight.finished.then(
      () => ghost.remove(),
      () => ghost.remove(),
    )
  }

  function describe() {
    if (!current) return
    const { match: m } = current,
      t = m.table,
      total = current.seats.length,
      n = t.ready?.length || 0
    const hasMine = t.ready?.includes(current.me)
    let title = '카드를 놓는 곳',
      sub = n + ' / ' + total + '장 제출',
      help = ''
    if (t.step === 'sealed') {
      title = '모두 제출'
      sub = '잠시 후 함께 공개'
      help = '여덟 장이 모두 모였습니다.'
    } else if (t.step === 'reveal') {
      help = '모두의 카드가 공개되었습니다.'
      if (t.kind === 'vote') {
        const a = Object.values(t.faces).filter((v) => v === 'A').length
        title = 'A ' + a + '　·　B ' + (n - a)
        sub = '투표 결과'
      } else if (t.kind === 'answer') {
        title = '정답 ' + t.answer + '개'
        sub = Number(t.mine) === t.answer ? '내 답 적중' : '내 답 ' + t.mine + '개'
      } else {
        title = t.community.join(' ')
        sub = '공유 패'
      }
    } else if (hasMine) {
      title = '내 카드 봉인'
      sub = n + ' / ' + total + '장 제출'
      help =
        '다른 참가자를 기다리는 중' +
        (t.mine
          ? ' · 내 카드 ' + (t.kind === 'vote' ? t.labels[t.mine === 'A' ? 0 : 1] : t.mine + '개')
          : '')
    } else if (picked) {
      title = '여기에 내기'
      help = '탁자 가운데를 누르면 선택한 카드를 냅니다.'
    } else if (t.kind === 'vote' || t.kind === 'answer')
      help = '카드를 탁자로 끌어 놓거나, 카드와 탁자 가운데를 차례로 누르세요.'
    at('.ct-drop b').textContent = title
    at('.ct-drop span').textContent = sub
    at('.ct-drop').disabled = !picked
    at('.ct-instruction').textContent = help
  }
  function fillSeats(v, firstPaint) {
    const { table: t } = v.match,
      container = at('.ct-seats')
    for (const s of v.seats) {
      let box = container.querySelector('[data-player="' + s.id + '"]')
      if (!box) {
        box = document.createElement('div')
        box.dataset.player = s.id
        box.setAttribute('role', 'img')
        box.className = 'ct-seat ct-place-' + ((s.id - v.me + 8) % 8) + (s.id === v.me ? ' ct-self' : '')
        box.innerHTML =
          '<div class="ct-pocket"><div class="ct-turn"><i class="ct-back"></i><i class="ct-face"></i></div></div><div class="ct-tag">' +
          portrait(s.id) +
          '<span></span></div>'
        container.appendChild(box)
      }
      box.querySelector('.ct-tag span').textContent =
        (s.id === v.me ? '나' : s.name) + (s.human ? '' : ' · AI')
      const ready = t.ready?.includes(s.id)
      const value = t.faces?.[s.id] ?? t.hands?.[s.id]?.join(' ')
      const face = box.querySelector('.ct-face')
      face.textContent = value ?? ''
      face.className = 'ct-face ' + (value === 'A' ? 'ct-a' : value === 'B' ? 'ct-b' : 'ct-n')
      if (
        ready &&
        !box.classList.contains('ct-placed') &&
        s.human &&
        s.id !== v.me &&
        !firstPaint &&
        !t.faces &&
        !t.hands
      )
        sound([240])
      box.classList.toggle('ct-placed', !!ready)
      box.classList.toggle('ct-open', value != null)
      box.classList.toggle('ct-hit', t.kind === 'answer' && value != null && Number(value) === t.answer)
      box.setAttribute(
        'aria-label',
        s.name + ' · ' + (value != null ? '공개 ' + value : ready ? '제출 완료' : '선택 중'),
      )
    }
  }
  function draw(v) {
    const m = v.match,
      t = m.table,
      first = !current
    if (first) {
      mount()
      document.body.classList.add('ct-active')
      window.scrollTo(0, 0)
    }
    const scene = v.code + '/' + v.serial + '/' + t.round + '/' + t.step
    const change = scene !== previousScene
    if (change) {
      clearDrag()
      picked = null
      at('.ct').classList.remove('ct-picked')
    }
    current = v
    const tableMode =
      t.kind === 'vote' ||
      t.kind === 'answer' ||
      ['sealed', 'reveal'].includes(t.step) ||
      (t.kind === 'poker' && t.ready.includes(v.me))
    if (change && !['sealed', 'reveal'].includes(t.step)) at('.ct-seats').replaceChildren()
    at('.ct').dataset.step = t.step
    at('.ct').dataset.kind = t.kind
    at('.ct-round').textContent = 'ROUND　0' + t.round + ' / 04'
    at('.ct-mission').textContent = t.mission
    at('.ct-beat').textContent =
      {
        vote: '비밀 투표',
        answer: '답안 제출',
        sealed: '봉인 완료',
        reveal: '동시 공개',
        turf: '잔디 배치',
        nominate: '상대 지목',
        memory: '패 기억',
        poker: '패 선택',
      }[t.step] || ''
    at('.ct-score').textContent = '내 승점　' + t.points
    at('.ct-rule p').textContent = t.rule + '\n' + (m.text || '')
    at('.ct-arena').hidden = !tableMode
    at('.ct-handarea').hidden = !tableMode
    if (tableMode) fillSeats(v, first)
    const handSignature = JSON.stringify([scene, m.options, tableMode ? null : [m.art, m.text]])
    if (handSignature !== previousHand) {
      clearDrag()
      picked = null
      at('.ct').classList.remove('ct-picked')
      previousHand = handSignature
      const hand = at('.ct-hand'),
        work = at('.ct-work')
      hand.innerHTML = ''
      work.innerHTML = ''
      if (tableMode) {
        if (t.step === 'vote' || t.step === 'answer') {
          if (t.step === 'vote') work.textContent = t.rule
          if (t.step === 'answer' && m.art) {
            const used = new Set()
            work.innerHTML =
              '<p>' + esc(m.text.split('\n').at(-1)) + '</p>' + gridHTML(m.art, [], m.key, used)
          }
          for (const o of m.options) {
            const face = o.key.split('.').at(-1)
            hand.insertAdjacentHTML(
              'beforeend',
              handCard(
                o.key,
                face,
                t.kind === 'vote' ? o.label : '개',
                t.kind === 'vote' ? (face === 'A' ? 'ct-a' : 'ct-b') : 'ct-number',
              ),
            )
          }
        } else if (t.step === 'reveal' && t.kind === 'poker') {
          work.textContent =
            t.duel.family + ' · ' + v.seats[t.duel.rival].name + '와 대결 · +' + t.duel.gain + '점'
        } else if (t.step === 'reveal' && t.kind === 'vote') {
          work.textContent = 'A　' + t.labels[0] + '　　 B　' + t.labels[1]
        }
      } else {
        const used = new Set()
        const sleeve =
          t.step === 'poker'
            ? '<div class="ct-sleeve"><div><b>내 패 두 장</b><span>카드를 이곳으로 끌거나 눌러 담으세요.</span></div>' +
              [0, 1]
                .map(
                  (i) =>
                    '<i class="' +
                    (t.positions[i] != null ? 'filled' : '') +
                    '">' +
                    (t.positions[i] != null ? t.positions[i] + 1 : '◇') +
                    '</i>',
                )
                .join('') +
              '</div>'
            : ''
        work.innerHTML =
          '<p>' +
          esc(m.text.split('\n').at(-1)) +
          '</p>' +
          gridHTML(m.art, m.options, m.key, used) +
          sleeve +
          '<div class="ct-actions">' +
          m.options
            .filter((o) => !used.has(o.key))
            .map(
              (o) =>
                '<button data-key="' +
                esc(o.key) +
                '">' +
                esc(o.label === '두 장 확정' ? '두 장 뒤집어 내기' : o.label) +
                '</button>',
            )
            .join('') +
          '</div>'
      }
      if (change && t.step === 'reveal') sound([392, 494, 587])
    }
    previousScene = scene
    describe()
  }
  function close() {
    if (!current) return
    clearDrag()
    current = null
    picked = null
    previousHand = previousScene = ''
    showingSalon = false
    document.body.classList.remove('ct-active', 'ct-salon-open')
  }
  return { draw, close }
}
