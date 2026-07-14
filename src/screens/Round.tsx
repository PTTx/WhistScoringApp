import { useState } from 'react'
import type { GameRecord } from '../storage'
import type { RecordRoundInput } from '../store'

interface Props {
  game: GameRecord
  onRecord: (input: RecordRoundInput) => void
  onEnd: () => void
}

const SOL_TYPES = [
  { value: 'normal', label: 'Normal Sol (0.50 / 2.00)' },
  { value: 'ren', label: 'Ren Sol (1.00 / 4.00)' },
  { value: 'bord', label: 'På bordet (1.50 / 8.00)' },
  { value: 'bord-clean', label: 'På bordet uden stik (2.00 / 16.00)' },
]

export default function Round({ game, onRecord, onEnd }: Props) {
  const { players, ruleset } = game
  const isTjell = ruleset === 'tjell'

  const [active, setActive] = useState<string[]>(['', '', '', ''])
  const [isSol, setIsSol] = useState(false)

  // Trick bid state
  const [bidderId, setBidderId] = useState('')
  const [tricksBid, setTricksBid] = useState(isTjell ? 7 : 8)
  const [tricksWon, setTricksWon] = useState(isTjell ? 7 : 8)
  const [clubs, setClubs] = useState(false)
  const [sans, setSans] = useState(false)
  const [halve, setHalve] = useState(false)
  const [vipFlips, setVipFlips] = useState(0)
  const [partnerGaveUp, setPartnerGaveUp] = useState(false)

  // Sol state
  const [solPlayerId, setSolPlayerId] = useState('')
  const [solType, setSolType] = useState<'normal' | 'ren' | 'bord' | 'bord-clean'>('normal')
  const [solWon, setSolWon] = useState(false)

  const activeFilled = active.every(id => id !== '')
  const partnerships: [string[], string[]] = [[active[0], active[1]], [active[2], active[3]]]

  const gode = isTjell ? (clubs ? 1 : 0) + (sans ? 1 : 0) + (halve ? 1 : 0) : undefined
  const godeFrants = !isTjell ? clubs || sans : undefined

  const canRecord = activeFilled && (isSol
    ? solPlayerId !== ''
    : bidderId !== '')

  function handleSetActive(index: number, value: string) {
    setActive(prev => prev.map((v, i) => i === index ? value : v))
  }

  function handleRecord() {
    if (!canRecord) return
    if (isSol) {
      onRecord({
        activePlayers: active,
        partnerships,
        bid: { type: 'sol', solPlayerId, solType, won: solWon },
      })
    } else if (isTjell) {
      onRecord({
        activePlayers: active,
        partnerships,
        bid: {
          type: 'trick',
          bidderId,
          flips: vipFlips,
          gode: gode!,
          tricksBid,
          tricksWon,
          partnerGaveUp,
        },
      })
    } else {
      onRecord({
        activePlayers: active,
        partnerships,
        bid: {
          type: 'trick',
          bidderId,
          vipFlips,
          gode: godeFrants!,
          tricksBid,
          tricksWon,
        },
      })
    }
  }

  const minBid = isTjell ? 7 : 8

  return (
    <div style={{ padding: '1rem', maxWidth: 400 }}>
      <h2>New Round</h2>

      <fieldset style={{ marginBottom: '1rem' }}>
        <legend>Active players</legend>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ marginBottom: 4 }}>
            <label htmlFor={`active-${i + 1}`}>Active player {i + 1}</label>
            <select
              id={`active-${i + 1}`}
              value={active[i]}
              onChange={e => handleSetActive(i, e.target.value)}
              style={{ display: 'block', width: '100%', padding: '0.4rem' }}
            >
              <option value="">-- select --</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        ))}
        <small style={{ color: '#666' }}>Players 1+2 vs Players 3+4</small>
      </fieldset>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          <input
            type="checkbox"
            aria-label="Sol"
            checked={isSol}
            onChange={e => setIsSol(e.target.checked)}
          />
          {' '}Sol round
        </label>
      </div>

      {isSol ? (
        <fieldset style={{ marginBottom: '1rem' }}>
          <legend>Sol</legend>
          <div style={{ marginBottom: 4 }}>
            <label htmlFor="sol-player">Sol player</label>
            <select
              id="sol-player"
              value={solPlayerId}
              onChange={e => setSolPlayerId(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '0.4rem' }}
            >
              <option value="">-- select --</option>
              {active.filter(Boolean).map(id => {
                const p = players.find(pl => pl.id === id)!
                return <option key={id} value={id}>{p?.name}</option>
              })}
            </select>
          </div>
          <div style={{ marginBottom: 4 }}>
            <label htmlFor="sol-type">Sol type</label>
            <select
              id="sol-type"
              value={solType}
              onChange={e => setSolType(e.target.value as typeof solType)}
              style={{ display: 'block', width: '100%', padding: '0.4rem' }}
            >
              {SOL_TYPES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <label>
            <input
              type="checkbox"
              aria-label="Sol won"
              checked={solWon}
              onChange={e => setSolWon(e.target.checked)}
            />
            {' '}Sol won
          </label>
        </fieldset>
      ) : (
        <fieldset style={{ marginBottom: '1rem' }}>
          <legend>Trick bid</legend>

          <div style={{ marginBottom: 4 }}>
            <label htmlFor="bidder">Bidder</label>
            <select
              id="bidder"
              value={bidderId}
              onChange={e => setBidderId(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '0.4rem' }}
            >
              <option value="">-- select --</option>
              {active.filter(Boolean).map(id => {
                const p = players.find(pl => pl.id === id)!
                return <option key={id} value={id}>{p?.name}</option>
              })}
            </select>
          </div>

          <div style={{ marginBottom: 4 }}>
            <label htmlFor="tricks-bid">Tricks bid</label>
            <input
              id="tricks-bid"
              type="number"
              min={minBid}
              max={13}
              value={tricksBid}
              onChange={e => setTricksBid(Number(e.target.value))}
              style={{ display: 'block', width: '100%', padding: '0.4rem' }}
            />
          </div>

          <div style={{ marginBottom: 4 }}>
            <label>
              <input
                type="checkbox"
                aria-label="Clubs"
                checked={clubs}
                onChange={e => setClubs(e.target.checked)}
              />
              {' '}Clubs
            </label>
            {' '}
            <label>
              <input
                type="checkbox"
                aria-label="Sans"
                checked={sans}
                onChange={e => setSans(e.target.checked)}
              />
              {' '}Sans trumpf
            </label>
          </div>

          {isTjell && (
            <div style={{ marginBottom: 4 }}>
              <label>
                <input
                  type="checkbox"
                  aria-label="Halve"
                  checked={halve}
                  disabled={vipFlips > 0}
                  onChange={e => setHalve(e.target.checked)}
                />
                {' '}Halve
              </label>
            </div>
          )}

          <div style={{ marginBottom: 4 }}>
            <label htmlFor="vip-flips">VIP flips</label>
            <input
              id="vip-flips"
              type="number"
              min={0}
              max={3}
              value={vipFlips}
              disabled={isTjell && halve}
              onChange={e => setVipFlips(Number(e.target.value))}
              style={{ display: 'block', width: '100%', padding: '0.4rem' }}
            />
          </div>

          {isTjell && (
            <div style={{ marginBottom: 4 }}>
              <label>
                <input
                  type="checkbox"
                  aria-label="Give-up"
                  checked={partnerGaveUp}
                  onChange={e => setPartnerGaveUp(e.target.checked)}
                />
                {' '}Partner gave up
              </label>
            </div>
          )}

          <div style={{ marginBottom: 4 }}>
            <label htmlFor="tricks-won">Tricks won</label>
            <input
              id="tricks-won"
              type="number"
              min={0}
              max={13}
              value={tricksWon}
              onChange={e => setTricksWon(Number(e.target.value))}
              style={{ display: 'block', width: '100%', padding: '0.4rem' }}
            />
          </div>
        </fieldset>
      )}

      <button
        onClick={handleRecord}
        disabled={!canRecord}
        style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem' }}
      >
        Record Round
      </button>

      <button
        onClick={onEnd}
        style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: '1px solid #ccc' }}
      >
        End Game
      </button>
    </div>
  )
}
