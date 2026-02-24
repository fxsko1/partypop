import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import CategoryBattleGame from './games/CategoryBattleGame'
import DrawingGame from './games/DrawingGame'
import EmojiRiddleGame from './games/EmojiRiddleGame'
import QuizGame from './games/QuizGame'
import VotingGame from './games/VotingGame'
import type {
  ClientToServerEvents,
  GameStateUpdate,
  JoinRoomPayload,
  RoomState,
  ServerError,
  ServerToClientEvents
} from '@shared/types'

type Screen = 'home' | 'lobby' | 'join' | 'gameselect' | 'game' | 'sessionEnd'

const defaultEmojis = ['🎉', '🎊', '🎈', '✨', '🌟', '🎮', '🕹️', '🃏', '🎲', '🎯', '🏆', '💥']

const drawSimpleQR = (canvas: HTMLCanvasElement, text: string) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const size = canvas.width
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#1a0a2e'

  const cells = 21
  const cell = size / cells
  const drawFinder = (x: number, y: number) => {
    ctx.fillStyle = '#1a0a2e'
    ctx.fillRect(x * cell, y * cell, 7 * cell, 7 * cell)
    ctx.fillStyle = 'white'
    ctx.fillRect((x + 1) * cell, (y + 1) * cell, 5 * cell, 5 * cell)
    ctx.fillStyle = '#1a0a2e'
    ctx.fillRect((x + 2) * cell, (y + 2) * cell, 3 * cell, 3 * cell)
  }
  drawFinder(0, 0)
  drawFinder(14, 0)
  drawFinder(0, 14)

  let seed = 0
  for (let i = 0; i < text.length; i += 1) seed += text.charCodeAt(i)
  const rand = (s: number) => ((s * 9301 + 49297) % 233280) / 233280
  for (let r = 0; r < cells; r += 1) {
    for (let c = 0; c < cells; c += 1) {
      if (r < 8 && c < 8) continue
      if (r < 8 && c > 13) continue
      if (r > 13 && c < 8) continue
      seed = Math.floor(rand(seed) * 233280)
      if (seed % 2 === 0) {
        ctx.fillStyle = '#1a0a2e'
        ctx.fillRect(c * cell, r * cell, cell, cell)
      }
    }
  }

  ctx.fillStyle = '#9B5DE5'
  ctx.font = 'bold 12px Nunito'
  ctx.textAlign = 'center'
  ctx.fillText(`partypop.io/${text}`, size / 2, size - 4)
}

