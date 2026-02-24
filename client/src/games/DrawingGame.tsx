import { useEffect, useMemo, useRef, useState } from 'react'
import { type Edition, getDrawingWords } from './gameContent'

const colors = ['#1a0a2e', '#FF4757', '#FF9F1C', '#FFE135', '#00F5D4', '#00BBF9', '#9B5DE5', '#FF6B9D', '#ffffff']

type Props = {
  players: string[]
  round: number
  onRoundComplete: () => void
  editions: Edition[]
  onScore: (player: string, delta: number) => void
  currentPlayerName: string
  contentSeed: number
  onSubmitGuess: (guess: string, correct: boolean) => void
  onSubmitCanvas: (imageData: string) => void
  guessLog: Array<{ playerId: string; value: string; correct?: boolean }>
  playerNameById: Record<string, string>
  submissions: Record<string, string>
}

export default function DrawingGame({
  players,
  round,
  onRoundComplete,
  editions,
  onScore,
  currentPlayerName,
  contentSeed,
  onSubmitGuess,
  onSubmitCanvas,
  guessLog,
  playerNameById,
  submissions
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastBroadcastRef = useRef(0)
  const lastRemoteImageRef = useRef('')
  const awardedRef = useRef<Record<string, boolean>>({})

  const [drawColor, setDrawColor] = useState('#1a0a2e')
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [brushSize, setBrushSize] = useState(6)
  const [word, setWord] = useState('')
  const [guessInput, setGuessInput] = useState('')
  const [hint, setHint] = useState('')
  const [guesses, setGuesses] = useState<Array<{ player: string; guess: string; correct: boolean }>>([])

  const drawerName = useMemo(() => {
    if (!players.length) return currentPlayerName
    const idx = Math.max(round - 1, 0) % players.length
    return players[idx]
  }, [players, round, currentPlayerName])

  const guessers = useMemo(() => players.filter((p) => p !== drawerName), [players, drawerName])
  const isDrawer = currentPlayerName === drawerName

  useEffect(() => {
    const list = getDrawingWords(editions)
    setWord(list[contentSeed % list.length])
    setGuesses([])
    setGuessInput('')
    setHint('')
    awardedRef.current = {}
    lastRemoteImageRef.current = ''
    lastBroadcastRef.current = 0
  }, [round, editions, contentSeed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = Math.min(600, window.innerWidth - 40)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [round])

  const draw = (event: PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleX
    ctx.lineTo(x, y)
    ctx.strokeStyle = tool === 'eraser' ? 'white' : drawColor
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return
    isDrawingRef.current = true
    const ctx = canvasRef.current?.getContext('2d')
    ctx?.beginPath()
    draw(event.nativeEvent)
    const canvas = canvasRef.current
    if (canvas) {
      onSubmitCanvas(canvas.toDataURL('image/png'))
      lastBroadcastRef.current = Date.now()
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawingRef.current) return
    draw(event.nativeEvent)
    const canvas = canvasRef.current
    if (!canvas) return
    const now = Date.now()
    if (now - lastBroadcastRef.current > 80) {
      onSubmitCanvas(canvas.toDataURL('image/png'))
      lastBroadcastRef.current = now
    }
  }

  const handlePointerUp = () => {
    isDrawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas || !isDrawer) return
    onSubmitCanvas(canvas.toDataURL('image/png', 0.7))
  }

  const clearCanvas = () => {
    if (!isDrawer) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    onSubmitCanvas(canvas.toDataURL('image/png', 0.7))
  }

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const submitGuess = () => {
    if (isDrawer) return
    const guess = guessInput.trim()
    if (!guess) return
    const correct = normalize(guess) === normalize(word)
    if (!correct) {
      const g = normalize(guess)
      const w = normalize(word)
      const near =
        (g.length >= 4 && w.includes(g)) ||
        (w.length >= 4 && g.includes(w)) ||
        g.split(' ').some((part) => part.length >= 4 && w.includes(part))
      setHint(near ? 'Fast!' : '')
    } else {
      setHint('')
    }
    onSubmitGuess(guess, correct)
    setGuesses((prev) => [...prev, { player: currentPlayerName, guess, correct }])
    setGuessInput('')
  }

  useEffect(() => {
    if (isDrawer) return
    const imageData = submissions.__drawing_canvas
    if (!imageData || imageData === lastRemoteImageRef.current) return
    lastRemoteImageRef.current = imageData
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = imageData
  }, [submissions, isDrawer])

  useEffect(() => {
    const synced = guessLog.map((entry) => ({
      player: playerNameById[entry.playerId] ?? 'Spieler',
      guess: entry.value,
      correct: Boolean(entry.correct)
    }))
    if (synced.length) {
      setGuesses(synced)
    }
  }, [guessLog, playerNameById])

  useEffect(() => {
    const correctPlayers = Array.from(new Set(guesses.filter((g) => g.correct).map((g) => g.player)))
    correctPlayers.forEach((player, index) => {
      if (awardedRef.current[player]) return
      onScore(player, Math.max(100 - index * 20, 0))
      awardedRef.current[player] = true
      if (!awardedRef.current[`drawer-bonus-${player}`]) {
        onScore(drawerName, 40)
        awardedRef.current[`drawer-bonus-${player}`] = true
      }
    })

    if (guessers.length > 0 && guessers.every((guesser) => correctPlayers.includes(guesser))) {
      const timeout = window.setTimeout(() => onRoundComplete(), 600)
      return () => window.clearTimeout(timeout)
    }
  }, [guesses, guessers, drawerName, onScore, onRoundComplete])

  return (
    <div id="drawing-game" className="game-stage">
      <div className="drawing-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 600 }}>
          <div>🎨 <strong>{drawerName.split(' ')[0]}</strong> zeichnet...</div>
          <div className="word-display">{isDrawer ? word : '???'}</div>
        </div>
        <div className="tagline" style={{ marginTop: 8 }}>
          {isDrawer ? 'Du zeichnest' : 'Du errätst'}
        </div>
      </div>

      <div className="canvas-wrap">
        <canvas
          ref={canvasRef}
          id="draw-canvas"
          height={350}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {isDrawer ? (
        <div className="drawing-tools">
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-btn${drawColor === color ? ' active' : ''}`}
                style={{ background: color, border: color === '#ffffff' ? '3px solid rgba(255,255,255,0.3)' : undefined }}
                onClick={() => {
                  setDrawColor(color)
                  setTool('pen')
                }}
              />
            ))}
          </div>
          <input
            type="range"
            className="size-slider"
            min={2}
            max={30}
            value={brushSize}
            onChange={(event) => setBrushSize(Number(event.target.value))}
          />
          <button className={`tool-btn${tool === 'pen' ? ' active' : ''}`} onClick={() => setTool('pen')}>
            ✏️
          </button>
          <button className={`tool-btn${tool === 'eraser' ? ' active' : ''}`} onClick={() => setTool('eraser')}>
            🧹
          </button>
          <button className="tool-btn" onClick={clearCanvas}>
            🗑️
          </button>
        </div>
      ) : (
        <div className="guess-section">
          <input
            className="guess-input"
            placeholder="Was wird gezeichnet?"
            value={guessInput}
            onChange={(event) => setGuessInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitGuess()
            }}
          />
          <button className="btn btn-primary btn-sm" onClick={submitGuess}>
            Raten!
          </button>
          {hint ? <div className="tagline" style={{ color: '#00f5d4' }}>{hint}</div> : null}
        </div>
      )}

      <div className="guesses-log">
        {guesses.map((entry, index) => (
          <div key={`${entry.player}-${index}`} className={`guess-entry${entry.correct ? ' correct-guess' : ''}`}>
            {entry.correct ? `✅ ${entry.player} hat es erraten: "${entry.guess}"!` : `${entry.player}: ${entry.guess}`}
          </div>
        ))}
      </div>
    </div>
  )
}
