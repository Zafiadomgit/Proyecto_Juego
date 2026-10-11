/** Efectos de sonido sintetizados con WebAudio: sin ficheros de audio y sin problemas de licencias. */
export class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.15): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  pick(): void {
    this.tone(660, 0, 0.06, 'triangle', 0.08);
  }

  place(): void {
    this.tone(220, 0, 0.09, 'triangle', 0.18);
    this.tone(330, 0.02, 0.07, 'sine', 0.08);
  }

  invalid(): void {
    this.tone(140, 0, 0.12, 'square', 0.05);
  }

  clear(lines: number, combo: number): void {
    const base = 440 * Math.pow(2, Math.min(combo, 8) / 12);
    const notes = [0, 4, 7, 12, 16, 19].slice(0, Math.min(2 + lines, 6));
    notes.forEach((n, i) => this.tone(base * Math.pow(2, n / 12), i * 0.05, 0.18, 'triangle', 0.14));
  }

  perfect(): void {
    [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => this.tone(523 * Math.pow(2, n / 12), i * 0.06, 0.25, 'sine', 0.12));
  }

  coin(): void {
    this.tone(988, 0, 0.08, 'square', 0.05);
    this.tone(1319, 0.07, 0.15, 'square', 0.05);
  }

  gameOver(): void {
    [7, 4, 0, -5].forEach((n, i) => this.tone(330 * Math.pow(2, n / 12), i * 0.14, 0.3, 'triangle', 0.12));
  }

  win(): void {
    [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => this.tone(523 * Math.pow(2, n / 12), i * 0.09, 0.22, 'triangle', 0.13));
  }

  tap(): void {
    this.tone(880, 0, 0.04, 'sine', 0.06);
  }
}

export function haptic(enabled: boolean, pattern: number | number[]): void {
  if (enabled && 'vibrate' in navigator) navigator.vibrate(pattern);
}
