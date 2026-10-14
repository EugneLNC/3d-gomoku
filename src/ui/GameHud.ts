import type { GameEngine } from '../game/GameEngine'
import type {
  CellPosition,
  GameMode,
  MoveFailureReason,
  MoveResult,
} from '../game/types'

const FAILURE_TEXT: Record<MoveFailureReason, string> = {
  OUT_OF_BOUNDS: '目标超出棋盘范围',
  OCCUPIED: '该位置已有棋子',
  UNSUPPORTED: '该位置没有支撑，不能落子',
  GAME_OVER: '本局已经结束',
}

interface HudCallbacks {
  onLayerChange: (layer: number) => void
  onReset: () => void
  onModeChange: (mode: GameMode) => void
  onSoundChange: (enabled: boolean) => void
}

export class GameHud {
  private readonly layerValue: HTMLElement
  private readonly layerInput: HTMLInputElement
  private readonly status: HTMLElement
  private readonly turnBadge: HTMLElement
  private readonly scores: HTMLElement
  private readonly winner: HTMLElement
  private readonly winnerTitle: HTMLElement
  private readonly soundButton: HTMLButtonElement

  constructor(
    root: HTMLElement,
    private readonly game: GameEngine,
    callbacks: HudCallbacks,
  ) {
    root.innerHTML = `
      <section class="brand-panel">
        <div class="eyebrow">THREE-DIMENSIONAL LINE CLEAR</div>
        <h1>星阵</h1>
        <p>连接五枚，清除得分</p>
      </section>

      <section class="mode-panel">
        <label for="mode-select">对局模式</label>
        <select id="mode-select">
          <option value="local-2">本地双人</option>
          <option value="ai">人机对局</option>
          <option value="local-3">本地三人</option>
        </select>
        <button id="sound-button" data-enabled="true" aria-label="切换音效">音效：开</button>
      </section>

      <section class="score-panel">
        <div class="turn-row">
          <span>当前回合</span>
          <strong id="turn-badge"></strong>
        </div>
        <div id="scores" class="scores"></div>
      </section>

      <section class="layer-panel">
        <div class="layer-heading"><span>当前空间层</span><strong id="layer-value">Z = 0</strong></div>
        <div class="layer-controls">
          <button id="layer-down" aria-label="降低一层">−</button>
          <input id="layer-input" type="range" min="${game.config.minZ}" max="${game.config.maxZ}" value="0" />
          <button id="layer-up" aria-label="升高一层">＋</button>
        </div>
      </section>

      <div id="status-message" class="status-message">选择中央平面的交叉点开始落子</div>

      <div class="controls-hint">
        <span><b>拖动</b> 旋转视角</span>
        <span><b>滚轮</b> 缩放</span>
        <span><b>点击交叉点</b> 落子</span>
      </div>

      <button id="reset-button" class="reset-button">重开游戏</button>

      <div id="winner-overlay" class="winner-overlay" hidden>
        <div class="winner-card">
          <div class="eyebrow">SEQUENCE COMPLETE</div>
          <h2 id="winner-title">玩家 A 获胜</h2>
          <p>已达到目标消除数量</p>
          <button id="winner-reset">再来一局</button>
        </div>
      </div>
    `
    this.layerValue = root.querySelector('#layer-value')!
    this.layerInput = root.querySelector('#layer-input')!
    this.status = root.querySelector('#status-message')!
    this.turnBadge = root.querySelector('#turn-badge')!
    this.scores = root.querySelector('#scores')!
    this.winner = root.querySelector('#winner-overlay')!
    this.winnerTitle = root.querySelector('#winner-title')!
    this.soundButton = root.querySelector('#sound-button')!

    const setLayer = (value: number) => {
      const layer = Math.max(game.config.minZ, Math.min(game.config.maxZ, value))
      this.layerInput.value = String(layer)
      this.layerValue.textContent = `Z = ${layer}`
      callbacks.onLayerChange(layer)
    }
    this.layerInput.addEventListener('input', () => setLayer(Number(this.layerInput.value)))
    root.querySelector('#layer-down')!.addEventListener('click', () => {
      setLayer(Number(this.layerInput.value) - 1)
    })
    root.querySelector('#layer-up')!.addEventListener('click', () => {
      setLayer(Number(this.layerInput.value) + 1)
    })
    root.querySelector<HTMLSelectElement>('#mode-select')!.addEventListener('change', (event) => {
      callbacks.onModeChange((event.target as HTMLSelectElement).value as GameMode)
    })
    this.soundButton.addEventListener('click', () => {
      const nextEnabled = this.soundButton.dataset.enabled !== 'true'
      this.soundButton.dataset.enabled = String(nextEnabled)
      this.soundButton.textContent = `音效：${nextEnabled ? '开' : '关'}`
      callbacks.onSoundChange(nextEnabled)
    })
    root.querySelector('#reset-button')!.addEventListener('click', callbacks.onReset)
    root.querySelector('#winner-reset')!.addEventListener('click', callbacks.onReset)
    this.update()
  }

  update(result?: MoveResult): void {
    this.scores.innerHTML = this.game.state.players
      .map(
        (player) => `
          <div class="score score-${player.id.toLowerCase()}">
            <span>${player.name}</span><strong>${player.eliminatedCount}</strong>
          </div>
        `,
      )
      .join('')
    this.scores.innerHTML += `
      <div class="target">
        <span>目标</span><strong>${this.game.config.targetEliminationCount}</strong>
      </div>
    `
    this.scores.style.setProperty('--player-count', String(this.game.state.players.length))
    this.turnBadge.textContent = this.game.currentPlayer.name
    this.turnBadge.className = `player-${this.game.currentPlayer.id.toLowerCase()}`

    if (result?.valid) {
      this.setMessage(
        result.eliminated > 0
          ? `连锁 ×${result.chainCount}，消除 ${result.eliminated} 枚棋子`
          : `${this.game.getPlayer(result.playerId).name} 已落子`,
        result.eliminated > 0 ? 'success' : 'neutral',
      )
    }
    if (this.game.state.winnerId) {
      this.winnerTitle.textContent = `${this.game.getPlayer(this.game.state.winnerId).name} 获胜`
      this.winner.hidden = false
    } else {
      this.winner.hidden = true
    }
  }

  showHover(position: CellPosition | null, reason: MoveFailureReason | null): void {
    if (!position || this.game.state.status === 'won') return
    this.setMessage(
      reason
        ? `${FAILURE_TEXT[reason]} · (${position.x}, ${position.y}, ${position.z})`
        : `可落子 · (${position.x}, ${position.y}, ${position.z})`,
      reason ? 'error' : 'success',
    )
  }

  showInvalid(reason: MoveFailureReason): void {
    this.setMessage(FAILURE_TEXT[reason], 'error')
    this.status.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-7px)' },
        { transform: 'translateX(7px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 220 },
    )
  }

  showThinking(): void {
    this.setMessage('电脑正在计算落点…', 'neutral')
  }

  reset(message = '棋盘已重置，玩家 A 先手'): void {
    this.layerInput.value = '0'
    this.layerValue.textContent = 'Z = 0'
    this.setMessage(message, 'neutral')
    this.update()
  }

  private setMessage(text: string, tone: 'neutral' | 'success' | 'error'): void {
    this.status.textContent = text
    this.status.dataset.tone = tone
  }
}
