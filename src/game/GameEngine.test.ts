import { describe, expect, it } from 'vitest'
import { UNIQUE_DIRECTIONS } from './config'
import { GameEngine } from './GameEngine'
import type { CellPosition, PlayerId } from './types'

const put = (game: GameEngine, cells: CellPosition[], player: PlayerId = 'A') => {
  cells.forEach((cell) => game.board.set(cell, player))
}

describe('GameEngine', () => {
  it('allows any empty ground cell', () => {
    const game = new GameEngine()
    expect(game.isValidMove(9, 9, 0)).toBe(true)
  })

  it('rejects unsupported elevated cells', () => {
    const game = new GameEngine()
    expect(game.isValidMove(4, 4, 1)).toBe(false)
    expect(game.getMoveFailure({ x: 4, y: 4, z: 1 })).toBe('UNSUPPORTED')
  })

  it('allows elevated cells with any of 26 neighbors occupied', () => {
    const game = new GameEngine()
    game.board.set({ x: 3, y: 3, z: 0 }, 'B')
    expect(game.isValidMove(4, 4, 1)).toBe(true)
  })

  it.each(UNIQUE_DIRECTIONS)('finds five in direction $x,$y,$z', (direction) => {
    const game = new GameEngine({ width: 10, depth: 10, minZ: -9, maxZ: 9 })
    const start = {
      x: direction.x < 0 ? 5 : 1,
      y: direction.y < 0 ? 5 : 1,
      z: direction.z < 0 ? 5 : 1,
    }
    const line = Array.from({ length: 5 }, (_, index) => ({
      x: start.x + direction.x * index,
      y: start.y + direction.y * index,
      z: start.z + direction.z * index,
    }))
    put(game, line)
    expect(game.findLinesToClear('A')).toHaveLength(5)
  })

  it.each([5, 6, 7])('clears the entire run of %i pieces', (length) => {
    const game = new GameEngine()
    put(
      game,
      Array.from({ length }, (_, x) => ({ x, y: 0, z: 0 })),
    )
    const result = game.resolveTurn('A')
    expect(result.eliminated).toBe(length)
    expect(game.board.entries()).toHaveLength(0)
  })

  it('deduplicates a shared piece across simultaneous lines', () => {
    const game = new GameEngine()
    const horizontal = Array.from({ length: 5 }, (_, x) => ({ x, y: 2, z: 0 }))
    const vertical = Array.from({ length: 5 }, (_, y) => ({ x: 2, y, z: 0 }))
    put(game, [...horizontal, ...vertical])
    const cells = game.findLinesToClear('A')
    expect(cells).toHaveLength(9)
    expect(new Set(cells.map((cell) => `${cell.x},${cell.y},${cell.z}`)).size).toBe(9)
  })

  it('compresses each vertical column while preserving order', () => {
    const game = new GameEngine()
    game.board.set({ x: 1, y: 1, z: 2 }, 'A')
    game.board.set({ x: 1, y: 1, z: 5 }, 'B')
    game.applyGravity()
    expect(game.board.get({ x: 1, y: 1, z: 0 })).toBeUndefined()
    expect(game.board.get({ x: 1, y: 1, z: 1 })).toBe('A')
    expect(game.board.get({ x: 1, y: 1, z: 2 })).toBe('B')
  })

  it('allows supported negative layers and compresses them toward z = 0', () => {
    const game = new GameEngine()
    game.board.set({ x: 2, y: 2, z: 0 }, 'A')
    expect(game.isValidMove(2, 2, -1)).toBe(true)
    game.board.set({ x: 3, y: 3, z: -3 }, 'A')
    game.board.set({ x: 3, y: 3, z: -6 }, 'B')
    game.applyGravity()
    expect(game.board.get({ x: 3, y: 3, z: -1 })).toBe('A')
    expect(game.board.get({ x: 3, y: 3, z: -2 })).toBe('B')
  })

  it('continues resolving lines created by gravity', () => {
    const game = new GameEngine({ maxZ: 7 })
    const upperHeights = [2, 4, 3, 5, 7]
    for (let x = 0; x < 5; x += 1) {
      game.board.set({ x, y: 0, z: 0 }, 'A')
      game.board.set({ x, y: 0, z: upperHeights[x] - 1 }, 'B')
      game.board.set({ x, y: 0, z: upperHeights[x] }, 'A')
    }
    const result = game.resolveTurn('A')
    expect(result.chainCount).toBe(2)
    expect(result.eliminated).toBe(10)
    expect(game.board.entries()).toHaveLength(5)
  })

  it('does not mutate state or switch player after an invalid move', () => {
    const game = new GameEngine()
    const before = game.board.cloneCells()
    const result = game.tryPlace({ x: 4, y: 4, z: 2 })
    expect(result.valid).toBe(false)
    expect(game.currentPlayer.id).toBe('A')
    expect(game.board.cloneCells()).toEqual(before)
  })

  it('wins at the target and rejects further moves', () => {
    const game = new GameEngine({ targetEliminationCount: 5 })
    put(
      game,
      Array.from({ length: 4 }, (_, x) => ({ x, y: 0, z: 0 })),
    )
    const result = game.tryPlace({ x: 4, y: 0, z: 0 })
    expect(result.winnerId).toBe('A')
    expect(game.state.status).toBe('won')
    expect(game.tryPlace({ x: 9, y: 9, z: 0 }).reason).toBe('GAME_OVER')
  })

  it('resets board, score, turn and winner', () => {
    const game = new GameEngine()
    game.board.set({ x: 0, y: 0, z: 0 }, 'A')
    game.getPlayer('A').eliminatedCount = 19
    game.state.currentPlayerIndex = 1
    game.state.status = 'won'
    game.state.winnerId = 'A'
    game.resetGame()
    expect(game.board.entries()).toHaveLength(0)
    expect(game.state.players.every((player) => player.eliminatedCount === 0)).toBe(true)
    expect(game.currentPlayer.id).toBe('A')
    expect(game.state.status).toBe('playing')
    expect(game.state.winnerId).toBeNull()
  })

  it('supports a three-player turn cycle', () => {
    const game = new GameEngine()
    game.configurePlayerCount(3)
    expect(game.state.players.map((player) => player.id)).toEqual(['A', 'B', 'C'])
    game.tryPlace({ x: 0, y: 0, z: 0 })
    game.tryPlace({ x: 1, y: 0, z: 0 })
    expect(game.currentPlayer.id).toBe('C')
  })
})
