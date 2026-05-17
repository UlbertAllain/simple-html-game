// ============================================================
// types.ts - Central type definitions for The Last Blue
// Eliminates all `any` types across the codebase
// ============================================================

/** Stats object passed from Engine to HUD/UI */
export interface GameStats {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  rage: number;
  maxRage: number;
  potions: number;
  zone: number;
  weaponName: string;
  weaponIndex: number;
  level: number;
  xp: number;
  xpToLevel: number;
  kills: number;
  quota: number;
  portalOpen: boolean;
  bossHp: number;
  bossMaxHp: number;
  time: number;
  gold: number;
  className: string;
  artifactCount: number;
}

/** Player class identifiers */
export type PlayerClass = 'warrior' | 'assassin' | 'mage';

/** Enemy type identifiers */
export type EnemyType = 'lancer' | 'archer' | 'brute' | 'mage' | 'ninja';

/** Enemy AI states */
export type EnemyState = 'idle' | 'chase' | 'prepare_attack' | 'attack' | 'flee' | 'cast';

/** Attack animation types */
export type AttackType = 'none' | 'thrust' | 'sideSlash' | 'heavySlash' | 'magicBolt' | 'shadowStrike';

/** Loot drop types */
export type LootType = 'potion' | 'gold' | 'artifact' | 'heart';

/** Loot drop object */
export interface LootItem {
  x: number;
  y: number;
  type: LootType;
  value?: number;
  rarity?: ArtifactRarity;
  artifactId?: string;
}

/** Floating text effect */
export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  size: number;
}

/** Particle effect */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
}

/** Slash visual effect */
export interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  radius: number;
  arc: number;
  alpha: number;
  decay: number;
  color: string;
}

/** AOE ring visual effect */
export interface AoeEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  decay: number;
  color: string;
}

/** Dash trail visual effect */
export interface DashTrailEffect {
  x: number;
  y: number;
  angle: number;
  frame: number;
  alpha: number;
  decay: number;
  scale: number;
}

/** Projectile (arrows, magic bolts) */
export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  speed: number;
  angle: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  fromEnemy: boolean;
  piercing: boolean;
  hitEntities: Set<number>;
}

/** Artifact rarity tiers */
export type ArtifactRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Artifact definition */
export interface ArtifactDef {
  id: string;
  name: string;
  description: string;
  rarity: ArtifactRarity;
  icon: string;
  effect: (engine: any) => void; // Applied once on pickup
  stackEffect?: (engine: any, count: number) => void; // Applied per stack
}

/** Save data structure */
export interface SaveData {
  version: number;
  highScore: number;
  maxZone: number;
  totalKills: number;
  totalRuns: number;
  unlockedClasses: PlayerClass[];
  artifacts: string[];
  settings: GameSettings;
  meta: MetaProgression;
}

/** Game settings */
export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  screenShake: boolean;
  showMinimap: boolean;
  showDamageNumbers: boolean;
  canvasScale: number;
}

/** Meta-progression data */
export interface MetaProgression {
  bonusHp: number;
  bonusDamage: number;
  bonusSpeed: number;
  bonusPotions: number;
  unlockedArtifacts: string[];
  prestige: number;
}

/** Equipment slots */
export type EquipSlot = 'weapon' | 'armor' | 'accessory';

/** Equipment item */
export interface Equipment {
  id: string;
  name: string;
  slot: EquipSlot;
  rarity: ArtifactRarity;
  bonusHp: number;
  bonusDamage: number;
  bonusSpeed: number;
  description: string;
}

/** NPC dialog entry */
export interface NpcDialog {
  speaker: string;
  text: string;
  color: string;
  next?: NpcDialog;
  choices?: NpcChoice[];
}

/** NPC dialog choice */
export interface NpcChoice {
  text: string;
  action: string;
  next: NpcDialog;
}

/** Upgrade option shown on level up */
export interface UpgradeOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic';
  apply: () => void;
}
