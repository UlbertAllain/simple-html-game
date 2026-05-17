// ============================================================
// SaveManager.ts - LocalStorage-based save/load system
// Handles meta-progression, settings, unlocks
// ============================================================

import { SaveData, GameSettings, PlayerClass, MetaProgression } from './types';

const SAVE_KEY = 'the_last_blue_save';
const SAVE_VERSION = 2;

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.3,
  screenShake: true,
  showMinimap: true,
  showDamageNumbers: true,
  canvasScale: 1,
};

const DEFAULT_META: MetaProgression = {
  bonusHp: 0,
  bonusDamage: 0,
  bonusSpeed: 0,
  bonusPotions: 0,
  unlockedArtifacts: [],
  prestige: 0,
};

function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    highScore: 0,
    maxZone: 0,
    totalKills: 0,
    totalRuns: 0,
    unlockedClasses: ['warrior'],
    artifacts: [],
    settings: { ...DEFAULT_SETTINGS },
    meta: { ...DEFAULT_META, unlockedArtifacts: [] },
  };
}

class SaveSystem {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  /** Load save from localStorage */
  private load(): SaveData {
    if (typeof window === 'undefined') return createDefaultSave();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return createDefaultSave();
      const parsed = JSON.parse(raw) as SaveData;
      // Version migration
      if (parsed.version < SAVE_VERSION) {
        return this.migrate(parsed);
      }
      return parsed;
    } catch {
      return createDefaultSave();
    }
  }

  /** Migrate old save data to new version */
  private migrate(old: any): SaveData {
    const def = createDefaultSave();
    return {
      ...def,
      ...old,
      version: SAVE_VERSION,
      settings: { ...def.settings, ...(old.settings || {}) },
      meta: { ...def.meta, ...(old.meta || {}) },
    };
  }

  /** Save current data to localStorage */
  save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  }

  /** Auto-save (debounced) */
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  autoSave(): void {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => this.save(), 2000);
  }

  // ========== Getters ==========

  get settings(): GameSettings {
    return this.data.settings;
  }

  get meta(): MetaProgression {
    return this.data.meta;
  }

  get highScore(): number {
    return this.data.highScore;
  }

  get maxZone(): number {
    return this.data.maxZone;
  }

  get totalKills(): number {
    return this.data.totalKills;
  }

  get totalRuns(): number {
    return this.data.totalRuns;
  }

  get unlockedClasses(): PlayerClass[] {
    return this.data.unlockedClasses;
  }

  get artifacts(): string[] {
    return this.data.artifacts;
  }

  // ========== Setters / Updaters ==========

  /** Record run completion */
  recordRun(zone: number, kills: number, score: number): void {
    this.data.totalRuns++;
    this.data.totalKills += kills;
    if (zone > this.data.maxZone) this.data.maxZone = zone;
    if (score > this.data.highScore) this.data.highScore = score;
    this.autoSave();
  }

  /** Update settings */
  updateSettings(settings: Partial<GameSettings>): void {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
  }

  /** Unlock a class */
  unlockClass(cls: PlayerClass): void {
    if (!this.data.unlockedClasses.includes(cls)) {
      this.data.unlockedClasses.push(cls);
      this.save();
    }
  }

  /** Check if class is unlocked */
  isClassUnlocked(cls: PlayerClass): boolean {
    return this.data.unlockedClasses.includes(cls);
  }

  /** Add meta-progression bonuses (on run end) */
  addMetaBonus(type: 'hp' | 'damage' | 'speed' | 'potions', amount: number): void {
    switch (type) {
      case 'hp': this.data.meta.bonusHp += amount; break;
      case 'damage': this.data.meta.bonusDamage += amount; break;
      case 'speed': this.data.meta.bonusSpeed += amount; break;
      case 'potions': this.data.meta.bonusPotions += amount; break;
    }
    this.autoSave();
  }

  /** Prestige (reset meta for bigger bonuses) */
  prestige(): void {
    this.data.meta.prestige++;
    this.data.meta.bonusHp = 0;
    this.data.meta.bonusDamage = 0;
    this.data.meta.bonusSpeed = 0;
    this.data.meta.bonusPotions = 0;
    this.data.meta.unlockedArtifacts = [];
    this.save();
  }

  /** Unlock an artifact for future runs */
  unlockArtifact(id: string): void {
    if (!this.data.meta.unlockedArtifacts.includes(id)) {
      this.data.meta.unlockedArtifacts.push(id);
      this.save();
    }
  }

  /** Add artifact found during run */
  addRunArtifact(id: string): void {
    if (!this.data.artifacts.includes(id)) {
      this.data.artifacts.push(id);
      this.autoSave();
    }
  }

  /** Clear run artifacts (new run) */
  clearRunArtifacts(): void {
    this.data.artifacts = [];
    this.autoSave();
  }

  /** Reset all save data */
  resetAll(): void {
    this.data = createDefaultSave();
    this.save();
  }
}

export const SaveManager = new SaveSystem();
export default SaveManager;
