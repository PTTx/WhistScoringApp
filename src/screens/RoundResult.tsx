import type { GameRecord, RoundRecord } from '../storage'

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

function buildResultLine(round: RoundRecord): string {
  const bid = round.bids[0]
  if (!bid) return ''

  if (bid.type === 'sol') {
    const typeLabel: Record<string, string> = {
      normal: 'Sol',
      ren: 'Ren sol',
      bord: 'Bord m/stik',
      'bord-clean': 'Bord u/stik',
    }
    const type = typeLabel[bid.solType ?? 'normal'] ?? bid.solType ?? ''
    return `${type} · ${bid.solWon ? 'Vundet' : 'Tabt'}`
  }

  const diff = (bid.tricksWon ?? 0) - (bid.tricksBid ?? 0)
  const diffStr = diff === 0 ? '±0' : diff > 0 ? `+${diff}` : `${diff}`
  return `Bud ${bid.tricksBid} · vandt ${bid.tricksWon} (${diffStr})`
}

export default function RoundResult({ data, onStilling, onNyRunde }: Props) {
  const { round, game } = data
  const bid = round.bids[0]
  if (!bid) return null

  const melderName = playerName(bid.bidderId, game)

  let makkerName: string
  if (bid.type === 'sol') {
    makkerName = 'Sol'
  } else if (bid.partnerGaveUp) {
    makkerName = 'Selv'
  } else {
    const partnership = round.partnerships.find(p => p.includes(bid.bidderId))
    const partnerId = partnership?.find(id => id !== bid.bidderId)
    makkerName = partnerId ? playerName(partnerId, game) : 'Selv'
  }

  const resultLine = buildResultLine(round)
  const bidWon = bid.type === 'sol'
    ? (bid.solWon ?? false)
    : (bid.tricksWon ?? 0) >= (bid.tricksBid ?? 0)

  const deltas = bid.deltas ?? {}

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.75)',
        zIndex: 100,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 12,
          padding: '1.5rem',
          maxWidth: 360,
          margin: '20vh auto 2rem',
        }}
      >
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Runde resultat
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Melder</span>
            <div>{melderName}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Makker</span>
            <div>{makkerName}</div>
          </div>
        </div>

        <div
          style={{
            marginBottom: '1rem',
            fontWeight: 600,
            color: bidWon ? 'var(--positive)' : 'var(--negative)',
          }}
        >
          {resultLine}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.3rem 0.75rem', marginBottom: '1.25rem' }}>
          {Object.entries(deltas).map(([pid, delta]) => (
            <div key={pid} style={{ display: 'contents' }}>
              <span style={{ fontSize: '0.9rem' }}>{playerName(pid, game)}</span>
              <span style={{
                fontSize: '0.9rem',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
                color: delta > 0 ? 'var(--positive)' : delta < 0 ? 'var(--negative)' : 'var(--text-muted)',
                fontWeight: delta !== 0 ? 600 : 400,
              }}>
                {(delta >= 0 ? '+' : '') + delta.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onStilling}
            style={{ flex: 1, padding: '0.65rem', background: 'var(--surface3)', fontSize: '1rem' }}
          >
            Stilling
          </button>
          <button
            type="button"
            onClick={onNyRunde}
            style={{ flex: 1, padding: '0.65rem', fontSize: '1rem' }}
          >
            Ny runde
          </button>
        </div>
      </div>
    </div>
  )
}
