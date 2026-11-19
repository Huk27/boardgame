const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')

const window = {}
runInNewContext(readFileSync(require.resolve('../deadagain/mp-early.js'), 'utf8'), { window })
const game = window.RoomBoards.choice
const submit = (board, id, key) => game.act(board, id, board.revs[id] + '.' + key)

test('only the owner sees a submitted face until the shared reveal, including after restore', () => {
  let board = game.start([0, 1, 2])
  for (const [id, face] of [
    [1, 'A'],
    [2, 'B'],
    [0, 'B'],
  ]) {
    const priorKey = board.revs[id] + '.' + face
    assert.ok(submit(board, id, face))
    assert.equal(game.act(board, id, priorKey), false)
    const own = game.view(board, id)
    assert.equal(own.table.mine, face)
    assert.equal(own.options.length, 0)
    for (const other of board.ids) {
      const table = game.view(board, other).table
      assert.ok(table.ready.includes(id))
      assert.equal(table.faces, undefined)
      assert.equal(table.mine, board.pending[other])
    }
    board = JSON.parse(JSON.stringify(board))
  }
  assert.equal(board.phase, 'sealed')
  assert.equal(game.tick(board, board.reveal.at - 1), false)
  assert.ok(game.tick(board, board.reveal.at))
  for (const id of board.ids)
    assert.deepEqual({ ...game.view(board, id).table.faces }, { 0: 'B', 1: 'A', 2: 'B' })
  board = JSON.parse(JSON.stringify(board))
  assert.equal(game.tick(board, board.reveal.at - 1), false)
  assert.ok(game.tick(board, board.reveal.at))
  assert.equal(board.phase, 'answer')
  assert.equal(game.tick(board, Number.MAX_SAFE_INTEGER), false)
  assert.equal(game.view(board, 1).table.faces, undefined)
})

test('every table size finishes all four votes, both answers and the two-card showdown once', () => {
  for (let size = 2; size <= 8; size++) {
    let board = game.start(Array.from({ length: size }, (_, i) => i))
    const reveals = []
    for (let i = 0; i < 2000 && !board.done; i++) {
      if (board.reveal) {
        if (board.phase === 'reveal') {
          reveals.push([board.round, board.reveal.kind])
          const t = game.view(board, 0).table
          if (t.kind === 'answer') assert.equal(t.answer, board.answer)
          if (t.kind === 'poker') {
            assert.equal(Object.keys(t.hands).length, size)
            assert.ok(Object.values(t.hands).every((cards) => cards.length === 2))
          }
        }
        board = JSON.parse(JSON.stringify(board))
        assert.ok(game.tick(board, board.reveal.at))
      } else {
        for (const id of board.ids) {
          if (board.done) break
          const key = game.bot(board, id)
          if (key != null) assert.ok(game.act(board, id, key))
        }
      }
    }
    assert.ok(board.done)
    assert.deepEqual(reveals, [
      [0, 'vote'],
      [0, 'answer'],
      [1, 'vote'],
      [1, 'answer'],
      [2, 'vote'],
      [3, 'vote'],
      [3, 'poker'],
    ])
  }
})
