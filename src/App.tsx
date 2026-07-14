import { useState } from 'react'
import { createStore } from './store'
import type { GameRecord } from './storage'
import Setup from './screens/Setup'
import Round from './screens/Round'
import Scoreboard from './screens/Scoreboard'

type Screen = 'setup' | 'round' | 'scoreboard'

const store = createStore()

export default function App() {
  const [game, setGame] = useState<GameRecord | null>(store.getGame())
  const [screen, setScreen] = useState<Screen>(store.getGame() ? 'scoreboard' : 'setup')
  const [lastActive, setLastActive] = useState<string[]>(['', '', '', ''])
  const [editingRound, setEditingRound] = useState<number | null>(null)

  function refresh() {
    setGame(store.getGame())
  }

  if (screen === 'setup') {
    return (
      <Setup
        onStart={({ ruleset, playerNames }) => {
          store.startGame({ ruleset, playerNames })
          refresh()
          setScreen('scoreboard')
        }}
      />
    )
  }

  if (!game) return null

  if (screen === 'round') {
    return (
      <Round
        game={game}
        defaultActive={lastActive}
        editingRoundIndex={editingRound}
        onRecord={input => {
          if (editingRound !== null) {
            store.editRound(editingRound, input)
            setEditingRound(null)
          } else {
            store.recordRound(input)
          }
          setLastActive(input.activePlayers)
          refresh()
          setScreen('scoreboard')
        }}
        onBack={() => { setEditingRound(null); setScreen('scoreboard') }}
      />
    )
  }

  return (
    <Scoreboard
      game={game}
      onAddPlayer={name => { store.addPlayer(name); refresh() }}
      onRenamePlayer={(id, name) => { store.renamePlayer(id, name); refresh() }}
      onNewRound={() => setScreen('round')}
      onEditRound={index => { setEditingRound(index); setScreen('round') }}
      onEnd={() => { store.endGame(); refresh(); setScreen('setup') }}
    />
  )
}
