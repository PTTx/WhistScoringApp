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
  color,
}: {
  label: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
  color?: 'green' | 'default'
}) {
  const isGreen = color === 'green' && selected
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.35rem 0.65rem',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: isGreen ? '#2a7a2a' : selected ? 'var(--accent)' : 'var(--surface)',
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
  const hasBlind = !!game.hasBlind

  // "Sidder over" is shown when players > 4, or in Frants with blind makker enabled
  const showSidderOver = players.length > 4 || (isFrants && hasBlind)

  // minActive: Frants with blind = 3, otherwise 4 (or total players if fewer)
  const minActive = Math.min(players.length, isFrants ? 3 : 4)

  // Init: who is sitting out (inverse of active set)
  const initSittingOut: Set<string> = (() => {
    if (editingRound) {
      const active = new Set(editingRound.activePlayers)
      return new Set(players.map(p => p.id).filter(id => !active.has(id)))
    }
    if (defaultActive && defaultActive.some(id => players.some(p => p.id === id))) {
      const activeIds = new Set(defaultActive.filter(id => players.some(p => p.id === id)))
      return new Set(players.map(p => p.id).filter(id => !activeIds.has(id)))
    }
    // Default: no one sits out (all active)
    return new Set<string>()
  })()

  const [sittingOut, setSittingOut] = useState<Set<string>>(initSittingOut)
  const [sittingOutExpanded, setSittingOutExpanded] = useState(showSidderOver && initSittingOut.size > 0)

  const [isSol, setIsSol] = useState(editingBid?.type === 'sol')

  // Trick bid
  const [melderId, setMelderId] = useState(editingBid?.bidderId ?? '')
  // partnerId: player id, 'blind' (Frants), 'ingen' (no partner), or ''
  const [partnerId, setPartnerId] = useState(() => {
    if (!editingBid || editingBid.type === 'sol') return ''
    if (editingBid.partnerGaveUp) return 'ingen'
    if (editingBid.blindIsPartner) return 'blind'
    const p = editingRound?.partnerships.find(ps => ps.includes(editingBid.bidderId ?? ''))
    return p?.find(id => id !== editingBid.bidderId) ?? ''
  })
  const [tricksBid, setTricksBid] = useState(editingBid?.tricksBid ?? 10)
  // godeType: '' | 'klor-sans' | 'halve' (Tjell), '' | 'klor-sans' (Frants, Halve is part of Gode)
  const [godeType, setGodeType] = useState<'' | 'klor-sans' | 'halve'>(() => {
    if (!editingBid || editingBid.type === 'sol') return ''
    // Reconstruct from stored bid - not persisted granularly, default to ''
    return ''
  })
  const [vipFlips, setVipFlips] = useState(0)
  const [tricksWon, setTricksWon] = useState(editingBid?.tricksWon ?? 10)

  // Sol
  const [solPlayerId, setSolPlayerId] = useState(editingBid?.type === 'sol' ? editingBid.bidderId : '')
  const [solType, setSolType] = useState<'normal' | 'ren' | 'bord' | 'bord-clean'>(
    editingBid?.type === 'sol' ? (editingBid.solType ?? 'normal') : 'normal'
  )
  const [solWon, setSolWon] = useState(editingBid?.type === 'sol' ? (editingBid.solWon ?? false) : false)

  const activePlayers = players.filter(p => !sittingOut.has(p.id)).map(p => p.id)
  const activeCount = activePlayers.length
  const activeFilled = activeCount >= minActive

  function toggleSittingOut(id: string) {
    setSittingOut(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    // Clear melder/partner if they sit out
    if (!sittingOut.has(id)) {
      if (melderId === id) setMelderId('')
      if (partnerId === id) setPartnerId('')
    }
  }

  const blindIsPartner = partnerId === 'blind'
  const partnerGaveUp = partnerId === 'ingen'
  const realPartnerId = (!blindIsPartner && !partnerGaveUp && partnerId !== '') ? partnerId : null
  const opponentIds = activePlayers.filter(id => id !== melderId && id !== realPartnerId)
  const partnerships: [string[], string[]] = partnerGaveUp || blindIsPartner
    ? [[melderId].filter(Boolean), opponentIds]
    : [[melderId, realPartnerId ?? ''].filter(Boolean), opponentIds]

  // Blind chip shows when Frants + (hasBlind game option OR exactly 3 active)
  const showBlindChip = isFrants && (hasBlind || activeCount === 3)

  // Makker chips: non-melder active players + optional 'blind' + 'ingen'
  const makkerOptions: { id: string; label: string }[] = melderId
    ? [
        ...activePlayers.filter(id => id !== melderId).map(id => ({ id, label: s(id, players) })),
        ...(showBlindChip ? [{ id: 'blind', label: 'Blind' }] : []),
        { id: 'ingen', label: 'Ingen' },
      ]
    : []

  const opponentNames = opponentIds.map(id => s(id, players))

  // Derive gode/halve numbers for engines
  const halve = godeType === 'halve'
  const godeForTjell = godeType !== '' ? 1 : 0   // clubs/sans/halve each = 1 doubler
  const godeForFrants = godeType !== ''            // any selection = gode

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
        },
      })
    } else if (isTjell) {
      onRecord({
        activePlayers,
        partnerships: [[melderId, ...(realPartnerId ? [realPartnerId] : [])], opponentIds],
        bid: {
          type: 'trick',
          bidderId: melderId,
          flips: halve ? 0 : vipFlips,
          gode: godeForTjell,
          tricksBid,
          tricksWon,
          partnerGaveUp,
        },
      })
    } else {
      onRecord({
        activePlayers,
        partnerships: [[melderId, ...(realPartnerId ? [realPartnerId] : [])], opponentIds],
        bid: {
          type: 'trick',
          bidderId: melderId,
          vipFlips,
          gode: godeForFrants,
          tricksBid,
          tricksWon,
          partnerGaveUp,
          ...(blindIsPartner ? { blindIsPartner: true } : {}),
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

      {/* Sidder over — only shown when relevant */}
      {showSidderOver && (
        <div style={{ background: 'var(--surface)', borderRadius: 8, marginBottom: '1rem', overflow: 'hidden' }}>
          <button
            onClick={() => setSittingOutExpanded(v => !v)}
            style={{
              width: '100%', background: 'transparent', border: 'none', color: 'var(--text)',
              padding: '0.55rem 0.75rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: '0.9rem',
            }}
          >
            <span>
              Sidder over
              {sittingOut.size > 0 && (
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                  ({[...sittingOut].map(id => s(id, players)).join(', ')})
                </span>
              )}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{sittingOutExpanded ? '▲' : '▼'}</span>
          </button>
          {sittingOutExpanded && (
            <div style={{ padding: '0.4rem 0.75rem 0.65rem', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {players.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    aria-label={`Sitting out ${p.name}`}
                    checked={sittingOut.has(p.id)}
                    onChange={() => toggleSittingOut(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

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
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.25rem' }}>
              <label>
                <input type="radio" name="sol-result" value="won" checked={solWon} onChange={() => setSolWon(true)} />
                {' '}Vundet
              </label>
              <label>
                <input type="radio" name="sol-result" value="lost" checked={!solWon} onChange={() => setSolWon(false)} />
                {' '}Tabt
              </label>
            </div>
          </div>
        </fieldset>
      ) : (
        <>
          <fieldset>
            <legend>Melding</legend>

            <div style={{ marginBottom: '0.65rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Melder</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {activePlayers.map(id => (
                  <Chip
                    key={id}
                    label={s(id, players)}
                    selected={melderId === id}
                    color="green"
                    onClick={() => { setMelderId(id); setPartnerId('') }}
                  />
                ))}
              </div>
            </div>

            {melderId && (
              <div style={{ marginBottom: '0.65rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Makker</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {makkerOptions.map(opt => (
                    <Chip
                      key={opt.id}
                      label={opt.label}
                      selected={partnerId === opt.id}
                      onClick={() => setPartnerId(opt.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {melderId && partnerId && (
              <div style={{ marginBottom: '0.65rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>Modstandere: </span>
                <span style={{ color: 'var(--text)' }}>
                  {opponentNames.length > 0 ? opponentNames.join(', ') : '–'}
                </span>
              </div>
            )}

            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Stik budt</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                {TRICK_OPTIONS.map(n => (
                  <Chip key={n} label={String(n)} selected={tricksBid === n} onClick={() => setTricksBid(n)} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Gode</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                <Chip
                  label="Klør / sans"
                  selected={godeType === 'klor-sans'}
                  onClick={() => setGodeType(godeType === 'klor-sans' ? '' : 'klor-sans')}
                  disabled={isTjell && vipFlips > 0}
                />
                {isTjell && (
                  <Chip
                    label="Halve"
                    selected={godeType === 'halve'}
                    onClick={() => { setGodeType(godeType === 'halve' ? '' : 'halve'); setVipFlips(0) }}
                    disabled={vipFlips > 0}
                  />
                )}
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
                    onClick={() => { setVipFlips(o.value); if (o.value > 0) setGodeType(g => g === 'halve' ? '' : g) }}
                    disabled={isTjell && halve && o.value > 0}
                  />
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Resultat</legend>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Stik vundet af melder</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                {TRICKS_WON_OPTIONS.map(n => (
                  <Chip key={n} label={String(n)} selected={tricksWon === n} onClick={() => setTricksWon(n)} />
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
