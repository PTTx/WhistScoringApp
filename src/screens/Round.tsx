import { useState } from 'react'
import type { GameRecord } from '../storage'
import type { RecordRoundInput, TjellBidInput, FrantsBidInput, SolBidInput } from '../store'

interface Props {
  game: GameRecord

  editingRoundIndex?: number | null
  onRecord: (input: RecordRoundInput) => void
  onBack: () => void
}

const SOL_TYPES: { value: 'normal' | 'ren' | 'bord' | 'bord-clean'; label: string }[] = [
  { value: 'normal', label: 'Alm' },
  { value: 'ren', label: 'Ren' },
  { value: 'bord-clean', label: 'Bord u/stik' },
  { value: 'bord', label: 'Bord m/stik' },
]

const TRICK_OPTIONS = [8, 9, 10, 11, 12, 13]
const TRICKS_WON_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
const VIP_OPTIONS = [1, 2, 3]

function Chip({
  label, selected, onClick, disabled, color,
}: {
  label: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
  color?: 'green' | 'red'
}) {
  let bg = selected ? 'var(--accent)' : 'var(--surface)'
  if (color === 'green' && selected) bg = '#2a7a2a'
  if (color === 'red' && selected) bg = '#8b1a1a'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid var(--border)',
        background: bg,
        color: selected ? '#fff' : 'var(--text)',
        fontSize: '0.95rem', opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >{label}</button>
  )
}

function s(id: string, players: GameRecord['players']) {
  return players.find(p => p.id === id)?.name ?? id
}

