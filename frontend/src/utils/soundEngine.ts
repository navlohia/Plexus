/**
 * Refined Tactile Web Audio Engine for Plexus
 * Modeled on physical micro-acoustics (mechanical ratchet, organic sub-bass pulse, resonant glass chime).
 * Zero harsh oscillators. Zero ear-piercing frequencies. Default muted to respect user intent.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = true; // Default to muted for modern web compliance
  private noiseBuffer: AudioBuffer | null = null;
  private lastTickTime: number = 0;
  private lastTickStep: number = -1;
  private separationTriggered: boolean = false;
  private mapLockTriggered: boolean = false;
  private listeners: Set<(muted: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('plexus_audio_muted');
        // Default to muted (true) unless user explicitly saved 'false'
        this.muted = saved !== null ? saved === 'true' : true;
      } catch {
        this.muted = true;
      }

      // Unlock AudioContext on first user interaction
      const unlock = () => {
        this.getAudioContext();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('wheel', unlock);
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('wheel', unlock, { passive: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initNoiseBuffer(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Pre-generate a 6ms burst of shaped pink/white noise for physical mechanical transients
   */
  private initNoiseBuffer(ctx: AudioContext): void {
    const bufferSize = Math.floor(ctx.sampleRate * 0.006); // 6ms
    this.noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Gentle pinking filter for softer, less abrasive transient
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      const pink = b0 + b1 + b2 + white * 0.5362;
      output[i] = pink * 0.11;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem('plexus_audio_muted', String(muted));
    } catch {
      // ignore
    }
    this.listeners.forEach((cb) => cb(this.muted));
  }

  public toggleMute(): boolean {
    const next = !this.muted;
    this.setMuted(next);
    if (!next) {
      // Prime context and play soft confirmation tap
      this.getAudioContext();
      this.playButtonClick();
    }
    return this.muted;
  }

  public subscribe(cb: (muted: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Sound 1 — Tactile Scroll Detent (Apple Watch / Leica dial ratchet)
   * Ultra-short (4ms) bandpass-filtered noise transient + damped low body impulse.
   * Rate-limited to max 1 per 45ms so rapid scrolling feels like a silky mechanical dial.
   */
  public playScrollTick(): void {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    // Rate limit: prevent rapid-fire abrasive clicks
    if (now - this.lastTickTime < 0.045) return;
    this.lastTickTime = now;

    try {
      // 1. Noise transient (tactile tooth contact)
      if (this.noiseBuffer) {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        // Subtle jitter for humanized physical feel
        const jitter = 1 + (Math.random() - 0.5) * 0.08;
        filter.frequency.setValueAtTime(2200 * jitter, now);
        filter.Q.value = 2.4;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.007, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.00001, now + 0.005);

        noiseSource.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noiseSource.start(now);
      }

      // 2. Micro body impulse (low subtle thump)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(175, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.007);

      oscGain.gain.setValueAtTime(0.006, now);
      oscGain.gain.exponentialRampToValueAtTime(0.00001, now + 0.007);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.008);
    } catch {
      // Audio node cleanup
    }
  }

  /**
   * Sound 2 — Organic Sub-Bass Pulse (Cell Division / Separation at ~22% Scroll)
   * Felt more than heard: deep, warm 58Hz cardiac sub-pulse with zero high-frequency hash.
   */
  public playSeparationChord(): void {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      const duration = 0.32;

      // Deep sub-bass sine
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(62, now);
      osc.frequency.exponentialRampToValueAtTime(46, now + duration);

      // Lowpass filter to ensure zero buzz or sharpness
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(105, now);
      filter.Q.value = 0.8;

      // Soft curved attack (no click) and velvet decay
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.038, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Audio node cleanup
    }
  }

  /**
   * Sound 3 — Resonant Glass / Marimba Chime (Map Coordinate Lock at ~75% Scroll)
   * Elegant dual-harmonic chime (C5 523Hz + G5 784Hz) with warm lowpass resonance.
   */
  public playMapLockPing(): void {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      const duration = 0.26;

      const masterGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Soft lowpass filter gives an organic wooden/glass resonance
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1050, now);
      filter.Q.value = 1.2;

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(0.022, now + 0.008);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      masterGain.connect(filter);
      filter.connect(ctx.destination);

      // 1. Fundamental tone (C5 - 523.25Hz)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + duration + 0.01);

      // 2. Harmonic fifth (G5 - 783.99Hz)
      const osc2 = ctx.createOscillator();
      const osc2Gain = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now);
      osc2Gain.gain.setValueAtTime(0.35, now); // quieter overtone
      osc2.connect(osc2Gain);
      osc2Gain.connect(masterGain);
      osc2.start(now);
      osc2.stop(now + duration + 0.01);
    } catch {
      // Audio node cleanup
    }
  }

  /**
   * Sound 4 — Tactile UI Tap (Buttons, Switches)
   */
  public playButtonClick(): void {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.008);

      gain.gain.setValueAtTime(0.008, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.01);
    } catch {
      // Audio node cleanup
    }
  }

  /**
   * Scroll handler with progress tracking
   */
  public onScrollProgress(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));

    // 1. Micro-detent every 3% (0.03)
    const step = Math.floor(clamped / 0.03);
    if (step !== this.lastTickStep) {
      if (this.lastTickStep !== -1) {
        this.playScrollTick();
      }
      this.lastTickStep = step;
    }

    // 2. Separation cardiac pulse at ~22% scroll
    if (clamped >= 0.22 && !this.separationTriggered) {
      this.separationTriggered = true;
      this.playSeparationChord();
    } else if (clamped < 0.18) {
      this.separationTriggered = false; // re-arm when scrolling back up
    }

    // 3. Map coordinate lock chime at ~75% scroll
    if (clamped >= 0.75 && !this.mapLockTriggered) {
      this.mapLockTriggered = true;
      this.playMapLockPing();
    } else if (clamped < 0.70) {
      this.mapLockTriggered = false; // re-arm when scrolling back up
    }
  }
}

export const soundEngine = new SoundEngine();
if (typeof window !== 'undefined') {
  (window as any).__soundEngine = soundEngine;
}
