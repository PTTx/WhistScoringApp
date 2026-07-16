import { describe, it, expect } from 'vitest'
import { calcFrantsBidPrice, settleTrickBid, settleSol } from './frants'

describe('calcFrantsBidPrice', () => {
  it('returns alm price for bid 10 with no modifiers', () => {
    expect(calcFrantsBidPrice({ tricksBid: 10, vipFlips: 0, gode: false })).toBe(2.00)
  })

  it('doubles for gode/halve: bid 10 = 4.00', () => {
    expect(calcFrantsBidPrice({ tricksBid: 10, vipFlips: 0, gode: true })).toBe(4.00)
  })

  it('VIP1 = alm × 2: bid 10 = 4.00', () => {
    expect(calcFrantsBidPrice({ tricksBid: 10, vipFlips: 1, gode: false })).toBe(4.00)
  })

  it('VIP2 = alm × 3: bid 10 = 6.00', () => {
    expect(calcFrantsBidPrice({ tricksBid: 10, vipFlips: 2, gode: false })).toBe(6.00)
  })

  it('VIP3 = alm × 4: bid 10 = 8.00', () => {
    expect(calcFrantsBidPrice({ tricksBid: 10, vipFlips: 3, gode: false })).toBe(8.00)
  })

  it('covers full alm price table', () => {
    const table: [number, number][] = [
      [8, 0.50], [9, 1.00], [10, 2.00],
      [11, 4.00], [12, 8.00], [13, 16.00],
    ]
    for (const [bid, price] of table) {
      expect(calcFrantsBidPrice({ tricksBid: bid, vipFlips: 0, gode: false })).toBe(price)
    }
  })

  it('covers full VIP3 column', () => {
    const table: [number, number][] = [
      [8, 2.00], [9, 4.00], [10, 8.00],
      [11, 16.00], [12, 32.00], [13, 64.00],
    ]
    for (const [bid, price] of table) {
      expect(calcFrantsBidPrice({ tricksBid: bid, vipFlips: 3, gode: false })).toBe(price)
    }
  })

  it('throws for invalid tricksBid', () => {
    expect(() => calcFrantsBidPrice({ tricksBid: 7, vipFlips: 0, gode: false })).toThrow()
  })
})

