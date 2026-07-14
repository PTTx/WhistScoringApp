import { useState } from 'react'
import { loadKnownPlayers } from '../storage'

interface Props {
  onStart: (opts: { ruleset: 'tjell' | 'frants'; playerNames: string[] }) => void
}

const MAX_PLAYERS = 6

export default function Setup({ onStart }: Props) {
  const [ruleset, setRuleset] = useState<'tjell' | 'frants'>('tjell')
  const [names, setNames] = useState<string[]>(Array(MAX_PLAYERS).fill(''))
  const knownPlayers = loadKnownPlayers()

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
    </div>
  )
}
