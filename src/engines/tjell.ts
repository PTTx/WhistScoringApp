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
  katIsPartner?: boolean
}

export function settleTrickBid({
  bidPrice,
  tricksBid,
  tricksWon,
  bidderId,
  partnerships,
  partnerGaveUp,
  katIsPartner,
}: TrickBidSettlementInput): Record<string, number> {
  const diff = tricksWon - tricksBid
  const multiplier = diff >= 0 ? 1 + diff : -diff
  const amount = round2(bidPrice * multiplier)
  const bidderWins = diff >= 0
  const sign = bidderWins ? 1 : -1

  const [partnershipA, partnershipB] = partnerships
  const bidderPartnership = partnershipA.includes(bidderId) ? partnershipA : partnershipB
  const opponentPartnership = partnershipA.includes(bidderId) ? partnershipB : partnershipA

  const deltas: Record<string, number> = {}

  if (katIsPartner) {
    // Kat is a virtual partner belonging to melder. Melder pays/receives for both seats.
    // 2 opponent seats each pay/receive 1x; melder pays/receives 2x. Zero-sum: 2 = 2.
    deltas[bidderId] = round2(sign * amount * 2)
    for (const id of opponentPartnership) deltas[id] = round2(-sign * amount)
  } else if (!partnerGaveUp) {
    // Standard: each member of each partnership pays/receives 1x
    for (const id of bidderPartnership) deltas[id] = round2(sign * amount)
    for (const id of opponentPartnership) deltas[id] = round2(-sign * amount)
  } else {
    // Selv: melder against all 3 other seats
    const partnerId = bidderPartnership.find(id => id !== bidderId)!
    deltas[bidderId] = round2(sign * amount * 3)
    deltas[partnerId] = round2(-sign * amount)
    for (const id of opponentPartnership) deltas[id] = round2(-sign * amount)
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
