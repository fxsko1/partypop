import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { checkDatabaseConnection, hasDatabaseConfig } from './db'
import { getRoundContentFromDb } from './contentRepo'
import {
  BlockPlayerPayload,
  ClientToServerEvents,
  GameMode,
  GamePhase,
  GameStateUpdate,
  JoinRoomPayload,
  JoinRandomLobbyPayload,
  Player,
  PlayerActionPayload,
  QueueStatusPayload,
  ReportPlayerPayload,
  RoomCode,
  RoomState,
  ServerError,
  ServerToClientEvents,
  SocketData
} from '@shared/types'

dotenv.config()

const app = express()
app.use(cors())
app.get('/health', async (_req, res) => {
  const db = await checkDatabaseConnection()
  res.json({
    ok: true,
    db
  })
})
app.get('/health/db', async (_req, res) => {
  const db = await checkDatabaseConnection()
  res.status(db.connected ? 200 : hasDatabaseConfig() ? 503 : 400).json(db)
})

const httpServer = http.createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
  httpServer,
  {
    cors: {
      origin: process.env.CLIENT_ORIGIN ?? '*',
      methods: ['GET', 'POST']
    }
  }
)

const rooms = new Map<RoomCode, RoomState>()
const awardedTokensByRoom = new Map<RoomCode, Set<string>>()
const CATEGORY_MAX_BID = 12
const queueByKey = new Map<string, Array<{
  socketId: string
  playerId: string
  name: string
  region: string
  language: string
}>>()
const reports: Array<{ roomCode: string; reporterId: string; targetId: string; reason: string; at: number }> = []
const blockedByPlayer = new Map<string, Set<string>>()
const socketEventHits = new Map<string, Array<number>>()
const NAME_BLOCKLIST = ['nazi', 'hitler', 'terror', 'admin', 'mod', 'support', 'idiot', 'arschloch']
const RANDOM_MATCH_SIZE = 4

const generateCode = (): RoomCode => {
  const code = Math.floor(1000 + Math.random() * 9000).toString()
  return code
}

const createRoomState = (code: RoomCode, host: Player, source: RoomState['source'] = 'private'): RoomState => ({
  code,
  source,
  hostId: host.id,
  mode: null,
  phase: 'lobby',
  round: 0,
  maxRounds: 10,
  roundSeconds: 60,
  selectedEditions: ['wissen'],
  roundContent: null,
  roundSubmissions: {},
  roundGuessLog: [],
  players: [host],
  freePlaysRemaining: 3,
  createdAt: Date.now()
})

const pickCategoryValidator = (room: RoomState, winnerId: string) => {
  if (room.hostId !== winnerId) return room.hostId
  const candidates = room.players.filter((player) => player.connected && player.id !== winnerId)
  if (!candidates.length) return room.hostId
  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index].id
}

const emitRoomUpdate = (room: RoomState) => {
  const payload: GameStateUpdate = { room }
  io.to(room.code).emit('game-state-update', payload)
}

const emitError = (socketId: string, error: ServerError) => {
  io.to(socketId).emit('error', error)
}

const allowEvent = (socketId: string, eventKey: string, limit: number, windowMs: number) => {
  const now = Date.now()
  const key = `${socketId}:${eventKey}`
  const prev = socketEventHits.get(key) ?? []
  const recent = prev.filter((ts) => now - ts <= windowMs)
  if (recent.length >= limit) {
    socketEventHits.set(key, recent)
    return false
  }
  recent.push(now)
  socketEventHits.set(key, recent)
  return true
}

const cleanName = (value: string) => value.trim().slice(0, 24)
const isNameAllowed = (value: string) => {
  const low = value.toLowerCase()
  return !NAME_BLOCKLIST.some((bad) => low.includes(bad))
}

const randomQueueKey = (region: string, language: string) => `${region.toUpperCase()}:${language.toLowerCase()}`
const normalizeRegion = (region: string) => region.trim().toUpperCase() || 'DE'
const normalizeLanguage = (language: string) => language.trim().toLowerCase() || 'de'

