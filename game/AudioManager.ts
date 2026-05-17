// src/game/AudioManager.ts - Background music & SFX using Web Audio API

class AudioManagerClass {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMusicPlaying: boolean = false;
  private musicVolume: number = 0.3;
  private sfxVolume: number = 0.5;

  init() {
    if (this.audioContext) return;
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.musicGain = this.audioContext.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);
    this.sfxGain = this.audioContext.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);
  }

  playDistrictMusic(zone: number) {
    this.init();
    if (!this.audioContext || !this.musicGain) return;
    this.stopMusic();
    const ctx = this.audioContext;
    const moods: Record<number, { baseFreq: number; tempo: number; scale: number[]; padFreq: number[] }> = {
      1: { baseFreq: 220, tempo: 0.4, scale: [0, 2, 4, 5, 7, 9, 11], padFreq: [220, 277, 330] },
      2: { baseFreq: 196, tempo: 0.45, scale: [0, 2, 3, 5, 7, 8, 10], padFreq: [196, 233, 294] },
      3: { baseFreq: 185, tempo: 0.5, scale: [0, 1, 4, 5, 7, 8, 11], padFreq: [185, 220, 277] },
      4: { baseFreq: 165, tempo: 0.55, scale: [0, 2, 3, 5, 7, 8, 10], padFreq: [165, 196, 247] },
      5: { baseFreq: 147, tempo: 0.6, scale: [0, 1, 3, 5, 6, 8, 10], padFreq: [147, 175, 220] },
    };
    const mood = moods[zone] || moods[1];
    this.createPadLayer(ctx, mood, zone);
    this.createMelodicLayer(ctx, mood, zone);
    this.createRhythmLayer(ctx, mood, zone);
    this.isMusicPlaying = true;
  }

  private createPadLayer(ctx: AudioContext, mood: { padFreq: number[] }, zone: number) {
    if (!this.musicGain) return;
    const now = ctx.currentTime;
    mood.padFreq.forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = zone >= 4 ? 'sawtooth' : (zone >= 3 ? 'triangle' : 'sine');
      osc.frequency.value = freq;
      const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.2 + i * 0.1; lfoGain.gain.value = 3;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency); lfo.start(now);
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.08 / mood.padFreq.length, now + 2);
      osc.connect(gain); gain.connect(this.musicGain!); osc.start(now);
    });
  }

  private createMelodicLayer(ctx: AudioContext, mood: { baseFreq: number; tempo: number; scale: number[] }, zone: number) {
    if (!this.musicGain) return;
    const now = ctx.currentTime;
    const noteLength = 0.3 + (5 - zone) * 0.05;
    const notePattern = [0, 2, 4, 5, 7, 4, 2, 0, 3, 5, 7, 9, 7, 5, 3, 2];
    for (let i = 0; i < 32; i++) {
      const noteIndex = notePattern[i % notePattern.length] + Math.floor(i / 16) * 3;
      const scaleIndex = noteIndex % mood.scale.length;
      const octaveShift = noteIndex % 14 < 7 ? 1 : 0.5;
      const freq = mood.baseFreq * octaveShift * Math.pow(2, mood.scale[scaleIndex] / 12);
      const startTime = now + i * (mood.tempo + 0.1);
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = zone >= 4 ? 'square' : 'triangle'; osc.frequency.value = freq;
      filter.type = 'lowpass'; filter.frequency.value = zone >= 4 ? 800 : 1500; filter.Q.value = 2;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.04, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLength);
      osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain!);
      osc.start(startTime); osc.stop(startTime + noteLength + 0.1);
    }
    const totalDuration = 32 * (mood.tempo + 0.1);
    setTimeout(() => { if (this.isMusicPlaying) this.createMelodicLayer(ctx, mood, zone); }, totalDuration * 1000 - 500);
  }

  private createRhythmLayer(ctx: AudioContext, mood: { tempo: number }, zone: number) {
    if (!this.musicGain) return;
    const now = ctx.currentTime;
    const beatInterval = mood.tempo + 0.15;
    for (let i = 0; i < 16; i++) {
      const t = now + i * beatInterval;
      if (i % 4 === 0) {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
        gain.gain.setValueAtTime(zone >= 4 ? 0.12 : 0.06, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain); gain.connect(this.musicGain!); osc.start(t); osc.stop(t + 0.3);
      }
      if (i % 2 === 0) {
        const bufferSize = ctx.sampleRate * 0.05; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.1));
        const source = ctx.createBufferSource(); source.buffer = buffer;
        const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 6000;
        const gain = ctx.createGain(); gain.gain.setValueAtTime(zone >= 4 ? 0.04 : 0.02, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        source.connect(filter); filter.connect(gain); gain.connect(this.musicGain!); source.start(t);
      }
    }
    const totalDuration = 16 * beatInterval;
    setTimeout(() => { if (this.isMusicPlaying) this.createRhythmLayer(ctx, mood, zone); }, totalDuration * 1000 - 300);
  }

  stopMusic() { this.isMusicPlaying = false; }

  playSfx(type: 'hit' | 'slash' | 'dash' | 'portal' | 'levelup' | 'death' | 'arrow' | 'fireball' | 'boss_appear') {
    this.init();
    if (!this.audioContext || !this.sfxGain) return;
    const ctx = this.audioContext; const now = ctx.currentTime;
    switch (type) {
      case 'hit': {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain); gain.connect(this.sfxGain); osc.start(now); osc.stop(now + 0.2);
        break;
      }
      case 'slash': {
        const bufferSize = ctx.sampleRate * 0.1; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.05));
        const source = ctx.createBufferSource(); source.buffer = buffer;
        const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 3000;
        const gain = ctx.createGain(); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        source.connect(filter); filter.connect(gain); gain.connect(this.sfxGain); source.start(now);
        break;
      }
      case 'dash': {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain); gain.connect(this.sfxGain); osc.start(now); osc.stop(now + 0.25);
        break;
      }
      case 'portal': {
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.value = 440 + i * 220;
          gain.gain.setValueAtTime(0.08, now + i * 0.15); gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
          osc.connect(gain); gain.connect(this.sfxGain); osc.start(now + i * 0.15); osc.stop(now + i * 0.15 + 0.5);
        }
        break;
      }
      case 'levelup': {
        [523, 659, 784, 1047].forEach((freq, i) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'triangle'; osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.1, now + i * 0.1); gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
          osc.connect(gain); gain.connect(this.sfxGain); osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.4);
        });
        break;
      }
      case 'death': {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain); gain.connect(this.sfxGain); osc.start(now); osc.stop(now + 1);
        break;
      }
      case 'arrow': {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
        gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain); gain.connect(this.sfxGain); osc.start(now); osc.stop(now + 0.25);
        break;
      }
      case 'fireball': {
        const bufferSize = ctx.sampleRate * 0.3; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        const source = ctx.createBufferSource(); source.buffer = buffer;
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2000;
        const gain = ctx.createGain(); gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        source.connect(filter); filter.connect(gain); gain.connect(this.sfxGain); source.start(now);
        break;
      }
      case 'boss_appear': {
        const osc1 = ctx.createOscillator(); const gain1 = ctx.createGain();
        osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(50, now); osc1.frequency.linearRampToValueAtTime(30, now + 1.5);
        gain1.gain.setValueAtTime(0.2, now); gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc1.connect(gain1); gain1.connect(this.sfxGain); osc1.start(now); osc1.stop(now + 2);
        const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
        osc2.type = 'square'; osc2.frequency.setValueAtTime(100, now); osc2.frequency.exponentialRampToValueAtTime(600, now + 0.5);
        gain2.gain.setValueAtTime(0.05, now); gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc2.connect(gain2); gain2.connect(this.sfxGain); osc2.start(now); osc2.stop(now + 1);
        break;
      }
    }
  }
}

export const AudioManager = new AudioManagerClass();
