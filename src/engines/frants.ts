const ALM_PRICES: Record<number, number> = {
  8: 0.50,
  9: 1.00,
  10: 2.00,
  11: 4.00,
  12: 8.00,
  13: 16.00,
}

const SOL_PRICES: Record<string, number> = {
  normal: 2.00,
  ren: 4.00,
  bord: 8.00,
  'bord-clean': 16.00,
}

export interface FrantsBidPriceInput {
  tricksBid: number
  vipFlips: number  // 0–3
  gode: boolean     // clubs, sans, or Halve — all treated as ×2 (no stacking in Frants)
}

export function calcFrantsBidPrice({ tricksBid, vipFlips, gode }: FrantsBidPriceInput): number {
  const alm = ALM_PRICES[tricksBid]
  if (alm === undefined) throw new Error(`Invalid tricksBid for Frants: ${tricksBid}`)
  if (vipFlips > 0) return round2(alm * (vipFlips + 1))
  if (gode) return round2(alm * 2)
  return alm
}

export interface TrickBidSettlementInput {
  bidPrice: number
  tricksBid: number
  tricksWon: number
  bidderId: string
  partnerships: [string[], string[]]
}

export function settleTrickBid({
  bidPrice,
  tricksBid,
  tricksWon,
  bidderId,
  partnerships,
}: TrickBidSettlementInput): Record<string, number> {
  const diff = tricksWon - tricksBid
  const multiplier = diff >= 0 ? 1 + diff : -diff
  const amount = round2(bidPrice * multiplier)
  const bidderWins = diff >= 0

  const [partnershipA, partnershipB] = partnerships
  const bidderPartnership = partnershipA.includes(bidderId) ? partnershipA : partnershipB
  const opponentPartnership = partnershipA.includes(bidderId) ? partnershipB : partnershipA

  const sign = bidderWins ? 1 : -1
  const deltas: Record<string, number> = {}
  for (const id of bidderPartnership) deltas[id] = round2(sign * amount)
  for (const id of opponentPartnership) deltas[id] = round2(-sign * amount)

  return deltas
}

export interface SolSettlementInput {
  solType: 'normal' | 'ren' | 'bord' | 'bord-clean'
  solPlayerId: string
  allPlayerIds: string[]
  won: boolean
}

export function settleSol({
  solType,
  solPlayerId,
  allPlayerIds,
  won,
}: SolSettlementInput): Record<string, number> {
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
