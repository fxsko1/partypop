export type RoomCode = string
export type PlayerId = string
export type GameId = string
export type EditionKey = 'fussball' | 'wissen' | 'romantisch' | 'gaming' | 'film'

export type GameMode = 'quiz' | 'drawing' | 'voting' | 'emoji' | 'category'
export type GamePhase = 'lobby' | 'countdown' | 'in_game' | 'results' | 'session_end'

export interface Player {
  id: PlayerId
  name: string
  score: number
  connected: boolean
  isHost: boolean
}

export interface RoomState {
  code: RoomCode
  hostId: PlayerId
  mode: GameMode | null
  phase: GamePhase
  round: number
  maxRounds: number
  roundSeconds: number
  selectedEditions: EditionKey[]
  roundSubmissions: Record<PlayerId, string>
  roundGuessLog: Array<{
    playerId: PlayerId
    value: string
    correct?: boolean
  }>
  players: Player[]
  freePlaysRemaining: number
  createdAt: number
}

export interface JoinRoomPayload {
  code?: RoomCode
  name: string
  isHost: boolean
  playerId?: PlayerId
}

export interface StartGamePayload {
  code: RoomCode
  mode: GameMode
}

export type PlayerAction =
  | {
      type: 'score_delta'
      updates: Array<{
        playerId: PlayerId
        delta: number
      }>
    }
  | {
      type: 'host_next_round'
      round: number
      nextMode: GameMode
      finished?: boolean
    }
  | {
      type: 'host_set_round_seconds'
      roundSeconds: number
    }
  | {
      type: 'host_set_editions'
      editions: EditionKey[]
    }
  | {
      type: 'quiz_submit'
      answerIndex: number
    }
  | {
      type: 'voting_submit'
      targetPlayerId: PlayerId
    }
  | {
      type: 'drawing_guess'
      guess: string
      correct: boolean
    }
  | {
      type: 'emoji_submit'
      guess: string
      correct: boolean
    }
  | {
      type: 'category_submit'
      value: string
    }
  | {
      type: 'quiz_answer'
      questionId: string
      answerId: string
    }
  | {
      type: 'drawing_submit'
      imageData: string
    }
  | {
      type: 'vote_submit'
      promptId: string
      targetPlayerId: PlayerId
    }

export interface PlayerActionPayload {
  code: RoomCode
  action: PlayerAction
}

export interface GameStateUpdate {
  room: RoomState
}

export type ServerErrorCode = 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'INVALID_PAYLOAD' | 'SERVER_ERROR'

export interface ServerError {
  code: ServerErrorCode
  message: string
}

export interface ClientToServerEvents {
  'join-room': (payload: JoinRoomPayload) => void
  'leave-room': () => void
  'start-game': (payload: StartGamePayload) => void
  'player-action': (payload: PlayerActionPayload) => void
}

export interface ServerToClientEvents {
  'room-joined': (room: RoomState) => void
  'game-state-update': (payload: GameStateUpdate) => void
  error: (payload: ServerError) => void
}

export interface SocketData {
  playerId?: PlayerId
  roomCode?: RoomCode
}

export const RedisKeys = {
  room: (code: RoomCode) => `room:${code}`,
  player: (id: PlayerId) => `player:${id}`,
  session: (code: RoomCode) => `session:${code}`
}
