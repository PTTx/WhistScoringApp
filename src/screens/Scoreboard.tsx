import { useState } from 'react'
import type { GameRecord } from '../storage'

interface Props {
  game: GameRecord
  onAddPlayer: (name: string) => void
  onNewRound: () => void
  onEnd: () => void
}

export default function Scoreboard({ game, onAddPlayer, onNewRound, onEnd }: Props) {
  const [newName, setNewName] = useState('')

  function handleAdd() {
    if (!newName.trim()) return
    onAddPlayer(newName.trim())
    setNewName('')
  }

  const sorted = [...game.players].sort((a, b) => b.balance - a.balance)

  return (
    <div style={{ padding: '1rem', maxWidth: 400 }}>
      <h2>Scoreboard</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0.4rem', borderBottom: '1px solid #ccc' }}>Player</th>
            <th style={{ textAlign: 'right', padding: '0.4rem', borderBottom: '1px solid #ccc' }}>DKK</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.id}>
              <td style={{ padding: '0.4rem' }}>{p.name}</td>
              <td style={{
                padding: '0.4rem',
                textAlign: 'right',
                color: p.balance > 0 ? 'green' : p.balance < 0 ? 'red' : 'inherit',
              }}>
                {p.balance.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Round history</h3>
        {game.rounds.length === 0 ? (
          <p style={{ color: '#666' }}>No rounds yet.</p>
        ) : (
          game.rounds.map((round, i) => (
            <div key={round.id} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#f5f5f5', borderRadius: 4 }}>
              <strong>Round {i + 1}</strong>
              {round.bids.map((bid, j) => (
                <div key={j} style={{ fontSize: '0.9em', color: '#444', marginTop: 2 }}>
                  {bid.type === 'sol'
                    ? `Sol (${bid.solType}): ${bid.solWon ? 'won' : 'lost'}`
                    : `Bid ${bid.tricksBid ?? '?'} → won ${bid.tricksWon ?? '?'}`
                  }
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="New player name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
        >
          Add player
        </button>
      </div>

      <button
        onClick={onNewRound}
        style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem', background: '#2980b9', color: 'white', border: 'none', borderRadius: 4 }}
      >
        New Round
      </button>

      <button
        onClick={onEnd}
        style={{ width: '100%', padding: '0.75rem', background: '#c0392b', color: 'white', border: 'none', borderRadius: 4 }}
      >
        End Game
      </button>
    </div>
  )
}
