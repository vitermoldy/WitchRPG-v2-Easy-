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
