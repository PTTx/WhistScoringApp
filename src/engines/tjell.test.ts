import { describe, it, expect } from 'vitest'
import { calcTjellBidPrice, settleTrickBid, settleSol } from './tjell'

describe('calcTjellBidPrice', () => {
  it('returns alm price for bid 10 with no modifiers', () => {
    expect(calcTjellBidPrice({ tricksBid: 10, flips: 0, gode: 0 })).toBe(0.40)
  })

  it('doubles for each flip: bid 10, 2 flips = 0.40 × 2^2 = 1.60', () => {
    expect(calcTjellBidPrice({ tricksBid: 10, flips: 2, gode: 0 })).toBe(1.60)
  })

  it('applies gode doublers: bid 10, clubs (gode=1) = 0.40 × 2^1 = 0.80', () => {
    expect(calcTjellBidPrice({ tricksBid: 10, flips: 0, gode: 1 })).toBe(0.80)
  })

  it('stacks flips and gode: bid 10, flip 2 + clubs = 0.40 × 2^3 = 3.20', () => {
    expect(calcTjellBidPrice({ tricksBid: 10, flips: 2, gode: 1 })).toBe(3.20)
  })

  it('halve + clubs = gode 2: bid 10 = 0.40 × 2^2 = 1.60', () => {
    expect(calcTjellBidPrice({ tricksBid: 10, flips: 0, gode: 2 })).toBe(1.60)
  })

  it('covers all alm prices in the price table', () => {
    const table: [number, number][] = [
      [7, 0.05], [8, 0.10], [9, 0.20], [10, 0.40],
      [11, 0.80], [12, 1.60], [13, 3.20],
    ]
    for (const [bid, price] of table) {
      expect(calcTjellBidPrice({ tricksBid: bid, flips: 0, gode: 0 })).toBe(price)
    }
  })
})

describe('settleTrickBid', () => {
  // Partnership A: ['p1','p2'], Partnership B: ['p3','p4']
  // Bidder p1, partner p2

  it('bidder wins exactly bid: each side settles bid_price × 1', () => {
    const result = settleTrickBid({
      bidPrice: 0.40,
      tricksBid: 10,
      tricksWon: 10,
      bidderId: 'p1',
      partnerships: [['p1', 'p2'], ['p3', 'p4']],
      partnerGaveUp: false,
    })
    expect(result).toEqual({ p1: 0.40, p2: 0.40, p3: -0.40, p4: -0.40 })
  })

  it('bidder wins one over: bid_price × 2', () => {
    const result = settleTrickBid({
      bidPrice: 0.40,
      tricksBid: 10,
      tricksWon: 11,
      bidderId: 'p1',
      partnerships: [['p1', 'p2'], ['p3', 'p4']],
      partnerGaveUp: false,
    })
    expect(result).toEqual({ p1: 0.80, p2: 0.80, p3: -0.80, p4: -0.80 })
  })

  it('bidder loses one under: bid_price × 1 loss', () => {
    const result = settleTrickBid({
      bidPrice: 0.40,
      tricksBid: 10,
      tricksWon: 9,
      bidderId: 'p1',
      partnerships: [['p1', 'p2'], ['p3', 'p4']],
      partnerGaveUp: false,
    })
    expect(result).toEqual({ p1: -0.40, p2: -0.40, p3: 0.40, p4: 0.40 })
  })

  it('bidder loses two under: bid_price × 2 loss', () => {
    const result = settleTrickBid({
      bidPrice: 0.40,
      tricksBid: 10,
      tricksWon: 8,
      bidderId: 'p1',
      partnerships: [['p1', 'p2'], ['p3', 'p4']],
      partnerGaveUp: false,
    })
    expect(result).toEqual({ p1: -0.80, p2: -0.80, p3: 0.80, p4: 0.80 })
  })

  it('partner gave up: bidder settles ×3, gave-up partner scores as opponent', () => {
    const result = settleTrickBid({
      bidPrice: 0.40,
      tricksBid: 10,
      tricksWon: 10,
      bidderId: 'p1',
      partnerships: [['p1', 'p2'], ['p3', 'p4']],
      partnerGaveUp: true,
    })
    // p1 wins bid_price × 1 × 3 opponents = +1.20
    // p2, p3, p4 each lose 0.40
    expect(result).toEqual({ p1: 1.20, p2: -0.40, p3: -0.40, p4: -0.40 })
  })

  it('partner gave up and bidder loses: bidder pays ×3', () => {
    const result = settleTrickBid({
      bidPrice: 0.40,
      tricksBid: 10,
      tricksWon: 9,
      bidderId: 'p1',
      partnerships: [['p1', 'p2'], ['p3', 'p4']],
      partnerGaveUp: true,
    })
    expect(result).toEqual({ p1: -1.20, p2: 0.40, p3: 0.40, p4: 0.40 })
  })
})

describe('settleSol', () => {
  it('normal sol win: sol player gets 0.50 from each of 3 opponents', () => {
    const result = settleSol({
      solType: 'normal',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: true,
    })
    expect(result).toEqual({ p1: 1.50, p2: -0.50, p3: -0.50, p4: -0.50 })
  })

  it('normal sol loss: sol player pays 0.50 to each of 3 opponents', () => {
    const result = settleSol({
      solType: 'normal',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: false,
    })
    expect(result).toEqual({ p1: -1.50, p2: 0.50, p3: 0.50, p4: 0.50 })
  })

  it('ren sol price is 1.00 per opponent', () => {
    const result = settleSol({
      solType: 'ren',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: true,
    })
    expect(result).toEqual({ p1: 3.00, p2: -1.00, p3: -1.00, p4: -1.00 })
  })

  it('bord price is 1.50 per opponent', () => {
    const result = settleSol({
      solType: 'bord',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: true,
    })
    expect(result).toEqual({ p1: 4.50, p2: -1.50, p3: -1.50, p4: -1.50 })
  })

  it('bord-clean price is 2.00 per opponent', () => {
    const result = settleSol({
      solType: 'bord-clean',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: true,
    })
    expect(result).toEqual({ p1: 6.00, p2: -2.00, p3: -2.00, p4: -2.00 })
  })

  it('dual sol: two independent settlements can be summed', () => {
    const sol1 = settleSol({
      solType: 'normal',
      solPlayerId: 'p1',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: true,
    })
    const sol2 = settleSol({
      solType: 'normal',
      solPlayerId: 'p2',
      allPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      won: false,
    })
    // Merge deltas
    const merged: Record<string, number> = {}
    for (const deltas of [sol1, sol2]) {
      for (const [id, d] of Object.entries(deltas)) {
        merged[id] = (merged[id] ?? 0) + d
      }
    }
    // p1 wins +1.50, plus gets +0.50 from p2's loss → +2.00
    // p2 loses -1.50, plus pays -0.50 to p1 → -2.00
    // p3: -0.50 (p1 wins) + 0.50 (p2 loses) = 0.00
    // p4: -0.50 (p1 wins) + 0.50 (p2 loses) = 0.00
    expect(merged).toEqual({ p1: 2.00, p2: -2.00, p3: 0.00, p4: 0.00 })
  })
})
