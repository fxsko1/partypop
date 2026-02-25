import { useEffect, useMemo, useRef, useState } from 'react'
import { type Edition, getEmojiRiddlesWithEdition } from './gameContent'
import type { RoundContent } from '@shared/types'

type Props = {
  players: string[]
  round: number
  editions: Edition[]
  onRoundComplete: () => void
  contentSeed: number
  onSubmitGuess: (guess: string, correct: boolean) => void
  submissions: Record<string, string>
  playerNameById: Record<string, string>
  currentPlayerName: string
  timeLeft: number
  roundContent: RoundContent | null
}

export default function EmojiRiddleGame({
  players,
  round,
  editions,
  onRoundComplete,
  contentSeed,
  onSubmitGuess,
  submissions,
  playerNameById,
  currentPlayerName,
  timeLeft,
  roundContent
}: Props) {
  const effectiveEditions = useMemo(() => {
    const hasFilmOrGaming = editions.includes('film') || editions.includes('gaming')
    return hasFilmOrGaming ? editions.filter((edition) => edition === 'film' || edition === 'gaming') : editions
  }, [editions])
  const riddles = useMemo(() => getEmojiRiddlesWithEdition(effectiveEditions), [effectiveEditions])
  const fallback = riddles[contentSeed % riddles.length]
  const riddle =
    roundContent?.mode === 'emoji'
      ? {
          emoji: roundContent.emoji.emoji,
          answer: roundContent.emoji.answer,
          edition: roundContent.emoji.edition
        }
      : fallback
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const completedRef = useRef(false)
  const [feedback, setFeedback] = useState<{ text: string; kind: 'ok' | 'bad' } | null>(null)
  const [revealAnswer, setRevealAnswer] = useState(false)

  useEffect(() => {
    const initial: Record<string, string> = {}
    players.forEach((p) => {
      initial[p] = ''
    })
    setAnswers(initial)
    completedRef.current = false
    setFeedback(null)
    setRevealAnswer(false)
  }, [players, round])

  useEffect(() => {
    if (completedRef.current) return
    const allCorrect = players.every(
      (player) => answers[player] && answers[player].toLowerCase() === riddle.answer.toLowerCase()
    )
    if (!allCorrect) return
    completedRef.current = true
    const timeout = window.setTimeout(() => onRoundComplete(), 700)
    return () => window.clearTimeout(timeout)
  }, [answers, players, riddle, onRoundComplete])

  useEffect(() => {
    if (completedRef.current) return
    if (timeLeft > 0) return
    setRevealAnswer(true)
    completedRef.current = true
    const timeout = window.setTimeout(() => onRoundComplete(), 2300)
    return () => window.clearTimeout(timeout)
  }, [timeLeft, onRoundComplete])

  const submit = (value: string) => {
    const text = value.trim()
    if (!text) return
    const correct = text.toLowerCase() === riddle.answer.toLowerCase()
    onSubmitGuess(text, correct)
    setAnswers((prev) => ({ ...prev, [currentPlayerName]: text }))
    setFeedback(correct ? { text: '✅ Wort erraten!', kind: 'ok' } : { text: '❌ Noch nicht richtig', kind: 'bad' })
  }

  useEffect(() => {
    const next: Record<string, string> = {}
    players.forEach((player) => {
      const id = Object.entries(playerNameById).find(([, name]) => name === player)?.[0]
      next[player] = id ? submissions[id] ?? '' : ''
    })
    setAnswers(next)
  }, [submissions, players, playerNameById])

  useEffect(() => {
    const ownAnswer = answers[currentPlayerName]
    if (!ownAnswer) return
    const correct = ownAnswer.toLowerCase() === riddle.answer.toLowerCase()
    setFeedback(correct ? { text: '✅ Wort erraten!', kind: 'ok' } : { text: '❌ Noch nicht richtig', kind: 'bad' })
  }, [answers, currentPlayerName, riddle.answer])

  return (
    <div className="game-stage">
      <div className="tagline" style={{ marginBottom: '0.5rem' }}>
        Hinweis: {riddle.edition === 'film' ? '🎬 Film' : riddle.edition === 'gaming' ? '🎮 Gaming' : '🌍 Allgemein'}
      </div>
      <div className="emoji-card">{riddle.emoji}</div>
      {feedback ? (
        <div className={`emoji-feedback ${feedback.kind === 'ok' ? 'ok' : 'bad'}`}>{feedback.text}</div>
      ) : null}
      {revealAnswer ? <div className="emoji-reveal">Auflösung: {riddle.answer}</div> : null}
      <div className="emoji-answer">
        <input
          className="guess-input"
          placeholder="Deine Antwort"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              submit((event.target as HTMLInputElement).value)
              ;(event.target as HTMLInputElement).value = ''
            }
          }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>('.guess-input')
            if (!input) return
            submit(input.value)
            input.value = ''
          }}
        >
          Senden
        </button>
      </div>
    </div>
  )
}