export default function App() {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const playerIdRef = useRef(`player-${Math.random().toString(36).slice(2, 10)}`)
  const [screen, setScreen] = useState<Screen>('home')
  const [roomCode, setRoomCode] = useState<string>('----')
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [showPremiumNudge, setShowPremiumNudge] = useState(false)
  const [editions, setEditions] = useState<Array<'fussball' | 'wissen' | 'romantisch' | 'gaming' | 'film'>>([
    'wissen'
  ])
  const [lastEdition, setLastEdition] = useState<'fussball' | 'wissen' | 'romantisch' | 'gaming' | 'film'>('wissen')
  const [showPremiumGate, setShowPremiumGate] = useState(false)
  const [pendingEdition, setPendingEdition] = useState<'gaming' | 'film' | null>(null)
  const isPremium = false
  const maxEditions = isPremium ? 5 : 2
  const [round, setRound] = useState(0)
  const [currentGame, setCurrentGame] = useState<
    'quiz' | 'drawing' | 'voting' | 'emoji' | 'category'
  >('quiz')
  const [isHost, setIsHost] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const roundCompleteRef = useRef(false)

  const games = useMemo(
    () =>
      (isPremium
        ? (['quiz', 'drawing', 'voting', 'emoji', 'category'] as const)
        : (['quiz', 'drawing', 'voting'] as const)),
    [isPremium]
  )

  const pickRandomGame = () => games[Math.floor(Math.random() * games.length)]

  const startSession = () => {
    if (!isHost || !roomState || !socketRef.current) return
    const mode = pickRandomGame()
    socketRef.current.emit('start-game', { code: roomState.code, mode })
  }

  const endRound = () => {
    if (roundCompleteRef.current) return
    roundCompleteRef.current = true
    if (!isHost) return
    window.setTimeout(() => {
      nextRound()
    }, 600)
  }

  const nextRound = () => {
    if (!isHost || !roomState || !socketRef.current) return
    if (round >= 10) {
      socketRef.current.emit('player-action', {
        code: roomState.code,
        action: {
          type: 'host_next_round',
          round,
          nextMode: currentGame,
          finished: true
        }
      })
      return
    }
    const next = round + 1
    const mode = pickRandomGame()
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: {
        type: 'host_next_round',
        round: next,
        nextMode: mode
      }
    })
  }
  const qrRef = useRef<HTMLCanvasElement | null>(null)
  const [players, setPlayers] = useState<string[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const backgroundEmojis = useMemo(() => {
    if (screen === 'home') return defaultEmojis
    const emojiMap = {
      fussball: ['⚽', '🥅', '🏟️', '🧤', '🏃', '🏆', '🎯', '📣', '💨', '🎉'],
      wissen: ['📚', '👓', '✏️', '🏫', '🧑‍🏫', '📖', '🧠', '🧩', '📌', '📝'],
      romantisch: ['💘', '💖', '💋', '🌹', '✨', '💌', '🥂', '💞', '💅', '💕'],
      gaming: ['🎮', '🕹️', '👾', '🧩', '🎯', '⚡', '🧠', '💥', '🛡️', '🏆'],
      film: ['🎬', '🍿', '🎥', '⭐', '🎞️', '📽️', '🧛', '🦖', '🚀', '🧙']
    }
    const combined = editions.flatMap((edition) => emojiMap[edition])
    return combined.length ? combined : defaultEmojis
  }, [editions, screen])

  const toggleEdition = (value: 'fussball' | 'wissen' | 'romantisch' | 'gaming' | 'film') => {
    if ((value === 'gaming' || value === 'film') && !isPremium) {
      setPendingEdition(value)
      setShowPremiumGate(true)
      return
    }
    setLastEdition(value)
    setEditions((prev) => {
      const exists = prev.includes(value)
      if (exists) {
        const next = prev.filter((item) => item !== value)
        return next.length ? next : prev
      }
      if (prev.length >= maxEditions) {
        setShowPremiumGate(true)
        setPendingEdition(null)
        return prev
      }
      return [...prev, value]
    })
  }

  useEffect(() => {
    const initial: Record<string, number> = {}
    players.forEach((p) => {
      initial[p] = scores[p] ?? 0
    })
    setScores(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length])

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000', {
      transports: ['websocket']
    })

    socketRef.current = socket

    const applyRoomState = (room: RoomState) => {
      setRoomState(room)
      setRoomCode(room.code)
      setIsHost(room.hostId === playerIdRef.current)
      setRound(room.round)
      if (room.mode) setCurrentGame(room.mode)
      setPlayers(room.players.map((player) => player.name))
      setScores(
        room.players.reduce<Record<string, number>>((acc, player) => {
          acc[player.name] = player.score
          return acc
        }, {})
      )
      if (room.phase === 'in_game') {
        setScreen('game')
      } else if (room.phase === 'session_end') {
        setScreen('sessionEnd')
      } else {
        setScreen('lobby')
      }
      setConnectionError('')
    }

    socket.on('room-joined', (room) => {
      applyRoomState(room)
    })

    socket.on('game-state-update', (payload: GameStateUpdate) => {
      applyRoomState(payload.room)
    })

    socket.on('error', (error: ServerError) => {
      setConnectionError(error.message)
    })

    socket.on('disconnect', () => {
      setConnectionError('Verbindung verloren. Bitte neu laden.')
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const addScore = (player: string, delta: number) => {
    if (!isHost || !roomState || !socketRef.current) return
    const target = roomState.players.find((p) => p.name === player)
    if (!target) return
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: {
        type: 'score_delta',
        updates: [{ playerId: target.id, delta }]
      }
    })
    setScores((prev) => ({
      ...prev,
      [player]: (prev[player] ?? 0) + delta
    }))
  }

  const addScores = (items: Array<{ player: string; delta: number }>) => {
    if (!isHost || !roomState || !socketRef.current) return
    const updates = items
      .map(({ player, delta }) => {
        const target = roomState.players.find((p) => p.name === player)
        if (!target) return null
        return { playerId: target.id, delta }
      })
      .filter((item): item is { playerId: string; delta: number } => Boolean(item))
    if (updates.length) {
      socketRef.current.emit('player-action', {
        code: roomState.code,
        action: {
          type: 'score_delta',
          updates
        }
      })
    }
    setScores((prev) => {
      const next = { ...prev }
      items.forEach(({ player, delta }) => {
        next[player] = (next[player] ?? 0) + delta
      })
      return next
    })
  }

  useEffect(() => {
    if (roomCode === '----') return
    if (qrRef.current) drawSimpleQR(qrRef.current, roomCode)
  }, [roomCode])

  useEffect(() => {
    if (screen !== 'game') return
    roundCompleteRef.current = false
    setTimeLeft(60)
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          endRound()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [screen, round, currentGame])

  useEffect(() => {
    if (screen !== 'home' && screen !== 'join') return

    const timeoutId = window.setTimeout(() => {
      setShowPremiumNudge(true)
      window.setTimeout(() => setShowPremiumNudge(false), 4500)
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [screen])

  const createRoom = () => {
    const socket = socketRef.current
    if (!socket) return
    const payload: JoinRoomPayload = {
      isHost: true,
      name: 'Du (Host)',
      playerId: playerIdRef.current
    }
    socket.emit('join-room', payload)
  }

  const joinRoom = () => {
    const socket = socketRef.current
    if (!socket) return
    if (joinCode.trim().length !== 4) {
      setConnectionError('Bitte einen 4-stelligen Code eingeben.')
      return
    }
    if (!joinName.trim()) {
      setConnectionError('Bitte Namen eingeben.')
      return
    }
    const payload: JoinRoomPayload = {
      isHost: false,
      code: joinCode.trim().toUpperCase(),
      name: joinName.trim(),
      playerId: playerIdRef.current
    }
    socket.emit('join-room', payload)
  }

  return (
    <div className="screen active" id={screen}>
      {screen === 'home' ? (
        <button className="btn btn-profile" onClick={() => setShowProfile(true)}>
          👤 Profil
        </button>
      ) : null}

      {showPremiumGate ? (
        <div className="profile-modal" role="dialog" aria-modal="true">
          <div className="profile-card">
            <div className="profile-header">
              <div className="logo">PartyPop 🎊</div>
              <button className="btn btn-back" onClick={() => setShowPremiumGate(false)}>
                ✕
              </button>
            </div>
            <h2 className="heading">Premium</h2>
            <p className="tagline">
              {pendingEdition
                ? `${pendingEdition === 'gaming' ? '🎮 Gaming' : '🎬 Film'} ist nur mit Premium verfügbar.`
                : 'Dieses Spiel ist nur für Premium verfügbar.'}
            </p>
            <div className="profile-actions">
              <button className="btn btn-yellow">Premium freischalten</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPremiumGate(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`premium-nudge ${showPremiumNudge ? 'show' : ''}`}>
        <div className="premium-nudge__title">Premium freischalten</div>
        <div className="premium-nudge__text">Mehr Spiele, mehr Features, keine Limits.</div>
        <button className="btn btn-yellow premium-nudge__cta" onClick={() => setShowProfile(true)}>
          Jetzt upgraden
        </button>
      </div>

      {showProfile ? (
        <div className="profile-modal" role="dialog" aria-modal="true">
          <div className="profile-card">
            <div className="profile-header">
              <div className="logo">PartyPop 🎊</div>
              <button className="btn btn-back" onClick={() => setShowProfile(false)}>
                ✕
              </button>
            </div>
            <h2 className="heading">Dein Profil</h2>
            <p className="tagline">Erstelle dein Profil oder schalte Premium frei.</p>
            <div className="profile-actions">
              <button className="btn btn-primary">Profil erstellen</button>
              <button className="btn btn-yellow">Premium kaufen</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="floating-emojis" aria-hidden="true">
        {backgroundEmojis.map((emoji, index) => (
          <span
            key={`${emoji}-${index}`}
            className="emoji-float"
            style={{
              left: `${(index * 8) % 100}%`,
              animationDuration: `${9 + (index % 6)}s`,
              animationDelay: `${(index % 8) * 0.6}s`,
              fontSize: `${1.4 + (index % 4) * 0.4}rem`
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      {screen === 'home' ? (
        <>
          <div className="logo">PartyPop 🎊</div>
          <p className="tagline">Das Party-Game für alle! Kein Download nötig.</p>
          <div className="home-buttons">
            <button className="btn btn-primary" onClick={createRoom}>
              🎮 Raum erstellen
            </button>
            <button className="btn btn-secondary" onClick={() => setScreen('join')}>
              📱 Beitreten
            </button>
            <button className="btn btn-yellow">✨ Demo starten</button>
          </div>
        </>
      ) : screen === 'join' ? (
        <>
          <button className="btn btn-back" onClick={() => setScreen('home')}>
            ← Zurück
          </button>
          <div className="logo">PartyPop 🎊</div>
          <h2 className="heading">Raum beitreten</h2>
          <input
            className="name-input"
            placeholder="Dein Name"
            maxLength={12}
            value={joinName}
            onChange={(event) => setJoinName(event.target.value)}
          />
          <input
            className="join-input"
            placeholder="CODE"
            maxLength={4}
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
          />
          <button className="btn btn-primary join-cta" onClick={joinRoom}>
            Beitreten!
          </button>
          {connectionError ? <p className="tagline">{connectionError}</p> : null}
        </>
      ) : screen === 'gameselect' ? (
        <>
          <button className="btn btn-back" onClick={() => setScreen('lobby')}>
            ← Zurück
          </button>
          <h2 className="heading">Diese Spiele werden gespielt</h2>
          <div className="edition-picker">
            <div className="edition-label">Edition wählen</div>
            <div className="edition-toggle" role="group" aria-label="Edition wählen">
              <button
                className={`label ${editions.includes('fussball') ? 'active' : ''}`}
                type="button"
                aria-pressed={editions.includes('fussball')}
                onClick={() => toggleEdition('fussball')}
              >
                <span>⚽ Fußball</span>
              </button>
              <button
                className={`label ${editions.includes('wissen') ? 'active' : ''}`}
                type="button"
                aria-pressed={editions.includes('wissen')}
                onClick={() => toggleEdition('wissen')}
              >
                <span>🧠 Allgemein</span>
              </button>
              <button
                className={`label ${editions.includes('romantisch') ? 'active' : ''}`}
                type="button"
                aria-pressed={editions.includes('romantisch')}
                onClick={() => toggleEdition('romantisch')}
              >
                <span>💘 Romantisch</span>
              </button>
              <button
                className={`label premium ${editions.includes('gaming') ? 'active' : ''}`}
                type="button"
                aria-pressed={editions.includes('gaming')}
                onClick={() => toggleEdition('gaming')}
              >
                <span>🎮 Gaming</span>
              </button>
              <button
                className={`label premium ${editions.includes('film') ? 'active' : ''}`}
                type="button"
                aria-pressed={editions.includes('film')}
                onClick={() => toggleEdition('film')}
              >
                <span>🎬 Film</span>
              </button>
              <div
                className="slidebar"
                aria-hidden="true"
                style={{
                  transform:
                    lastEdition === 'fussball'
                      ? 'translateX(0)'
                      : lastEdition === 'wissen'
                        ? 'translateX(100%)'
                        : lastEdition === 'romantisch'
                          ? 'translateX(200%)'
                          : lastEdition === 'gaming'
                            ? 'translateX(300%)'
                            : 'translateX(400%)'
                }}
              />
              <div className="bar" aria-hidden="true" />
            </div>
          </div>
          <div className="game-cards">
            <button className="game-card quiz" type="button">
              <span className="icon">🧠</span>
              <div className="name">Quiz</div>
              <div className="desc">Wissen testen</div>
            </button>
            <button className="game-card drawing" type="button">
              <span className="icon">🎨</span>
              <div className="name">Drawing</div>
              <div className="desc">Zeichnen & raten</div>
            </button>
            <button className="game-card voting" type="button">
              <span className="icon">🗳️</span>
              <div className="name">Voting</div>
              <div className="desc">Wer ist am ehesten...?</div>
            </button>
            <button
              className={`game-card premium ${!isPremium ? 'locked' : ''}`}
              type="button"
              onClick={() => {
                if (!isPremium) {
                  setPendingEdition(null)
                  setShowPremiumGate(true)
                  return
                }
                setCurrentGame('emoji')
                setRound(1)
                setScreen('game')
              }}
            >
              <span className="icon">🧩</span>
              <div className="name">Emoji Rätsel</div>
              <div className="desc">Emoji erraten</div>
              {!isPremium ? <span className="badge">Premium</span> : null}
            </button>
            <button
              className={`game-card premium ${!isPremium ? 'locked' : ''}`}
              type="button"
              onClick={() => {
                if (!isPremium) {
                  setPendingEdition(null)
                  setShowPremiumGate(true)
                  return
                }
                setCurrentGame('category')
                setRound(1)
                setScreen('game')
              }}
            >
              <span className="icon">🏷️</span>
              <div className="name">Kategorien</div>
              <div className="desc">Battle</div>
              {!isPremium ? <span className="badge">Premium</span> : null}
            </button>
          </div>
          <button className="btn btn-primary session-start" onClick={startSession} disabled={!isHost}>
            {isHost ? 'Spielen' : 'Warte auf Host...'}
          </button>
        </>
      ) : screen === 'game' ? (
        <>
          <button className="btn btn-back" onClick={() => setScreen('gameselect')}>
            ← Zurück
          </button>
          <div className="scoreboard">
            {players.map((player) => (
              <div key={player} className="score-chip">
                👤 {player.split(' ')[0]}: <strong>{scores[player] ?? 0}</strong>
              </div>
            ))}
          </div>
          <div className="game-shell">
            <div className="game-round">Runde {round} / 10 · {timeLeft}s</div>
            <div className="game-title">
              {currentGame === 'quiz' && '🧠 Quiz'}
              {currentGame === 'drawing' && '🎨 Drawing'}
              {currentGame === 'voting' && '🗳️ Voting'}
              {currentGame === 'emoji' && '🧩 Emoji Rätsel'}
              {currentGame === 'category' && '🏷️ Kategorien Battle'}
            </div>
            <p className="game-subtitle">
              Edition:{' '}
              {editions.length
                ? editions
                    .map((item) =>
                      item === 'fussball'
                        ? 'Fußball'
                        : item === 'wissen'
                          ? 'Allgemein'
                          : item === 'romantisch'
                            ? 'Romantisch'
                            : item === 'gaming'
                              ? 'Gaming'
                              : 'Film'
                    )
                    .join(' · ')
                : 'Allgemein'}
            </p>
            {round === 0 ? (
              <div className="game-placeholder">Runde wird gestartet…</div>
            ) : null}
            {currentGame === 'quiz' && (
              <QuizGame
                players={players}
                round={round}
                onRoundComplete={endRound}
                editions={editions}
                onScore={addScore}
              />
            )}
            {currentGame === 'drawing' && (
              <DrawingGame
                players={players}
                round={round}
                onRoundComplete={endRound}
                editions={editions}
                onScore={addScore}
              />
            )}
            {currentGame === 'voting' && (
              <VotingGame
                players={players}
                round={round}
                onRoundComplete={endRound}
                editions={editions}
                onScore={addScores}
              />
            )}
            {currentGame === 'emoji' && (
              <EmojiRiddleGame
                players={players}
                round={round}
                onRoundComplete={endRound}
                editions={editions}
                onScore={addScore}
              />
            )}
            {currentGame === 'category' && (
              <CategoryBattleGame
                players={players}
                round={round}
                onRoundComplete={endRound}
                editions={editions}
                onScore={addScores}
              />
            )}
            {isHost ? (
              <button className="btn btn-yellow" onClick={nextRound}>
                {round >= 10 ? 'Beenden' : 'Nächste Runde'}
              </button>
            ) : (
              <div className="tagline">Nur der Host kann die nächste Runde starten.</div>
            )}
          </div>
        </>
      ) : screen === 'sessionEnd' ? (
        <>
          <button className="btn btn-back" onClick={() => setScreen('gameselect')}>
            ← Zurück
          </button>
          <div className="game-shell">
            <div className="game-title">🎉 Session beendet</div>
            <p className="game-subtitle">10 Runden gespielt. Neue Runde starten?</p>
            <button className="btn btn-primary" onClick={() => setScreen('gameselect')}>
              Zur Auswahl
            </button>
          </div>
        </>
      ) : (
        <>
          <button className="btn btn-back" onClick={() => setScreen('home')}>
            ← Zurück
          </button>
          <div className="logo">PartyPop 🎊</div>
          <div className="qr-box">
            <canvas ref={qrRef} id="qr-canvas" width={200} height={200} />
          </div>
          <div className="room-code-display">
            <div className="label">Raum-Code</div>
            <div className="code">{roomCode}</div>
          </div>
          <div className="players-list">
            <h3>
              👥 Spieler (<span>{players.length}</span>)
            </h3>
            <div className="player-chips">
              {players.length === 0 ? (
                <div className="player-empty">Warte auf Spieler…</div>
              ) : (
                players.map((player) => (
                  <div key={player} className="player-chip">
                    {player}
                  </div>
                ))
              )}
            </div>
          </div>
          {connectionError ? <p className="tagline">{connectionError}</p> : null}
          <button
            className="btn btn-yellow"
            style={{ maxWidth: 360, width: '100%' }}
            onClick={() => setScreen('gameselect')}
            disabled={!isHost}
          >
            {isHost ? 'Spielen →' : 'Warte auf Host'}
          </button>
        </>
      )}
    </div>
  )
}
