// ============================================================
// AudioManager.ts - Web Audio API sound system
// Handles SFX, music, volume control with procedural sounds
// (no external audio files needed)
// ============================================================

import { GameSettings } from './types';

class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentMusic: AudioBufferSourceNode | null = null;
  private settings: GameSettings;
  private initialized: boolean = false;

  constructor(settings: GameSettings) {
    this.settings = settings;
  }

  /** Initialize AudioContext (must be called from user gesture) */
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.settings.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.settings.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.settings.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext not available:', e);
    }
  }

  /** Resume AudioContext if suspended (browser autoplay policy) */
  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateSettings(settings: GameSettings) {
    this.settings = settings;
    if (this.masterGain) this.masterGain.gain.value = settings.masterVolume;
    if (this.sfxGain) this.sfxGain.gain.value = settings.sfxVolume;
    if (this.musicGain) this.musicGain.gain.value = settings.musicVolume;
  }

  // ========== PROCEDURAL SFX ==========

  /** Quick sword slash sound */
  playSlash(pitch: number = 800) {
    if (!this.ctx || !this.sfxGain || !this.settings.screenShake) return;
    // We always play SFX regardless of screenShake, but let's use a proper check
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.15);
  }

  /** Heavy impact (Greatsword / Brute) */
  playHeavyHit() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.3);
  }

  /** Quick stab (Daggers / Spear) */
  playStab() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.08);
  }

  /** Player hurt sound */
  playPlayerHurt() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.2);
  }

  /** Enemy death sound */
  playEnemyDeath() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.25);
  }

  /** Potion pickup / heal */
  playHeal() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.2);
  }

  /** Level up chime */
  playLevelUp() {
    if (!this.ctx || !this.sfxGain) return;
    [0, 0.1, 0.2].forEach((delay, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = [523, 659, 784][i]; // C5, E5, G5
      gain.gain.setValueAtTime(0.15, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + 0.3);
    });
  }

  /** Zenitsu dash whoosh */
  playDash() {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(this.ctx.currentTime);
  }

  /** Shockwave / AOE skill */
  playShockwave() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.5);
  }

  /** Boss roar (District 5 boss appearance) */
  playBossRoar() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.5);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 1.0);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.0);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 1.0);
  }

  /** Portal open sound */
  playPortalOpen() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.4);
  }

  /** Gold/item pickup */
  playPickup() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1000, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.15);
  }

  /** Arrow shot (Archer enemy) */
  playArrowShot() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.1);
  }

  /** Magic cast (Mage enemy) */
  playMagicCast() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.3);
  }

  /** Game over sound */
  playGameOver() {
    if (!this.ctx || !this.sfxGain) return;
    [0, 0.2, 0.4].forEach((delay, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = [300, 250, 150][i];
      gain.gain.setValueAtTime(0.15, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + 0.4);
    });
  }

  /** Victory fanfare */
  playVictory() {
    if (!this.ctx || !this.sfxGain) return;
    [0, 0.15, 0.3, 0.45].forEach((delay, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = [523, 659, 784, 1047][i]; // C5 E5 G5 C6
      gain.gain.setValueAtTime(0.15, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + delay + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + 0.4);
    });
  }

  // ========== BACKGROUND MUSIC (Procedural) ==========

  private musicOscillators: OscillatorNode[] = [];

  /** Start ambient background music */
  startMusic(zone: number) {
    if (!this.ctx || !this.musicGain) return;
    this.stopMusic();

    // Different base frequencies per zone
    const baseFreqs = [
      [130.81, 164.81, 196.00], // Zone 1: C3, E3, G3 - calm
      [146.83, 174.61, 220.00], // Zone 2: D3, F3, A3 - slightly tense
      [110.00, 138.59, 164.81], // Zone 3: A2, C#3, E3 - ominous
      [98.00, 123.47, 146.83],  // Zone 4: G2, B2, D3 - dark
      [82.41, 103.83, 123.47],  // Zone 5: E2, G#2, B2 - intense
    ][Math.min(zone - 1, 4)];

    baseFreqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const lfo = this.ctx!.createOscillator();
      const lfoGain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      lfo.type = 'sine';
      lfo.frequency.value = 0.3 + Math.random() * 0.2;
      lfoGain.gain.value = freq * 0.02;

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(this.musicGain!);

      osc.start();
      lfo.start();
      this.musicOscillators.push(osc, lfo);
    });
  }

  /** Stop background music */
  stopMusic() {
    this.musicOscillators.forEach((osc) => {
      try { osc.stop(); } catch (_) {}
    });
    this.musicOscillators = [];
  }
}

// Singleton export
export const AudioManager = new AudioSystem({
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.3,
  screenShake: true,
  showMinimap: true,
  showDamageNumbers: true,
  canvasScale: 1,
});

export default AudioManager;
