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
