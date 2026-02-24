import { useEffect, useMemo, useRef, useState } from 'react'
import { type Edition, getQuizQuestions } from './gameContent'
const classes = ['a', 'b', 'c', 'd']

type Props = {
  players: string[]
  round: number
  onRoundComplete: () => void
  editions: Edition[]
  onScore: (player: string, delta: number) => void
}

export default function QuizGame({ players, round, onRoundComplete, editions, onScore }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState<Record<string, boolean>>({})
  const [selectedByPlayer, setSelectedByPlayer] = useState<Record<string, number | null>>({})
  const [scores, setScores] = useState<Record<string, number>>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const lastQuestionIndexRef = useRef<number | null>(null)

  useEffect(() => {
    const initial: Record<string, number> = {}
    players.forEach((p) => {
      initial[p] = 0
    })
    setScores(initial)
  }, [players, round])

  useEffect(() => {
    const initial: Record<string, boolean> = {}
    const picks: Record<string, number | null> = {}
    players.forEach((p) => {
      initial[p] = false
      picks[p] = null
    })
    setAnswered(initial)
    setSelectedByPlayer(picks)
    setSelected(null)
  }, [players, round])

  useEffect(() => {
    const list = getQuizQuestions(editions)
    if (!list.length) return
    let nextIndex = Math.floor(Math.random() * list.length)
    if (list.length > 1 && lastQuestionIndexRef.current === nextIndex) {
      nextIndex = (nextIndex + 1) % list.length
    }
    setQuestionIndex(nextIndex)
    lastQuestionIndexRef.current = nextIndex
  }, [round, editions])

  const question = useMemo(() => {
    const list = getQuizQuestions(editions)
    return list[questionIndex % list.length]
  }, [questionIndex, editions])

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
    if (answered[players[0] ?? 'Du']) return
    setSelected(idx)
    const playerKey = players[0] ?? 'Du'
    setAnswered((prev) => ({ ...prev, [playerKey]: true }))
    setSelectedByPlayer((prev) => ({ ...prev, [playerKey]: idx }))
    if (idx === question.correct) {
      setScores((prev) => ({
        ...prev,
        [playerKey]: (prev[playerKey] ?? 0) + 100
      }))
      onScore(playerKey, 100)
    }
  }

  useEffect(() => {
    const allAnswered = players.length > 0 && players.every((p) => answered[p])
    if (allAnswered) {
      const timeout = window.setTimeout(() => onRoundComplete(), 600)
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
            const pickedIndex = selectedByPlayer[player]
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
