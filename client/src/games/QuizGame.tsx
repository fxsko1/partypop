import { useEffect, useMemo, useState } from 'react'
import { type Edition, getQuizQuestions } from './gameContent'
const classes = ['a', 'b', 'c', 'd']

type Props = {
  players: string[]
  round: number
  onRoundComplete: () => void
  editions: Edition[]
  onScore: (player: string, delta: number) => void
  contentSeed: number
  onSubmitAnswer: (answerIndex: number) => void
  submissions: Record<string, string>
  playerNameById: Record<string, string>
  currentPlayerName: string
}

export default function QuizGame({
  players,
  round,
  onRoundComplete,
  editions,
  onScore,
  contentSeed,
  onSubmitAnswer,
  submissions,
  playerNameById,
  currentPlayerName
}: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState<Record<string, boolean>>({})
  const [scores, setScores] = useState<Record<string, number>>({})

  useEffect(() => {
    const initial: Record<string, number> = {}
    players.forEach((p) => {
      initial[p] = 0
    })
    setScores(initial)
  }, [players, round])

  useEffect(() => {
    const initial: Record<string, boolean> = {}
    players.forEach((p) => {
      initial[p] = false
    })
    setAnswered(initial)
    setSelected(null)
  }, [players, round])

  const question = useMemo(() => {
    const list = getQuizQuestions(editions)
    return list[contentSeed % list.length]
  }, [contentSeed, editions])

  const scoreBar = useMemo(
    () =>
      players.map((p) => (
        <div className="score-chip" key={p}>
          👤 {p.split(' ')[0]}: <strong>{scores[p] ?? 0}</strong>
        </div>
      )),
    [players, scores]
  )

  const selectAnswer = (idx: number) => {
    if (answered[currentPlayerName]) return
    setSelected(idx)
    const playerKey = currentPlayerName
    setAnswered((prev) => ({ ...prev, [playerKey]: true }))
    onSubmitAnswer(idx)
    if (idx === question.correct) {
      setScores((prev) => ({
        ...prev,
        [playerKey]: (prev[playerKey] ?? 0) + 100
      }))
      onScore(playerKey, 100)
    }
  }

  useEffect(() => {
    const fromSubmissions: Record<string, boolean> = {}
    players.forEach((p) => {
      fromSubmissions[p] = Object.values(playerNameById).includes(p)
        ? Object.entries(playerNameById).some(([id, name]) => name === p && submissions[id] !== undefined)
        : false
    })
    setAnswered((prev) => ({ ...prev, ...fromSubmissions }))
  }, [submissions, players, playerNameById])

  useEffect(() => {
    const allAnswered = players.length > 0 && players.every((p) => answered[p])
    if (allAnswered) {
      const timeout = window.setTimeout(() => onRoundComplete(), 2500)
      return () => window.clearTimeout(timeout)
    }
  }, [answered, players, onRoundComplete])

  return (
    <div id="quiz-game" className="game-stage">
      <div className="score-bar">{scoreBar}</div>
      <div className="question-header">
        <span className="q-counter">Antworten</span>
      </div>
      <div className="question-card">
        <div className="question-text">{question.q}</div>
      </div>
      <div className="answers-grid">
        {question.answers.map((answer, index) => {
          const isCorrect = selected !== null && index === question.correct
          const isWrong = selected !== null && index !== question.correct && index === selected
          return (
            <button
              key={answer}
              className={`answer-btn ${classes[index]}${isCorrect ? ' correct' : ''}${isWrong ? ' wrong' : ''}`}
              onClick={() => selectAnswer(index)}
            >
              {answer}
            </button>
          )
        })}
      </div>
      {players.length > 0 && players.every((p) => answered[p]) ? (
        <div className="guesses-log">
          {players.map((player) => {
            const pickedRaw = Object.entries(playerNameById).find(([, name]) => name === player)?.[0]
            const pickedIndex =
              pickedRaw !== undefined && submissions[pickedRaw] !== undefined
                ? Number(submissions[pickedRaw])
                : null
            const pickedText = pickedIndex !== null && pickedIndex !== undefined ? question.answers[pickedIndex] : 'Keine Antwort'
            return (
              <div key={player} className={`guess-entry${pickedIndex === question.correct ? ' correct-guess' : ''}`}>
                {player}: {pickedText}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
