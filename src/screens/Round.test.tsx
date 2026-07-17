import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Round from './Round'
import type { GameRecord } from '../storage'

const PLAYERS = [
  { id: 'p1', name: 'Alice', balance: 0 },
  { id: 'p2', name: 'Bob', balance: 0 },
  { id: 'p3', name: 'Carol', balance: 0 },
  { id: 'p4', name: 'Dan', balance: 0 },
]

function makeGame(ruleset: 'tjell' | 'frants', extra?: Partial<GameRecord>): GameRecord {
  return {
    schemaVersion: 1, id: 'g1', startedAt: 0, endedAt: null,
    ruleset, players: PLAYERS, rounds: [], ...extra,
  }
}

beforeEach(() => localStorage.clear())

describe('Round screen - opponent selection with extra players', () => {
  it('shows selectable Modstandere when >4 players', () => {
    const game = makeGame('tjell', { players: [...PLAYERS, { id: 'p5', name: 'Eve', balance: 0 }] })
    render(<Round game={game} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByText(/modstandere/i)).toBeInTheDocument()
  })

  it('shows Sidder over text below Modstandere when >4 players', () => {
    const game = makeGame('tjell', { players: [...PLAYERS, { id: 'p5', name: 'Eve', balance: 0 }] })
    render(<Round game={game} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByText(/sidder over/i)).toBeInTheDocument()
  })
})

describe('Round screen - general', () => {
  it('submit enabled once melder is set (no partner required)', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: /registrer/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByRole('button', { name: /registrer/i })).not.toBeDisabled()
  })
})

describe('Round screen - Tjell trick bid', () => {
  it('calls onRecord with correct Tjell trick bid input', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Bob' })[1])
    fireEvent.click(screen.getByRole('button', { name: /klør/i }))
    const chips10 = screen.getAllByRole('button', { name: '10' })
    fireEvent.click(chips10[0]) // tricksBid
    fireEvent.click(chips10[1] ?? chips10[0]) // tricksWon
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bids: [expect.objectContaining({ type: 'trick', bidderId: 'p1', tricksBid: 10, tricksWon: 10, gode: 1, flips: 0, partnerGaveUp: false })],
    }))
  })

  it('Klør/sans and Halve can both be selected (gode=2)', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getByRole('button', { name: /klør/i }))
    fireEvent.click(screen.getByRole('button', { name: /halve/i }))
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bids: [expect.objectContaining({ gode: 2, flips: 0 })],
    }))
  })

  it('Halve disables VIP chips', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /halve/i }))
    expect(screen.getAllByRole('button', { name: '1' })[0]).toBeDisabled()
    expect(screen.getAllByRole('button', { name: '2' })[0]).toBeDisabled()
    expect(screen.getAllByRole('button', { name: '3' })[0]).toBeDisabled()
  })

  it('Klør/sans does not disable VIP in Tjell', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /klør/i }))
    expect(screen.getAllByRole('button', { name: '1' })[0]).not.toBeDisabled()
  })

  it('no partner selected means selv (partnerGaveUp=true)', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bids: [expect.objectContaining({ partnerGaveUp: true })],
    }))
  })

  it('clicking selected partner deselects it', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    const bobChips = screen.getAllByRole('button', { name: 'Bob' })
    fireEvent.click(bobChips[1]) // select Bob as partner
    fireEvent.click(bobChips[1]) // deselect
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bids: [expect.objectContaining({ partnerGaveUp: true })],
    }))
  })

  it('Vip deselectable by clicking selected chip', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getAllByRole('button', { name: '1' })[0]) // select Vip 1
    fireEvent.click(screen.getAllByRole('button', { name: '1' })[0]) // deselect
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bids: [expect.objectContaining({ flips: 0 })],
    }))
  })
})

describe('Round screen - Sol bid', () => {
  it('activates sol mode when a sol type chip is clicked', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^ren$/i }))
    expect(screen.getByText(/sol spiller/i)).toBeInTheDocument()
    expect(screen.queryByText(/^makker$/i)).not.toBeInTheDocument()
  })

  it('sol result chips appear in Resultat fieldset', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^ren$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Alice' })) // select sol spiller to show results
    expect(screen.getByRole('button', { name: /vundet/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tabt/i })).toBeInTheDocument()
    expect(screen.queryByText(/stik vundet af melder/i)).not.toBeInTheDocument()
  })

  it('registrer is disabled until sol result is selected', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^ren$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByRole('button', { name: /registrer/i })).toBeDisabled()
    fireEvent.click(screen.getAllByRole('button', { name: /vundet/i })[0])
    expect(screen.getByRole('button', { name: /registrer/i })).not.toBeDisabled()
  })

  it('calls onRecord with correct sol input', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^ren$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getAllByRole('button', { name: /vundet/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bids: [expect.objectContaining({ type: 'sol', solPlayerId: 'p1', solType: 'ren', won: true })],
    }))
  })

  it('deselects sol when same chip clicked again', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^ren$/i }))
    expect(screen.getByText(/sol spiller/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^ren$/i }))
    expect(screen.queryByText(/sol spiller/i)).not.toBeInTheDocument()
  })

  it('dual sol: two players with separate results call onRecord with two bids', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^ren$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Alice' })) // sol spiller
    // Bob appears in both Sol spiller row and Sol makker row; pick the second one (Sol makker)
    fireEvent.click(screen.getAllByRole('button', { name: 'Bob' })[1])
    const vundetBtns = screen.getAllByRole('button', { name: /vundet/i })
    const tabtBtns = screen.getAllByRole('button', { name: /tabt/i })
    fireEvent.click(vundetBtns[0]) // Alice vundet
    fireEvent.click(tabtBtns[1])   // Bob tabt
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bids: [
        expect.objectContaining({ type: 'sol', solPlayerId: 'p1', won: true }),
        expect.objectContaining({ type: 'sol', solPlayerId: 'p2', won: false }),
      ],
    }))
  })
})

