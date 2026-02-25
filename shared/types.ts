export type RoomCode = string
export type PlayerId = string
export type GameId = string
export type EditionKey = 'fussball' | 'wissen' | 'romantisch' | 'gaming' | 'film'
export type RoomSource = 'private' | 'random'

export type GameMode = 'quiz' | 'drawing' | 'voting' | 'emoji' | 'category'
export type GamePhase = 'lobby' | 'countdown' | 'in_game' | 'results' | 'session_end'

export type RoundContent =
  | {
      mode: 'quiz'
      question: {
        text: string
        answers: string[]
        correctIndex: number
        edition: EditionKey
      }
    }
  | {
      mode: 'drawing'
      drawing: {
        word: string
        edition: EditionKey
      }
    }
  | {
      mode: 'voting'
      voting: {
        prompt: string
        edition: EditionKey
      }
    }
  | {
      mode: 'emoji'
      emoji: {
        emoji: string
        answer: string
        edition: EditionKey
      }
    }
  | {
      mode: 'category'
      category: {
        prompt: string
        edition: EditionKey
      }
    }

export interface Player {
  id: PlayerId
  name: string
  score: number
  connected: boolean
  isHost: boolean
}

export interface RoomState {
  code: RoomCode
  source: RoomSource
  hostId: PlayerId
  mode: GameMode | null
  phase: GamePhase
  round: number
  maxRounds: number
  roundSeconds: number
  selectedEditions: EditionKey[]
  roundContent: RoundContent | null
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

export interface JoinRandomLobbyPayload {
  name: string
  playerId?: PlayerId
  region: string
  language: string
  ageConfirmed: boolean
  acceptedTerms: boolean
  acceptedPrivacy: boolean
}

export interface LeaveRandomLobbyPayload {
  region?: string
  language?: string
}

export interface QueueStatusPayload {
  waiting: number
  region: string
  language: string
}

export interface ReportPlayerPayload {
  code: RoomCode
  targetPlayerId: PlayerId
  reason: string
}

export interface BlockPlayerPayload {
  targetPlayerId: PlayerId
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
      type: 'host_set_max_rounds'
      maxRounds: number
    }
  | {
      type: 'host_set_editions'
      editions: EditionKey[]
    }
  | {
      type: 'quiz_submit'
      answerIndex: number
      isCorrect: boolean
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
      type: 'drawing_canvas'
      imageData: string
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
      type: 'category_bid'
      bid: number
    }
  | {
      type: 'category_words'
      words: string[]
    }
  | {
      type: 'category_validate'
      acceptedWords: string[]
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
  'join-random-lobby': (payload: JoinRandomLobbyPayload) => void
  'leave-random-lobby': (payload?: LeaveRandomLobbyPayload) => void
  'report-player': (payload: ReportPlayerPayload) => void
  'block-player': (payload: BlockPlayerPayload) => void
  'start-game': (payload: StartGamePayload) => void
  'player-action': (payload: PlayerActionPayload) => void
}

export interface ServerToClientEvents {
  'room-joined': (room: RoomState) => void
  'game-state-update': (payload: GameStateUpdate) => void
  'random-queue-status': (payload: QueueStatusPayload) => void
  error: (payload: ServerError) => void
}

export interface SocketData {
  playerId?: PlayerId
  roomCode?: RoomCode
  randomQueueKey?: string
}

export const RedisKeys = {
  room: (code: RoomCode) => `room:${code}`,
  player: (id: PlayerId) => `player:${id}`,
  session: (code: RoomCode) => `session:${code}`
}
