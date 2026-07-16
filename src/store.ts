import { calcTjellBidPrice, settleTrickBid as tjellSettleTrick, settleSol as tjellSettleSol } from './engines/tjell'
import { calcFrantsBidPrice, settleTrickBid as frantsSettleTrick, settleSol as frantsSettleSol } from './engines/frants'
import { GameRecord, PlayerRecord, RoundRecord, BidRecord, SCHEMA_VERSION, saveGame, loadActiveGame, addKnownPlayers, reopenGame as storageReopenGame } from './storage'

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export type TjellBidInput = {
  type: 'trick'
  bidderId: string
  flips: number
  gode: number
  godeKlorSans: boolean
  godeHalve: boolean
  tricksBid: number
  tricksWon: number
  partnerGaveUp: boolean
  katIsPartner?: boolean
}

export type FrantsBidInput = {
  type: 'trick'
  bidderId: string
  vipFlips: number
  gode: boolean
  godeKlorSans: boolean
  tricksBid: number
  tricksWon: number
  partnerGaveUp: boolean
  blindIsPartner?: boolean
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
  bids: BidInput[]
}

export interface Store {
  startGame(opts: { ruleset: 'tjell' | 'frants'; playerNames: string[]; hasBlind?: boolean; hasKat?: boolean }): void
  getGame(): GameRecord | null
  addPlayer(name: string): void
  renamePlayer(playerId: string, newName: string): void
  recordRound(input: RecordRoundInput): void
  editRound(index: number, input: RecordRoundInput): void
  endGame(): void
  reopenGame(gameId: string): void
}

export function createStore(): Store {
  let current: GameRecord | null = loadActiveGame()

  function save() {
    if (current) saveGame(current)
  }

  return {
    startGame({ ruleset, playerNames, hasBlind, hasKat }) {
      addKnownPlayers(playerNames)
      current = {
        schemaVersion: SCHEMA_VERSION,
        id: generateId(),
        startedAt: Date.now(),
        endedAt: null,
        ruleset,
        ...(hasBlind ? { hasBlind: true } : {}),
        ...(hasKat ? { hasKat: true } : {}),
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
      addKnownPlayers([name])
      const player: PlayerRecord = { id: generateId(), name, balance: 0 }
      current = { ...current, players: [...current.players, player] }
      save()
    },

    renamePlayer(playerId: string, newName: string) {
      if (!current) throw new Error('No active game')
      addKnownPlayers([newName])
      current = {
        ...current,
        players: current.players.map(p => p.id === playerId ? { ...p, name: newName } : p),
      }
      save()
    },

    recordRound({ activePlayers, partnerships, bids: bidInputs }: RecordRoundInput) {
      if (!current) throw new Error('No active game')

      function settleBid(bid: BidInput): { bidRecord: BidRecord; deltas: Record<string, number> } {
        let deltas: Record<string, number>

        if (bid.type === 'sol') {
          const solBid = bid as SolBidInput
          const settle = current!.ruleset === 'tjell' ? tjellSettleSol : frantsSettleSol
          deltas = settle({
            solType: solBid.solType,
            solPlayerId: solBid.solPlayerId,
            allPlayerIds: activePlayers,
            won: solBid.won,
          })
        } else if (current!.ruleset === 'tjell') {
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
            katIsPartner: tjellBid.katIsPartner,
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
            partnerGaveUp: frantsBid.partnerGaveUp,
            blindIsPartner: frantsBid.blindIsPartner,
          })
        }

        const bidRecord: BidRecord = {
          type: bid.type,
          bidderId: bid.type !== 'sol' ? bid.bidderId : bid.solPlayerId,
          partnerGaveUp: bid.type === 'trick'
            ? (bid as TjellBidInput | FrantsBidInput).partnerGaveUp
            : false,
          deltas,
          ...(bid.type === 'trick' && {
            tricksBid: (bid as TjellBidInput | FrantsBidInput).tricksBid,
            tricksWon: (bid as TjellBidInput | FrantsBidInput).tricksWon,
            godeKlorSans: (bid as TjellBidInput | FrantsBidInput).godeKlorSans,
            vipFlips: current!.ruleset === 'frants' ? (bid as FrantsBidInput).vipFlips : (bid as TjellBidInput).flips,
          }),
          ...(bid.type === 'trick' && current!.ruleset === 'tjell' && {
            godeHalve: (bid as TjellBidInput).godeHalve,
          }),
          ...(bid.type === 'sol' && {
            solType: (bid as SolBidInput).solType,
            solWon: (bid as SolBidInput).won,
          }),
          ...((bid as FrantsBidInput).blindIsPartner && { blindIsPartner: true }),
          ...((bid as TjellBidInput).katIsPartner && { katIsPartner: true }),
        }

        return { bidRecord, deltas }
      }

      const settled = bidInputs.map(settleBid)

      // Merge deltas across all bids
      const mergedDeltas: Record<string, number> = {}
      for (const { deltas } of settled) {
        for (const [pid, d] of Object.entries(deltas)) {
          mergedDeltas[pid] = Math.round(((mergedDeltas[pid] ?? 0) + d) * 100) / 100
        }
      }

      const round: RoundRecord = {
        id: generateId(),
        timestamp: Date.now(),
        activePlayers,
        partnerships,
        bids: settled.map(s => s.bidRecord),
      }

      const updatedPlayers = current.players.map(p => ({
        ...p,
        balance: Math.round((p.balance + (mergedDeltas[p.id] ?? 0)) * 100) / 100,
      }))

      current = { ...current, players: updatedPlayers, rounds: [...current.rounds, round] }
      save()
    },

    editRound(index: number, input: RecordRoundInput) {
      if (!current) throw new Error('No active game')
      // Reverse the old round's deltas from player balances
      const oldRound = current.rounds[index]
      if (!oldRound) throw new Error(`No round at index ${index}`)
      const oldDeltas: Record<string, number> = {}
      for (const bid of oldRound.bids) {
        for (const [pid, d] of Object.entries(bid.deltas ?? {})) {
          oldDeltas[pid] = Math.round(((oldDeltas[pid] ?? 0) + d) * 100) / 100
        }
      }
      const reversed = current.players.map(p => ({
        ...p,
        balance: Math.round((p.balance - (oldDeltas[p.id] ?? 0)) * 100) / 100,
      }))
      current = { ...current, players: reversed }
      // Remove old round and re-record
      current = { ...current, rounds: current.rounds.filter((_, i) => i !== index) }
      // recordRound appends to the end - for editing we insert back at the same index
      const self = (this as Store)
      self.recordRound(input)
      // Move the newly appended round back to the original index
      const rounds = [...current!.rounds]
      const newRound = rounds.pop()!
      rounds.splice(index, 0, newRound)
      current = { ...current!, rounds }
      save()
    },

    endGame() {
      if (!current) throw new Error('No active game')
      current = { ...current, endedAt: Date.now() }
      save()
    },

    reopenGame(gameId: string) {
      current = storageReopenGame(gameId)
    },
  }
}
