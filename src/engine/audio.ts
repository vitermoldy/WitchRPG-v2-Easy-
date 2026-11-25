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