describe('settleTrickBid (Frants)', () => {
  it('bidder wins exactly bid: each side settles bid_price × 1', () => {
    const result = settleTrickBid({
      bidPrice: 2.00,
      tricksBid: 10,
      tricksWon: 10,
      bidderId: 'p1',
      partnerships: [['p1', 'p2'], ['p3', 'p4']],
      partnerGaveUp: false,
    })
    expect(result).toEqual({ p1: 2.00, p2: 2.00, p3: -2.00, p4: -2.00 })
  })

  it('bidder wins one over: bid_price × 2', () => {
    const result = settleTrickBid({
      bidPrice: 2.00,
      tricksBid: 10,
      tricksWon: 11,
      bidderId: 'p1',
      partnerships: [['p1', 'p2'], ['p3', 'p4']],
      partnerGaveUp: false,
    })
    expect(result).toEqual({ p1: 4.00, p2: 4.00, p3: -4.00, p4: -4.00 })
  })

  it('bidder loses one under: bid_price × 1 loss', () => {
    const result = settleTrickBid({
      bidPrice: 2.00,
      tricksBid: 10,
      tricksWon: 9,
      bidderId: 'p1',
      partnerships: [['p1', 'p2'], ['p3', 'p4']],
      partnerGaveUp: false,
    })
    expect(result).toEqual({ p1: -2.00, p2: -2.00, p3: 2.00, p4: 2.00 })
  })

  it('selv (partnerGaveUp) with 4 active: melder +3×, each opp −1×, zero-sum', () => {
    const result = settleTrickBid({
      bidPrice: 2.00,
      tricksBid: 10,
      tricksWon: 10,
      bidderId: 'p1',
      partnerships: [['p1'], ['p2', 'p3', 'p4']],
      partnerGaveUp: true,
    })
    expect(result).toEqual({ p1: 6.00, p2: -2.00, p3: -2.00, p4: -2.00 })
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(0)
  })

  // Case A: real partner, 3 active (blind is on opp side - lone real opponent absorbs blind's share)
  it('3-player real partner (Case A): melder +1×, partner +1×, lone opp −2×, zero-sum', () => {
    const result = settleTrickBid({
      bidPrice: 2.00,
      tricksBid: 10,
      tricksWon: 10,
      bidderId: 'p1',
      partnerships: [['p1', 'p2'], ['p3']],
      partnerGaveUp: false,
    })
    expect(result).toEqual({ p1: 2.00, p2: 2.00, p3: -4.00 })
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(0)
  })

  // Case B: blind is melder's partner (blindIsPartner=true)
  it('blind is partner (Case B): melder +2×, each real opp −1×, zero-sum', () => {
    const result = settleTrickBid({
      bidPrice: 2.00,
      tricksBid: 10,
      tricksWon: 10,
      bidderId: 'p1',
      partnerships: [['p1'], ['p2', 'p3']],
      partnerGaveUp: false,
      blindIsPartner: true,
    })
    expect(result).toEqual({ p1: 4.00, p2: -2.00, p3: -2.00 })
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(0)
  })

  it('blind is partner (Case B) loss: melder −2×, each real opp +1×, zero-sum', () => {
    const result = settleTrickBid({
      bidPrice: 2.00,
      tricksBid: 10,
      tricksWon: 9,
      bidderId: 'p1',
      partnerships: [['p1'], ['p2', 'p3']],
      partnerGaveUp: false,
      blindIsPartner: true,
    })
    expect(result).toEqual({ p1: -4.00, p2: 2.00, p3: 2.00 })
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(0)
  })

  // Case C: ingen/selv makker with 3 active (blind in swap pile - melder triple)
  it('ingen makker 3-player (Case C): melder +3×, each real opp −1.5×, zero-sum', () => {
    const result = settleTrickBid({
      bidPrice: 2.00,
      tricksBid: 10,
      tricksWon: 10,
      bidderId: 'p1',
      partnerships: [['p1'], ['p2', 'p3']],
      partnerGaveUp: true,
    })
    expect(result).toEqual({ p1: 6.00, p2: -3.00, p3: -3.00 })
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(0)
  })
})

describe('settleSol (Frants)', () => {
  it('normal sol win: sol player +6, each of 3 opps −2.00', () => {
    const result = settleSol({
      solType: 'normal',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: true,
    })
    expect(result).toEqual({ p1: 6.00, p2: -2.00, p3: -2.00, p4: -2.00 })
  })

  it('normal sol loss: sol player −6, each of 3 opps +2.00', () => {
    const result = settleSol({
      solType: 'normal',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: false,
    })
    expect(result).toEqual({ p1: -6.00, p2: 2.00, p3: 2.00, p4: 2.00 })
  })

  it('ren sol price is 4.00 per opponent seat', () => {
    const result = settleSol({
      solType: 'ren',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: true,
    })
    expect(result).toEqual({ p1: 12.00, p2: -4.00, p3: -4.00, p4: -4.00 })
  })

  it('bord price is 8.00 per opponent seat', () => {
    const result = settleSol({
      solType: 'bord',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: true,
    })
    expect(result).toEqual({ p1: 24.00, p2: -8.00, p3: -8.00, p4: -8.00 })
  })

  it('bord-clean price is 16.00 per opponent seat', () => {
    const result = settleSol({
      solType: 'bord-clean',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: true,
    })
    expect(result).toEqual({ p1: 48.00, p2: -16.00, p3: -16.00, p4: -16.00 })
  })

  it('3-player sol win: 3 opp seats split across 2 real opps, zero-sum', () => {
    const result = settleSol({
      solType: 'normal',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3'],
      won: true,
    })
    expect(result).toEqual({ p1: 6.00, p2: -3.00, p3: -3.00 })
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(0)
  })

  it('3-player sol loss: zero-sum', () => {
    const result = settleSol({
      solType: 'normal',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3'],
      won: false,
    })
    expect(result).toEqual({ p1: -6.00, p2: 3.00, p3: 3.00 })
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(0)
  })
})
