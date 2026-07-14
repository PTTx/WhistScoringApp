import { describe, it, expect, beforeEach } from 'vitest'
import { createStore } from './store'

beforeEach(() => {
  localStorage.clear()
})

describe('startGame', () => {
  it('creates a game with all players at 0.00 and correct ruleset', () => {
    const store = createStore()
    store.startGame({ ruleset: 'tjell', playerNames: ['Alice', 'Bob', 'Carol', 'Dan'] })
    const game = store.getGame()!
    expect(game.ruleset).toBe('tjell')
    expect(game.players).toHaveLength(4)
    expect(game.players.every(p => p.balance === 0)).toBe(true)
    expect(game.rounds).toHaveLength(0)
    expect(game.endedAt).toBeNull()
  })

  it('persists to localStorage with schemaVersion', () => {
    const store = createStore()
    store.startGame({ ruleset: 'frants', playerNames: ['Alice', 'Bob', 'Carol', 'Dan'] })
    const raw = localStorage.getItem('whist_games')
    const parsed = JSON.parse(raw!)
    expect(parsed[0].schemaVersion).toBe(1)
  })
})

describe('addPlayer', () => {
  it('adds a new player at 0.00 DKK mid-game', () => {
    const store = createStore()
    store.startGame({ ruleset: 'tjell', playerNames: ['Alice', 'Bob', 'Carol', 'Dan'] })
    store.addPlayer('Eve')
    const game = store.getGame()!
    expect(game.players).toHaveLength(5)
    const eve = game.players.find(p => p.name === 'Eve')!
    expect(eve.balance).toBe(0)
  })
})

describe('recordRound - tjell trick bid', () => {
  it('updates player balances correctly after a Tjell trick bid round', () => {
    const store = createStore()
    store.startGame({ ruleset: 'tjell', playerNames: ['Alice', 'Bob', 'Carol', 'Dan'] })
    const game = store.getGame()!
    const [alice, bob, carol, dan] = game.players.map(p => p.id)

    // Alice bids 10, alm (no modifiers), wins exactly 10
    // bid_price = 0.40 × 2^0 = 0.40
    // Alice+Bob win 0.40 each, Carol+Dan lose 0.40 each
    store.recordRound({
      activePlayers: [alice, bob, carol, dan],
      partnerships: [[alice, bob], [carol, dan]],
      bid: {
        type: 'trick',
        bidderId: alice,
        flips: 0,
        gode: 0,
        tricksBid: 10,
        tricksWon: 10,
        partnerGaveUp: false,
      },
    })

    const updated = store.getGame()!
    const balances = Object.fromEntries(updated.players.map(p => [p.name, p.balance]))
    expect(balances['Alice']).toBe(0.40)
    expect(balances['Bob']).toBe(0.40)
    expect(balances['Carol']).toBe(-0.40)
    expect(balances['Dan']).toBe(-0.40)
  })

  it('persists the full round record to localStorage', () => {
    const store = createStore()
    store.startGame({ ruleset: 'tjell', playerNames: ['Alice', 'Bob', 'Carol', 'Dan'] })
    const game = store.getGame()!
    const [alice, bob, carol, dan] = game.players.map(p => p.id)

    store.recordRound({
      activePlayers: [alice, bob, carol, dan],
      partnerships: [[alice, bob], [carol, dan]],
      bid: {
        type: 'trick',
        bidderId: alice,
        flips: 0,
        gode: 0,
        tricksBid: 10,
        tricksWon: 10,
        partnerGaveUp: false,
      },
    })

    const raw = JSON.parse(localStorage.getItem('whist_games')!)
    expect(raw[0].rounds).toHaveLength(1)
    expect(raw[0].rounds[0].bids[0].deltas).toBeDefined()
  })
})

describe('recordRound - frants trick bid', () => {
  it('updates balances using Frants pricing', () => {
    const store = createStore()
    store.startGame({ ruleset: 'frants', playerNames: ['Alice', 'Bob', 'Carol', 'Dan'] })
    const game = store.getGame()!
    const [alice, bob, carol, dan] = game.players.map(p => p.id)

    // Alice bids 10, alm, wins exactly 10 → bid_price = 2.00
    store.recordRound({
      activePlayers: [alice, bob, carol, dan],
      partnerships: [[alice, bob], [carol, dan]],
      bid: {
        type: 'trick',
        bidderId: alice,
        vipFlips: 0,
        gode: false,
        tricksBid: 10,
        tricksWon: 10,
        partnerGaveUp: false,
      },
    })

    const updated = store.getGame()!
    const balances = Object.fromEntries(updated.players.map(p => [p.name, p.balance]))
    expect(balances['Alice']).toBe(2.00)
    expect(balances['Bob']).toBe(2.00)
    expect(balances['Carol']).toBe(-2.00)
    expect(balances['Dan']).toBe(-2.00)
  })
})

describe('recordRound - sol', () => {
  it('settles Tjell sol correctly', () => {
    const store = createStore()
    store.startGame({ ruleset: 'tjell', playerNames: ['Alice', 'Bob', 'Carol', 'Dan'] })
    const game = store.getGame()!
    const [alice, bob, carol, dan] = game.players.map(p => p.id)

    store.recordRound({
      activePlayers: [alice, bob, carol, dan],
      partnerships: [[alice, bob], [carol, dan]],
      bid: {
        type: 'sol',
        solPlayerId: alice,
        solType: 'normal',
        won: true,
      },
    })

    const updated = store.getGame()!
    const balances = Object.fromEntries(updated.players.map(p => [p.name, p.balance]))
    expect(balances['Alice']).toBe(1.50)
    expect(balances['Bob']).toBe(-0.50)
    expect(balances['Carol']).toBe(-0.50)
    expect(balances['Dan']).toBe(-0.50)
  })
})

describe('endGame', () => {
  it('sets endedAt on the game record', () => {
    const store = createStore()
    store.startGame({ ruleset: 'tjell', playerNames: ['Alice', 'Bob', 'Carol', 'Dan'] })
    store.endGame()
    const raw = JSON.parse(localStorage.getItem('whist_games')!)
    expect(raw[0].endedAt).not.toBeNull()
  })
})
