import { useState } from 'react'

interface Props {
  onStart: (opts: { ruleset: 'tjell' | 'frants'; playerNames: string[] }) => void
}

const MAX_PLAYERS = 6

export default function Setup({ onStart }: Props) {
  const [ruleset, setRuleset] = useState<'tjell' | 'frants'>('tjell')
  const [names, setNames] = useState<string[]>(Array(MAX_PLAYERS).fill(''))

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
      <h2>New Game</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="ruleset">Ruleset</label>
        <select
          id="ruleset"
          value={ruleset}
          onChange={e => setRuleset(e.target.value as 'tjell' | 'frants')}
          style={{ display: 'block', marginTop: 4, width: '100%', padding: '0.5rem' }}
        >
          <option value="tjell">Familien Tjell</option>
          <option value="frants">Frants</option>
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        {names.map((name, i) => (
          <input
            key={i}
            type="text"
            placeholder={`Player ${i + 1}`}
            value={name}
            onChange={e => handleChange(i, e.target.value)}
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginBottom: 4, boxSizing: 'border-box' }}
          />
        ))}
      </div>

      <button onClick={handleStart} disabled={!canStart} style={{ width: '100%', padding: '0.75rem' }}>
        Start Game
      </button>
    </div>
  )
}