export default function Round({ game, editingRoundIndex, onRecord, onBack }: Props) {
  const editingRound = editingRoundIndex != null ? game.rounds[editingRoundIndex] : null
  const editingBid = editingRound?.bids[0] ?? null
  const { players, ruleset } = game
  const isTjell = ruleset === 'tjell'
  const isFrants = ruleset === 'frants'
  const hasBlind = !!game.hasBlind
  const hasKat = !!game.hasKat

  const virtualPartner = hasKat || hasBlind

  // All players always available — no interactive sitting-out toggle
  const activePlayers = players.map(p => p.id)
  const activeCount = players.length
  // Kat fills the 4th seat only in Tjell when exactly 3 real players
  const katInPlay = hasKat && activeCount === 3
  // Blind fills the 4th seat only in Frants when exactly 3 real players
  const blindInPlay = hasBlind && activeCount === 3
  // Game is always 4-handed (virtual or real players fill the seats)
  const effectiveSeats = 4
  const activeFilled = activeCount >= (virtualPartner ? 3 : 4)
  // Selectable opponents mode: more players than fit in a 4-seat game
  const hasExtraPlayers = players.length > (virtualPartner ? 3 : 4)

  // --- Sol type ---
  const [solType, setSolType] = useState<'normal' | 'ren' | 'bord' | 'bord-clean' | null>(
    editingBid?.type === 'sol' ? (editingBid.solType ?? 'normal') : null
  )
  const isSol = solType !== null

  // --- Melder ---
  const [melderId, setMelderId] = useState(editingBid?.bidderId ?? '')

  // --- Partner (trick mode) ---
  // partnerId: player id | 'blind' | 'kat' | '' (selv)
  const [partnerId, setPartnerId] = useState(() => {
    if (!editingBid || editingBid.type === 'sol') return hasKat ? 'kat' : ''
    if (editingBid.katIsPartner) return 'kat'
    if (editingBid.partnerGaveUp) return ''
    if (editingBid.blindIsPartner) return 'blind'
    const p = editingRound?.partnerships.find(ps => ps.includes(editingBid.bidderId ?? ''))
    return p?.find(id => id !== editingBid.bidderId) ?? ''
  })

  // --- Sol second player ---
  const [solMakkerId, setSolMakkerId] = useState('')
  const [solMakkerWon, setSolMakkerWon] = useState<boolean | null>(null)

  // --- Trick fields ---
  const [tricksBid, setTricksBid] = useState(editingBid?.tricksBid ?? 10)
  const [godeKlorSans, setGodeKlorSans] = useState(editingBid?.godeKlorSans ?? false)
  const [godeHalve, setGodeHalve] = useState(editingBid?.godeHalve ?? false)
  const [vipFlips, setVipFlips] = useState(editingBid?.vipFlips ?? 0)
  const [tricksWon, setTricksWon] = useState(editingBid?.tricksWon ?? 10)

  // --- Sol result ---
  const [solWon, setSolWon] = useState<boolean | null>(editingBid?.type === 'sol' ? (editingBid.solWon ?? false) : null)

  // --- Selectable opponents (only when hasExtraPlayers) ---
  const initSelectedOpponents: Set<string> = (() => {
    if (editingRound) {
      const [partA, partB] = editingRound.partnerships
      const oppSide = partA.includes(editingBid?.bidderId ?? '') ? partB : partA
      return new Set(oppSide)
    }
    return new Set<string>()
  })()
  const [selectedOpponents, setSelectedOpponents] = useState<Set<string>>(initSelectedOpponents)

  function toggleOpponent(id: string) {
    setSelectedOpponents(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // --- Derived ---
  // Kat: auto-partner when 3 real players; selectable when hasExtraPlayers
  const katIsPartner = katInPlay || partnerId === 'kat'
  // Blind: explicit selection only
  const blindIsPartner = partnerId === 'blind'
  const partnerGaveUp = !katIsPartner && !blindIsPartner && partnerId === ''
  const realPartnerId = (!katIsPartner && !blindIsPartner && partnerId !== '') ? partnerId : null

  // Kat chip: always show when hasKat (disabled+selected when katInPlay, selectable when extra players)
  const showKatChip = hasKat
  // Blind chip: show when hasBlind (always selectable)
  const showBlindChip = isFrants && hasBlind

  // Players available to select as opponents (exclude melder and real partner)
  const opponentCandidates = activePlayers.filter(id => id !== melderId && id !== realPartnerId)

  // Opponents: selectedOpponents when hasExtraPlayers, otherwise all non-melder/partner
  const opponentIds: string[] = hasExtraPlayers && !isSol
    ? [...selectedOpponents].filter(id => id !== melderId && id !== realPartnerId)
    : activePlayers.filter(id => id !== melderId && id !== realPartnerId)

  // Required real opponents = total seats - bidder - partner seat
  const hasPartnerSeat = realPartnerId != null || katIsPartner || blindIsPartner
  const requiredOppCount = effectiveSeats - 1 - (hasPartnerSeat ? 1 : 0)

  const makkerOptions: { id: string; label: string }[] = melderId && !isSol && !showKatChip
    ? [
        ...activePlayers.filter(id => id !== melderId).map(id => ({ id, label: s(id, players) })),
        ...(showBlindChip ? [{ id: 'blind', label: 'Blind' }] : []),
      ]
    : melderId && !isSol && showKatChip && hasExtraPlayers
      ? [
          { id: 'kat', label: 'Kat' },
          ...activePlayers.filter(id => id !== melderId).map(id => ({ id, label: s(id, players) })),
          ...(showBlindChip ? [{ id: 'blind', label: 'Blind' }] : []),
        ]
      : []

  const halve = godeHalve
  const godeForTjell = (godeKlorSans ? 1 : 0) + (godeHalve ? 1 : 0)
  const godeForFrants = godeKlorSans

  const klorSansDisabled = isFrants && vipFlips > 0
  const halveDisabled = vipFlips > 0
  const vipDisabled = (isTjell && halve) || (isFrants && godeKlorSans)

  // Sidder over (read-only, shown below Modstandere when hasExtraPlayers)
  // Players not assigned a seat + any virtual entity not used this round
  const playingRealIds = new Set([
    ...(melderId ? [melderId] : []),
    ...(realPartnerId ? [realPartnerId] : []),
    ...opponentIds,
  ])
  const sidderOverLabels: string[] = [
    ...players.filter(p => !playingRealIds.has(p.id)).map(p => p.name),
    ...(hasKat && !katIsPartner ? ['Kat'] : []),
    ...(hasBlind && !blindIsPartner && !blindInPlay ? ['Blind makker'] : []),
  ]

  // activePlayers for the record: those actually playing (4 seats)
  const recordActivePlayers = hasExtraPlayers
    ? [
        ...(melderId ? [melderId] : []),
        ...(realPartnerId ? [realPartnerId] : []),
        ...opponentIds,
      ]
    : activePlayers

  // canRecord
  const opponentsFilled = !hasExtraPlayers || opponentIds.length >= requiredOppCount
  const solResultOk = !isSol || (solWon !== null && (!solMakkerId || solMakkerWon !== null))
  const canRecord = activeFilled && melderId !== '' && opponentsFilled && solResultOk

  function handleRecord() {
    if (!canRecord) return

    const bidderPartnership = [melderId, ...(realPartnerId ? [realPartnerId] : [])]
    const partnerships: [string[], string[]] = [bidderPartnership, opponentIds]

    if (isSol) {
      const solBids: SolBidInput[] = [
        { type: 'sol', solPlayerId: melderId, solType: solType!, won: solWon === true },
        ...(solMakkerId ? [{ type: 'sol' as const, solPlayerId: solMakkerId, solType: solType!, won: solMakkerWon === true }] : []),
      ]
      onRecord({ activePlayers: recordActivePlayers, partnerships, bids: solBids })
    } else if (isTjell) {
      const bid: TjellBidInput = {
        type: 'trick',
        bidderId: melderId,
        flips: halve ? 0 : vipFlips,
        gode: godeForTjell,
        godeKlorSans,
        godeHalve,
        tricksBid,
        tricksWon,
        partnerGaveUp: !katIsPartner && partnerGaveUp,
        ...(katIsPartner ? { katIsPartner: true } : {}),
      }
      onRecord({ activePlayers: recordActivePlayers, partnerships, bids: [bid] })
    } else {
      const bid: FrantsBidInput = {
        type: 'trick',
        bidderId: melderId,
        vipFlips,
        gode: godeForFrants,
        godeKlorSans,
        tricksBid,
        tricksWon,
        partnerGaveUp,
        ...(blindIsPartner ? { blindIsPartner: true } : {}),
      }
      onRecord({ activePlayers: recordActivePlayers, partnerships, bids: [bid] })
    }
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 440 }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '0 0 0.75rem', fontSize: '0.9rem' }}>
        ← Tilbage
      </button>
      <h2>{editingRound ? 'Rediger runde' : 'Ny runde'}</h2>

      <fieldset>
        <legend>Melding</legend>

        {/* Melder / Sol spiller */}
        <div style={{ marginBottom: '0.65rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
            {isSol ? 'Sol spiller' : 'Melder'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {activePlayers.map(id => (
              <Chip
                key={id}
                label={s(id, players)}
                selected={melderId === id}
                color="green"
                onClick={() => {
                  setMelderId(id)
                  if (!isSol) {
                    setPartnerId(hasKat ? 'kat' : '')
                    setSelectedOpponents(new Set())
                  }
                  if (isSol && solMakkerId === id) setSolMakkerId('')
                }}
              />
            ))}
          </div>
        </div>

        {/* Sol makker (sol mode only) */}
        {isSol && melderId && (
          <div style={{ marginBottom: '0.65rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Sol makker (valgfri)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {activePlayers.filter(id => id !== melderId).map(id => (
                <Chip
                  key={id}
                  label={s(id, players)}
                  selected={solMakkerId === id}
                  onClick={() => { setSolMakkerId(solMakkerId === id ? '' : id); setSolMakkerWon(null) }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Makker (trick mode) */}
        {!isSol && melderId && (
          <div style={{ marginBottom: '0.65rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Makker</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {katInPlay ? (
                <Chip label="Kat" selected={true} disabled={true} onClick={() => {}} color="green" />
              ) : (
                makkerOptions.map(opt => (
                  <Chip
                    key={opt.id}
                    label={opt.label}
                    selected={partnerId === opt.id}
                    onClick={() => setPartnerId(partnerId === opt.id ? '' : opt.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Modstandere — selectable when hasExtraPlayers, read-only otherwise */}
        {!isSol && melderId && (
          <div style={{ marginBottom: '0.65rem' }}>
            {hasExtraPlayers ? (
              <>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Modstandere (vælg {requiredOppCount})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {opponentCandidates.map(id => (
                    <Chip
                      key={id}
                      label={s(id, players)}
                      selected={selectedOpponents.has(id)}
                      onClick={() => toggleOpponent(id)}
                    />
                  ))}
                </div>
                {sidderOverLabels.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Sidder over: {sidderOverLabels.join(', ')}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>Modstandere: </span>
                <span style={{ color: 'var(--text)' }}>
                  {opponentIds.map(id => s(id, players)).join(', ') || '–'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Stik budt */}
        {!isSol && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Stik budt</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
              {TRICK_OPTIONS.map(n => (
                <Chip key={n} label={String(n)} selected={tricksBid === n} onClick={() => setTricksBid(n)} />
              ))}
            </div>
          </div>
        )}

        {/* Gode */}
        {!isSol && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Gode</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
              <Chip
                label="Klør / sans"
                selected={godeKlorSans}
                onClick={() => { setGodeKlorSans(v => !v); if (isFrants) setVipFlips(0) }}
                disabled={klorSansDisabled}
              />
              {isTjell && (
                <Chip
                  label="Halve"
                  selected={godeHalve}
                  onClick={() => { setGodeHalve(v => !v); setVipFlips(0) }}
                  disabled={halveDisabled}
                />
              )}
            </div>
          </div>
        )}

        {/* Vip — no "–", deselectable by clicking selected */}
        {!isSol && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Vip</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
              {VIP_OPTIONS.map(v => (
                <Chip
                  key={v}
                  label={String(v)}
                  selected={vipFlips === v}
                  onClick={() => {
                    const next = vipFlips === v ? 0 : v
                    setVipFlips(next)
                    if (next > 0) {
                      setGodeHalve(false)
                      if (isFrants) setGodeKlorSans(false)
                    }
                  }}
                  disabled={vipDisabled && vipFlips !== v}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sol type chips */}
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Sol melding</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
            {SOL_TYPES.map(st => (
              <Chip
                key={st.value}
                label={st.label}
                selected={solType === st.value}
                onClick={() => {
                  const next = solType === st.value ? null : st.value
                  setSolType(next)
                  if (!next) { setSolWon(null); setSolMakkerId(''); setSolMakkerWon(null) }
                  else { setPartnerId('') }
                }}
              />
            ))}
          </div>
        </div>
      </fieldset>

      {/* Resultat */}
      <fieldset>
        <legend>Resultat</legend>
        {isSol ? (
          <div>
            {/* Primary sol player result */}
            {melderId && (
              <div style={{ marginBottom: solMakkerId ? '0.65rem' : 0 }}>
                {solMakkerId && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    {s(melderId, players)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <Chip label="Vundet" selected={solWon === true} onClick={() => setSolWon(true)} color="green" />
                  <Chip label="Tabt" selected={solWon === false} onClick={() => setSolWon(false)} color="red" />
                </div>
              </div>
            )}
            {/* Sol makker result */}
            {solMakkerId && (
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  {s(solMakkerId, players)}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <Chip label="Vundet" selected={solMakkerWon === true} onClick={() => setSolMakkerWon(true)} color="green" />
                  <Chip label="Tabt" selected={solMakkerWon === false} onClick={() => setSolMakkerWon(false)} color="red" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Stik vundet af melder</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
              {TRICKS_WON_OPTIONS.map(n => (
                <Chip key={n} label={String(n)} selected={tricksWon === n} onClick={() => setTricksWon(n)} />
              ))}
            </div>
          </div>
        )}
      </fieldset>

      <button onClick={handleRecord} disabled={!canRecord} style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem' }}>
        {editingRound ? 'Gem ændringer' : 'Registrer runde'}
      </button>
    </div>
  )
}
