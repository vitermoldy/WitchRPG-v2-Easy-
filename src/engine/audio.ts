/**
 * Every sound is synthesised with WebAudio, so the game ships no audio files.
 * The context starts on the first click (browsers block audio before a gesture).
 */
export class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private gripNodes: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null
  private volume = 0.7

  start() {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    try {
      this.ctx = new AudioContext()
    } catch {
      return
    }
    const ctx = this.ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.volume
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    this.master.connect(comp).connect(ctx.destination)
    const len = ctx.sampleRate * 1.5
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    this.startAmbience()
  }

  setVolume(v: number) {
    this.volume = v
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }

  suspend() {
    void this.ctx?.suspend()
  }

  resume() {
    void this.ctx?.resume()
  }

  private env(gain: GainNode, t: number, a: number, peak: number, dec: number) {
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(peak, t + a)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + a + dec)
  }

  private noise(t: number, dur: number, type: BiquadFilterType, freq: number, peak: number, q = 1, freqEnd?: number, attack = 0.005) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.setValueAtTime(freq, t)
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur)
    f.Q.value = q
    const g = ctx.createGain()
    this.env(g, t, attack, peak, dur)
    src.connect(f).connect(g).connect(this.master!)
    src.start(t, Math.random())
    src.stop(t + attack + dur + 0.05)
  }

  private tone(t: number, type: OscillatorType, f0: number, f1: number, dur: number, peak: number, attack = 0.005) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    const g = ctx.createGain()
    this.env(g, t, attack, peak, dur)
    o.connect(g).connect(this.master!)
    o.start(t)
    o.stop(t + attack + dur + 0.05)
  }

  private ok() {
    return !!this.ctx && this.ctx.state === 'running'
  }

  bolt() {
    if (!this.ok()) return
    const t = this.ctx!.currentTime
    this.tone(t, 'sawtooth', 900 + Math.random() * 120, 180, 0.16, 0.12)
    this.tone(t, 'square', 1800, 600, 0.06, 0.04)
    this.noise(t, 0.1, 'bandpass', 3000, 0.12, 2)
  }

  hit(strong = false) {
    if (!this.ok()) return
    const t = this.ctx!.currentTime
    this.noise(t, strong ? 0.2 : 0.09, 'lowpass', strong ? 1400 : 2600, strong ? 0.35 : 0.18)
    this.tone(t, 'sine', strong ? 160 : 240, 60, 0.12, strong ? 0.3 : 0.12)
  }

  /** v2: the staff cutting the air; the heavy blow is lower and longer. */
  swing(heavy = false) {
    if (!this.ok()) return
    const t = this.ctx!.currentTime
    this.noise(t, heavy ? 0.28 : 0.14, 'bandpass', heavy ? 700 : 1400, heavy ? 0.16 : 0.1, 1.4, heavy ? 260 : 600)
  }

  /**
   * v2: a creature starts an attack. ring (blockable): a low swelling thrum. line (dodge it): a sharp
   * rising two-note shriek. They sound different so the warning does not rest on sight alone.
   */
  warn(kind: 'ring' | 'line') {
    if (!this.ok()) return
    const t = this.ctx!.currentTime
    if (kind === 'ring') {
      this.tone(t, 'triangle', 150, 110, 0.4, 0.14, 0.08)
      this.noise(t, 0.3, 'lowpass', 500, 0.08, 1)
    } else {
      this.tone(t, 'sawtooth', 700, 1500, 0.12, 0.08)
      this.tone(t + 0.12, 'sawtooth', 900, 1900, 0.14, 0.08)
    }
  }

  /** v2: a parry, bright and ringing, so it reads apart from a plain block. */
  parry() {
    if (!this.ok()) return
    const t = this.ctx!.currentTime
    this.tone(t, 'triangle', 1560, 1300, 0.45, 0.22)
    this.tone(t, 'sine', 2340, 2100, 0.3, 0.1)
    this.noise(t, 0.08, 'highpass', 3500, 0.25)
  }

  burst() {
    if (!this.ok()) return
    const t = this.ctx!.currentTime
    this.tone(t, 'sine', 120, 32, 0.9, 0.7)
    this.noise(t, 0.8, 'lowpass', 2400, 0.55, 0.7, 200)
    this.tone(t, 'sawtooth', 420, 60, 0.4, 0.12)
  }

  snare() {
    if (!this.ok()) return
    const t = this.ctx!.currentTime
    this.tone(t, 'triangle', 220, 110, 0.7, 0.18, 0.05)
    this.tone(t, 'triangle', 330, 160, 0.7, 0.1, 0.05)
    this.noise(t, 0.6, 'bandpass', 900, 0.12, 6, 300)
  }

  barrier(up: boolean) {
    if (!this.ok()) return
    const t = this.ctx!.currentTime
    if (up) {
      this.tone(t, 'sine', 300, 600, 0.35, 0.2, 0.04)
      this.tone(t, 'sine', 450, 900, 0.35, 0.1, 0.04)
    } else {
      this.tone(t, 'sine', 200, 40, 0.5, 0.4)
      this.noise(t, 0.4, 'lowpass', 1800, 0.35, 0.7, 200)
    }
  }

  overload(on: boolean) {
    if (!this.ok()) return
    const t = this.ctx!.currentTime
    if (on) {
