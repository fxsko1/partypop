import { useEffect, useMemo, useRef, useState } from 'react'
import { type Edition, getVotingQuestions } from './gameContent'

type Props = {
  players: string[]
  round: number
  onRoundComplete: () => void
  editions: Edition[]
  onScore: (items: Array<{ player: string; delta: number }>) => void
}

export default function VotingGame({ players, round, onRoundComplete, editions, onScore }: Props) {
  const [voteQuestionIdx, setVoteQuestionIdx] = useState(0)
  const [results, setResults] = useState<Record<string, number> | null>(null)
  const [voted, setVoted] = useState<Record<string, boolean>>({})
  const scoredRef = useRef(false)

  const list = getVotingQuestions(editions)
  const question = list[(voteQuestionIdx + round) % list.length]

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
    const votes: Record<string, number> = {}
    players.forEach((p) => {
      votes[p] = Math.floor(Math.random() * 10 + 1)
    })
    votes[player] += 5
    setResults(votes)
    setVoted((prev) => ({ ...prev, [player]: true }))
  }

  useEffect(() => {
    const others = players.slice(1)
    const timers = others.map((player, index) =>
      window.setTimeout(() => {
        setVoted((prev) => ({ ...prev, [player]: true }))
        if (!results) {
          const votes: Record<string, number> = {}
          players.forEach((p) => {
            votes[p] = Math.floor(Math.random() * 10 + 1)
          })
          votes[player] += 5
          setResults(votes)
        }
      }, 1800 + index * 900 + Math.random() * 900)
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [players, results, round])

  useEffect(() => {
    const allVoted = players.length > 0 && players.every((p) => voted[p])
    if (allVoted) {
      const timeout = window.setTimeout(() => onRoundComplete(), 1200)
      return () => window.clearTimeout(timeout)
    }
  }, [voted, players, onRoundComplete])

  useEffect(() => {
    const allVoted = players.length > 0 && players.every((p) => voted[p])
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
      {results ? (
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
