import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import {
  ClientToServerEvents,
  GameMode,
  GamePhase,
  GameStateUpdate,
  JoinRoomPayload,
  Player,
  PlayerActionPayload,
  RoomCode,
  RoomState,
  ServerError,
  ServerToClientEvents,
  SocketData
} from '@shared/types'

dotenv.config()

const app = express()
app.use(cors())
app.get('/health', (_req, res) => res.json({ ok: true }))

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

const generateCode = (): RoomCode => {
  const code = Math.floor(1000 + Math.random() * 9000).toString()
  return code
}

const createRoomState = (code: RoomCode, host: Player): RoomState => ({
  code,
  hostId: host.id,
  mode: null,
  phase: 'lobby',
  round: 0,
  maxRounds: 10,
  roundSeconds: 60,
  selectedEditions: ['wissen'],
  roundSubmissions: {},
  roundGuessLog: [],
  players: [host],
  freePlaysRemaining: 3,
  createdAt: Date.now()
})

const emitRoomUpdate = (room: RoomState) => {
  const payload: GameStateUpdate = { room }
  io.to(room.code).emit('game-state-update', payload)
}

const emitError = (socketId: string, error: ServerError) => {
  io.to(socketId).emit('error', error)
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
    const { code, name, isHost, playerId } = payload

    if (isHost) {
      const newCode = generateCode()
      const host: Player = {
        id: playerId ?? socket.id,
        name,
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
        name,
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

  socket.on('start-game', (payload) => {
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
    room.roundSubmissions = {}
    room.roundGuessLog = []
    resetRoundAwards(room.code)
    emitRoomUpdate(room)
  })

  socket.on('player-action', (payload: PlayerActionPayload) => {
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
          addScore(room, socket.data.playerId, Math.max(120 - idx * 20, 40))
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

      const bid = Math.max(1, Math.min(5, Math.floor(payload.action.bid)))
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
          room.roundGuessLog.push({
            playerId: tied[0].playerId,
            value: 'category_winner',
            correct: true
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
    handleLeave()
  })
})

const port = Number(process.env.PORT ?? 4000)
httpServer.listen(port, () => {
  console.log(`Partypop server listening on ${port}`)
})
