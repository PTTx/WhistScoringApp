import { useState } from 'react'
import { loadKnownPlayers, loadGames, clearHistory } from '../storage'
import type { GameRecord } from '../storage'

interface Props {
  onStart: (opts: { ruleset: 'tjell' | 'frants'; playerNames: string[]; hasBlind?: boolean }) => void
}

const MAX_PLAYERS = 6

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
}

function GameHistoryRow({ g }: { g: GameRecord }) {
  const [open, setOpen] = useState(false)
  const date = formatDate(g.endedAt!)
  const ruleName = g.ruleset === 'tjell' ? 'Familien Tjell' : 'Frants'
  const sorted = [...g.players].sort((a, b) => b.balance - a.balance)

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 8, marginBottom: '0.4rem', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'transparent', border: 'none', color: 'var(--text)',
          padding: '0.6rem 0.75rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>{date}</span>
          <span style={{ fontSize: '0.85rem' }}>{sorted.map(p => p.name).join(', ')}</span>
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
          {ruleName} · {g.rounds.length}r {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 0.75rem 0.65rem', borderTop: '1px solid var(--border)' }}>
          {sorted.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.2rem 0' }}>
              <span>{p.name}</span>
              <span style={{
                fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                color: p.balance > 0 ? 'var(--positive)' : p.balance < 0 ? 'var(--negative)' : 'var(--text-muted)',
              }}>
                {(p.balance >= 0 ? '+' : '') + p.balance.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Setup({ onStart }: Props) {
  const [ruleset, setRuleset] = useState<'tjell' | 'frants'>('tjell')
  const [hasBlind, setHasBlind] = useState(false)
  const [names, setNames] = useState<string[]>(Array(MAX_PLAYERS).fill(''))
  const [pastGames, setPastGames] = useState(() =>
    loadGames().filter(g => g.endedAt !== null).reverse().slice(0, 20)
  )
  const [knownPlayers] = useState(() => loadKnownPlayers())

  const filledNames = names.map(n => n.trim()).filter(Boolean)
  const canStart = filledNames.length >= 2

  function handleChange(index: number, value: string) {
    setNames(prev => prev.map((n, i) => (i === index ? value : n)))
  }

  function handleStart() {
    onStart({ ruleset, playerNames: filledNames, ...(hasBlind ? { hasBlind: true } : {}) })
  }

  function handleClearHistory() {
    if (window.confirm('Slet al historik? Dette kan ikke fortrydes.')) {
      clearHistory()
      setPastGames([])
    }
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 400 }}>
      <h2>Nyt spil</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="ruleset" style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Regelsæt</label>
        <select
          id="ruleset"
          value={ruleset}
          onChange={e => { setRuleset(e.target.value as 'tjell' | 'frants'); setHasBlind(false) }}
          style={{ width: '100%' }}
        >
          <option value="tjell">Familien Tjell</option>
          <option value="frants">Frants</option>
        </select>
      </div>

      {ruleset === 'frants' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={hasBlind}
              onChange={e => setHasBlind(e.target.checked)}
            />
            <span>Blind makker</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(én spiller skiftes til at spille blindt)</span>
          </label>
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Spillere (min. 2)</div>
        {names.map((name, i) => (
          <div key={i} style={{ marginBottom: '0.4rem', position: 'relative' }}>
            <input
              type="text"
              list="known-players"
              placeholder={`Spiller ${i + 1}`}
              value={name}
              onChange={e => handleChange(i, e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        ))}
        {knownPlayers.length > 0 && (
          <datalist id="known-players">
            {knownPlayers.map(n => <option key={n} value={n} />)}
          </datalist>
        )}
      </div>

      <button onClick={handleStart} disabled={!canStart} style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem' }}>
        Start spil
      </button>

      {pastGames.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tidligere spil
            </div>
            <button
              onClick={handleClearHistory}
              style={{ background: 'transparent', border: 'none', color: 'var(--negative)', fontSize: '0.8rem', padding: 0, cursor: 'pointer' }}
            >
              Slet historik
            </button>
          </div>
          {pastGames.map(g => <GameHistoryRow key={g.id} g={g} />)}
        </div>
      )}
    </div>
  )
}
