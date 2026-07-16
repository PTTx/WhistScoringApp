export const SCHEMA_VERSION = 1

export interface PlayerRecord {
  id: string
  name: string
  balance: number
}

export interface RoundRecord {
  id: string
  timestamp: number
  activePlayers: string[]
  partnerships: [string[], string[]]
  bids: BidRecord[]
}

export interface BidRecord {
  type: 'trick' | 'sol'
  bidderId: string
  partnerGaveUp: boolean
  // trick bid fields
  tricksWon?: number
  tricksBid?: number
  bidPrice?: number
  // sol fields
  solType?: 'normal' | 'ren' | 'bord' | 'bord-clean'
  solWon?: boolean
  // blind is on melder's side (Frants 3-player variant)
  blindIsPartner?: boolean
  // per-player deltas, keyed by player id
  deltas: Record<string, number>
}

export interface GameRecord {
  schemaVersion: number
  id: string
  startedAt: number
  endedAt: number | null
  ruleset: 'tjell' | 'frants'
  players: PlayerRecord[]
  rounds: RoundRecord[]
}

const STORAGE_KEY = 'whist_games'
const KNOWN_PLAYERS_KEY = 'whist_known_players'

export function loadKnownPlayers(): string[] {
  try {
    const raw = localStorage.getItem(KNOWN_PLAYERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveKnownPlayers(names: string[]): void {
  localStorage.setItem(KNOWN_PLAYERS_KEY, JSON.stringify(names))
}

export function addKnownPlayers(names: string[]): void {
  const existing = new Set(loadKnownPlayers())
  for (const n of names) if (n.trim()) existing.add(n.trim())
  saveKnownPlayers([...existing].sort())
}

function migrate(raw: unknown): GameRecord[] {
  if (!Array.isArray(raw)) return []
  // Future migrations: check schemaVersion per record and transform as needed
  return raw.filter((g): g is GameRecord => typeof g === 'object' && g !== null)
}

export function loadGames(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return migrate(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveGames(games: GameRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

export function saveGame(game: GameRecord): void {
  const games = loadGames()
  const idx = games.findIndex(g => g.id === game.id)
  if (idx >= 0) {
    games[idx] = game
  } else {
    games.push(game)
  }
  saveGames(games)
}

export function loadActiveGame(): GameRecord | null {
  const games = loadGames()
  return games.find(g => g.endedAt === null) ?? null
}

export function clearHistory(): void {
  const active = loadActiveGame()
  saveGames(active ? [active] : [])
}
