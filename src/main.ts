import './style.css'
import { GameAudio } from './audio/GameAudio'
import { chooseAiMove } from './game/AiPlayer'
import { GameEngine } from './game/GameEngine'
import type { CellPosition, GameMode, MoveResult } from './game/types'
import { GameScene } from './render/GameScene'
import { GameHud } from './ui/GameHud'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app root')

app.innerHTML = `
  <main id="game-view" aria-label="3D 五子棋棋盘"></main>
  <aside id="hud" aria-label="游戏状态与控制"></aside>
`

const game = new GameEngine()
const audio = new GameAudio()
const gameView = document.querySelector<HTMLElement>('#game-view')!
const hudRoot = document.querySelector<HTMLElement>('#hud')!

let scene: GameScene
let mode: GameMode = 'local-2'
let aiThinking = false

const hud = new GameHud(hudRoot, game, {
  onLayerChange: (layer) => scene.setSelectedLayer(layer),
  onReset: () => {
    aiThinking = false
    game.resetGame()
    scene.setSelectedLayer(0)
    scene.sync()
    hud.reset()
  },
  onModeChange: (nextMode) => {
    mode = nextMode
    aiThinking = false
    game.configurePlayerCount(nextMode === 'local-3' ? 3 : 2)
    scene.setSelectedLayer(0)
    scene.sync()
    hud.reset(
      nextMode === 'ai'
        ? '人机对局：你执玩家 A，电脑执玩家 B'
        : nextMode === 'local-3'
          ? '三人模式：玩家 A 先手'
          : '双人模式：玩家 A 先手',
    )
  },
  onSoundChange: (enabled) => audio.setEnabled(enabled),
})

const presentResult = (result: MoveResult) => {
  audio.playPlace(result.playerId)
  if (result.eliminated > 0) audio.playClear(result.chainCount)
  scene.flashCleared(result.cleared, result.playerId)
  scene.sync()
  hud.update(result)
}

const runAiTurn = () => {
  if (mode !== 'ai' || game.currentPlayer.id !== 'B' || game.state.status !== 'playing') {
    return
  }
  aiThinking = true
  hud.showThinking()
  window.setTimeout(() => {
    const move = chooseAiMove(game, 'B')
    if (move) presentResult(game.tryPlace(move))
    aiThinking = false
  }, 420)
}

const handleSelect = (position: CellPosition) => {
  audio.unlock()
  if (aiThinking || (mode === 'ai' && game.currentPlayer.id === 'B')) {
    hud.showThinking()
    return
  }
  const result = game.tryPlace(position)
  if (!result.valid) {
    if (result.reason) hud.showInvalid(result.reason)
    return
  }
  presentResult(result)
  runAiTurn()
}

scene = new GameScene(gameView, game, {
  onHover: (position, reason) => hud.showHover(position, reason),
  onSelect: handleSelect,
})
