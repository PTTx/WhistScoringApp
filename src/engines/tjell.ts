const ALM_PRICES: Record<number, number> = {
  7: 0.05,
  8: 0.10,
  9: 0.20,
  10: 0.40,
  11: 0.80,
  12: 1.60,
  13: 3.20,
}

const SOL_PRICES: Record<string, number> = {
  normal: 0.50,
  ren: 1.00,
  bord: 1.50,
  'bord-clean': 2.00,
}

export interface TjellBidPriceInput {
  tricksBid: number
  flips: number  // 0–3, mutually exclusive with Halve
  gode: number   // count of suit doublers: clubs=1, sans=1, Halve=1 (stackable)
}

export function calcTjellBidPrice({ tricksBid, flips, gode }: TjellBidPriceInput): number {
  const alm = ALM_PRICES[tricksBid]
  if (alm === undefined) throw new Error(`Invalid tricksBid: ${tricksBid}`)
  return round2(alm * Math.pow(2, flips + gode))
}

export interface TrickBidSettlementInput {
  bidPrice: number
  tricksBid: number
  tricksWon: number
  bidderId: string
  partnerships: [string[], string[]]
  partnerGaveUp: boolean
}

export function settleTrickBid({
  bidPrice,
  tricksBid,
  tricksWon,
  bidderId,
  partnerships,
  partnerGaveUp,
}: TrickBidSettlementInput): Record<string, number> {
  const diff = tricksWon - tricksBid
  const multiplier = diff >= 0 ? 1 + diff : -diff
  const amount = round2(bidPrice * multiplier)
  const bidderWins = diff >= 0

  const [partnershipA, partnershipB] = partnerships
  const bidderPartnership = partnershipA.includes(bidderId) ? partnershipA : partnershipB
  const opponentPartnership = partnershipA.includes(bidderId) ? partnershipB : partnershipA
  const partnerId = bidderPartnership.find(id => id !== bidderId)!

  const deltas: Record<string, number> = {}

  if (!partnerGaveUp) {
    // Standard zero-sum: bidding side wins/loses amount, opponents mirror
    const bidderSign = bidderWins ? 1 : -1
    for (const id of bidderPartnership) deltas[id] = round2(bidderSign * amount)
    for (const id of opponentPartnership) deltas[id] = round2(-bidderSign * amount)
  } else {
    // Partner gave up: partner joins opponents, bidder settles against all three
    const bidderSign = bidderWins ? 1 : -1
    deltas[bidderId] = round2(bidderSign * amount * 3)
    deltas[partnerId] = round2(-bidderSign * amount)
    for (const id of opponentPartnership) deltas[id] = round2(-bidderSign * amount)
  }

  return deltas
}

export interface SolSettlementInput {
  solType: 'normal' | 'ren' | 'bord' | 'bord-clean'
  solPlayerId: string
  allPlayerIds: string[]
  won: boolean
  partnerGaveUp?: boolean
}

export function settleSol({
  solType,
  solPlayerId,
  allPlayerIds,
  won,
  partnerGaveUp,
}: SolSettlementInput): Record<string, number> {
  if (partnerGaveUp) throw new Error('Partner cannot give up on a Sol bid')

  const price = SOL_PRICES[solType]
  const opponents = allPlayerIds.filter(id => id !== solPlayerId)
  const sign = won ? 1 : -1
  const deltas: Record<string, number> = {}

  deltas[solPlayerId] = round2(sign * price * opponents.length)
  for (const id of opponents) deltas[id] = round2(-sign * price)

  return deltas
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
