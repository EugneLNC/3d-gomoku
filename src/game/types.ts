export type PlayerId = 'A' | 'B' | string

export interface CellPosition {
  x: number
  y: number
  z: number
}

export interface PlayerConfig {
  id: PlayerId
  name: string
  color: number
}

export interface Player extends PlayerConfig {
  eliminatedCount: number
}

export interface GameConfig {
  width: number
  depth: number
  minZ: number
  maxZ: number
  lineLength: number
  targetEliminationCount: number
  players: PlayerConfig[]
}

export type GameMode = 'local-2' | 'ai' | 'local-3'

export type GameStatus = 'playing' | 'won'

export interface GameState {
  currentPlayerIndex: number
  players: Player[]
  status: GameStatus
  winnerId: PlayerId | null
  turn: number
}

export type MoveFailureReason =
  | 'OUT_OF_BOUNDS'
  | 'OCCUPIED'
  | 'UNSUPPORTED'
  | 'GAME_OVER'

export interface GravityMove {
  playerId: PlayerId
  from: CellPosition
  to: CellPosition
}

export interface ResolveResult {
  cleared: CellPosition[]
  eliminated: number
  gravityMoves: GravityMove[]
  chainCount: number
}

export interface MoveResult extends ResolveResult {
  valid: boolean
  reason?: MoveFailureReason
  placed?: CellPosition
  playerId: PlayerId
  nextPlayerId: PlayerId
  winnerId: PlayerId | null
}
