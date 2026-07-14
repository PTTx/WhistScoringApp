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

const SOL_TYPES = [
  { value: 'normal', label: 'Normal Sol' },
  { value: 'ren', label: 'Ren Sol' },
  { value: 'bord', label: 'På bordet' },
  { value: 'bord-clean', label: 'På bordet uden stik' },
]

const TRICK_OPTIONS_TJELL = [7, 8, 9, 10, 11, 12, 13]
const TRICK_OPTIONS_FRANTS = [8, 9, 10, 11, 12, 13]

const VIP_OPTIONS = [
  { value: '0', label: 'Ingen VIP' },
  { value: '1', label: 'VIP 1 flip' },
  { value: '2', label: 'VIP 2 flips' },
  { value: '3', label: 'VIP 3 flips' },
]

function s(id: string, players: GameRecord['players']) {
  return players.find(p => p.id === id)?.name ?? id
}

export default function Round({ game, defaultActive, editingRoundIndex, onRecord, onBack }: Props) {
  const editingRound = editingRoundIndex != null ? game.rounds[editingRoundIndex] : null
  const editingBid = editingRound?.bids[0] ?? null
  const { players, ruleset } = game
  const isTjell = ruleset === 'tjell'
  const trickOptions = isTjell ? TRICK_OPTIONS_TJELL : TRICK_OPTIONS_FRANTS

  const initActive = editingRound
    ? editingRound.activePlayers.length === 4
      ? editingRound.activePlayers
      : [...editingRound.activePlayers, ...Array(4 - editingRound.activePlayers.length).fill('')]
    : (defaultActive ?? ['', '', '', ''])

  const [active, setActive] = useState<string[]>(initActive)
  const [isSol, setIsSol] = useState(editingBid?.type === 'sol')

  // Trick bid
  const [melderId, setMelderId] = useState(editingBid?.bidderId ?? '')
  const [partnerId, setPartnerId] = useState(() => {
    if (!editingBid || editingBid.type === 'sol') return ''
    const p = editingRound?.partnerships.find(ps => ps.includes(editingBid.bidderId ?? ''))
    const partner = p?.find(id => id !== editingBid.bidderId)
    return partner ?? (editingBid.partnerGaveUp ? 'self' : '')
  })
  const [tricksBid, setTricksBid] = useState(editingBid?.tricksBid ?? trickOptions[3])
  const [gode, setGode] = useState(false)   // klør / uden trumf
  const [halve, setHalve] = useState(false) // Halve (Tjell only, mutually exclusive with VIP)
  const [vipFlips, setVipFlips] = useState(0)
  const [tricksWon, setTricksWon] = useState(editingBid?.tricksWon ?? trickOptions[3])

  // Sol
  const [solPlayerId, setSolPlayerId] = useState(editingBid?.type === 'sol' ? editingBid.bidderId : '')
  const [solType, setSolType] = useState<'normal' | 'ren' | 'bord' | 'bord-clean'>(
    editingBid?.type === 'sol' ? (editingBid.solType ?? 'normal') : 'normal'
  )
  const [solWon, setSolWon] = useState(editingBid?.type === 'sol' ? (editingBid.solWon ?? false) : false)

  const activeFilled = active.every(id => id !== '')
  const activePlayers = active.filter(Boolean)

  // Partnership derived from melder + partner selection
  // 'self' means melder is alone - partner gave up / no partner
  const partnerGaveUp = partnerId === 'self'
  const melderPartner = partnerGaveUp ? null : partnerId
  const opponentIds = activePlayers.filter(id => id !== melderId && id !== melderPartner)
  const partnerships: [string[], string[]] = partnerGaveUp
    ? [[melderId], opponentIds]
    : [[melderId, melderPartner ?? ''].filter(Boolean), opponentIds]

  const canRecord = activeFilled && (isSol
    ? solPlayerId !== ''
    : melderId !== '' && partnerId !== '')

  function handleSetActive(index: number, value: string) {
    setActive(prev => prev.map((v, i) => i === index ? value : v))
  }

  function handleRecord() {
    if (!canRecord) return

    if (isSol) {
      onRecord({
        activePlayers,
        partnerships,
        bid: { type: 'sol', solPlayerId, solType, won: solWon },
      })
    } else if (isTjell) {
      // gode (klør/sans) counts as 1 doubler; halve also counts as 1 doubler
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
        },
      })
    }
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 440 }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '0 0 0.75rem', fontSize: '0.9rem' }}>
        ← Back
      </button>
      <h2>{editingRound ? 'Rediger runde' : 'Ny runde'}</h2>

      <fieldset>
        <legend>Aktive spillere</legend>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {[0, 1, 2, 3].map(i => (
            <select
              key={i}
              aria-label={`Active player ${i + 1}`}
              value={active[i]}
              onChange={e => handleSetActive(i, e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">--</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ))}
        </div>
      </fieldset>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          <input type="checkbox" checked={isSol} onChange={e => setIsSol(e.target.checked)} />
          Sol melding
        </label>
      </div>

      {isSol ? (
        <fieldset>
          <legend>Sol</legend>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Sol player</div>
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
              <select
                aria-label="Sol type"
                value={solType}
                onChange={e => setSolType(e.target.value as typeof solType)}
                style={{ width: '100%' }}
              >
                {SOL_TYPES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Stik budt</div>
                <select
                  aria-label="Tricks bid"
                  value={tricksBid}
                  onChange={e => setTricksBid(Number(e.target.value))}
                  style={{ width: '100%' }}
                >
                  {trickOptions.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>VIP</div>
                <select
                  aria-label="VIP flips"
                  value={vipFlips}
                  onChange={e => setVipFlips(Number(e.target.value))}
                  disabled={isTjell && halve}
                  style={{ width: '100%' }}
                >
                  {VIP_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
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
                Gode (klør / uden trumf)
              </label>
              {isTjell && (
                <label>
                  <input
                    type="checkbox"
                    aria-label="Halve"
                    checked={halve}
                    disabled={vipFlips > 0}
                    onChange={e => { setHalve(e.target.checked); if (e.target.checked) setVipFlips(0) }}
                  />
                  Halve
                </label>
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend>Resultat</legend>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>Stik vundet af melder</div>
              <select
                aria-label="Tricks won"
                value={tricksWon}
                onChange={e => setTricksWon(Number(e.target.value))}
                style={{ width: '100%' }}
              >
                {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
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
