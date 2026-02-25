import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import CategoryBattleGame from './games/CategoryBattleGame'
import DrawingGame from './games/DrawingGame'
import EmojiRiddleGame from './games/EmojiRiddleGame'
import QuizGame from './games/QuizGame'
import VotingGame from './games/VotingGame'
import type {
  BlockPlayerPayload,
  ClientToServerEvents,
  GameMode,
  EditionKey,
  GameStateUpdate,
  JoinRandomLobbyPayload,
  JoinRoomPayload,
  Player,
  QueueStatusPayload,
  ReportPlayerPayload,
  RoomState,
  ServerError,
  ServerToClientEvents
} from '@shared/types'

type Screen = 'home' | 'create' | 'lobby' | 'join' | 'gameselect' | 'game' | 'roundSummary' | 'sessionEnd' | 'randomQueue'

const defaultEmojis = ['🎉', '🎊', '🎈', '✨', '🌟', '🎮', '🕹️', '🃏', '🎲', '🎯', '🏆', '💥']
const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

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
  const [hostName, setHostName] = useState('Host')
  const [createVisibility, setCreateVisibility] = useState<'private' | 'public'>('private')
  const [randomName, setRandomName] = useState('')
  const [queueRegion, setQueueRegion] = useState('DE')
  const [queueLanguage, setQueueLanguage] = useState('de')
  const [queueWaiting, setQueueWaiting] = useState(0)
  const [queueAgeConfirmed, setQueueAgeConfirmed] = useState(false)
  const [queueTermsConfirmed, setQueueTermsConfirmed] = useState(false)
  const [queuePrivacyConfirmed, setQueuePrivacyConfirmed] = useState(false)
  const [isInQueue, setIsInQueue] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [showPremiumNudge, setShowPremiumNudge] = useState(false)
  const [editions, setEditions] = useState<EditionKey[]>(['wissen'])
  const [lastEdition, setLastEdition] = useState<EditionKey>('wissen')
  const [showPremiumGate, setShowPremiumGate] = useState(false)
  const [pendingEdition, setPendingEdition] = useState<'gaming' | 'film' | null>(null)
  const isPremium = true
  const premiumPaywallEnabled = false
  const maxEditions = isPremium ? 5 : 2
  const [round, setRound] = useState(0)
  const [currentGame, setCurrentGame] = useState<
    'quiz' | 'drawing' | 'voting' | 'emoji' | 'category'
  >('quiz')
  const [isHost, setIsHost] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [leaveNotice, setLeaveNotice] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [roundSeconds, setRoundSeconds] = useState(60)
  const [maxRounds, setMaxRounds] = useState(10)
  const [roundPlan, setRoundPlan] = useState<GameMode[]>([])
  const roundCompleteRef = useRef(false)
  const autoAdvancedKeyRef = useRef('')
  const lastConnectedIdsRef = useRef<string[]>([])

  const games = useMemo(
    () =>
      (isPremium
        ? (['quiz', 'drawing', 'voting', 'emoji', 'category'] as GameMode[])
        : (['quiz', 'drawing', 'voting'] as GameMode[])),
    [isPremium]
  )

  const pickRandomGame = () => games[Math.floor(Math.random() * games.length)]

  const buildRoundPlan = (totalRounds: number, pool: GameMode[]) => {
    const counts = Object.fromEntries(pool.map((mode) => [mode, 0])) as Record<GameMode, number>
    const shuffledBase = [...pool].sort(() => Math.random() - 0.5)
    const plan: GameMode[] = []

    for (const mode of shuffledBase) {
      if (plan.length >= totalRounds) break
      plan.push(mode)
      counts[mode] += 1
    }

    while (plan.length < totalRounds) {
      const min = Math.min(...pool.map((mode) => counts[mode]))
      const candidates = pool.filter((mode) => counts[mode] === min)
      const next = candidates[Math.floor(Math.random() * candidates.length)]
      plan.push(next)
      counts[next] += 1
    }
    return plan
  }

  const startSession = () => {
    if (!isHost || !roomState || !socketRef.current) return
    const plan = buildRoundPlan(maxRounds, games)
    setRoundPlan(plan)
    const mode = plan[0] ?? pickRandomGame()
    socketRef.current.emit('start-game', { code: roomState.code, mode })
  }

  const endRound = () => {
    if (roundCompleteRef.current) return
    roundCompleteRef.current = true
    setScreen('roundSummary')
  }

  const nextRound = () => {
    if (!isHost || !roomState || !socketRef.current) return
    if (round >= maxRounds) {
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
    const mode = roundPlan[next - 1] ?? pickRandomGame()
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: {
        type: 'host_next_round',
        round: next,
        nextMode: mode
      }
    })
    roundCompleteRef.current = false
    setTimeLeft(roundSeconds)
    setScreen('game')
  }

  useEffect(() => {
    if (screen !== 'roundSummary' || !isHost) return
    const timeout = window.setTimeout(() => {
      nextRound()
    }, 12000)
    return () => window.clearTimeout(timeout)
  }, [screen, isHost, round, currentGame, roomState])
  const qrRef = useRef<HTMLCanvasElement | null>(null)
  const [roomPlayers, setRoomPlayers] = useState<Player[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const activePlayers = useMemo(
    () => roomPlayers.filter((player) => player.connected).map((player) => player.name),
    [roomPlayers]
  )
  const currentPlayerName = useMemo(() => {
    const me = roomPlayers.find((player) => player.id === playerIdRef.current)
    return me?.name ?? 'Du'
  }, [roomPlayers])
  const currentPlayerId = useMemo(() => {
    const me = roomPlayers.find((player) => player.id === playerIdRef.current)
    return me?.id ?? ''
  }, [roomPlayers])
  const activePlayerIds = useMemo(
    () => roomPlayers.filter((player) => player.connected).map((player) => player.id),
    [roomPlayers]
  )
  const playerNameById = useMemo(
    () =>
      roomPlayers.reduce<Record<string, string>>((acc, player) => {
        acc[player.id] = player.name
        return acc
      }, {}),
    [roomPlayers]
  )
  const contentSeed = useMemo(
    () => hashString(`${roomCode}-${round}-${currentGame}-${[...editions].sort().join(',')}`),
    [roomCode, round, currentGame, editions]
  )
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

  const toggleEdition = (value: EditionKey) => {
    if (!isHost) return
    if (premiumPaywallEnabled && (value === 'gaming' || value === 'film') && !isPremium) {
      setPendingEdition(value)
      setShowPremiumGate(true)
      return
    }
    setLastEdition(value)
    const next = (() => {
      const prev = editions
      const exists = prev.includes(value)
      if (exists) {
        const removed = prev.filter((item) => item !== value)
        return removed.length ? removed : prev
      }
      if (prev.length >= maxEditions) {
        setShowPremiumGate(true)
        setPendingEdition(null)
        return prev
      }
      return [...prev, value]
    })()
    setEditions(next)
    if (roomState && socketRef.current) {
      socketRef.current.emit('player-action', {
        code: roomState.code,
        action: {
          type: 'host_set_editions',
          editions: next
        }
      })
    }
  }

  useEffect(() => {
    const initial: Record<string, number> = {}
    activePlayers.forEach((p) => {
      initial[p] = scores[p] ?? 0
    })
    setScores(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayers.length])

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000', {
      transports: ['websocket']
    })

    socketRef.current = socket

    const applyRoomState = (room: RoomState) => {
      const currentConnectedIds = room.players.filter((player) => player.connected).map((player) => player.id)
      if (lastConnectedIdsRef.current.length > 0) {
        const leftPlayer = room.players.find(
          (player) => !player.connected && lastConnectedIdsRef.current.includes(player.id)
        )
        if (leftPlayer && playerIdRef.current !== leftPlayer.id) {
          setLeaveNotice(`${leftPlayer.name} hat den Raum verlassen.`)
          window.setTimeout(() => setLeaveNotice(''), 3000)
        }
      }
      lastConnectedIdsRef.current = currentConnectedIds

      setRoomState(room)
      setRoomCode(room.code)
      setIsHost(room.hostId === playerIdRef.current)
      setRound(room.round)
    setRoundSeconds(room.roundSeconds ?? 60)
      setMaxRounds(room.maxRounds ?? 10)
      setEditions(room.selectedEditions ?? ['wissen'])
      if (room.mode) setCurrentGame(room.mode)
      setRoomPlayers(room.players)
      setScores(
        room.players.reduce<Record<string, number>>((acc, player) => {
          acc[player.name] = player.score
          return acc
        }, {})
      )
      setIsInQueue(false)
      if (room.phase === 'in_game') {
        setScreen('game')
      } else if (room.phase === 'session_end') {
        setScreen('sessionEnd')
      } else {
        setScreen((prev) => (prev === 'gameselect' ? 'gameselect' : 'lobby'))
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
      if (error.code === 'SERVER_ERROR' && error.message.includes('Host')) {
        setScreen('home')
        setRoomState(null)
        setRoomPlayers([])
      }
    })

    socket.on('random-queue-status', (payload: QueueStatusPayload) => {
      setQueueWaiting(payload.waiting)
      setQueueRegion(payload.region)
      setQueueLanguage(payload.language)
    })

    socket.on('disconnect', () => {
      setConnectionError('Verbindung verloren. Bitte neu laden.')
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const addScore = (_player: string, _delta: number) => {}

  const addScores = (_items: Array<{ player: string; delta: number }>) => {}

  useEffect(() => {
    if (roomCode === '----') return
    if (qrRef.current) drawSimpleQR(qrRef.current, roomCode)
  }, [roomCode])

  useEffect(() => {
    if (screen !== 'game') return
    roundCompleteRef.current = false
    setTimeLeft(roundSeconds)
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          if (currentGame !== 'emoji') {
            endRound()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [screen, round, currentGame, roundSeconds])

  useEffect(() => {
    if (!premiumPaywallEnabled) return
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
    const cleanHostName = hostName.trim() || 'Host'
    const payload: JoinRoomPayload = {
      isHost: true,
      name: cleanHostName,
      playerId: playerIdRef.current,
      visibility: createVisibility
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

  const leaveRoom = () => {
    socketRef.current?.emit('leave-room')
    setRoomState(null)
    setRoomPlayers([])
    setRoomCode('----')
    setScores({})
    setRound(0)
    setTimeLeft(60)
    setLeaveNotice('')
    setIsInQueue(false)
    setScreen('home')
  }

  const joinRandomLobby = () => {
    const socket = socketRef.current
    if (!socket) return
    if (!queueAgeConfirmed || !queueTermsConfirmed || !queuePrivacyConfirmed) {
      setConnectionError('Bitte Alters-/Content-Regeln und DSGVO-Hinweise bestätigen.')
      return
    }
    const payload: JoinRandomLobbyPayload = {
      name: randomName.trim() || 'Gast',
      playerId: playerIdRef.current,
      region: queueRegion,
      language: queueLanguage,
      ageConfirmed: queueAgeConfirmed,
      acceptedTerms: queueTermsConfirmed,
      acceptedPrivacy: queuePrivacyConfirmed
    }
    socket.emit('join-random-lobby', payload)
    setConnectionError('')
    setIsInQueue(true)
  }

  const leaveRandomLobby = () => {
    socketRef.current?.emit('leave-random-lobby')
    setIsInQueue(false)
    setScreen('home')
  }

  const reportPlayer = (targetPlayerId: string) => {
    if (!roomState || !socketRef.current) return
    const reason = window.prompt('Grund für Report (z.B. Beleidigung, Spam):', 'Unangemessenes Verhalten')
    if (!reason) return
    const payload: ReportPlayerPayload = {
      code: roomState.code,
      targetPlayerId,
      reason
    }
    socketRef.current.emit('report-player', payload)
  }

  const blockPlayer = (targetPlayerId: string) => {
    if (!socketRef.current) return
    const payload: BlockPlayerPayload = { targetPlayerId }
    socketRef.current.emit('block-player', payload)
  }

  const updateRoundSeconds = (value: number) => {
    if (!socketRef.current || !roomState || !isHost) return
    setRoundSeconds(value)
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: {
        type: 'host_set_round_seconds',
        roundSeconds: value
      }
    })
  }

  const updateMaxRounds = (value: number) => {
    if (!socketRef.current || !roomState || !isHost) return
    setMaxRounds(value)
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: {
        type: 'host_set_max_rounds',
        maxRounds: value
      }
    })
  }

  const submitQuiz = (answerIndex: number, isCorrect: boolean) => {
    if (!roomState || !socketRef.current) return
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: { type: 'quiz_submit', answerIndex, isCorrect }
    })
  }

  const submitVote = (targetName: string) => {
    if (!roomState || !socketRef.current) return
    const target = roomState.players.find((p) => p.name === targetName)
    if (!target) return
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: { type: 'voting_submit', targetPlayerId: target.id }
    })
  }

  const submitDrawingGuess = (guess: string, correct: boolean) => {
    if (!roomState || !socketRef.current) return
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: { type: 'drawing_guess', guess, correct }
    })
  }

  const submitDrawingCanvas = (imageData: string) => {
    if (!roomState || !socketRef.current) return
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: { type: 'drawing_canvas', imageData }
    })
  }

  const submitEmojiGuess = (guess: string, correct: boolean) => {
    if (!roomState || !socketRef.current) return
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: { type: 'emoji_submit', guess, correct }
    })
  }

  const submitCategory = (value: string) => {
    if (!roomState || !socketRef.current) return
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: { type: 'category_submit', value }
    })
  }

  const submitCategoryBid = (bid: number) => {
    if (!roomState || !socketRef.current) return
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: { type: 'category_bid', bid }
    })
  }

  const submitCategoryWords = (words: string[]) => {
    if (!roomState || !socketRef.current) return
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: { type: 'category_words', words }
    })
  }

  const submitCategoryValidation = (acceptedWords: string[]) => {
    if (!roomState || !socketRef.current) return
    socketRef.current.emit('player-action', {
      code: roomState.code,
      action: { type: 'category_validate', acceptedWords }
    })
  }

  useEffect(() => {
    if (!roomState || roomState.phase !== 'in_game') return
    if (screen !== 'game') return
    if (roomState.mode === 'category' || roomState.mode === 'emoji') return
    const connected = roomPlayers.filter((p) => p.connected)
    if (!connected.length) return

    let required = connected.length
    if (roomState.mode === 'drawing') {
      const drawerIdx = Math.max(roomState.round - 1, 0) % connected.length
      const drawer = connected[drawerIdx]
      required = connected.filter((p) => p.id !== drawer.id).length
    }

    const submitted =
      roomState.mode === 'drawing'
        ? connected
            .map((p) => p.id)
            .filter((id) => id in (roomState.roundSubmissions ?? {})).length
        : Object.keys(roomState.roundSubmissions ?? {}).filter((key) => !key.startsWith('__')).length
    const key = `${roomState.round}-${roomState.mode}-${submitted}-${required}`
    if (submitted >= required && autoAdvancedKeyRef.current !== key) {
      autoAdvancedKeyRef.current = key
      endRound()
    }
  }, [roomState, roomPlayers, screen])

  useEffect(() => {
    if (!roomState || roomState.mode !== 'category' || screen !== 'game') return
    const hasResult = (roomState.roundGuessLog ?? []).some((entry) =>
      entry.value.startsWith('category_result:')
    )
    if (hasResult) {
      const timeout = window.setTimeout(() => endRound(), 1200)
      return () => window.clearTimeout(timeout)
    }
  }, [roomState, screen])

  return (
    <div className="screen active" id={screen}>
      {screen === 'home' ? (
        <button className="btn btn-profile" onClick={() => setShowProfile(true)}>
          👤 Profil
        </button>
      ) : null}

      {premiumPaywallEnabled && showPremiumGate ? (
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

      {premiumPaywallEnabled ? (
        <div className={`premium-nudge ${showPremiumNudge ? 'show' : ''}`}>
          <div className="premium-nudge__title">Premium freischalten</div>
          <div className="premium-nudge__text">Mehr Spiele, mehr Features, keine Limits.</div>
          <button className="btn btn-yellow premium-nudge__cta" onClick={() => setShowProfile(true)}>
            Jetzt upgraden
          </button>
        </div>
      ) : null}

      {showProfile ? (
        <div className="profile-modal" role="dialog" aria-modal="true">
          <div className="profile-card">
            <div className="profile-header">
              <div className="logo">PartyPop 🎊</div>
              <button className="btn btn-back" onClick={() => setShowProfile(false)}>
                ✕
              </button>
            </div>
            <h2 className="heading">Coming Soon</h2>
            <p className="tagline">Profil-Features sind bald verfügbar.</p>
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
            <button className="btn btn-primary" onClick={() => setScreen('create')}>
              🎮 Raum erstellen
            </button>
            <button className="btn btn-secondary" onClick={() => setScreen('join')}>
              📱 Beitreten
            </button>
            <button className="btn btn-secondary" onClick={() => setScreen('randomQueue')}>
              🌍 Random Lobby (DE)
            </button>
          </div>
        </>
      ) : screen === 'create' ? (
        <>
          <button className="btn btn-back" onClick={() => setScreen('home')}>
            ← Zurück
          </button>
          <div className="logo">PartyPop 🎊</div>
          <h2 className="heading">Raum erstellen</h2>
          <div className="create-room-card">
            <input
              className="name-input"
              placeholder="Host-Name"
              maxLength={20}
              value={hostName}
              onChange={(event) => setHostName(event.target.value)}
            />
            <button
              className={`btn btn-sm ${createVisibility === 'private' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ maxWidth: 300 }}
              onClick={() => setCreateVisibility((prev) => (prev === 'private' ? 'public' : 'private'))}
            >
              {createVisibility === 'private' ? '🔒 Privat' : '🌍 Public'}
            </button>
            <button
              className="btn btn-primary"
              style={{ width: '100%', maxWidth: 300, fontSize: '1.05rem', padding: '0.85rem 1.2rem' }}
              onClick={createRoom}
            >
              Raum erstellen
            </button>
          </div>
          <p className="tagline">
            {createVisibility === 'private'
              ? 'Privat: Beitritt nur mit Raum-Code.'
              : 'Öffentlich: Random Lobby Spieler können auch in laufende Räume joinen.'}
          </p>
        </>
      ) : screen === 'randomQueue' ? (
        <>
          <button className="btn btn-back" onClick={leaveRandomLobby}>
            ← Warteschlange verlassen
          </button>
          <div className="logo">Random Lobby</div>
          <p className="tagline">Öffentliche Räume finden oder neue Runde starten.</p>
          <div className="random-queue-card">
            <input
              className="name-input"
              placeholder="Dein Name"
              maxLength={20}
              value={randomName}
              onChange={(event) => setRandomName(event.target.value)}
            />
            <div style={{ width: '100%', maxWidth: 360, display: 'flex', gap: 8 }}>
              <input
                className="name-input"
                style={{ maxWidth: 110, padding: '0.7rem 0.8rem' }}
                value={queueRegion}
                onChange={(event) => setQueueRegion(event.target.value.toUpperCase())}
                placeholder="Region"
                maxLength={3}
              />
              <input
                className="name-input"
                style={{ maxWidth: 110, padding: '0.7rem 0.8rem' }}
                value={queueLanguage}
                onChange={(event) => setQueueLanguage(event.target.value.toLowerCase())}
                placeholder="Sprache"
                maxLength={5}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="tagline" style={{ textAlign: 'left' }}>
                <input
                  type="checkbox"
                  checked={queueAgeConfirmed}
                  onChange={(event) => setQueueAgeConfirmed(event.target.checked)}
                />{' '}
                Ich bin mindestens 16 Jahre alt.
              </label>
              <label className="tagline" style={{ textAlign: 'left' }}>
                <input
                  type="checkbox"
                  checked={queueTermsConfirmed}
                  onChange={(event) => setQueueTermsConfirmed(event.target.checked)}
                />{' '}
                Ich akzeptiere Content-Regeln.
              </label>
              <label className="tagline" style={{ textAlign: 'left' }}>
                <input
                  type="checkbox"
                  checked={queuePrivacyConfirmed}
                  onChange={(event) => setQueuePrivacyConfirmed(event.target.checked)}
                />{' '}
                Ich akzeptiere DSGVO-Hinweise.
              </label>
            </div>
            <button className="btn btn-secondary" style={{ maxWidth: 360 }} onClick={joinRandomLobby}>
              {isInQueue ? 'Queue aktualisieren' : 'In Queue gehen'}
            </button>
          </div>
          <p className="tagline">
            Suche Spieler in Region {queueRegion} / Sprache {queueLanguage}
          </p>
          <div className="room-code-display">
            <div className="label">Wartende Spieler</div>
            <div className="code">{queueWaiting}</div>
          </div>
          <p className="tagline">Sobald genug Spieler da sind, erstellt der Server automatisch einen Raum.</p>
          {connectionError ? <p className="tagline">{connectionError}</p> : null}
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
            {roomPlayers.filter((player) => player.connected).map((player) => (
              <div key={player.id} className="score-chip">
                👤 {player.name.split(' ')[0]}: <strong>{scores[player.name] ?? 0}</strong>
                {player.id !== currentPlayerId ? (
                  <>
                    <button
                      className="tool-btn"
                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                      onClick={() => reportPlayer(player.id)}
                    >
                      Report
                    </button>
                    <button
                      className="tool-btn"
                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                      onClick={() => blockPlayer(player.id)}
                    >
                      Block
                    </button>
                  </>
                ) : null}
              </div>
            ))}
          </div>
          <div className="game-shell">
            <div className="game-round" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              Runde {round} / {maxRounds} · ⏱ {timeLeft}s
            </div>
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
                players={activePlayers}
                round={round}
                onRoundComplete={endRound}
                editions={editions}
                onScore={addScore}
                contentSeed={contentSeed}
                onSubmitAnswer={submitQuiz}
                submissions={roomState?.roundSubmissions ?? {}}
                playerNameById={playerNameById}
                currentPlayerName={currentPlayerName}
                currentPlayerId={currentPlayerId}
                activePlayerIds={activePlayerIds}
                roundContent={roomState?.roundContent ?? null}
              />
            )}
            {currentGame === 'drawing' && (
              <DrawingGame
                players={activePlayers}
                round={round}
                onRoundComplete={endRound}
                editions={editions}
                onScore={addScore}
                currentPlayerName={currentPlayerName}
                contentSeed={contentSeed}
                onSubmitGuess={submitDrawingGuess}
                onSubmitCanvas={submitDrawingCanvas}
                guessLog={roomState?.roundGuessLog ?? []}
                playerNameById={playerNameById}
                submissions={roomState?.roundSubmissions ?? {}}
                roundContent={roomState?.roundContent ?? null}
              />
            )}
            {currentGame === 'voting' && (
              <VotingGame
                players={activePlayers}
                round={round}
                onRoundComplete={endRound}
                editions={editions}
                onScore={addScores}
                contentSeed={contentSeed}
                onSubmitVote={submitVote}
                submissions={roomState?.roundSubmissions ?? {}}
                playerNameById={playerNameById}
                currentPlayerName={currentPlayerName}
                currentPlayerId={currentPlayerId}
                activePlayerIds={activePlayerIds}
                roundContent={roomState?.roundContent ?? null}
                isHost={isHost}
              />
            )}
            {currentGame === 'emoji' && (
              <EmojiRiddleGame
                players={activePlayers}
                round={round}
                onRoundComplete={endRound}
                editions={editions}
                contentSeed={contentSeed}
                onSubmitGuess={submitEmojiGuess}
                submissions={roomState?.roundSubmissions ?? {}}
                playerNameById={playerNameById}
                currentPlayerName={currentPlayerName}
                timeLeft={timeLeft}
                roundContent={roomState?.roundContent ?? null}
              />
            )}
            {currentGame === 'category' && (
              <CategoryBattleGame
                players={activePlayers}
                round={round}
                onRoundComplete={endRound}
                editions={editions}
                onScore={addScores}
                contentSeed={contentSeed}
                onSubmitValue={submitCategory}
                submissions={roomState?.roundSubmissions ?? {}}
                currentPlayerName={currentPlayerName}
                currentPlayerId={currentPlayerId}
                isHost={isHost}
                playerNameById={playerNameById}
                guessLog={roomState?.roundGuessLog ?? []}
                onSubmitBid={submitCategoryBid}
                onSubmitWords={submitCategoryWords}
                onValidateWords={submitCategoryValidation}
                roundContent={roomState?.roundContent ?? null}
              />
            )}
            <div className="tagline">Runde läuft...</div>
          </div>
        </>
      ) : screen === 'roundSummary' ? (
        <>
          <button className="btn btn-back" onClick={leaveRoom}>
            ← Lobby verlassen
          </button>
          <div className="game-shell">
            <div className="game-title">Zwischenstand</div>
            <div className="scoreboard">
              {roomPlayers
                .filter((player) => player.connected)
                .sort((a, b) => (scores[b.name] ?? 0) - (scores[a.name] ?? 0))
                .map((player) => (
                  <div key={player.id} className="score-chip">
                    👤 {player.name}: <strong>{scores[player.name] ?? 0}</strong>
                  </div>
                ))}
            </div>
            {isHost ? (
              <button className="btn btn-yellow" onClick={nextRound}>
                {round >= maxRounds ? 'Beenden' : 'Nächste Runde'}
              </button>
            ) : (
              <div className="tagline">Host startet die nächste Runde...</div>
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
          <button className="btn btn-back" onClick={leaveRoom}>
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
              👥 Spieler (<span>{activePlayers.length}</span>)
            </h3>
            <div className="player-chips">
              {activePlayers.length === 0 ? (
                <div className="player-empty">Warte auf Spieler…</div>
              ) : (
                roomPlayers
                  .filter((player) => player.connected)
                  .map((player) => (
                  <div key={player.id} className="player-chip">
                    {player.name}
                  </div>
                ))
              )}
            </div>
          </div>
          {isHost ? (
            <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label htmlFor="round-seconds" className="tagline">
                Rundenzeit: {roundSeconds}s
              </label>
              <input
                id="round-seconds"
                type="range"
                min={20}
                max={180}
                step={10}
                value={roundSeconds}
                onChange={(event) => updateRoundSeconds(Number(event.target.value))}
                style={{ width: '100%' }}
              />
              <label htmlFor="max-rounds" className="tagline">
                Runden: {maxRounds}
              </label>
              <input
                id="max-rounds"
                type="range"
                min={1}
                max={20}
                step={1}
                value={maxRounds}
                onChange={(event) => updateMaxRounds(Number(event.target.value))}
                style={{ width: '100%' }}
              />
              {roomState?.visibility === 'public' ? (
                <p className="tagline" style={{ textAlign: 'left' }}>
                  Random Queue ({roomState.publicRegion}/{roomState.publicLanguage}): {roomState.publicQueueWaiting ?? 0} wartend
                </p>
              ) : null}
            </div>
          ) : null}
          {leaveNotice ? <p className="tagline" style={{ color: '#ff6b6b' }}>{leaveNotice}</p> : null}
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