const dequeueSocketEverywhere = (socketId: string) => {
  for (const [key, items] of queueByKey.entries()) {
    const next = items.filter((item) => item.socketId !== socketId)
    if (!next.length) queueByKey.delete(key)
    else queueByKey.set(key, next)
  }
}

const emitQueueStatus = (key: string) => {
  const [region, language] = key.split(':')
  const waiting = queueByKey.get(key)?.length ?? 0
  const payload: QueueStatusPayload = { waiting, region, language }
  const items = queueByKey.get(key) ?? []
  items.forEach((entry) => io.to(entry.socketId).emit('random-queue-status', payload))
}

const resetRoundAwards = (roomCode: RoomCode) => {
  awardedTokensByRoom.set(roomCode, new Set<string>())
}

const getRoundAwards = (roomCode: RoomCode) => {
  const existing = awardedTokensByRoom.get(roomCode)
  if (existing) return existing
  const created = new Set<string>()
  awardedTokensByRoom.set(roomCode, created)
  return created
}

const addScore = (room: RoomState, playerId: string, delta: number) => {
  const player = room.players.find((p) => p.id === playerId)
  if (!player) return
  player.score += delta
}

const canMatchPair = (aId: string, bId: string) => {
  const aBlocked = blockedByPlayer.get(aId)
  const bBlocked = blockedByPlayer.get(bId)
  if (aBlocked?.has(bId)) return false
  if (bBlocked?.has(aId)) return false
  return true
}

const tryMatchmake = (key: string) => {
  const entries = queueByKey.get(key) ?? []
  if (entries.length < RANDOM_MATCH_SIZE) return

  const candidates = entries.slice(0, 12)
  let selected: typeof candidates = []
  for (let i = 0; i < candidates.length; i += 1) {
    const seed = candidates[i]
    const group: typeof candidates = [seed]
    for (let j = 0; j < candidates.length; j += 1) {
      if (i === j) continue
      const current = candidates[j]
      const fits = group.every((picked) => canMatchPair(picked.playerId, current.playerId))
      if (fits) group.push(current)
      if (group.length >= RANDOM_MATCH_SIZE) break
    }
    if (group.length >= RANDOM_MATCH_SIZE) {
      selected = group.slice(0, RANDOM_MATCH_SIZE)
      break
    }
  }
  if (selected.length < RANDOM_MATCH_SIZE) return

  const remaining = entries.filter((item) => !selected.some((pick) => pick.socketId === item.socketId))
  if (!remaining.length) queueByKey.delete(key)
  else queueByKey.set(key, remaining)

  const code = generateCode()
  const hostEntry = selected[0]
  const host: Player = {
    id: hostEntry.playerId,
    name: hostEntry.name,
    score: 0,
    connected: true,
    isHost: true
  }
  const room = createRoomState(code, host, 'random')
  room.players = selected.map((entry, index) => ({
    id: entry.playerId,
    name: entry.name,
    score: 0,
    connected: true,
    isHost: index === 0
  }))
  rooms.set(code, room)
  resetRoundAwards(code)

  selected.forEach((entry) => {
    const s = io.sockets.sockets.get(entry.socketId)
    if (!s) return
    s.join(code)
    s.data.playerId = entry.playerId
    s.data.roomCode = code
    s.data.randomQueueKey = undefined
    s.emit('room-joined', room)
  })
  emitRoomUpdate(room)
  emitQueueStatus(key)
}

const prepareRoundContent = async (room: RoomState, mode: GameMode) => {
  try {
    const content = await getRoundContentFromDb(room.code, room.round, mode, room.selectedEditions)
    room.roundContent = content
  } catch (error) {
    console.error('Failed to load DB round content:', error)
    room.roundContent = null
  }
}

