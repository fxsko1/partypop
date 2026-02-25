import { useEffect, useMemo, useRef, useState } from 'react'
import { type Edition, getVotingQuestions } from './gameContent'
import type { RoundContent } from '@shared/types'

type Props = {
  players: string[]
  round: number
  onRoundComplete: () => void
  editions: Edition[]
  onScore: (items: Array<{ player: string; delta: number }>) => void
  contentSeed: number
  onSubmitVote: (targetName: string) => void
  submissions: Record<string, string>
  playerNameById: Record<string, string>
  currentPlayerName: string
  currentPlayerId: string
  activePlayerIds: string[]
  roundContent: RoundContent | null
}

export default function VotingGame({
  players,
  round,
  onRoundComplete,
  editions,
  onScore,
  contentSeed,
  onSubmitVote,
  submissions,
  playerNameById,
  currentPlayerName,
  currentPlayerId,
  activePlayerIds,
  roundContent
}: Props) {
  const [results, setResults] = useState<Record<string, number> | null>(null)
  const [voted, setVoted] = useState<Record<string, boolean>>({})
  const [voterChoices, setVoterChoices] = useState<Array<{ voter: string; target: string }>>([])
  const scoredRef = useRef(false)

  const list = getVotingQuestions(editions)
  const fallbackQuestion = list[contentSeed % list.length]
  const question = roundContent?.mode === 'voting' ? roundContent.voting.prompt : fallbackQuestion

  const total = useMemo(() => {
    if (!results) return 0
    return Object.values(results).reduce((acc, value) => acc + value, 0)
  }, [results])

  useEffect(() => {
    const initial: Record<string, boolean> = {}
    players.forEach((p) => {
      initial[p] = false
    })
    setVoted(initial)
    setResults(null)
    scoredRef.current = false
  }, [players, round, editions])

  const vote = (player: string) => {
    if (currentPlayerId && submissions[currentPlayerId] !== undefined) return
    onSubmitVote(player)
    setVoted((prev) => ({ ...prev, [currentPlayerName]: true }))
  }

  useEffect(() => {
    const nextVoted: Record<string, boolean> = {}
    players.forEach((player) => {
      const id = Object.entries(playerNameById).find(([, name]) => name === player)?.[0]
      nextVoted[player] = Boolean(id && submissions[id] !== undefined)
    })
    setVoted(nextVoted)

    const tally: Record<string, number> = {}
    players.forEach((p) => {
      tally[p] = 0
    })
    const choices: Array<{ voter: string; target: string }> = []
    Object.entries(submissions).forEach(([voterId, targetId]) => {
      const targetName = playerNameById[targetId]
      if (targetName && tally[targetName] !== undefined) {
        tally[targetName] += 1
      }
      const voterName = playerNameById[voterId]
      if (voterName && targetName) {
        choices.push({ voter: voterName, target: targetName })
      }
    })
    setResults(tally)
    setVoterChoices(choices)
  }, [submissions, players, playerNameById])

  const allVoted = useMemo(() => {
    if (!activePlayerIds.length) return false
    return activePlayerIds.every((id) => submissions[id] !== undefined)
  }, [activePlayerIds, submissions])

  useEffect(() => {
    if (allVoted) {
      const timeout = window.setTimeout(() => onRoundComplete(), 4000)
      return () => window.clearTimeout(timeout)
    }
  }, [allVoted, onRoundComplete])

  useEffect(() => {
    if (!results || scoredRef.current || !allVoted) return
    const sorted = Object.entries(results).sort((a, b) => b[1] - a[1])
    const chosen = sorted[0]?.[0]
    if (!chosen) return
    const awards = players
      .filter((player) => player !== chosen)
      .map((player) => ({ player, delta: 50 }))
    onScore(awards)
    scoredRef.current = true
  }, [results, players, voted, onScore])

  return (
    <div id="voting-game" className="game-stage">
      <div className="voting-question">{question}</div>
      {allVoted && results ? (
        <>
          <div className="vote-result">
            {Object.entries(results)
              .sort((a, b) => b[1] - a[1])
              .map(([player, value]) => {
                const percent = total ? Math.round((value / total) * 100) : 0
                return (
                  <div className="result-bar-wrap" key={player}>
                    <div className="result-label">
                      <span>{player}</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="result-bar-bg">
                      <div className="result-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })}
          </div>
          <div className="guesses-log" style={{ width: '100%', maxWidth: 500 }}>
            {voterChoices.map((choice, index) => (
              <div className="guess-entry" key={`${choice.voter}-${index}`}>
                <strong>{choice.voter}</strong> → {choice.target}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="vote-options">
          {players.map((player, index) => (
            <button className="vote-btn" key={player} onClick={() => vote(player)}>
              <span>{['😂', '😎', '🤔', '🥳', '😱', '🤩'][index % 6]}</span> {player}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
