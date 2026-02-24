import { useEffect, useMemo, useRef, useState } from 'react'
import { type Edition, getEmojiRiddlesWithEdition } from './gameContent'

type Props = {
  players: string[]
  round: number
  editions: Edition[]
  onRoundComplete: () => void
  onScore: (player: string, delta: number) => void
  contentSeed: number
  onSubmitGuess: (guess: string, correct: boolean) => void
  submissions: Record<string, string>
  playerNameById: Record<string, string>
  currentPlayerName: string
}

export default function EmojiRiddleGame({
  players,
  round,
  editions,
  onRoundComplete,
  onScore,
  contentSeed,
  onSubmitGuess,
  submissions,
  playerNameById,
  currentPlayerName
}: Props) {
  const effectiveEditions = useMemo(() => {
    const hasFilmOrGaming = editions.includes('film') || editions.includes('gaming')
    return hasFilmOrGaming ? editions.filter((edition) => edition === 'film' || edition === 'gaming') : editions
  }, [editions])
  const riddles = useMemo(() => getEmojiRiddlesWithEdition(effectiveEditions), [effectiveEditions])
  const riddle = riddles[contentSeed % riddles.length]
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const scoredRef = useRef(false)

  useEffect(() => {
    const initial: Record<string, string> = {}
    players.forEach((p) => {
      initial[p] = ''
    })
    setAnswers(initial)
    scoredRef.current = false
  }, [players, round])

  useEffect(() => {
    if (scoredRef.current) return
    const filled = players.every((p) => answers[p])
    if (!filled) return
    const correct = players.filter((p) => answers[p].toLowerCase() === riddle.answer.toLowerCase())
    correct.forEach((player, index) => {
      const points = Math.max(120 - index * 20, 40)
      onScore(player, points)
    })
    scoredRef.current = true
    const timeout = window.setTimeout(() => onRoundComplete(), 600)
    return () => window.clearTimeout(timeout)
  }, [answers, players, riddle, onRoundComplete, onScore])

  const submit = (value: string) => {
    const text = value.trim()
    if (!text) return
    const correct = text.toLowerCase() === riddle.answer.toLowerCase()
    onSubmitGuess(text, correct)
    setAnswers((prev) => ({ ...prev, [currentPlayerName]: text }))
  }

  useEffect(() => {
    const next: Record<string, string> = {}
    players.forEach((player) => {
      const id = Object.entries(playerNameById).find(([, name]) => name === player)?.[0]
      next[player] = id ? submissions[id] ?? '' : ''
    })
    setAnswers(next)
  }, [submissions, players, playerNameById])

  return (
    <div className="game-stage">
      <div className="tagline" style={{ marginBottom: '0.5rem' }}>
        Hinweis: {riddle.edition === 'film' ? '🎬 Film' : riddle.edition === 'gaming' ? '🎮 Gaming' : '🌍 Allgemein'}
      </div>
      <div className="emoji-card">{riddle.emoji}</div>
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
