import { useEffect, useMemo, useRef, useState } from 'react'
import { type Edition, getCategoryPrompts } from './gameContent'

type Props = {
  players: string[]
  round: number
  editions: Edition[]
  onRoundComplete: () => void
  onScore: (items: Array<{ player: string; delta: number }>) => void
  contentSeed: number
}

export default function CategoryBattleGame({ players, round, editions, onRoundComplete, onScore, contentSeed }: Props) {
  const prompts = useMemo(() => getCategoryPrompts(editions), [editions])
  const prompt = prompts[contentSeed % prompts.length]
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
    const normalized = players.map((p) => ({ player: p, answer: answers[p].trim().toLowerCase() }))
    const counts: Record<string, number> = {}
    normalized.forEach(({ answer }) => {
      counts[answer] = (counts[answer] ?? 0) + 1
    })
    const awards = normalized
      .filter(({ answer }) => answer && counts[answer] === 1)
      .map(({ player }) => ({ player, delta: 80 }))
    if (awards.length) onScore(awards)
    scoredRef.current = true
    const timeout = window.setTimeout(() => onRoundComplete(), 600)
    return () => window.clearTimeout(timeout)
  }, [answers, players, onScore, onRoundComplete])

  const submit = (value: string) => {
    const text = value.trim()
    if (!text) return
    setAnswers((prev) => ({ ...prev, [players[0] ?? 'Du']: text }))
  }

  return (
    <div className="game-stage">
      <div className="category-card">Nenne Dinge: {prompt.word}</div>
      <div className="emoji-answer">
        <input
          className="guess-input"
          placeholder="Dein Begriff"
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
