import type { GameConfig, PlayerConfig } from './types'

export const PLAYER_CONFIGS: PlayerConfig[] = [
  { id: 'A', name: '玩家 A', color: 0x35d9ff },
  { id: 'B', name: '玩家 B', color: 0xff5e86 },
  { id: 'C', name: '玩家 C', color: 0xffc857 },
]

export const DEFAULT_GAME_CONFIG: GameConfig = {
  width: 10,
  depth: 10,
  minZ: -7,
  maxZ: 7,
  lineLength: 5,
  targetEliminationCount: 20,
  players: PLAYER_CONFIGS.slice(0, 2),
}

export const UNIQUE_DIRECTIONS: ReadonlyArray<Readonly<CellDirection>> = [
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 1, y: 1, z: 0 },
  { x: 1, y: -1, z: 0 },
  { x: 1, y: 0, z: 1 },
  { x: 1, y: 0, z: -1 },
  { x: 0, y: 1, z: 1 },
  { x: 0, y: 1, z: -1 },
  { x: 1, y: 1, z: 1 },
  { x: 1, y: 1, z: -1 },
  { x: 1, y: -1, z: 1 },
  { x: 1, y: -1, z: -1 },
]

interface CellDirection {
  x: number
  y: number
  z: number
}
