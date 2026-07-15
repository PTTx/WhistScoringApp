import { useState } from 'react'
import type { GameRecord } from '../storage'
import type { RecordRoundInput } from '../store'

interface Props {
  game: GameRecord
  defaultActive?: string[]
  editingRoundIndex?: number | null
  onRecord: (input: RecordRoundInput) => void
  onBack: () => void
}

const SOL_TYPES: { value: 'normal' | 'ren' | 'bord' | 'bord-clean'; label: string }[] = [
  { value: 'normal', label: 'Sol' },
  { value: 'ren', label: 'Ren sol' },
  { value: 'bord-clean', label: 'Bord u/stik' },
  { value: 'bord', label: 'Bord m/stik' },
]

const TRICK_OPTIONS = [8, 9, 10, 11, 12, 13]
const TRICKS_WON_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
const VIP_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '–' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
]

function Chip({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.35rem 0.65rem',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: selected ? 'var(--accent)' : 'var(--surface)',
        color: selected ? '#fff' : 'var(--text)',
        fontSize: '0.95rem',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function s(id: string, players: GameRecord['players']) {
  return players.find(p => p.id === id)?.name ?? id
}

export default function Round({ game, defaultActive, editingRoundIndex, onRecord, onBack }: Props) {
  const editingRound = editingRoundIndex != null ? game.rounds[editingRoundIndex] : null
  const editingBid = editingRound?.bids[0] ?? null
  const { players, ruleset } = game
  const isTjell = ruleset === 'tjell'
  const isFrants = ruleset === 'frants'

  // Active players: default to all players, or the editing round's active players
  const initActiveSet: Set<string> = editingRound
    ? new Set(editingRound.activePlayers)
    : defaultActive && defaultActive.some(Boolean)
      ? new Set(defaultActive.filter(Boolean))
      : new Set(players.map(p => p.id))

  const [activeSet, setActiveSet] = useState<Set<string>>(initActiveSet)
  // Only show the collapsible if there are more than 4 players
  const [activeExpanded, setActiveExpanded] = useState(players.length > 4)

  const [isSol, setIsSol] = useState(editingBid?.type === 'sol')

  // Trick bid
  const [melderId, setMelderId] = useState(editingBid?.bidderId ?? '')
  const [partnerId, setPartnerId] = useState(() => {
    if (!editingBid || editingBid.type === 'sol') return ''
    const p = editingRound?.partnerships.find(ps => ps.includes(editingBid.bidderId ?? ''))
    const partner = p?.find(id => id !== editingBid.bidderId)
    return partner ?? (editingBid.partnerGaveUp ? 'self' : '')
  })
  const [tricksBid, setTricksBid] = useState(editingBid?.tricksBid ?? 10)
  const [gode, setGode] = useState(false)
  const [halve, setHalve] = useState(false)
  const [vipFlips, setVipFlips] = useState(0)
  const [tricksWon, setTricksWon] = useState(editingBid?.tricksWon ?? 10)

  // Blind makker (Frants only)
  const [blindMakkerId, setBlindMakkerId] = useState<string>(editingBid?.blindMakkerId ?? '')

  // Sol
  const [solPlayerId, setSolPlayerId] = useState(editingBid?.type === 'sol' ? editingBid.bidderId : '')
  const [solType, setSolType] = useState<'normal' | 'ren' | 'bord' | 'bord-clean'>(
    editingBid?.type === 'sol' ? (editingBid.solType ?? 'normal') : 'normal'
  )
  const [solWon, setSolWon] = useState(editingBid?.type === 'sol' ? (editingBid.solWon ?? false) : false)

  const activePlayers = players.filter(p => activeSet.has(p.id)).map(p => p.id)
  const activeCount = activePlayers.length
  const activeFilled = activeCount >= 4

  function toggleActive(id: string) {
    setActiveSet(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    // Clear melder/partner if they are no longer active
    if (activeSet.has(id)) {
      if (melderId === id) setMelderId('')
      if (partnerId === id) setPartnerId('')
    }
  }

  const partnerGaveUp = partnerId === 'self'
  const melderPartner = partnerGaveUp ? null : partnerId
  const opponentIds = activePlayers.filter(id => id !== melderId && id !== melderPartner)
  const partnerships: [string[], string[]] = partnerGaveUp
    ? [[melderId], opponentIds]
    : [[melderId, melderPartner ?? ''].filter(Boolean), opponentIds]

  const canRecord = activeFilled && (isSol
    ? solPlayerId !== ''
    : melderId !== '' && partnerId !== '')

  function handleRecord() {
    if (!canRecord) return

    if (isSol) {
      onRecord({
        activePlayers,
        partnerships,
        bid: {
          type: 'sol',
          solPlayerId,
          solType,
          won: solWon,
          ...(isFrants && blindMakkerId ? { blindMakkerId } : {}),
        },
      })
    } else if (isTjell) {
      const godeNum = (gode ? 1 : 0) + (halve ? 1 : 0)
      onRecord({
        activePlayers,
        partnerships: [[melderId, ...(melderPartner ? [melderPartner] : [])], opponentIds],
        bid: {
          type: 'trick',
          bidderId: melderId,
          flips: halve ? 0 : vipFlips,
          gode: godeNum,
          tricksBid,
          tricksWon,
          partnerGaveUp,
        },
      })
    } else {
      onRecord({
        activePlayers,
        partnerships: [[melderId, ...(melderPartner ? [melderPartner] : [])], opponentIds],
        bid: {
          type: 'trick',
          bidderId: melderId,
          vipFlips,
          gode,
          tricksBid,
          tricksWon,
          partnerGaveUp,
          ...(blindMakkerId ? { blindMakkerId } : {}),
        },
      })
    }
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 440 }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '0 0 0.75rem', fontSize: '0.9rem' }}>
        ← Tilbage
      </button>
      <h2>{editingRound ? 'Rediger runde' : 'Ny runde'}</h2>

      {/* Aktive spillere — collapsible, only relevant when > 4 players */}
      <div style={{ background: 'var(--surface)', borderRadius: 8, marginBottom: '1rem', overflow: 'hidden' }}>
        <button
          onClick={() => setActiveExpanded(v => !v)}
          style={{
            width: '100%', background: 'transparent', border: 'none', color: 'var(--text)',
            padding: '0.55rem 0.75rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '0.9rem',
          }}
        >
          <span>
            Aktive spillere
            <span style={{ color: activeCount < 4 ? 'var(--negative)' : 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
              ({activeCount} valgt)
            </span>
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{activeExpanded ? '▲' : '▼'}</span>
        </button>
        {activeExpanded && (
          <div style={{ padding: '0.4rem 0.75rem 0.65rem', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {players.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  aria-label={`Active player ${p.name}`}
                  checked={activeSet.has(p.id)}
                  onChange={() => toggleActive(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          <input type="checkbox" checked={isSol} onChange={e => setIsSol(e.target.checked)} />
          {' '}Sol melding
        </label>
      </div>

      {isSol ? (
        <fieldset>
          <legend>Sol</legend>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Sol spiller</div>
              <select
                aria-label="Sol player"
                value={solPlayerId}
                onChange={e => setSolPlayerId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">--</option>
                {activePlayers.map(id => (
                  <option key={id} value={id}>{s(id, players)}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Sol type</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                {SOL_TYPES.map(st => (
                  <Chip
                    key={st.value}
                    label={st.label}
                    selected={solType === st.value}
                    onClick={() => setSolType(st.value)}
                  />
                ))}
              </div>
            </div>
            {isFrants && (
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Blind makker</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                  <Chip
                    label="Ingen"
                    selected={blindMakkerId === ''}
                    onClick={() => setBlindMakkerId('')}
                  />
                  {activePlayers.filter(id => id !== solPlayerId).map(id => (
                    <Chip
                      key={id}
                      label={s(id, players)}
                      selected={blindMakkerId === id}
                      onClick={() => setBlindMakkerId(id)}
                    />
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.25rem' }}>
              <label>
                <input type="radio" name="sol-result" value="won" checked={solWon}
                  onChange={() => setSolWon(true)} />
                {' '}Vundet
              </label>
              <label>
                <input type="radio" name="sol-result" value="lost" checked={!solWon}
                  onChange={() => setSolWon(false)} />
                {' '}Tabt
              </label>
            </div>
          </div>
        </fieldset>
      ) : (
        <>
          <fieldset>
            <legend>Melding</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Melder</div>
                <select
                  aria-label="Bidder"
                  value={melderId}
                  onChange={e => { setMelderId(e.target.value); setPartnerId('') }}
                  style={{ width: '100%' }}
                >
                  <option value="">--</option>
                  {activePlayers.map(id => (
                    <option key={id} value={id}>{s(id, players)}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Makker</div>
                <select
                  aria-label="Makker"
                  value={partnerId}
                  onChange={e => setPartnerId(e.target.value)}
                  disabled={!melderId}
                  style={{ width: '100%' }}
                >
                  <option value="">--</option>
                  <option value="self">Selv (ingen makker)</option>
                  {activePlayers.filter(id => id !== melderId).map(id => (
                    <option key={id} value={id}>{s(id, players)}</option>
                  ))}
                </select>
              </div>
            </div>

            {isFrants && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Blind makker</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                  <Chip
                    label="Ingen"
                    selected={blindMakkerId === ''}
                    onClick={() => setBlindMakkerId('')}
                  />
                  {activePlayers.filter(id => id !== melderId).map(id => (
                    <Chip
                      key={id}
                      label={s(id, players)}
                      selected={blindMakkerId === id}
                      onClick={() => setBlindMakkerId(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Stik budt</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                {TRICK_OPTIONS.map(n => (
                  <Chip
                    key={n}
                    label={String(n)}
                    selected={tricksBid === n}
                    onClick={() => setTricksBid(n)}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Vip</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                {VIP_OPTIONS.map(o => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    selected={vipFlips === o.value}
                    onClick={() => setVipFlips(o.value)}
                    disabled={isTjell && halve && o.value > 0}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label>
                <input
                  type="checkbox"
                  aria-label="Gode"
                  checked={gode}
                  onChange={e => setGode(e.target.checked)}
                />
                {' '}Gode ({isTjell ? 'klør / uden trumf' : 'klør / uden trumf / Halve'})
              </label>
              {isTjell && (
                <label style={{ opacity: vipFlips > 0 ? 0.4 : 1, pointerEvents: vipFlips > 0 ? 'none' : 'auto' }}>
                  <input
                    type="checkbox"
                    aria-label="Halve"
                    checked={halve}
                    disabled={vipFlips > 0}
                    onChange={e => { setHalve(e.target.checked); if (e.target.checked) setVipFlips(0) }}
                  />
                  {' '}Halve
                </label>
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend>Resultat</legend>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Stik vundet af melder</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                {TRICKS_WON_OPTIONS.map(n => (
                  <Chip
                    key={n}
                    label={String(n)}
                    selected={tricksWon === n}
                    onClick={() => setTricksWon(n)}
                  />
                ))}
              </div>
            </div>
          </fieldset>
        </>
      )}

      <button onClick={handleRecord} disabled={!canRecord} style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem' }}>
        {editingRound ? 'Gem ændringer' : 'Registrer runde'}
      </button>
    </div>
  )
}
