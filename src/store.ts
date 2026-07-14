import { calcTjellBidPrice, settleTrickBid as tjellSettleTrick, settleSol as tjellSettleSol } from './engines/tjell'
import { calcFrantsBidPrice, settleTrickBid as frantsSettleTrick, settleSol as frantsSettleSol } from './engines/frants'
import { GameRecord, PlayerRecord, RoundRecord, BidRecord, SCHEMA_VERSION, saveGame, loadActiveGame } from './storage'

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export type TjellBidInput = {
  type: 'trick'
  bidderId: string
  flips: number
  gode: number
  tricksBid: number
  tricksWon: number
  partnerGaveUp: boolean
}

export type FrantsBidInput = {
  type: 'trick'
  bidderId: string
  vipFlips: number
  gode: boolean
  tricksBid: number
  tricksWon: number
}

export type SolBidInput = {
  type: 'sol'
  solPlayerId: string
  solType: 'normal' | 'ren' | 'bord' | 'bord-clean'
  won: boolean
}

export type BidInput = TjellBidInput | FrantsBidInput | SolBidInput

export interface RecordRoundInput {
  activePlayers: string[]
  partnerships: [string[], string[]]
  bid: BidInput
}

export interface Store {
  startGame(opts: { ruleset: 'tjell' | 'frants'; playerNames: string[] }): void
  getGame(): GameRecord | null
  addPlayer(name: string): void
  recordRound(input: RecordRoundInput): void
  endGame(): void
}

export function createStore(): Store {
  let current: GameRecord | null = loadActiveGame()

  function save() {
    if (current) saveGame(current)
  }

  return {
    startGame({ ruleset, playerNames }) {
      current = {
        schemaVersion: SCHEMA_VERSION,
        id: generateId(),
        startedAt: Date.now(),
        endedAt: null,
        ruleset,
        players: playerNames.map(name => ({ id: generateId(), name, balance: 0 })),
        rounds: [],
      }
      save()
    },

    getGame() {
      return current
    },

    addPlayer(name: string) {
      if (!current) throw new Error('No active game')
      const player: PlayerRecord = { id: generateId(), name, balance: 0 }
      current = { ...current, players: [...current.players, player] }
      save()
    },

    recordRound({ activePlayers, partnerships, bid }: RecordRoundInput) {
      if (!current) throw new Error('No active game')

      let deltas: Record<string, number>

      if (bid.type === 'sol') {
        const settle = current.ruleset === 'tjell' ? tjellSettleSol : frantsSettleSol
        deltas = settle({
          solType: bid.solType,
          solPlayerId: bid.solPlayerId,
          allPlayerIds: activePlayers,
          won: bid.won,
        })
      } else if (current.ruleset === 'tjell') {
        const tjellBid = bid as TjellBidInput
        const bidPrice = calcTjellBidPrice({
          tricksBid: tjellBid.tricksBid,
          flips: tjellBid.flips,
          gode: tjellBid.gode,
        })
        deltas = tjellSettleTrick({
          bidPrice,
          tricksBid: tjellBid.tricksBid,
          tricksWon: tjellBid.tricksWon,
          bidderId: tjellBid.bidderId,
          partnerships,
          partnerGaveUp: tjellBid.partnerGaveUp,
        })
      } else {
        const frantsBid = bid as FrantsBidInput
        const bidPrice = calcFrantsBidPrice({
          tricksBid: frantsBid.tricksBid,
          vipFlips: frantsBid.vipFlips,
          gode: frantsBid.gode,
        })
        deltas = frantsSettleTrick({
          bidPrice,
          tricksBid: frantsBid.tricksBid,
          tricksWon: frantsBid.tricksWon,
          bidderId: frantsBid.bidderId,
          partnerships,
        })
      }

      const bidRecord: BidRecord = {
        type: bid.type,
        bidderId: bid.type !== 'sol' ? bid.bidderId : bid.solPlayerId,
        partnerGaveUp: bid.type === 'trick' && current.ruleset === 'tjell'
          ? (bid as TjellBidInput).partnerGaveUp
          : false,
        deltas,
        ...(bid.type === 'trick' && {
          tricksBid: (bid as TjellBidInput | FrantsBidInput).tricksBid,
          tricksWon: (bid as TjellBidInput | FrantsBidInput).tricksWon,
        }),
        ...(bid.type === 'sol' && {
          solType: bid.solType,
          solWon: bid.won,
        }),
      }

      const round: RoundRecord = {
        id: generateId(),
        timestamp: Date.now(),
        activePlayers,
        partnerships,
        bids: [bidRecord],
      }

      const updatedPlayers = current.players.map(p => ({
        ...p,
        balance: Math.round((p.balance + (deltas[p.id] ?? 0)) * 100) / 100,
      }))

      current = { ...current, players: updatedPlayers, rounds: [...current.rounds, round] }
      save()
    },

    endGame() {
      if (!current) throw new Error('No active game')
      current = { ...current, endedAt: Date.now() }
      save()
    },
  }
}
