import { useState } from 'react'
import type { GameRecord, RoundRecord } from '../storage'

interface Props {
  game: GameRecord
  onAddPlayer: (name: string) => void
  onRenamePlayer: (playerId: string, newName: string) => void
  onNewRound: () => void
  onEditRound: (roundIndex: number) => void
  onEnd: () => void
  autoExpandRound?: number | null
}

function playerName(id: string, game: GameRecord) {
  return game.players.find(p => p.id === id)?.name ?? id
}

function roundSummary(round: RoundRecord, game: GameRecord) {
  const bid = round.bids[0]
  if (!bid) return null

  if (bid.type === 'sol') {
    const who = playerName(bid.bidderId, game)
    const typeLabel: Record<string, string> = { normal: 'Sol', ren: 'Ren sol', bord: 'Bord m/stik', 'bord-clean': 'Bord u/stik' }
    const type = typeLabel[bid.solType ?? 'normal'] ?? bid.solType ?? ''
    const won = bid.solWon ?? false
    const extra = round.bids.length > 1 ? ` + ${playerName(round.bids[1].bidderId, game)}` : ''
    return { melder: who + extra, makker: 'Sol', label: `${type} · ${won ? 'Vundet' : 'Tabt'}`, won }
  }

  const melder = playerName(bid.bidderId, game)
  const partnership = round.partnerships.find(p => p.includes(bid.bidderId))
  const partnerId = partnership?.find(id => id !== bid.bidderId)
  const makker = bid.katIsPartner
    ? 'Kat'
    : bid.partnerGaveUp
      ? 'Selv'
      : bid.blindIsPartner
        ? 'Blind'
        : !partnerId
          ? 'Selv'
          : playerName(partnerId, game)

  const parts: string[] = [`Melding ${bid.tricksBid}`]
  if (bid.godeKlorSans) parts.push('Klør/sans')
  if (bid.godeHalve) parts.push('Halve')
  const vip = bid.vipFlips ?? 0
  if (vip > 0) parts.push(`Vip ${vip}`)

  const diff = (bid.tricksWon ?? 0) - (bid.tricksBid ?? 0)
  const won = diff >= 0
  const diffStr = diff === 0 ? '±0' : diff > 0 ? `+${diff}` : `${diff}`
  return { melder, makker, label: `${parts.join(', ')} - vandt ${bid.tricksWon} (${diffStr})`, won }
}

export default function Scoreboard({ game, onAddPlayer, onRenamePlayer, onNewRound, onEditRound, onEnd, autoExpandRound }: Props) {
  const [newName, setNewName] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(autoExpandRound ?? null)
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)
  const [editingPlayerName, setEditingPlayerName] = useState('')

  function handleAdd() {
    if (!newName.trim()) return
    onAddPlayer(newName.trim())
    setNewName('')
    setAddingPlayer(false)
  }

  const sorted = [...game.players].sort((a, b) => b.balance - a.balance)

  return (
    <div style={{ padding: '1rem', maxWidth: 440 }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Stilling</h2>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        {game.ruleset === 'tjell' ? 'Familien Tjell' : 'Frants'}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '0.4rem 0.25rem', color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.85rem' }}>Spiller</th>
            <th style={{ textAlign: 'right', padding: '0.4rem 0.25rem', color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.85rem' }}>DKK</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.4rem 0.25rem' }}>
                {editingPlayerId === p.id ? (
                  <form
                    style={{ display: 'flex', gap: '0.3rem' }}
                    onSubmit={e => {
                      e.preventDefault()
                      const trimmed = editingPlayerName.trim()
                      if (trimmed) onRenamePlayer(p.id, trimmed)
                      setEditingPlayerId(null)
                    }}
                  >
                    <input
                      autoFocus
                      value={editingPlayerName}
                      onChange={e => setEditingPlayerName(e.target.value)}
                      onBlur={() => setEditingPlayerId(null)}
                      style={{ flex: 1, padding: '0.25rem 0.4rem', fontSize: '1rem' }}
                    />
                    <button type="submit" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>✓</button>
                  </form>
                ) : (
                  <span
                    onClick={() => { setEditingPlayerId(p.id); setEditingPlayerName(p.name) }}
                    style={{ cursor: 'pointer', borderBottom: '1px dashed var(--border)' }}
                    title="Tryk for at omdøbe"
                  >
                    {p.name}
                  </span>
                )}
              </td>
              <td style={{
                padding: '0.5rem 0.25rem',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                color: p.balance > 0 ? 'var(--positive)' : p.balance < 0 ? 'var(--negative)' : 'var(--text-muted)',
                fontWeight: p.balance !== 0 ? 600 : 400,
              }}>
                {(p.balance >= 0 ? '+' : '') + p.balance.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: addingPlayer ? '0.5rem' : '1.25rem' }}>
        <button
          onClick={() => setAddingPlayer(v => !v)}
          style={{ padding: '0.65rem 0.9rem', fontSize: '0.95rem', background: 'var(--surface3)', flex: 'none' }}
        >
          + Ny spiller
        </button>
        <button onClick={onNewRound} style={{ flex: 1, padding: '0.75rem', fontSize: '1.1rem' }}>
          Ny runde
        </button>
      </div>
      {addingPlayer && (
        <form
          onSubmit={e => { e.preventDefault(); handleAdd() }}
          style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Spillernavn"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={!newName.trim()}>Tilføj</button>
          <button type="button" onClick={() => { setAddingPlayer(false); setNewName('') }}
            style={{ background: 'var(--surface3)', color: 'var(--text-muted)' }}>✕</button>
        </form>
      )}

      {game.rounds.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Rundehistorik
          </h3>
          {[...game.rounds].reverse().map((round, ri) => {
            const realIndex = game.rounds.length - 1 - ri
            const summary = roundSummary(round, game)
            const isOpen = expanded === realIndex
            const rowColor = summary ? (summary.won ? 'var(--positive)' : 'var(--negative)') : 'var(--text)'
            return (
              <div
                key={round.id}
                style={{ background: 'var(--surface)', borderRadius: 8, marginBottom: '0.5rem', overflow: 'hidden' }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : realIndex)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', color: 'var(--text)',
                    padding: '0.6rem 0.75rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginRight: '0.5rem' }}>#{realIndex + 1}</span>
                    <span style={{ color: rowColor }}>
                      {summary ? `${summary.melder} + ${summary.makker}` : 'Runde'}
                    </span>
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && summary && (
                  <div style={{ padding: '0 0.75rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Melder: </span>{summary.melder}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Makker: </span>{summary.makker}</div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Resultat: </span>
                        <span style={{ color: rowColor, fontWeight: 600 }}>{summary.label}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                      {round.bids[0]?.deltas && Object.entries(round.bids[0].deltas).map(([pid, delta]) => (
                        <div key={pid} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{playerName(pid, game)}</span>
                          <span style={{ color: delta > 0 ? 'var(--positive)' : delta < 0 ? 'var(--negative)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {(delta >= 0 ? '+' : '') + delta.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => onEditRound(realIndex)}
                      style={{ marginTop: '0.75rem', width: '100%', background: 'var(--surface3)', fontSize: '0.9rem', padding: '0.4rem' }}
                    >
                      Rediger resultat
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={onEnd}
        style={{ width: '100%', padding: '0.65rem', background: 'var(--surface3)', color: 'var(--text-muted)', fontSize: '0.9rem' }}
      >
        Afslut spil
      </button>
    </div>
  )
}
