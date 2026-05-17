// ============================================================
// Artifact.ts - Artifact system with random drops
// Artifacts provide passive bonuses during a run
// ============================================================

import { ArtifactDef, ArtifactRarity } from './types';

/** All artifact definitions */
export const ARTIFACTS: ArtifactDef[] = [
  // === COMMON ===
  {
    id: 'iron_shard',
    name: 'Iron Shard',
    description: 'Damage +10%',
    rarity: 'common',
    icon: '🗡️',
    effect: (engine: any) => { engine.player.damageMultiplier += 0.1; },
  },
  {
    id: 'herb_bundle',
    name: 'Herb Bundle',
    description: 'Heal 30 HP on pickup',
    rarity: 'common',
    icon: '🌿',
    effect: (engine: any) => {
      engine.player.hp = Math.min(engine.player.maxHp, engine.player.hp + 30);
    },
  },
  {
    id: 'swift_boots',
    name: 'Swift Boots',
    description: 'Move speed +10%',
    rarity: 'common',
    icon: '👢',
    effect: (engine: any) => { engine.player.speed *= 1.1; },
  },
  {
    id: 'potion_fairy',
    name: 'Potion Fairy',
    description: 'Max potions +1',
    rarity: 'common',
    icon: '🧚',
    effect: (engine: any) => {
      engine.player.maxPotions++;
      engine.player.potions++;
    },
  },
  {
    id: 'war_drums',
    name: 'War Drums',
    description: 'Rage gain +20%',
    rarity: 'common',
    icon: '🥁',
    effect: (engine: any) => { /* Tracked in damage calc */ },
  },

  // === RARE ===
  {
    id: 'blood_amulet',
    name: 'Blood Amulet',
    description: 'Lifesteal 5% of damage dealt',
    rarity: 'rare',
    icon: '🩸',
    effect: (engine: any) => { /* Handled in damage calc */ },
  },
  {
    id: 'thorn_armor',
    name: 'Thorn Armor',
    description: 'Reflect 15% damage to attackers',
    rarity: 'rare',
    icon: '🛡️',
    effect: (engine: any) => { /* Handled in damage calc */ },
  },
  {
    id: 'rage_crystal',
    name: 'Rage Crystal',
    description: 'Start each zone with full rage',
    rarity: 'rare',
    icon: '💎',
    effect: (engine: any) => { engine.player.rage = engine.player.maxRage; },
  },
  {
    id: 'stamina_vampire',
    name: 'Stamina Vampire',
    description: 'Gain 5 stamina on hit',
    rarity: 'rare',
    icon: '⚡',
    effect: (engine: any) => { /* Handled in damage calc */ },
  },
  {
    id: 'double_strike',
    name: 'Double Strike',
    description: '20% chance to hit twice',
    rarity: 'rare',
    icon: '⚔️',
    effect: (engine: any) => { /* Handled in damage calc */ },
  },

  // === EPIC ===
  {
    id: 'phoenix_feather',
    name: 'Phoenix Feather',
    description: 'Revive once with 50% HP on death',
    rarity: 'epic',
    icon: '🔥',
    effect: (engine: any) => { /* Handled in player death check */ },
  },
  {
    id: 'berserker_mark',
    name: 'Berserker Mark',
    description: 'Damage +50% when below 30% HP',
    rarity: 'epic',
    icon: '💀',
    effect: (engine: any) => { /* Handled in damage calc */ },
  },
  {
    id: 'chrono_shard',
    name: 'Chrono Shard',
    description: 'Dodge cooldown -50%',
    rarity: 'epic',
    icon: '⏳',
    effect: (engine: any) => { /* Handled in dodge calc */ },
  },
  {
    id: 'shadow_cloak',
    name: 'Shadow Cloak',
    description: '+2s invulnerability after hit',
    rarity: 'epic',
    icon: 'cloak',
    effect: (engine: any) => { /* Handled in damage calc */ },
  },

  // === LEGENDARY ===
  {
    id: 'excalibur',
    name: 'Excalibur',
    description: 'All damage doubled. Screen shakes harder.',
    rarity: 'legendary',
    icon: '⚔️',
    effect: (engine: any) => { engine.player.damageMultiplier *= 2; },
  },
  {
    id: 'immortal_heart',
    name: 'Immortal Heart',
    description: 'Max HP doubled, but move speed -20%',
    rarity: 'legendary',
    icon: '❤️',
    effect: (engine: any) => {
      engine.player.maxHp *= 2;
      engine.player.hp = engine.player.maxHp;
      engine.player.speed *= 0.8;
    },
  },
];

/** Get artifact by ID */
export function getArtifact(id: string): ArtifactDef | undefined {
  return ARTIFACTS.find(a => a.id === id);
}

/** Roll a random artifact based on rarity weights */
export function rollRandomArtifact(): ArtifactDef {
  const roll = Math.random();
  let pool: ArtifactRarity;
  if (roll < 0.50) pool = 'common';
  else if (roll < 0.80) pool = 'rare';
  else if (roll < 0.95) pool = 'epic';
  else pool = 'legendary';

  const filtered = ARTIFACTS.filter(a => a.rarity === pool);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/** Get rarity color for UI */
export function getRarityColor(rarity: ArtifactRarity): string {
  switch (rarity) {
    case 'common': return '#9ca3af'; // gray
    case 'rare': return '#3b82f6'; // blue
    case 'epic': return '#a855f7'; // purple
    case 'legendary': return '#f59e0b'; // amber/gold
  }
}

/** Get rarity display name */
export function getRarityName(rarity: ArtifactRarity): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}
