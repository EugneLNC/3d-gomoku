import { Board, keyOf } from './Board'
import { DEFAULT_GAME_CONFIG, PLAYER_CONFIGS, UNIQUE_DIRECTIONS } from './config'
import type {
  CellPosition,
  GameConfig,
  GameState,
  MoveFailureReason,
  MoveResult,
  Player,
  PlayerId,
  ResolveResult,
} from './types'

const copyPosition = (p: CellPosition): CellPosition => ({ ...p })

export class GameEngine {
  readonly config: GameConfig
  readonly board: Board
  state: GameState

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      ...DEFAULT_GAME_CONFIG,
      ...config,
      players: config.players ?? DEFAULT_GAME_CONFIG.players,
    }
    if (this.config.players.length < 2) {
      throw new Error('At least two players are required.')
    }
    this.board = new Board(this.config)
    this.state = this.createInitialState()
  }

  private createInitialState(): GameState {
    return {
      currentPlayerIndex: 0,
      players: this.config.players.map((player) => ({
        ...player,
        eliminatedCount: 0,
      })),
      status: 'playing',
      winnerId: null,
      turn: 1,
    }
  }

  get currentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex]
  }

  getPlayer(playerId: PlayerId): Player {
    const player = this.state.players.find((candidate) => candidate.id === playerId)
    if (!player) throw new Error(`Unknown player: ${playerId}`)
    return player
  }

  isInsideBoard(x: number, y: number, z: number): boolean {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      Number.isInteger(z) &&
      x >= 0 &&
      y >= 0 &&
      x < this.config.width &&
      y < this.config.depth &&
      z >= this.config.minZ &&
      z <= this.config.maxZ
    )
  }

  isCellEmpty(x: number, y: number, z: number): boolean {
    return this.board.get({ x, y, z }) === undefined
  }

  isSupported(x: number, y: number, z: number): boolean {
    if (z === 0) return true
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          if (dx === 0 && dy === 0 && dz === 0) continue
          const neighbor = { x: x + dx, y: y + dy, z: z + dz }
          if (
            this.isInsideBoard(neighbor.x, neighbor.y, neighbor.z) &&
            this.board.get(neighbor) !== undefined
          ) {
            return true
          }
        }
      }
    }
    return false
  }

  getMoveFailure(position: CellPosition): MoveFailureReason | null {
    if (this.state.status !== 'playing') return 'GAME_OVER'
    if (!this.isInsideBoard(position.x, position.y, position.z)) return 'OUT_OF_BOUNDS'
    if (!this.isCellEmpty(position.x, position.y, position.z)) return 'OCCUPIED'
    if (!this.isSupported(position.x, position.y, position.z)) return 'UNSUPPORTED'
    return null
  }

  isValidMove(x: number, y: number, z: number, _playerId = this.currentPlayer.id): boolean {
    return this.getMoveFailure({ x, y, z }) === null
  }

  placePiece(x: number, y: number, z: number, playerId: PlayerId): boolean {
    if (this.getMoveFailure({ x, y, z }) !== null) return false
    this.board.set({ x, y, z }, playerId)
    return true
  }

  findLinesToClear(playerId: PlayerId): CellPosition[] {
    const toClear = new Map<string, CellPosition>()
    for (const { position, playerId: occupant } of this.board.entries()) {
      if (occupant !== playerId) continue
      for (const direction of UNIQUE_DIRECTIONS) {
        const previous = {
          x: position.x - direction.x,
          y: position.y - direction.y,
          z: position.z - direction.z,
        }
        if (this.board.get(previous) === playerId) continue

        const line: CellPosition[] = []
        let cursor = copyPosition(position)
        while (
          this.isInsideBoard(cursor.x, cursor.y, cursor.z) &&
          this.board.get(cursor) === playerId
        ) {
          line.push(copyPosition(cursor))
          cursor = {
            x: cursor.x + direction.x,
            y: cursor.y + direction.y,
            z: cursor.z + direction.z,
          }
        }
        if (line.length >= this.config.lineLength) {
          line.forEach((cell) => toClear.set(keyOf(cell), cell))
        }
      }
    }
    return [...toClear.values()]
  }

  clearCells(cells: CellPosition[]): void {
    cells.forEach((cell) => this.board.delete(cell))
  }

  applyGravity() {
    return this.board.applyGravity()
  }

  resolveTurn(playerId: PlayerId): ResolveResult {
    const result: ResolveResult = {
      cleared: [],
      eliminated: 0,
      gravityMoves: [],
      chainCount: 0,
    }
    while (true) {
      const cells = this.findLinesToClear(playerId)
      if (cells.length === 0) break
      this.clearCells(cells)
      result.cleared.push(...cells.map(copyPosition))
      result.eliminated += cells.length
      result.chainCount += 1
      this.getPlayer(playerId).eliminatedCount += cells.length
      result.gravityMoves.push(...this.applyGravity())
    }
    return result
  }

  checkWin(playerId: PlayerId): boolean {
    if (this.getPlayer(playerId).eliminatedCount < this.config.targetEliminationCount) {
      return false
    }
    this.state.status = 'won'
    this.state.winnerId = playerId
    return true
  }

  tryPlace(position: CellPosition): MoveResult {
    const playerId = this.currentPlayer.id
    const failure = this.getMoveFailure(position)
    if (failure) {
      return {
        valid: false,
        reason: failure,
        playerId,
        nextPlayerId: playerId,
        winnerId: this.state.winnerId,
        cleared: [],
        eliminated: 0,
        gravityMoves: [],
        chainCount: 0,
      }
    }

    this.board.set(position, playerId)
    const resolved = this.resolveTurn(playerId)
    const won = this.checkWin(playerId)
    if (!won) {
      this.state.currentPlayerIndex =
        (this.state.currentPlayerIndex + 1) % this.state.players.length
      this.state.turn += 1
    }
    return {
      valid: true,
      placed: copyPosition(position),
      playerId,
      nextPlayerId: this.currentPlayer.id,
      winnerId: this.state.winnerId,
      ...resolved,
    }
  }

  resetGame(): void {
    this.board.clear()
    this.state = this.createInitialState()
  }

  configurePlayerCount(count: 2 | 3): void {
    this.config.players = PLAYER_CONFIGS.slice(0, count)
    this.resetGame()
  }
}