io.on('connection', (socket) => {
  const handleLeave = () => {
    const { roomCode, playerId } = socket.data
    if (!roomCode || !playerId) return

    const room = rooms.get(roomCode)
    if (!room) return

    if (playerId === room.hostId) {
      io.to(room.code).emit('error', {
        code: 'SERVER_ERROR',
        message: 'Host hat den Raum verlassen. Lobby wurde geschlossen.'
      })
      rooms.delete(room.code)
      awardedTokensByRoom.delete(room.code)
      socket.leave(room.code)
      socket.data.playerId = undefined
      socket.data.roomCode = undefined
      return
    }

    room.players = room.players.map((p) => (p.id === playerId ? { ...p, connected: false } : p))
    emitRoomUpdate(room)
    socket.leave(room.code)
    socket.data.playerId = undefined
    socket.data.roomCode = undefined
  }

  socket.on('join-room', (payload: JoinRoomPayload) => {
    if (!allowEvent(socket.id, 'join-room', 8, 10_000)) {
      emitError(socket.id, { code: 'SERVER_ERROR', message: 'Zu viele Join-Versuche. Bitte kurz warten.' })
      return
    }
    const { code, name, isHost, playerId } = payload
    if (socket.data.randomQueueKey) {
      const key = socket.data.randomQueueKey
      dequeueSocketEverywhere(socket.id)
      socket.data.randomQueueKey = undefined
      emitQueueStatus(key)
    }
    const clean = cleanName(name)
    if (!clean || !isNameAllowed(clean)) {
      emitError(socket.id, { code: 'INVALID_PAYLOAD', message: 'Ungültiger Name.' })
      return
    }

    if (isHost) {
      const newCode = generateCode()
      const host: Player = {
        id: playerId ?? socket.id,
        name: clean,
        score: 0,
        connected: true,
        isHost: true
      }
      const room = createRoomState(newCode, host)
      rooms.set(newCode, room)
      resetRoundAwards(newCode)
      socket.join(newCode)
      socket.data.playerId = host.id
      socket.data.roomCode = newCode
      socket.emit('room-joined', room)
      emitRoomUpdate(room)
      return
    }

    if (!code) {
      emitError(socket.id, { code: 'INVALID_PAYLOAD', message: 'Room code fehlt.' })
      return
    }

    const room = rooms.get(code)
    if (!room) {
      emitError(socket.id, { code: 'ROOM_NOT_FOUND', message: 'Raum nicht gefunden.' })
      return
    }

    const wantedId = playerId ?? socket.id
    const existingById = room.players.find((p) => p.id === wantedId)
    const existingByName = room.players.find((p) => p.name === name)
    let player: Player
    if (existingById) {
      existingById.connected = true
      player = existingById
    } else if (existingByName && !existingByName.connected) {
      existingByName.connected = true
      player = existingByName
    } else {
      player = {
        id: wantedId,
        name: clean,
        score: 0,
        connected: true,
        isHost: false
      }
      room.players.push(player)
    }

    socket.join(code)
    socket.data.playerId = player.id
    socket.data.roomCode = code
    socket.emit('room-joined', room)
    emitRoomUpdate(room)
  })

  socket.on('join-random-lobby', (payload: JoinRandomLobbyPayload) => {
    if (!allowEvent(socket.id, 'join-random-lobby', 6, 10_000)) {
      emitError(socket.id, { code: 'SERVER_ERROR', message: 'Zu viele Queue-Versuche. Bitte kurz warten.' })
      return
    }
    const name = cleanName(payload.name)
    if (!name || !isNameAllowed(name)) {
      emitError(socket.id, { code: 'INVALID_PAYLOAD', message: 'Ungültiger Name für Random Lobby.' })
      return
    }
    if (!payload.ageConfirmed || !payload.acceptedTerms || !payload.acceptedPrivacy) {
      emitError(socket.id, {
        code: 'INVALID_PAYLOAD',
        message: 'Bitte Alters-/Content-Regeln und DSGVO-Hinweise bestätigen.'
      })
      return
    }

    const region = normalizeRegion(payload.region)
    const language = normalizeLanguage(payload.language)
    const key = randomQueueKey(region, language)
    const entry = {
      socketId: socket.id,
      playerId: payload.playerId ?? socket.id,
      name,
      region,
      language
    }

    dequeueSocketEverywhere(socket.id)
    const next = queueByKey.get(key) ?? []
    next.push(entry)
    queueByKey.set(key, next)
    socket.data.randomQueueKey = key
    socket.data.playerId = entry.playerId
    emitQueueStatus(key)
    tryMatchmake(key)
  })

  socket.on('leave-random-lobby', () => {
    const key = socket.data.randomQueueKey
    dequeueSocketEverywhere(socket.id)
    socket.data.randomQueueKey = undefined
    if (key) emitQueueStatus(key)
  })

  socket.on('report-player', (payload: ReportPlayerPayload) => {
    if (!allowEvent(socket.id, 'report-player', 15, 60_000)) {
      emitError(socket.id, { code: 'SERVER_ERROR', message: 'Zu viele Reports in kurzer Zeit.' })
      return
    }
    if (!payload.reason || payload.reason.trim().length < 3) {
      emitError(socket.id, { code: 'INVALID_PAYLOAD', message: 'Bitte Report-Grund angeben.' })
      return
    }
    const reporterId = socket.data.playerId
    if (!reporterId) return
    reports.push({
      roomCode: payload.code,
      reporterId,
      targetId: payload.targetPlayerId,
      reason: payload.reason.slice(0, 200),
      at: Date.now()
    })
  })

  socket.on('block-player', (payload: BlockPlayerPayload) => {
    const actorId = socket.data.playerId
    if (!actorId) return
    const set = blockedByPlayer.get(actorId) ?? new Set<string>()
    set.add(payload.targetPlayerId)
    blockedByPlayer.set(actorId, set)
  })

  socket.on('start-game', async (payload) => {
    const room = rooms.get(payload.code)
    if (!room) {
      emitError(socket.id, { code: 'ROOM_NOT_FOUND', message: 'Raum nicht gefunden.' })
      return
    }
    if (socket.data.playerId !== room.hostId) {
      emitError(socket.id, { code: 'INVALID_PAYLOAD', message: 'Nur der Host kann starten.' })
      return
    }

    room.mode = payload.mode as GameMode
    room.phase = 'in_game' as GamePhase
    room.round = 1
    await prepareRoundContent(room, room.mode)
    room.roundSubmissions = {}
    room.roundGuessLog = []
    resetRoundAwards(room.code)
    emitRoomUpdate(room)
  })

  socket.on('player-action', async (payload: PlayerActionPayload) => {
    const room = rooms.get(payload.code)
    if (!room) {
      emitError(socket.id, { code: 'ROOM_NOT_FOUND', message: 'Raum nicht gefunden.' })
      return
    }

    if (payload.action.type === 'score_delta') {
      if (socket.data.playerId !== room.hostId) {
        emitError(socket.id, { code: 'INVALID_PAYLOAD', message: 'Nur der Host darf Punkte vergeben.' })
        return
      }
      payload.action.updates.forEach(({ playerId, delta }) => {
        const player = room.players.find((p) => p.id === playerId)
        if (!player) return
        player.score += delta
      })
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'host_next_round') {
      if (socket.data.playerId !== room.hostId) {
        emitError(socket.id, { code: 'INVALID_PAYLOAD', message: 'Nur der Host kann Runden steuern.' })
        return
      }
      room.round = payload.action.round
      room.mode = payload.action.nextMode
      room.phase = payload.action.finished ? 'session_end' : 'in_game'
      room.roundContent = null
      if (!payload.action.finished) {
        await prepareRoundContent(room, room.mode)
      }
      room.roundSubmissions = {}
      room.roundGuessLog = []
      resetRoundAwards(room.code)
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'host_set_round_seconds') {
      if (socket.data.playerId !== room.hostId) {
        emitError(socket.id, { code: 'INVALID_PAYLOAD', message: 'Nur der Host kann die Zeit ändern.' })
        return
      }
      const seconds = Math.max(20, Math.min(180, Math.floor(payload.action.roundSeconds)))
      room.roundSeconds = seconds
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'host_set_max_rounds') {
      if (socket.data.playerId !== room.hostId) {
        emitError(socket.id, { code: 'INVALID_PAYLOAD', message: 'Nur der Host kann Rundenzahl ändern.' })
        return
      }
      const rounds = Math.max(1, Math.min(20, Math.floor(payload.action.maxRounds)))
      room.maxRounds = rounds
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'host_set_editions') {
      if (socket.data.playerId !== room.hostId) {
        emitError(socket.id, { code: 'INVALID_PAYLOAD', message: 'Nur der Host kann Editionen ändern.' })
        return
      }
      room.selectedEditions = payload.action.editions
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'quiz_submit') {
      if (!socket.data.playerId) return
      room.roundSubmissions[socket.data.playerId] = String(payload.action.answerIndex)
      const awards = getRoundAwards(room.code)
      if (payload.action.isCorrect) {
        const token = `quiz:${room.round}:${socket.data.playerId}`
        if (!awards.has(token)) {
          addScore(room, socket.data.playerId, 100)
          awards.add(token)
        }
      }
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'voting_submit') {
      if (!socket.data.playerId) return
      room.roundSubmissions[socket.data.playerId] = payload.action.targetPlayerId
      const connected = room.players.filter((p) => p.connected)
      const submitted = Object.keys(room.roundSubmissions).length
      const awards = getRoundAwards(room.code)
      const finalizeToken = `voting:final:${room.round}`
      if (submitted >= connected.length && !awards.has(finalizeToken)) {
        const selected = new Set(Object.values(room.roundSubmissions))
        connected.forEach((player) => {
          if (!selected.has(player.id)) {
            addScore(room, player.id, 50)
          }
        })
        awards.add(finalizeToken)
      }
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'drawing_guess') {
      if (!socket.data.playerId) return
      room.roundGuessLog.push({
        playerId: socket.data.playerId,
        value: payload.action.guess,
        correct: payload.action.correct
      })
      if (payload.action.correct) {
        room.roundSubmissions[socket.data.playerId] = payload.action.guess
        const awards = getRoundAwards(room.code)
        const correctOrder = Array.from(
          new Set(
            room.roundGuessLog
              .filter((entry) => entry.correct)
              .map((entry) => entry.playerId)
          )
        )
        const idx = correctOrder.indexOf(socket.data.playerId)
        if (idx >= 0) {
          const guesserToken = `drawing:guesser:${room.round}:${socket.data.playerId}`
          if (!awards.has(guesserToken)) {
            addScore(room, socket.data.playerId, Math.max(100 - idx * 20, 0))
            awards.add(guesserToken)
          }
          const connected = room.players.filter((p) => p.connected)
          if (connected.length > 0) {
            const drawer = connected[Math.max(room.round - 1, 0) % connected.length]
            const drawerToken = `drawing:drawer:${room.round}:${socket.data.playerId}`
            if (!awards.has(drawerToken)) {
              addScore(room, drawer.id, 40)
              awards.add(drawerToken)
            }
          }
        }
      }
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'drawing_canvas') {
      room.roundSubmissions.__drawing_canvas = payload.action.imageData
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'emoji_submit') {
      if (!socket.data.playerId) return
      room.roundGuessLog.push({
        playerId: socket.data.playerId,
        value: payload.action.guess,
        correct: payload.action.correct
      })
      room.roundSubmissions[socket.data.playerId] = payload.action.guess
      if (payload.action.correct) {
        const awards = getRoundAwards(room.code)
        const correctOrder = Array.from(
          new Set(
            room.roundGuessLog
              .filter((entry) => entry.correct)
              .map((entry) => entry.playerId)
          )
        )
        const idx = correctOrder.indexOf(socket.data.playerId)
        const token = `emoji:${room.round}:${socket.data.playerId}`
        if (!awards.has(token)) {
          addScore(room, socket.data.playerId, Math.max(100 - idx * 20, 0))
          awards.add(token)
        }
      }
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'category_submit') {
      if (!socket.data.playerId) return
      room.roundSubmissions[socket.data.playerId] = payload.action.value
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'category_bid') {
      if (!socket.data.playerId) return
      if (room.roundGuessLog.some((entry) => entry.value === 'category_winner')) {
        emitRoomUpdate(room)
        return
      }

      const connectedIds = room.players.filter((p) => p.connected).map((p) => p.id)
      const tieRaw = room.roundGuessLog.find((entry) => entry.value.startsWith('category_tiebreak:'))?.value
      const requiredIds =
        tieRaw && tieRaw.includes(':')
          ? tieRaw.split(':')[1].split(',').filter(Boolean)
          : connectedIds

      if (!requiredIds.includes(socket.data.playerId)) {
        emitRoomUpdate(room)
        return
      }

      const bid = Math.max(1, Math.min(CATEGORY_MAX_BID, Math.floor(payload.action.bid)))
      room.roundSubmissions[socket.data.playerId] = `bid:${bid}`

      const allBids = requiredIds.every((id) => (room.roundSubmissions[id] ?? '').startsWith('bid:'))
      if (allBids) {
        const bids = requiredIds.map((id) => ({
          playerId: id,
          bid: Number((room.roundSubmissions[id] ?? 'bid:1').split(':')[1] ?? 1)
        }))
        const top = Math.max(...bids.map((b) => b.bid))
        const tied = bids.filter((b) => b.bid === top)
        room.roundGuessLog = room.roundGuessLog.filter((entry) => !entry.value.startsWith('category_tiebreak:'))
        if (tied.length === 1) {
          const winner = tied[0].playerId
          const validatorId = pickCategoryValidator(room, winner)
          room.roundGuessLog.push({
            playerId: winner,
            value: 'category_winner',
            correct: true
          })
          room.roundGuessLog.push({
            playerId: validatorId,
            value: `category_validator:${validatorId}`
          })
        } else {
          tied.forEach(({ playerId }) => {
            delete room.roundSubmissions[playerId]
          })
          room.roundGuessLog.push({
            playerId: room.hostId,
            value: `category_tiebreak:${tied.map((item) => item.playerId).join(',')}`
          })
        }
      }
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'category_words') {
      if (!socket.data.playerId) return
      const winner = room.roundGuessLog.find((e) => e.value === 'category_winner')?.playerId
      if (!winner || winner !== socket.data.playerId) return
      room.roundGuessLog = room.roundGuessLog.filter((entry) => entry.value !== 'category_words')
      room.roundGuessLog.push({
        playerId: socket.data.playerId,
        value: `category_words:${payload.action.words.join('|')}`
      })
      emitRoomUpdate(room)
      return
    }

    if (payload.action.type === 'category_validate') {
      if (socket.data.playerId !== room.hostId) {
        emitError(socket.id, { code: 'INVALID_PAYLOAD', message: 'Nur der Host darf validieren.' })
        return
      }
      const winner = room.roundGuessLog.find((e) => e.value === 'category_winner')?.playerId
      if (!winner) return
      const bidRaw = room.roundSubmissions[winner] ?? ''
      const bid = bidRaw.startsWith('bid:') ? Number(bidRaw.split(':')[1] ?? 1) : 1
      const acceptedCount = payload.action.acceptedWords.length
      const awards = getRoundAwards(room.code)
      const token = `category:result:${room.round}:${winner}`
      if (!awards.has(token)) {
        const delta = acceptedCount >= bid ? 120 + 20 * bid : -40
        addScore(room, winner, delta)
        awards.add(token)
        room.roundGuessLog.push({
          playerId: winner,
          value: `category_result:${acceptedCount}:${bid}:${delta}`,
          correct: acceptedCount >= bid
        })
      }
      emitRoomUpdate(room)
      return
    }

    emitRoomUpdate(room)
  })

  socket.on('leave-room', () => {
    handleLeave()
  })

  socket.on('disconnect', () => {
    const key = socket.data.randomQueueKey
    dequeueSocketEverywhere(socket.id)
    if (key) emitQueueStatus(key)
    handleLeave()
  })
})

const port = Number(process.env.PORT ?? 4000)
httpServer.listen(port, () => {
  console.log(`Partypop server listening on ${port}`)
})
