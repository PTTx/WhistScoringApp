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
    // Section is collapsed by default when exactly 4 players - expand it
    fireEvent.click(screen.getByText(/aktive spillere/i))
    expect(screen.getByLabelText(/active player alice/i)).toBeChecked()
    expect(screen.getByLabelText(/active player bob/i)).toBeChecked()
    expect(screen.getByLabelText(/active player carol/i)).toBeChecked()
    expect(screen.getByLabelText(/active player dan/i)).toBeChecked()
  })

  it('submit is disabled until melder and partner are set', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: /registrer/i })).toBeDisabled()
  })
})

describe('Round screen - Tjell trick bid', () => {
  it('calls onRecord with correct Tjell trick bid input', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    // All 4 players active by default
    fireEvent.change(screen.getByLabelText(/bidder/i), { target: { value: 'p1' } })
    fireEvent.change(screen.getByLabelText(/makker/i), { target: { value: 'p2' } })
    // Click chip "10" for tricks bid (already default, but click to be explicit)
    // There are multiple "10" chips (tricksBid=10 and tricksWon=10), click first one
    const chips10 = screen.getAllByRole('button', { name: '10' })
    fireEvent.click(chips10[0]) // tricksBid chip
    fireEvent.click(screen.getByLabelText(/gode/i))
    // tricksWon chips: click "10" (second occurrence since tricksBid also has 10)
    fireEvent.click(chips10[1] ?? chips10[0]) // tricksWon chip
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
    // VIP chips 1, 2, 3 should be disabled.
    // Chips '1', '2', '3' also appear in stik vundet (0-13), so use getAllByRole.
    // VIP chips come first in the DOM (before stik vundet).
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
    // All 4 players active by default
    fireEvent.click(screen.getByText(/sol melding/i))
    fireEvent.change(screen.getByLabelText(/sol player/i), { target: { value: 'p1' } })
    // Click "Ren sol" chip
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
    // Frants has no separate Halve checkbox - it is covered by the Gode checkbox
    expect(screen.queryByLabelText(/^halve$/i)).not.toBeInTheDocument()
  })

  it('calls onRecord with correct Frants trick bid input', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('frants')} onRecord={onRecord} onBack={vi.fn()} />)
    // All 4 players active by default
    fireEvent.change(screen.getByLabelText(/bidder/i), { target: { value: 'p1' } })
    fireEvent.change(screen.getByLabelText(/makker/i), { target: { value: 'p2' } })
    // Click VIP chip "2" - there are two "2" buttons (VIP and stik vundet), pick the first (VIP)
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

  it('shows Blind makker selector in Frants trick bid', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/blind makker/i)).toBeInTheDocument()
  })

  it('calls onRecord with blindMakkerId when blind makker is selected', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('frants')} onRecord={onRecord} onBack={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/bidder/i), { target: { value: 'p1' } })
    fireEvent.change(screen.getByLabelText(/makker/i), { target: { value: 'p2' } })
    // Select Bob as blind makker (p2 is already makker, so pick Carol = p3)
    fireEvent.click(screen.getByRole('button', { name: 'Carol' }))
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bid: expect.objectContaining({
        type: 'trick',
        blindMakkerId: 'p3',
      }),
    }))
  })
})
