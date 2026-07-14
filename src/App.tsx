import { useState, useEffect } from 'react'
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

  function refresh() {
    setGame(store.getGame())
  }

  useEffect(() => {
    refresh()
  }, [])

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
        onRecord={input => {
          store.recordRound(input)
          refresh()
          setScreen('scoreboard')
        }}
        onEnd={() => setScreen('scoreboard')}
      />
    )
  }

  return (
    <Scoreboard
      game={game}
      onAddPlayer={name => {
        store.addPlayer(name)
        refresh()
      }}
      onNewRound={() => setScreen('round')}
      onEnd={() => {
        store.endGame()
        refresh()
        setScreen('setup')
      }}
    />
  )
}
