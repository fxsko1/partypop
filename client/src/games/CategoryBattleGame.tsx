import { useEffect, useMemo, useState } from 'react'
import { type Edition, getCategoryPrompts } from './gameContent'

type GuessLogEntry = { playerId: string; value: string; correct?: boolean }

type Props = {
  players: string[]
  round: number
  editions: Edition[]
  onRoundComplete: () => void
  onScore: (items: Array<{ player: string; delta: number }>) => void
  contentSeed: number
  onSubmitValue: (value: string) => void
  submissions: Record<string, string>
  currentPlayerName: string
  currentPlayerId: string
  isHost: boolean
  playerNameById: Record<string, string>
  guessLog: GuessLogEntry[]
  onSubmitBid: (bid: number) => void
  onSubmitWords: (words: string[]) => void
  onValidateWords: (acceptedWords: string[]) => void
}

export default function CategoryBattleGame({
  round,
  editions,
  onRoundComplete,
  onScore,
  contentSeed,
  submissions,
  currentPlayerId,
  isHost,
  playerNameById,
  guessLog,
  onSubmitBid,
  onSubmitWords,
  onValidateWords,
  onSubmitValue
}: Props) {
  void onScore

  const prompts = useMemo(() => getCategoryPrompts(editions), [editions])
  const prompt = prompts[contentSeed % prompts.length]

  const [localBid, setLocalBid] = useState(3)
  const [wordInputs, setWordInputs] = useState<string[]>([])
  const [secondsLeft, setSecondsLeft] = useState(20)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const bids = useMemo(() => {
    const out: Record<string, number> = {}
    Object.entries(submissions).forEach(([playerId, value]) => {
      if (value.startsWith('bid:')) out[playerId] = Number(value.split(':')[1] ?? 0)
    })
    return out
  }, [submissions])

  const tiebreakIds = useMemo(() => {
    const marker = guessLog.find((entry) => entry.value.startsWith('category_tiebreak:'))?.value
    if (!marker) return []
    const [, ids] = marker.split(':')
    return (ids ?? '').split(',').filter(Boolean)
  }, [guessLog])

  const winnerId = useMemo(
    () => guessLog.find((entry) => entry.value === 'category_winner')?.playerId ?? null,
    [guessLog]
  )
  const winnerBid = useMemo(() => {
    if (!winnerId) return 0
    const raw = submissions[winnerId] ?? ''
    if (!raw.startsWith('bid:')) return 0
    return Math.max(1, Number(raw.split(':')[1] ?? 1))
  }, [winnerId, submissions])

  const winnerWords = useMemo(() => {
    const raw = guessLog.find((entry) => entry.value.startsWith('category_words:'))?.value ?? ''
    if (!raw) return []
    return raw
      .replace('category_words:', '')
      .split('|')
      .map((word) => word.trim())
      .filter(Boolean)
  }, [guessLog])

  const result = useMemo(() => {
    const raw = guessLog.find((entry) => entry.value.startsWith('category_result:'))?.value
    if (!raw) return null
    const [, accepted, bid, delta] = raw.split(':')
    return { accepted: Number(accepted), bid: Number(bid), delta: Number(delta) }
  }, [guessLog])

  const canBid = useMemo(() => {
    if (winnerId) return false
    if (!tiebreakIds.length) return true
    return tiebreakIds.includes(currentPlayerId)
  }, [winnerId, tiebreakIds, currentPlayerId])

  const iAmWinner = Boolean(winnerId && winnerId === currentPlayerId)

  useEffect(() => {
    if (!winnerBid) {
      setWordInputs([])
      return
    }
    setWordInputs((prev) =>
      Array.from({ length: winnerBid }, (_, index) => prev[index] ?? '')
    )
  }, [winnerBid, round])

  useEffect(() => {
    if (!winnerWords.length) {
      setChecked({})
      return
    }
    setChecked(
      winnerWords.reduce<Record<string, boolean>>((acc, word) => {
        acc[word] = true
        return acc
      }, {})
    )
  }, [winnerWords])

  useEffect(() => {
    if (!winnerId || winnerWords.length > 0 || result) return
    setSecondsLeft(20)
  }, [winnerId, winnerWords.length, result, round])

  useEffect(() => {
    if (!winnerId || winnerWords.length > 0 || result) return
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          if (iAmWinner) {
            const words = wordInputs
              .map((word) => word.trim())
              .filter(Boolean)
            onSubmitWords(words)
            onSubmitValue(words.join(','))
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [winnerId, winnerWords.length, result, iAmWinner, wordInputs, onSubmitWords, onSubmitValue])

  useEffect(() => {
    if (!result) return
    const timeout = window.setTimeout(() => onRoundComplete(), 1400)
    return () => window.clearTimeout(timeout)
  }, [result, onRoundComplete])

  return (
    <div className="game-stage">
      <div className="category-card">Kategorie Battle: {prompt.word}</div>

      {!winnerId ? (
        <div className="guess-section">
          {canBid ? (
            <>
              <input
                className="guess-input"
                type="number"
                min={1}
                max={12}
                value={localBid}
                onChange={(event) => setLocalBid(Math.max(1, Math.min(12, Number(event.target.value))))}
              />
              <button className="btn btn-primary btn-sm" onClick={() => onSubmitBid(localBid)}>
                Geheim bieten
              </button>
            </>
          ) : (
            <div className="tagline">Stechrunde läuft. Warte auf die Bieter.</div>
          )}
        </div>
      ) : null}

      {!winnerId && Object.keys(bids).length > 0 ? (
        <div className="guesses-log">
          {Object.entries(bids).map(([id, bid]) => (
            <div key={id} className="guess-entry">
              {playerNameById[id] ?? 'Spieler'} hat {bid} geboten
            </div>
          ))}
        </div>
      ) : null}

      {!winnerId && tiebreakIds.length > 0 ? (
        <div className="tagline">
          Stechrunde zwischen:{' '}
          {tiebreakIds.map((id) => playerNameById[id] ?? 'Spieler').join(', ')}
        </div>
      ) : null}

      {winnerId && winnerWords.length === 0 ? (
        <div className="tagline">Eingabezeit: {secondsLeft}s</div>
      ) : null}

      {winnerId && iAmWinner && winnerWords.length === 0 ? (
        <div className="category-word-form">
          <div className="tagline">Du hast mit {winnerBid} gewonnen. Trage jetzt bis zu {winnerBid} Begriffe ein.</div>
          {wordInputs.map((word, index) => (
            <div className="category-word-row" key={`input-${index}`}>
              <span className="category-word-index">{index + 1}.</span>
              <input
                className="guess-input"
                placeholder={`Begriff ${index + 1}`}
                value={word}
                onChange={(event) =>
                  setWordInputs((prev) =>
                    prev.map((entry, entryIndex) => (entryIndex === index ? event.target.value : entry))
                  )
                }
              />
            </div>
          ))}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              const words = wordInputs.map((word) => word.trim()).filter(Boolean)
              onSubmitWords(words)
              onSubmitValue(words.join(','))
            }}
          >
            Abschicken
          </button>
        </div>
      ) : null}

      {winnerId && !iAmWinner && winnerWords.length === 0 ? (
        <div className="tagline">{playerNameById[winnerId] ?? 'Spieler'} gibt Begriffe ein.</div>
      ) : null}

      {isHost && winnerWords.length > 0 && !result ? (
        <div className="category-validation">
          <div className="tagline">Host Validierung</div>
          {winnerWords.map((word, index) => (
            <div key={`${word}-${index}`} className="category-validate-row">
              <span className="category-word-index">{index + 1}.</span>
              <span className="category-validate-word">{word}</span>
              <button
                type="button"
                className={`btn btn-sm ${checked[word] ?? true ? 'btn-secondary' : 'btn-back'}`}
                onClick={() => setChecked((prev) => ({ ...prev, [word]: !(prev[word] ?? true) }))}
              >
                {(checked[word] ?? true) ? 'Gültig' : 'Ungültig'}
              </button>
            </div>
          ))}
          <button
            className="btn btn-yellow btn-sm"
            onClick={() => {
              const accepted = winnerWords.filter((word) => checked[word] ?? true)
              onValidateWords(accepted)
            }}
          >
            Validieren
          </button>
        </div>
      ) : null}

      {winnerWords.length > 0 && !isHost && !result ? (
        <div className="tagline">Host validiert die Begriffe...</div>
      ) : null}

      {result ? (
        <div className="guesses-log">
          <div className={`guess-entry ${result.delta >= 0 ? 'correct-guess' : ''}`}>
            Ergebnis: {result.accepted}/{result.bid} gültig · Punkte {result.delta >= 0 ? `+${result.delta}` : result.delta}
          </div>
        </div>
      ) : null}

      {!winnerId && Object.keys(bids).length > 0 ? (
        <div className="tagline">Bieten abgeschlossen. Gewinner wird ermittelt...</div>
      ) : null}
    </div>
  )
}
