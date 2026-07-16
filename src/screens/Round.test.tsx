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

function makeGame(ruleset: 'tjell' | 'frants'): GameRecord {
  return {
    schemaVersion: 1,
    id: 'g1',
    startedAt: 0,
    endedAt: null,
    ruleset,
    players: PLAYERS,
    rounds: [],
  }
}

beforeEach(() => localStorage.clear())

describe('Round screen - player selection', () => {
  it('renders all players as active checkboxes by default (expand to see)', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByText(/aktive spillere/i))
    expect(screen.getByLabelText(/active player alice/i)).toBeChecked()
    expect(screen.getByLabelText(/active player bob/i)).toBeChecked()
    expect(screen.getByLabelText(/active player carol/i)).toBeChecked()
    expect(screen.getByLabelText(/active player dan/i)).toBeChecked()
  })

  it('submit is disabled until melder and makker are set', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: /registrer/i })).toBeDisabled()
  })
})

describe('Round screen - Tjell trick bid', () => {
  it('calls onRecord with correct Tjell trick bid input', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    // Select Melder = Alice (first chip row), then Makker = Bob (second occurrence after Alice selected)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    // Bob now appears in both melder row and makker row - click the second one (makker row)
    fireEvent.click(screen.getAllByRole('button', { name: 'Bob' })[1])
    // tricksBid chip "10" - click the first "10" button (tricksBid row)
    const chips10 = screen.getAllByRole('button', { name: '10' })
    fireEvent.click(chips10[0])
    fireEvent.click(screen.getByLabelText(/gode/i))
    // tricksWon chip "10" - second occurrence
    fireEvent.click(chips10[1] ?? chips10[0])
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bid: expect.objectContaining({
        type: 'trick',
        bidderId: 'p1',
        tricksBid: 10,
        tricksWon: 10,
        gode: 1,
        flips: 0,
        partnerGaveUp: false,
      }),
    }))
  })

  it('Halve chip disables VIP chips with value > 0 when Halve is selected', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByLabelText(/halve/i))
    const vip1 = screen.getAllByRole('button', { name: '1' })[0]
    const vip2 = screen.getAllByRole('button', { name: '2' })[0]
    const vip3 = screen.getAllByRole('button', { name: '3' })[0]
    expect(vip1).toBeDisabled()
    expect(vip2).toBeDisabled()
    expect(vip3).toBeDisabled()
  })
})

describe('Round screen - Sol bid', () => {
  it('calls onRecord with correct sol input', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByText(/sol melding/i))
    fireEvent.change(screen.getByLabelText(/sol player/i), { target: { value: 'p1' } })
    fireEvent.click(screen.getByRole('button', { name: /ren sol/i }))
    fireEvent.click(screen.getByLabelText(/vundet/i))
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bid: { type: 'sol', solPlayerId: 'p1', solType: 'ren', won: true },
    }))
  })
})

describe('Round screen - Frants', () => {
  it('does not show separate Halve checkbox for Frants (Halve is part of Gode)', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.queryByLabelText(/^halve$/i)).not.toBeInTheDocument()
  })

  it('calls onRecord with correct Frants trick bid input', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('frants')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    // Bob appears in both Melder and Makker rows; second occurrence is Makker row
    fireEvent.click(screen.getAllByRole('button', { name: 'Bob' })[1])
    // VIP chip "2" - first "2" button (VIP row, before stik vundet)
    fireEvent.click(screen.getAllByRole('button', { name: '2' })[0])
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bid: expect.objectContaining({
        type: 'trick',
        bidderId: 'p1',
        tricksBid: 10,
        tricksWon: 10,
        vipFlips: 2,
        gode: false,
        partnerGaveUp: false,
      }),
    }))
  })

  it('shows Ingen chip in Makker row for Frants with 4 active players', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    // Select a melder first to reveal makker options
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByRole('button', { name: 'Ingen' })).toBeInTheDocument()
  })

  it('does not show Blind chip when 4 active players', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.queryByRole('button', { name: 'Blind' })).not.toBeInTheDocument()
  })

  it('shows Blind chip when only 3 active players (Frants)', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    // Deactivate Dan to have 3 active players
    fireEvent.click(screen.getByText(/aktive spillere/i))
    fireEvent.click(screen.getByLabelText(/active player dan/i))
    // Now select melder
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByRole('button', { name: 'Blind' })).toBeInTheDocument()
  })

  it('calls onRecord with blindIsPartner when Blind chip selected', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('frants')} onRecord={onRecord} onBack={vi.fn()} />)
    // Deactivate Dan to get 3 active
    fireEvent.click(screen.getByText(/aktive spillere/i))
    fireEvent.click(screen.getByLabelText(/active player dan/i))
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Blind' }))
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bid: expect.objectContaining({
        type: 'trick',
        bidderId: 'p1',
        blindIsPartner: true,
        partnerGaveUp: false,
      }),
    }))
  })

  it('calls onRecord with partnerGaveUp when Ingen selected', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('frants')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ingen' }))
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bid: expect.objectContaining({
        type: 'trick',
        bidderId: 'p1',
        partnerGaveUp: true,
      }),
    }))
  })

  it('shows Modstandere after melder and makker are selected', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    // Use Ingen (unique chip in makker row) to avoid ambiguity with player name chips
    fireEvent.click(screen.getByRole('button', { name: 'Ingen' }))
    expect(screen.getByText(/modstandere/i)).toBeInTheDocument()
  })
})
