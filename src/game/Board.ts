import type { CellPosition, GameConfig, GravityMove, PlayerId } from './types'

const keyOf = ({ x, y, z }: CellPosition): string => `${x},${y},${z}`

export class Board {
  private readonly cells = new Map<string, PlayerId>()

  constructor(readonly config: GameConfig) {}

  get(position: CellPosition): PlayerId | undefined {
    return this.cells.get(keyOf(position))
  }

  set(position: CellPosition, playerId: PlayerId): void {
    this.cells.set(keyOf(position), playerId)
  }

  delete(position: CellPosition): void {
    this.cells.delete(keyOf(position))
  }

  clear(): void {
    this.cells.clear()
  }

  entries(): Array<{ position: CellPosition; playerId: PlayerId }> {
    return [...this.cells.entries()].map(([key, playerId]) => {
      const [x, y, z] = key.split(',').map(Number)
      return { position: { x, y, z }, playerId }
    })
  }

  cloneCells(): Map<string, PlayerId> {
    return new Map(this.cells)
  }

  applyGravity(): GravityMove[] {
    const moves: GravityMove[] = []
    for (let x = 0; x < this.config.width; x += 1) {
      for (let y = 0; y < this.config.depth; y += 1) {
        const positive: Array<{ z: number; playerId: PlayerId }> = []
        const negative: Array<{ z: number; playerId: PlayerId }> = []
        for (let z = 1; z <= this.config.maxZ; z += 1) {
          const playerId = this.get({ x, y, z })
          if (playerId !== undefined) positive.push({ z, playerId })
          this.delete({ x, y, z })
        }
        for (let z = -1; z >= this.config.minZ; z -= 1) {
          const playerId = this.get({ x, y, z })
          if (playerId !== undefined) negative.push({ z, playerId })
          this.delete({ x, y, z })
        }
        positive.forEach(({ z: oldZ, playerId }, index) => {
          const newZ = index + 1
          this.set({ x, y, z: newZ }, playerId)
          if (oldZ !== newZ) {
            moves.push({
              playerId,
              from: { x, y, z: oldZ },
              to: { x, y, z: newZ },
            })
          }
        })
        negative.forEach(({ z: oldZ, playerId }, index) => {
          const newZ = -(index + 1)
          this.set({ x, y, z: newZ }, playerId)
          if (oldZ !== newZ) {
            moves.push({
              playerId,
              from: { x, y, z: oldZ },
              to: { x, y, z: newZ },
            })
          }
        })
      }
    }
    return moves
  }
}

export { keyOf }
