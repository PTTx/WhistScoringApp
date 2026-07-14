import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Setup from './Setup'

beforeEach(() => {
  localStorage.clear()
})

describe('Setup screen', () => {
  it('renders ruleset selector and player name inputs', () => {
    const onStart = vi.fn()
    render(<Setup onStart={onStart} />)
    expect(screen.getByLabelText(/regelsæt/i)).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText(/spiller/i).length).toBeGreaterThanOrEqual(2)
  })

  it('start button is disabled until at least 2 player names are entered', () => {
    const onStart = vi.fn()
    render(<Setup onStart={onStart} />)
    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled()
    fireEvent.change(screen.getAllByPlaceholderText(/spiller/i)[0], { target: { value: 'Alice' } })
    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled()
    fireEvent.change(screen.getAllByPlaceholderText(/spiller/i)[1], { target: { value: 'Bob' } })
    expect(screen.getByRole('button', { name: /start/i })).not.toBeDisabled()
  })

  it('calls onStart with ruleset and player names when Start is clicked', () => {
    const onStart = vi.fn()
    render(<Setup onStart={onStart} />)
    const inputs = screen.getAllByPlaceholderText(/spiller/i)
    fireEvent.change(inputs[0], { target: { value: 'Alice' } })
    fireEvent.change(inputs[1], { target: { value: 'Bob' } })
    fireEvent.change(inputs[2], { target: { value: 'Carol' } })
    fireEvent.change(inputs[3], { target: { value: 'Dan' } })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledWith({
      ruleset: expect.stringMatching(/tjell|frants/),
      playerNames: ['Alice', 'Bob', 'Carol', 'Dan'],
    })
  })

  it('ignores empty player name fields when calling onStart', () => {
    const onStart = vi.fn()
    render(<Setup onStart={onStart} />)
    const inputs = screen.getAllByPlaceholderText(/spiller/i)
    fireEvent.change(inputs[0], { target: { value: 'Alice' } })
    fireEvent.change(inputs[1], { target: { value: 'Bob' } })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledWith({
      ruleset: expect.stringMatching(/tjell|frants/),
      playerNames: ['Alice', 'Bob'],
    })
  })

  it('allows selecting Frants ruleset', () => {
    const onStart = vi.fn()
    render(<Setup onStart={onStart} />)
    fireEvent.change(screen.getByLabelText(/regelsæt/i), { target: { value: 'frants' } })
    const inputs = screen.getAllByPlaceholderText(/spiller/i)
    fireEvent.change(inputs[0], { target: { value: 'Alice' } })
    fireEvent.change(inputs[1], { target: { value: 'Bob' } })
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledWith({ ruleset: 'frants', playerNames: ['Alice', 'Bob'] })
  })
})
