import { UNIQUE_DIRECTIONS } from './config'
import type { GameEngine } from './GameEngine'
import type { CellPosition, PlayerId } from './types'

const lineWeight = (count: number): number => {
  if (count >= 5) return 1_000_000
  return [0, 4, 22, 120, 2_400][count] ?? 0
}

const countDirection = (
  game: GameEngine,
  origin: CellPosition,
  playerId: PlayerId,
  dx: number,
  dy: number,
  dz: number,
): number => {
  let count = 0
  let cursor = { x: origin.x + dx, y: origin.y + dy, z: origin.z + dz }
  while (
    game.isInsideBoard(cursor.x, cursor.y, cursor.z) &&
    game.board.get(cursor) === playerId
  ) {
    count += 1
    cursor = { x: cursor.x + dx, y: cursor.y + dy, z: cursor.z + dz }
  }
  return count
}

const scoreForPlayer = (
  game: GameEngine,
  position: CellPosition,
  playerId: PlayerId,
): number =>
  UNIQUE_DIRECTIONS.reduce((score, direction) => {
    const count =
      1 +
      countDirection(game, position, playerId, direction.x, direction.y, direction.z) +
      countDirection(game, position, playerId, -direction.x, -direction.y, -direction.z)
    return score + lineWeight(count)
  }, 0)

export const chooseAiMove = (game: GameEngine, aiId: PlayerId): CellPosition | null => {
  const opponents = game.state.players.filter((player) => player.id !== aiId)
  const candidates: Array<{ position: CellPosition; score: number }> = []
  for (let z = game.config.minZ; z <= game.config.maxZ; z += 1) {
    for (let y = 0; y < game.config.depth; y += 1) {
      for (let x = 0; x < game.config.width; x += 1) {
        const position = { x, y, z }
        if (!game.isValidMove(x, y, z, aiId)) continue
        const attack = scoreForPlayer(game, position, aiId)
        const defense = Math.max(
          ...opponents.map((opponent) => scoreForPlayer(game, position, opponent.id)),
        )
        const centerDistance =
          Math.abs(x - (game.config.width - 1) / 2) +
          Math.abs(y - (game.config.depth - 1) / 2) +
          Math.abs(z) * 0.35
        const score = attack + defense * 0.82 - centerDistance + Math.random() * 0.15
        candidates.push({ position, score })
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]?.position ?? null
}