describe('Round screen - Frants', () => {
  it('Gode disables Vip > 0 in Frants', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /klør/i }))
    expect(screen.getAllByRole('button', { name: '1' })[0]).toBeDisabled()
  })

  it('Vip > 0 disables Gode in Frants', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: '1' })[0])
    expect(screen.getByRole('button', { name: /klør/i })).toBeDisabled()
  })

  it('Halve chip is not shown in Frants', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /^halve$/i })).not.toBeInTheDocument()
  })

  it('no Ingen chip - empty partner means selv', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.queryByRole('button', { name: 'Ingen' })).not.toBeInTheDocument()
  })

  it('does not show Blind chip when 4 active and no hasBlind', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.queryByRole('button', { name: 'Blind' })).not.toBeInTheDocument()
  })

  it('shows Blind chip when hasBlind and 3 active players', () => {
    const frantsPlayers = [
      { id: 'p1', name: 'Alice', balance: 0 },
      { id: 'p2', name: 'Bob', balance: 0 },
      { id: 'p3', name: 'Carol', balance: 0 },
    ]
    const g = { ...makeGame('frants', { hasBlind: true }), players: frantsPlayers }
    render(<Round game={g} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Alice' })[0])
    expect(screen.getByRole('button', { name: 'Blind' })).toBeInTheDocument()
  })

  it('shows Blind chip when hasBlind and 4 active players', () => {
    render(<Round game={makeGame('frants', { hasBlind: true })} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByRole('button', { name: 'Blind' })).toBeInTheDocument()
  })

  it('calls onRecord with blindIsPartner=true when Blind chip explicitly selected', () => {
    const onRecord = vi.fn()
    const frantsPlayers = [
      { id: 'p1', name: 'Alice', balance: 0 },
      { id: 'p2', name: 'Bob', balance: 0 },
      { id: 'p3', name: 'Carol', balance: 0 },
    ]
    const g = { ...makeGame('frants', { hasBlind: true }), players: frantsPlayers }
    render(<Round game={g} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Alice' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Blind' }))
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bids: [expect.objectContaining({ type: 'trick', bidderId: 'p1', blindIsPartner: true, partnerGaveUp: false })],
    }))
  })

  it('calls onRecord with partnerGaveUp=true when Blind not selected as makker (blind is opponent)', () => {
    const onRecord = vi.fn()
    const frantsPlayers = [
      { id: 'p1', name: 'Alice', balance: 0 },
      { id: 'p2', name: 'Bob', balance: 0 },
      { id: 'p3', name: 'Carol', balance: 0 },
    ]
    const g = { ...makeGame('frants', { hasBlind: true }), players: frantsPlayers }
    render(<Round game={g} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Alice' })[0])
    // Do NOT click Blind — blind is on opponent side
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bids: [expect.objectContaining({ type: 'trick', bidderId: 'p1', partnerGaveUp: true })],
    }))
  })

  it('shows Modstandere once melder is selected', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByText(/modstandere/i)).toBeInTheDocument()
  })
})

describe('Round screen - Kat (Tjell hasKat)', () => {
  const KAT_PLAYERS = [
    { id: 'p1', name: 'Alice', balance: 0 },
    { id: 'p2', name: 'Bob', balance: 0 },
    { id: 'p3', name: 'Carol', balance: 0 },
  ]

  it('shows Kat as fixed disabled chip in Makker row', () => {
    const g = { ...makeGame('tjell', { hasKat: true }), players: KAT_PLAYERS }
    render(<Round game={g} onRecord={vi.fn()} onBack={vi.fn()} />)
    // 3 players + Kat: no Sidder over, Alice appears once
    fireEvent.click(screen.getAllByRole('button', { name: 'Alice' })[0])
    expect(screen.getByRole('button', { name: 'Kat' })).toBeDisabled()
  })

  it('calls onRecord with katIsPartner=true', () => {
    const onRecord = vi.fn()
    const g = { ...makeGame('tjell', { hasKat: true }), players: KAT_PLAYERS }
    render(<Round game={g} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Alice' })[0])
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bids: [expect.objectContaining({ katIsPartner: true, partnerGaveUp: false })],
    }))
  })
})
