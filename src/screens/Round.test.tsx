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

function selectActivePlayers() {
  fireEvent.change(screen.getByLabelText(/active player 1/i), { target: { value: 'p1' } })
  fireEvent.change(screen.getByLabelText(/active player 2/i), { target: { value: 'p2' } })
  fireEvent.change(screen.getByLabelText(/active player 3/i), { target: { value: 'p3' } })
  fireEvent.change(screen.getByLabelText(/active player 4/i), { target: { value: 'p4' } })
}

beforeEach(() => localStorage.clear())

describe('Round screen - player selection', () => {
  it('renders all players as selectable for active slots', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Carol').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dan').length).toBeGreaterThan(0)
  })

  it('submit is disabled until 4 active players and melder+partner are set', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: /registrer/i })).toBeDisabled()
  })
})

describe('Round screen - Tjell trick bid', () => {
  it('calls onRecord with correct Tjell trick bid input', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    selectActivePlayers()
    fireEvent.change(screen.getByLabelText(/bidder/i), { target: { value: 'p1' } })
    fireEvent.change(screen.getByLabelText(/makker/i), { target: { value: 'p2' } })
    fireEvent.change(screen.getByLabelText(/tricks bid/i), { target: { value: '10' } })
    fireEvent.click(screen.getByLabelText(/gode/i))
    fireEvent.change(screen.getByLabelText(/tricks won/i), { target: { value: '10' } })
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

  it('VIP select is disabled when Halve is selected', () => {
    render(<Round game={makeGame('tjell')} onRecord={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByLabelText(/halve/i))
    expect(screen.getByLabelText(/vip flips/i)).toBeDisabled()
  })
})

describe('Round screen - Sol bid', () => {
  it('calls onRecord with correct sol input', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('tjell')} onRecord={onRecord} onBack={vi.fn()} />)
    selectActivePlayers()
    fireEvent.click(screen.getByText(/sol round/i))
    fireEvent.change(screen.getByLabelText(/sol player/i), { target: { value: 'p1' } })
    fireEvent.change(screen.getByLabelText(/sol type/i), { target: { value: 'ren' } })
    fireEvent.click(screen.getByLabelText(/sol won/i))
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bid: { type: 'sol', solPlayerId: 'p1', solType: 'ren', won: true },
    }))
  })
})

describe('Round screen - Frants', () => {
  it('does not show Halve checkbox for Frants', () => {
    render(<Round game={makeGame('frants')} onRecord={vi.fn()} onBack={vi.fn()} />)
    expect(screen.queryByLabelText(/halve/i)).not.toBeInTheDocument()
  })

  it('calls onRecord with correct Frants trick bid input', () => {
    const onRecord = vi.fn()
    render(<Round game={makeGame('frants')} onRecord={onRecord} onBack={vi.fn()} />)
    selectActivePlayers()
    fireEvent.change(screen.getByLabelText(/bidder/i), { target: { value: 'p1' } })
    fireEvent.change(screen.getByLabelText(/makker/i), { target: { value: 'p2' } })
    fireEvent.change(screen.getByLabelText(/tricks bid/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/vip flips/i), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(/tricks won/i), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /registrer/i }))
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({
      bid: expect.objectContaining({
        type: 'trick',
        bidderId: 'p1',
        tricksBid: 10,
        tricksWon: 10,
        vipFlips: 2,
        gode: false,
      }),
    }))
  })
})
