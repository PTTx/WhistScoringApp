import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Setup from './Setup'

beforeEach(() => {
  localStorage.clear()
})

describe('Setup screen', () => {
  it('renders ruleset chips and player name inputs', () => {
    render(<Setup onStart={vi.fn()} onReopen={vi.fn()} />)
    expect(screen.getByRole('button', { name: /familien tjell/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /frants/i })).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText(/spiller/i).length).toBeGreaterThanOrEqual(4)
  })

  it('start button is disabled until at least 4 player names are entered', () => {
    render(<Setup onStart={vi.fn()} onReopen={vi.fn()} />)
    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled()
    const inputs = screen.getAllByPlaceholderText(/spiller/i)
    fireEvent.change(inputs[0], { target: { value: 'Alice' } })
    fireEvent.change(inputs[1], { target: { value: 'Bob' } })
    fireEvent.change(inputs[2], { target: { value: 'Carol' } })
    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled()
    fireEvent.change(inputs[3], { target: { value: 'Dan' } })
    expect(screen.getByRole('button', { name: /start/i })).not.toBeDisabled()
  })

  it('calls onStart with ruleset and player names when Start is clicked', () => {
    const onStart = vi.fn()
    render(<Setup onStart={onStart} onReopen={vi.fn()} />)
    const inputs = screen.getAllByPlaceholderText(/spiller/i)
    fireEvent.change(inputs[0], { target: { value: 'Alice' } })
    fireEvent.change(inputs[1], { target: { value: 'Bob' } })
    fireEvent.change(inputs[2], { target: { value: 'Carol' } })
    fireEvent.change(inputs[3], { target: { value: 'Dan' } })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledWith({
      ruleset: 'tjell',
      playerNames: ['Alice', 'Bob', 'Carol', 'Dan'],
    })
  })

  it('allows selecting Frants ruleset via chip', () => {
    const onStart = vi.fn()
    render(<Setup onStart={onStart} onReopen={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /frants/i }))
    const inputs = screen.getAllByPlaceholderText(/spiller/i)
    fireEvent.change(inputs[0], { target: { value: 'Alice' } })
    fireEvent.change(inputs[1], { target: { value: 'Bob' } })
    fireEvent.change(inputs[2], { target: { value: 'Carol' } })
    fireEvent.change(inputs[3], { target: { value: 'Dan' } })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledWith({ ruleset: 'frants', playerNames: ['Alice', 'Bob', 'Carol', 'Dan'] })
  })

  it('with Kat enabled, 3 players is enough to start (Tjell)', () => {
    render(<Setup onStart={vi.fn()} onReopen={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^kat$/i }))
    const inputs = screen.getAllByPlaceholderText(/spiller/i)
    fireEvent.change(inputs[0], { target: { value: 'Alice' } })
    fireEvent.change(inputs[1], { target: { value: 'Bob' } })
    fireEvent.change(inputs[2], { target: { value: 'Carol' } })
    expect(screen.getByRole('button', { name: /start/i })).not.toBeDisabled()
  })
})
