/**
 * Sci-Fi Holographic Web Audio Synthesizer & Ambient Soundscape Engine
 * Features:
 * - Ambient low-frequency spacecraft reactor hum & cosmic resonance
 * - Periodic subtle avionics telemetry radar beeps
 * - Camera snapshot shutter sound for HUD capture
 * - Terrain scanline lidar sweep sweep-sound
 * - Core explosion & UI micro-interaction clicks
 */

class HoloAudioEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  // Ambient loop nodes
  private ambientGain: GainNode | null = null;
  private subOsc1: OscillatorNode | null = null;
  private subOsc2: OscillatorNode | null = null;
  private noiseNode: AudioNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private telemetryTimer: number | null = null;

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (val) {
      this.initContext();
      this.startAmbientSoundscape();
    } else {
      this.stopAmbientSoundscape();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Start Ambient Space Soundscapes
   * Low-frequency reactor core hum + subtle LFO drift + periodic avionics radar beeps
   */
  public startAmbientSoundscape() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Stop existing if running
    this.stopAmbientSoundscape();

    try {
      const now = this.ctx.currentTime;

      // Master Ambient Gain with smooth fade-in
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.045, now + 2.5);
      masterGain.connect(this.ctx.destination);
      this.ambientGain = masterGain;

      // Resonant Low-Pass Filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(110, now);
      filter.Q.setValueAtTime(2.2, now);
      filter.connect(masterGain);
      this.filterNode = filter;

      // Sub-Oscillator 1: 52 Hz (fundamental deep cabin hum)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(52, now);
      const osc1Gain = this.ctx.createGain();
      osc1Gain.gain.setValueAtTime(0.4, now);
      osc1.connect(osc1Gain);
      osc1Gain.connect(filter);
      osc1.start();
      this.subOsc1 = osc1;

      // Sub-Oscillator 2: 54.2 Hz (creates gentle binaural beat pulsation)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(54.2, now);
      const osc2Gain = this.ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.6, now);
      osc2.connect(osc2Gain);
      osc2Gain.connect(filter);
      osc2.start();
      this.subOsc2 = osc2;

      // Slow LFO: gently pulses the filter cutoff (cosmic breathing effect)
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.12, now); // ~8 second cycle
      lfoGain.gain.setValueAtTime(35, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.lfoOsc = lfo;

      // Filtered Pink Noise for interstellar vacuum airflow
      this.createNoiseBuffer(filter);

      // Start periodic subtle radar/telemetry beeps
      this.scheduleNextTelemetryPing();
    } catch (e) {
      console.warn('Ambient soundscape start caught:', e);
    }
  }

  private createNoiseBuffer(targetNode: AudioNode) {
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.96 * b1 + white * 0.11;
        b2 = 0.86 * b2 + white * 0.25;
        data[i] = (b0 + b1 + b2) * 0.08;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      noiseSource.connect(noiseGain);
      noiseGain.connect(targetNode);
      noiseSource.start();
      this.noiseNode = noiseSource;
    } catch (e) {
      // Noise buffer failure fallback
    }
  }

  private scheduleNextTelemetryPing() {
    if (!this.enabled) return;
    const delayMs = 4500 + Math.random() * 4500; // between 4.5s and 9s
    this.telemetryTimer = window.setTimeout(() => {
      this.playTelemetryPing();
      this.scheduleNextTelemetryPing();
    }, delayMs);
  }

  /**
   * Subtle high-tech avionics radar beep
   */
  public playTelemetryPing() {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const tones = [1320, 1760, 2200, 2640];
      const freq = tones[Math.floor(Math.random() * tones.length)];

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + 0.06);

      gain.gain.setValueAtTime(0.018, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {
      // Audio catch
    }
  }

  /**
   * Stop Ambient Space Soundscapes with smooth fade-out
   */
  public stopAmbientSoundscape() {
    if (this.telemetryTimer) {
      clearTimeout(this.telemetryTimer);
      this.telemetryTimer = null;
    }

    if (this.ambientGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
        this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      } catch (e) {}
    }

    setTimeout(() => {
      try {
        this.subOsc1?.stop();
        this.subOsc2?.stop();
        this.lfoOsc?.stop();
        (this.noiseNode as any)?.stop?.();
      } catch (e) {}
      this.subOsc1 = null;
      this.subOsc2 = null;
      this.lfoOsc = null;
      this.noiseNode = null;
      this.filterNode = null;
      this.ambientGain = null;
    }, 450);
  }

  /**
   * Camera Shutter Snapshot Chime (for PNG documentation download)
   */
  public playCameraShutterSound() {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;

      // Mech click 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1400, now);
      osc1.frequency.exponentialRampToValueAtTime(400, now + 0.04);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      // Electronic confirm chime
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.18);
      gain2.gain.setValueAtTime(0.06, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.22);
    } catch (e) {}
  }

  /**
   * Satellite Lidar Scanline Sweep Sound
   */
  public playScanSweepSound() {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Rising and falling laser sweep
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(1600, now + 0.25);
      osc.frequency.linearRampToValueAtTime(600, now + 0.65);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {}
  }

  /**
   * UI Click / Blip Sound
   */
  public playBlip(freq: number = 880, duration: number = 0.08) {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  /**
   * Exploded Core Sound
   */
  public playExplodeSound() {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }
}

export const holoAudio = new HoloAudioEngine();
