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
  vipFlips: number
  gode: boolean
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
  partnerGaveUp: boolean
  blindIsPartner?: boolean
}

export function settleTrickBid({
  bidPrice,
  tricksBid,
  tricksWon,
  bidderId,
  partnerships,
  partnerGaveUp,
  blindIsPartner,
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

  // Virtual opponent seats: how many of the 4 seats have no real player (i.e. the blind)
  const totalReal = bidderPartnership.length + opponentPartnership.length
  const virtualOpponents = Math.max(0, 4 - totalReal)

  if (blindIsPartner) {
    // Blind is on melder's side: melder absorbs the blind's seat earnings
    // Opponents have no virtual seats on their side
    deltas[bidderId] = round2(sign * amount * (1 + virtualOpponents))
    const realPartners = bidderPartnership.filter(id => id !== bidderId)
    for (const id of realPartners) deltas[id] = round2(sign * amount)
    for (const id of opponentPartnership) deltas[id] = round2(-sign * amount)
  } else if (partnerGaveUp) {
    // Ingen/Selv: melder alone, opponents share all seats including virtual
    const totalOppSeats = opponentPartnership.length + virtualOpponents
    deltas[bidderId] = round2(sign * amount * totalOppSeats)
    const oppShare = round2(amount * totalOppSeats / opponentPartnership.length)
    for (const id of opponentPartnership) deltas[id] = round2(-sign * oppShare)
  } else {
    // Normal real partnership: bidder side each earns 1×, opponents share all opp seats
    for (const id of bidderPartnership) deltas[id] = round2(sign * amount)
    const totalOppSeats = opponentPartnership.length + virtualOpponents
    const oppShare = round2(amount * totalOppSeats / opponentPartnership.length)
    for (const id of opponentPartnership) deltas[id] = round2(-sign * oppShare)
  }

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
  const realOpponents = allPlayerIds.filter(id => id !== solPlayerId)
  // Always 3 conceptual opponent seats (4 total − sol player's 1 seat)
  // Real opponents split those 3 seats equally
  const totalOppSeats = 3
  const sign = won ? 1 : -1
  const deltas: Record<string, number> = {}

  deltas[solPlayerId] = round2(sign * price * totalOppSeats)
  const oppShare = round2(price * totalOppSeats / realOpponents.length)
  for (const id of realOpponents) deltas[id] = round2(-sign * oppShare)

  return deltas
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
