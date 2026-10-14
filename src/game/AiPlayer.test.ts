import { describe, expect, it } from 'vitest'
import { chooseAiMove } from './AiPlayer'
import { GameEngine } from './GameEngine'

describe('chooseAiMove', () => {
  it('finishes an available five-in-a-row', () => {
    const game = new GameEngine()
    for (let x = 1; x <= 4; x += 1) {
      game.board.set({ x, y: 2, z: 0 }, 'B')
    }
    const move = chooseAiMove(game, 'B')
    expect(move).not.toBeNull()
    expect(
      (move?.x === 0 || move?.x === 5) && move?.y === 2 && move?.z === 0,
    ).toBe(true)
  })
})
