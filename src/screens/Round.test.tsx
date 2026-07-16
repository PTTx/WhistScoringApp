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
    schemaVersion: 1,
    id: 'g1',
    startedAt: 0,
    endedAt: null,
    ruleset,
    players: PLAYERS,
    rounds: [],
    ...extra,
  }
}

beforeEach(() => localStorage.clear())

describe('Round screen - Sidder over', () => {
  it('not shown when exactly 4 players and no blind', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.queryByText(/sidder over/i)).not.toBeInTheDocument()
  })

  it('shown when >4 players', () => {
    const game = makeGame('tjell', { players: [...PLAYERS, { id: 'p5', name: 'Eve', balance: 0 }] })
    render(<Round game={game} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/sidder over/i)).toBeInTheDocument()
  })

  it('shown in Frants with hasBlind', () => {
    render(<Round game={makeGame('frants', { hasBlind: true })} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/sidder over/i)).toBeInTheDocument()
  })

  it('uses chips for player selection (no checkboxes)', () => {
    const game = makeGame('tjell', { players: [...PLAYERS, { id: 'p5', name: 'Eve', balance: 0 }] })
    render(<Round game={game} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByText(/sidder over/i))
    // Should show chips (buttons), not checkboxes
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    // Multiple Eve chips may exist (Sidder over + Melder row) - both are chips, no checkbox
    expect(screen.getAllByRole('button', { name: 'Eve' }).length).toBeGreaterThan(0)
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
      bid: expect.objectContaining({ type: 'trick', bidderId: 'p1', tricksBid: 10, tricksWon: 10, gode: 1, flips: 0, partnerGaveUp: false }),
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
      bid: expect.objectContaining({ gode: 2, flips: 0 }),
    }))
  })

  it('Halve disables VIP chips > 0', () => {
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
    // Do not select a partner
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bid: expect.objectContaining({ partnerGaveUp: true }),
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
      bid: expect.objectContaining({ partnerGaveUp: true }),
    }))
  })
})

describe('Round screen - Sol bid', () => {
  it('activates sol mode when a sol type chip is clicked', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /ren sol/i }))
    expect(screen.getByText(/sol spiller/i)).toBeInTheDocument()
    expect(screen.queryByText(/^makker$/i)).not.toBeInTheDocument()
  })

  it('sol result chips appear in Resultat fieldset', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /ren sol/i }))
    expect(screen.getByRole('button', { name: /vundet/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tabt/i })).toBeInTheDocument()
    // The trick result chips (0-13) should not be visible
    expect(screen.queryByText(/stik vundet af melder/i)).not.toBeInTheDocument()
  })

  it('calls onRecord with correct sol input', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /ren sol/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getByRole('button', { name: /vundet/i }))
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bid: { type: 'sol', solPlayerId: 'p1', solType: 'ren', won: true },
    }))
  })

  it('registrer is disabled until sol result is selected', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /ren sol/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByRole('button', { name: /registrer/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /vundet/i }))
    expect(screen.getByRole('button', { name: /registrer/i })).not.toBeDisabled()
  })

  it('deselects sol when same chip clicked again', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /ren sol/i }))
    expect(screen.getByText(/sol spiller/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /ren sol/i }))
    expect(screen.queryByText(/sol spiller/i)).not.toBeInTheDocument()
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

  it('shows Blind chip when hasBlind is set', () => {
    render(<Round game={makeGame('frants', { hasBlind: true })} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByRole('button', { name: 'Blind' })).toBeInTheDocument()
  })

  it('calls onRecord with blindIsPartner when Blind chip selected', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('frants', { hasBlind: true })} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Blind' }))
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bid: expect.objectContaining({ type: 'trick', bidderId: 'p1', blindIsPartner: true, partnerGaveUp: false }),
    }))
  })

  it('shows Modstandere once melder is selected', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByText(/modstandere/i)).toBeInTheDocument()
  })
})
