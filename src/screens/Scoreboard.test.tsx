import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Scoreboard from './Scoreboard'
import type { GameRecord } from '../storage'

function makeGame(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    schemaVersion: 1,
    id: 'g1',
    startedAt: 0,
    endedAt: null,
    ruleset: 'tjell',
    players: [
      { id: 'p1', name: 'Alice', balance: 1.20 },
      { id: 'p2', name: 'Bob', balance: -0.40 },
      { id: 'p3', name: 'Carol', balance: 0.00 },
      { id: 'p4', name: 'Dan', balance: -0.80 },
    ],
    rounds: [
      {
        id: 'r1',
        timestamp: 1000,
        activePlayers: ['p1', 'p2', 'p3', 'p4'],
        partnerships: [['p1', 'p2'], ['p3', 'p4']],
        bids: [{
          type: 'trick',
          bidderId: 'p1',
          partnerGaveUp: false,
          tricksBid: 10,
          tricksWon: 11,
          bidPrice: 0.40,
          deltas: { p1: 0.80, p2: 0.80, p3: -0.80, p4: -0.80 },
        }],
      },
    ],
    ...overrides,
  }
}

beforeEach(() => localStorage.clear())

describe('Scoreboard', () => {
  it('displays all player names and balances', () => {
    render(<Scoreboard game={makeGame()} onAddPlayer={vi.fn()} onNewRound={vi.fn()} onEnd={vi.fn()} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('1.20')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('-0.40')).toBeInTheDocument()
  })

  it('displays round history', () => {
    render(<Scoreboard game={makeGame()} onAddPlayer={vi.fn()} onNewRound={vi.fn()} onEnd={vi.fn()} />)
    expect(screen.getByText(/round 1/i)).toBeInTheDocument()
  })

  it('calls onEnd when End Game button is clicked', () => {
    const onEnd = vi.fn()
    render(<Scoreboard game={makeGame()} onAddPlayer={vi.fn()} onNewRound={vi.fn()} onEnd={onEnd} />)
    fireEvent.click(screen.getByRole('button', { name: /end game/i }))
    expect(onEnd).toHaveBeenCalled()
  })

  it('allows entering a new player name and calls onAddPlayer', () => {
    const onAddPlayer = vi.fn()
    render(<Scoreboard game={makeGame()} onAddPlayer={onAddPlayer} onNewRound={vi.fn()} onEnd={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/new player/i), { target: { value: 'Eve' } })
    fireEvent.click(screen.getByRole('button', { name: /add player/i }))
    expect(onAddPlayer).toHaveBeenCalledWith('Eve')
  })

  it('add player button is disabled when name input is empty', () => {
    render(<Scoreboard game={makeGame()} onAddPlayer={vi.fn()} onNewRound={vi.fn()} onEnd={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add player/i })).toBeDisabled()
  })

  it('clears the name input after adding a player', () => {
    render(<Scoreboard game={makeGame()} onAddPlayer={vi.fn()} onNewRound={vi.fn()} onEnd={vi.fn()} />)
    const input = screen.getByPlaceholderText(/new player/i)
    fireEvent.change(input, { target: { value: 'Eve' } })
    fireEvent.click(screen.getByRole('button', { name: /add player/i }))
    expect(input).toHaveValue('')
  })
})
