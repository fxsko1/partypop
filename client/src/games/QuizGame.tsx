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
    players.forEach((p) => {
      initial[p] = false
    })
    setAnswered(initial)
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
    </div>
  )
}
