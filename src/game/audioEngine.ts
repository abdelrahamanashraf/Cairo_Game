/**
 * Procedural Web Audio SFX + Egyptian Hijaz Dynamic Action Score Engine.
 * Zero external audio dependencies — works immediately alongside optional Lyria 3 MP3 tracks.
 */

export class TacticalAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private synthMusicEnabled = true;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicIntensity: 'ambient' | 'combat' | 'boss' = 'ambient';
  private externalTrackPlaying = false;

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setSynthMusicEnabled(enabled: boolean): void {
    this.synthMusicEnabled = enabled;
    if (!enabled) {
      this.stopMusicLoop();
    } else if (!this.externalTrackPlaying) {
      this.startMusicLoop();
    }
  }

  public setExternalTrackPlaying(playing: boolean): void {
    this.externalTrackPlaying = playing;
    if (playing) {
      this.stopMusicLoop();
    } else if (this.synthMusicEnabled) {
      this.startMusicLoop();
    }
  }

  public setMusicIntensity(mode: 'ambient' | 'combat' | 'boss'): void {
    this.musicIntensity = mode;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.noiseBuffer && this.ctx) {
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * 0.45);
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  public startMusicLoop(): void {
    if (this.musicTimer !== null || !this.synthMusicEnabled || this.externalTrackPlaying) return;
    // D Hijaz scale frequencies (authentic Cairo cinematic tension)
    const hijazNotes = [146.83, 155.56, 185.0, 196.0, 220.0, 233.08, 261.63, 293.66, 311.13, 369.99];
    const pattern = [0, 3, 2, 1, 0, 4, 5, 4, 2, 1, 0, 7, 6, 4, 2, 1];

    const stepMs = 215;
    this.musicTimer = window.setInterval(() => {
      if (this.muted || !this.synthMusicEnabled || this.externalTrackPlaying) return;
      if (!this.ctx || this.ctx.state !== 'running') return;

      const ctx = this.ctx;
      const now = ctx.currentTime;
      const step = this.musicStep++;
      const isBoss = this.musicIntensity === 'boss';
      const isCombat = this.musicIntensity === 'combat' || isBoss;

      // Deep Cairo sub-bass drone on bar downbeats
      if (step % 8 === 0) {
        const bass = ctx.createOscillator();
        bass.type = isBoss ? 'sawtooth' : 'triangle';
        bass.frequency.setValueAtTime(step % 16 === 0 ? 73.42 : 77.78, now);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isBoss ? 220 : 150, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(isBoss ? 0.085 : 0.05, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.55);
        bass.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        bass.start(now);
        bass.stop(now + 1.6);
      }

      // Darbuka rhythmic pulse during combat / boss
      if (isCombat && this.noiseBuffer) {
        const isDum = step % 4 === 0 || (isBoss && step % 8 === 6);
        const isTak = step % 2 === 1;
        if (isDum) {
          const drum = ctx.createOscillator();
          drum.type = 'sine';
          drum.frequency.setValueAtTime(118, now);
          drum.frequency.exponentialRampToValueAtTime(48, now + 0.11);
          const g = ctx.createGain();
          g.gain.setValueAtTime(isBoss ? 0.095 : 0.06, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          drum.connect(g);
          g.connect(ctx.destination);
          drum.start(now);
          drum.stop(now + 0.13);
        } else if (isTak) {
          const n = ctx.createBufferSource();
          n.buffer = this.noiseBuffer;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(2400, now);
          bp.Q.setValueAtTime(2.5, now);
          const g = ctx.createGain();
          g.gain.setValueAtTime(isBoss ? 0.035 : 0.022, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
          n.connect(bp);
          bp.connect(g);
          g.connect(ctx.destination);
          n.start(now);
          n.stop(now + 0.05);
        }
      }

      // Plucked Oud Hijaz motif
      if (isCombat || step % 2 === 0) {
        const noteIdx = pattern[step % pattern.length];
        const freq = hijazNotes[noteIdx] * (isBoss ? 1.0 : 1.0);
        const oud = ctx.createOscillator();
        oud.type = 'triangle';
        oud.frequency.setValueAtTime(freq, now);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1850, now);
        filter.frequency.exponentialRampToValueAtTime(420, now + 0.24);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(isBoss ? 0.052 : 0.036, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
        oud.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        oud.start(now);
        oud.stop(now + 0.28);
      }
    }, stepMs);
  }

  public stopMusicLoop(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public unlockAndStartMusic(): void {
    this.ensureContext();
    if (this.synthMusicEnabled && !this.externalTrackPlaying) {
      this.startMusicLoop();
    }
  }

  public playRifleShot(isPlayer = true, style: 'rifle' | 'shotgun' | 'sniper' | 'pulse' = 'rifle'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const centerFreq =
      style === 'shotgun' ? 520 : style === 'sniper' ? 1650 : style === 'pulse' ? 2100 : isPlayer ? 1320 : 960;
    filter.frequency.setValueAtTime(centerFreq, now);
    filter.Q.setValueAtTime(style === 'pulse' ? 2.4 : 0.85, now);

    const gain = ctx.createGain();
    const peak = isPlayer ? 0.27 : style === 'shotgun' || style === 'sniper' ? 0.24 : 0.13;
    const decay = style === 'shotgun' ? 0.28 : style === 'sniper' ? 0.25 : 0.15;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + decay + 0.02);

    // Mechanical bolt/chest punch
    const osc = ctx.createOscillator();
    osc.type = style === 'pulse' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(style === 'pulse' ? 420 : style === 'shotgun' ? 110 : 185, now);
    osc.frequency.exponentialRampToValueAtTime(style === 'pulse' ? 110 : 40, now + 0.09);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(isPlayer ? 0.23 : 0.15, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playHitMarker(isHeadshot: boolean, isKill: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = isHeadshot ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(isHeadshot ? 1780 : 1020, now);
    osc.frequency.exponentialRampToValueAtTime(isKill ? 440 : 640, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isHeadshot ? 0.17 : 0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playReload(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.45, 0.95].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      const baseFreq = idx === 0 ? 520 : idx === 1 ? 680 : 940;
      osc.frequency.setValueAtTime(baseFreq, now + offset);
      osc.frequency.exponentialRampToValueAtTime(220, now + offset + 0.05);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.065, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.06);
    });
  }

  public playPlayerHit(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.135);
  }

  public playPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.09, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.15);
    });
  }

  public playBossHorn(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [110, 146.83, 233.08].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.94, now + 1.0);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.08);
    });
  }

  public playVictory(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [293.66, 369.99, 440.0, 587.33].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.11);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, now + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.52);
    });
  }

  public dispose(): void {
    this.stopMusicLoop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
