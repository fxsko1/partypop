import { useEffect, useMemo, useRef, useState } from 'react'
import { type Edition, getDrawingWords } from './gameContent'

const colors = ['#1a0a2e', '#FF4757', '#FF9F1C', '#FFE135', '#00F5D4', '#00BBF9', '#9B5DE5', '#FF6B9D', '#ffffff']

type Props = {
  players: string[]
  round: number
  onRoundComplete: () => void
  editions: Edition[]
  onScore: (player: string, delta: number) => void
}

export default function DrawingGame({ players, round, onRoundComplete, editions, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [drawColor, setDrawColor] = useState('#1a0a2e')
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [brushSize, setBrushSize] = useState(6)
  const [word, setWord] = useState(() => {
    const list = getDrawingWords(editions)
    return list[Math.floor(Math.random() * list.length)]
  })
  const [guesses, setGuesses] = useState<Array<{ player: string; guess: string; correct: boolean }>>([])
  const awardedRef = useRef<Record<string, boolean>>({})
  const isDrawingRef = useRef(false)

  const drawerName = useMemo(() => players[0]?.split(' ')[0] ?? 'Du', [players])

  useEffect(() => {
    const list = getDrawingWords(editions)
    setWord(list[Math.floor(Math.random() * list.length)])
    setGuesses([])
    awardedRef.current = {}
  }, [round, editions])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = Math.min(600, window.innerWidth - 40)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const draw = (event: PointerEvent | MouseEvent | Touch) => {
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
    isDrawingRef.current = true
    const ctx = canvasRef.current?.getContext('2d')
    ctx?.beginPath()
    draw(event.nativeEvent)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    draw(event.nativeEvent)
  }

  const handlePointerUp = () => {
    isDrawingRef.current = false
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const submitGuess = (value: string) => {
    const guess = value.trim()
    if (!guess) return
    const correct = guess.toLowerCase() === word.toLowerCase()
    setGuesses((prev) => [...prev, { player: 'Du', guess, correct }])
  }

  useEffect(() => {
    const others = players.slice(1)
    const timers = others.map((player, index) =>
      window.setTimeout(() => {
        setGuesses((prev) => [...prev, { player, guess: word, correct: true }])
      }, 4500 + index * 1000 + Math.random() * 1200)
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [players, word, round])

  useEffect(() => {
    const correctPlayers = guesses.filter((g) => g.correct).map((g) => g.player)
    const unique = Array.from(new Set(correctPlayers))
    unique.forEach((player, index) => {
      if (awardedRef.current[player]) return
      const points = Math.max(100 - index * 20, 0)
      onScore(player, points)
      awardedRef.current[player] = true
    })
  }, [guesses, onScore])

  useEffect(() => {
    const winners = new Set(guesses.filter((g) => g.correct).map((g) => g.player))
    const allGuessed = players.length > 0 && players.every((p) => winners.has(p))
    if (allGuessed) {
      const timeout = window.setTimeout(() => onRoundComplete(), 600)
      return () => window.clearTimeout(timeout)
    }
  }, [guesses, players, onRoundComplete])

  return (
    <div id="drawing-game" className="game-stage">
      <div className="drawing-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 600 }}>
          <div>🎨 <strong>{drawerName}</strong> zeichnet...</div>
          <div className="word-display">{word}</div>
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
      <div className="guess-section">
        <input
          className="guess-input"
          placeholder="Was wird gezeichnet?"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              submitGuess((event.target as HTMLInputElement).value)
              ;(event.target as HTMLInputElement).value = ''
            }
          }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>('.guess-input')
            if (!input) return
            submitGuess(input.value)
            input.value = ''
          }}
        >
          Raten!
        </button>
      </div>
      <div className="guesses-log">
        {guesses.map((entry, index) => (
          <div key={`${entry.player}-${index}`} className={`guess-entry${entry.correct ? ' correct-guess' : ''}`}>
            {entry.correct ? `✅ ${entry.player} hat es erraten: "${entry.guess}"! 🎉` : `${entry.player}: ${entry.guess}`}
          </div>
        ))}
      </div>
    </div>
  )
}
