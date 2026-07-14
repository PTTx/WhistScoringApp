import { useState } from 'react'
import { loadKnownPlayers, loadGames } from '../storage'

interface Props {
  onStart: (opts: { ruleset: 'tjell' | 'frants'; playerNames: string[] }) => void
}

const MAX_PLAYERS = 6

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Setup({ onStart }: Props) {
  const [ruleset, setRuleset] = useState<'tjell' | 'frants'>('tjell')
  const [names, setNames] = useState<string[]>(Array(MAX_PLAYERS).fill(''))
  const knownPlayers = loadKnownPlayers()
  const pastGames = loadGames().filter(g => g.endedAt !== null).reverse().slice(0, 10)

  const filledNames = names.map(n => n.trim()).filter(Boolean)
  const canStart = filledNames.length >= 2

  function handleChange(index: number, value: string) {
    setNames(prev => prev.map((n, i) => (i === index ? value : n)))
  }

  function handleStart() {
    onStart({ ruleset, playerNames: filledNames })
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 400 }}>
      <h2>Nyt spil</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="ruleset" style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Regelsæt</label>
        <select
          id="ruleset"
          value={ruleset}
          onChange={e => setRuleset(e.target.value as 'tjell' | 'frants')}
          style={{ width: '100%' }}
        >
          <option value="tjell">Familien Tjell</option>
          <option value="frants">Frants</option>
        </select>
      </div>

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
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Tidligere spil
          </div>
          {pastGames.map(g => {
            const playerList = g.players.map(p => p.name).join(', ')
            const date = formatDate(g.endedAt!)
            const ruleName = g.ruleset === 'tjell' ? 'Familien Tjell' : 'Frants'
            return (
              <div key={g.id} style={{ background: 'var(--surface)', borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{date}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ruleName} · {g.rounds.length} runder</span>
                </div>
                <div style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>{playerList}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
