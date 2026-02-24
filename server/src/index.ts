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

    const player: Player = {
      id: playerId ?? socket.id,
      name,
      score: 0,
      connected: true,
      isHost: false
    }

    room.players.push(player)
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

    room.mode = payload.mode as GameMode
    room.phase = 'in_game' as GamePhase
    emitRoomUpdate(room)
  })

  socket.on('player-action', (payload: PlayerActionPayload) => {
    const room = rooms.get(payload.code)
    if (!room) {
      emitError(socket.id, { code: 'ROOM_NOT_FOUND', message: 'Raum nicht gefunden.' })
      return
    }

    // Placeholder: game logic will be handled per mode later.
    emitRoomUpdate(room)
  })

  socket.on('disconnect', () => {
    const { roomCode, playerId } = socket.data
    if (!roomCode || !playerId) return

    const room = rooms.get(roomCode)
    if (!room) return

    room.players = room.players.map((p) => (p.id === playerId ? { ...p, connected: false } : p))
    emitRoomUpdate(room)
  })
})

const port = Number(process.env.PORT ?? 4000)
httpServer.listen(port, () => {
  console.log(`Partypop server listening on ${port}`)
})
