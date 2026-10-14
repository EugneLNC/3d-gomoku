import type { PlayerId } from '../game/types'

export class GameAudio {
  private context: AudioContext | null = null
  enabled = true

  unlock(): void {
    if (!this.context) this.context = new AudioContext()
    if (this.context.state === 'suspended') void this.context.resume()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (enabled) this.unlock()
  }

  playPlace(playerId: PlayerId): void {
    const frequencies: Record<string, number> = { A: 440, B: 554, C: 659 }
    this.tone(frequencies[playerId] ?? 440, 0.09, 'sine', 0.075)
  }

  playClear(chainCount: number): void {
    if (!this.enabled) return
    this.unlock()
    const base = 520 + Math.min(chainCount, 4) * 70
    ;[0, 4, 7, 12].forEach((semitones, index) => {
      window.setTimeout(
        () => this.tone(base * 2 ** (semitones / 12), 0.16, 'triangle', 0.055),
        index * 45,
      )
    })
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
  ): void {
    if (!this.enabled) return
    this.unlock()
    if (!this.context) return
    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(this.context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }
}
