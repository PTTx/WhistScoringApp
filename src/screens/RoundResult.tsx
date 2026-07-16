import type { GameRecord, RoundRecord, BidRecord } from '../storage'

export interface RoundResultData {
  round: RoundRecord
  game: GameRecord
}

interface Props {
  data: RoundResultData
  onStilling: () => void
  onNyRunde: () => void
}

function playerName(id: string, game: GameRecord): string {
  return game.players.find(p => p.id === id)?.name ?? id
}

function buildResultLine(bid: BidRecord): string {
  if (bid.type === 'sol') {
    const typeLabel: Record<string, string> = {
      normal: 'Sol', ren: 'Ren sol', bord: 'Bord m/stik', 'bord-clean': 'Bord u/stik',
    }
    return `${typeLabel[bid.solType ?? 'normal'] ?? bid.solType} · ${bid.solWon ? 'Vundet' : 'Tabt'}`
  }

  const parts: string[] = [`Melding ${bid.tricksBid}`]
  if (bid.godeKlorSans) parts.push('Klør/sans')
  if (bid.godeHalve) parts.push('Halve')
  const vip = bid.vipFlips ?? 0
  if (vip > 0) parts.push(`Vip ${vip}`)

  const diff = (bid.tricksWon ?? 0) - (bid.tricksBid ?? 0)
  const diffStr = diff === 0 ? '±0' : diff > 0 ? `+${diff}` : `${diff}`
  return `${parts.join(', ')} - vandt ${bid.tricksWon} (${diffStr})`
}

function makkerLabel(bid: BidRecord, round: RoundRecord, game: GameRecord): string {
  if (bid.type === 'sol') return 'Sol'
  if (bid.katIsPartner) return 'Kat'
  if (bid.partnerGaveUp) return 'Selv'
  if (bid.blindIsPartner) return 'Blind'
  const partnership = round.partnerships.find(p => p.includes(bid.bidderId))
  const partnerId = partnership?.find(id => id !== bid.bidderId)
  return partnerId ? playerName(partnerId, game) : 'Selv'
}

export default function RoundResult({ data, onStilling, onNyRunde }: Props) {
  const { round, game } = data
  if (!round.bids.length) return null

  // Merge deltas across all bids for display
  const mergedDeltas: Record<string, number> = {}
  for (const bid of round.bids) {
    for (const [pid, d] of Object.entries(bid.deltas ?? {})) {
      mergedDeltas[pid] = Math.round(((mergedDeltas[pid] ?? 0) + d) * 100) / 100
    }
  }

  const isSol = round.bids[0].type === 'sol'
  const overallWon = isSol
    ? (round.bids[0].solWon ?? false)
    : ((round.bids[0].tricksWon ?? 0) >= (round.bids[0].tricksBid ?? 0))

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.75)', zIndex: 100, overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 12, padding: '1.5rem',
        maxWidth: 360, margin: '20vh auto 2rem',
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Runde resultat
        </div>

        {round.bids.map((bid, i) => {
          const bidWon = bid.type === 'sol' ? (bid.solWon ?? false) : ((bid.tricksWon ?? 0) >= (bid.tricksBid ?? 0))
          return (
            <div key={i} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Melder</span>
                  <div>{playerName(bid.bidderId, game)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Makker</span>
                  <div>{makkerLabel(bid, round, game)}</div>
                </div>
              </div>
              <div style={{ fontWeight: 600, color: bidWon ? 'var(--positive)' : 'var(--negative)' }}>
                {buildResultLine(bid)}
              </div>
              {round.bids.length > 1 && i < round.bids.length - 1 && (
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0 0' }} />
              )}
            </div>
          )
        })}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.3rem 0.75rem', marginBottom: '1.25rem', marginTop: '0.5rem' }}>
          {Object.entries(mergedDeltas).map(([pid, delta]) => (
            <div key={pid} style={{ display: 'contents' }}>
              <span style={{ fontSize: '0.9rem' }}>{playerName(pid, game)}</span>
              <span style={{
                fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums', textAlign: 'right',
                color: delta > 0 ? 'var(--positive)' : delta < 0 ? 'var(--negative)' : 'var(--text-muted)',
                fontWeight: delta !== 0 ? 600 : 400,
              }}>
                {(delta >= 0 ? '+' : '') + delta.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" onClick={onStilling} style={{ flex: 1, padding: '0.65rem', background: 'var(--surface3)', fontSize: '1rem' }}>
            Stilling
          </button>
          <button type="button" onClick={onNyRunde} style={{ flex: 1, padding: '0.65rem', fontSize: '1rem' }}>
            Ny runde
          </button>
        </div>
      </div>
    </div>
  )
}
