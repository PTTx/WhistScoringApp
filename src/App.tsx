import { useState } from 'react'
import { createStore } from './store'
import type { GameRecord } from './storage'
import Setup from './screens/Setup'
import Round from './screens/Round'
import Scoreboard from './screens/Scoreboard'
import RoundResult from './screens/RoundResult'
import type { RoundResultData } from './screens/RoundResult'

type Screen = 'setup' | 'round' | 'scoreboard'

const store = createStore()

export default function App() {
  const [game, setGame] = useState<GameRecord | null>(store.getGame())
  const [screen, setScreen] = useState<Screen>(store.getGame() ? 'scoreboard' : 'setup')
  const [lastActive, setLastActive] = useState<string[]>(['', '', '', ''])
  const [editingRound, setEditingRound] = useState<number | null>(null)
  const [autoExpandRound, setAutoExpandRound] = useState<number | null>(null)
  const [roundResult, setRoundResult] = useState<RoundResultData | null>(null)

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
      <>
        <Round
          game={game}
          defaultActive={lastActive}
          editingRoundIndex={editingRound}
          onRecord={input => {
            if (editingRound !== null) {
              store.editRound(editingRound, input)
              setAutoExpandRound(editingRound)
              setEditingRound(null)
              setLastActive(input.activePlayers)
              refresh()
              setScreen('scoreboard')
            } else {
              store.recordRound(input)
              const g = store.getGame()
              setAutoExpandRound(g ? g.rounds.length - 1 : null)
              setLastActive(input.activePlayers)
              refresh()
              // Show result popup instead of going to scoreboard
              const updatedGame = store.getGame()
              if (updatedGame) {
                const lastRound = updatedGame.rounds[updatedGame.rounds.length - 1]
                if (lastRound) {
                  setRoundResult({ round: lastRound, game: updatedGame })
                }
              }
            }
          }}
          onBack={() => { setEditingRound(null); setScreen('scoreboard') }}
        />
        {roundResult && (
          <RoundResult
            data={roundResult}
            onStilling={() => { setRoundResult(null); setScreen('scoreboard') }}
            onNyRunde={() => { setRoundResult(null) }}
          />
        )}
      </>
    )
  }

  return (
    <Scoreboard
      game={game}
      onAddPlayer={name => { store.addPlayer(name); refresh() }}
      autoExpandRound={autoExpandRound}
      onRenamePlayer={(id, name) => { store.renamePlayer(id, name); refresh() }}
      onNewRound={() => setScreen('round')}
      onEditRound={index => { setEditingRound(index); setScreen('round') }}
      onEnd={() => { store.endGame(); refresh(); setScreen('setup') }}
    />
  )
}
