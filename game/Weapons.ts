// ============================================================
// Weapons.ts - Weapon definitions and class-specific weapons
// Expanded: New weapons for Assassin and Mage classes
// ============================================================

export interface Weapon {
  name: string;
  cooldown: number;
  damage: number;
  range: number;
  arc: number;
  staminaCost: number;
  swordLen: number;
  swordWidth: number;
  hitStopFrames: number;
  description: string;
}

// ========== WARRIOR WEAPONS ==========
export const WARRIOR_WEAPONS: Weapon[] = [
  {
    name: "Greatsword", cooldown: 26, damage: 55, range: 75, arc: Math.PI / 1.5, 
    staminaCost: 15, swordLen: 35, swordWidth: 8, hitStopFrames: 7,
    description: "Slow, devastating slashes"
  },
  {
    name: "Spear", cooldown: 18, damage: 35, range: 130, arc: Math.PI / 8, 
    staminaCost: 12, swordLen: 55, swordWidth: 3, hitStopFrames: 3,
    description: "Long reach, precise thrusts"
  },
  {
    name: "Daggers", cooldown: 8, damage: 18, range: 50, arc: Math.PI / 2.5, 
    staminaCost: 5, swordLen: 20, swordWidth: 2, hitStopFrames: 1,
    description: "Fast strikes, low stamina cost"
  }
];

// ========== ASSASSIN WEAPONS ==========
export const ASSASSIN_WEAPONS: Weapon[] = [
  {
    name: "Twin Blades", cooldown: 6, damage: 14, range: 45, arc: Math.PI / 2, 
    staminaCost: 3, swordLen: 18, swordWidth: 2, hitStopFrames: 1,
    description: "Ultra-fast dual strikes"
  },
  {
    name: "Kunai", cooldown: 10, damage: 22, range: 70, arc: Math.PI / 4, 
    staminaCost: 6, swordLen: 25, swordWidth: 2, hitStopFrames: 2,
    description: "Balanced speed and precision"
  },
  {
    name: "Claw Gauntlets", cooldown: 5, damage: 10, range: 35, arc: Math.PI / 1.8, 
    staminaCost: 2, swordLen: 15, swordWidth: 2, hitStopFrames: 0,
    description: "Rapid slashes, minimal cost"
  }
];

// ========== MAGE WEAPONS ==========
export const MAGE_WEAPONS: Weapon[] = [
  {
    name: "Arcane Staff", cooldown: 22, damage: 45, range: 160, arc: Math.PI / 6, 
    staminaCost: 14, swordLen: 40, swordWidth: 4, hitStopFrames: 4,
    description: "Long-range magic bolts"
  },
  {
    name: "Crystal Wand", cooldown: 15, damage: 30, range: 120, arc: Math.PI / 3, 
    staminaCost: 10, swordLen: 30, swordWidth: 3, hitStopFrames: 2,
    description: "Balanced magic attacks"
  },
  {
    name: "Dark Grimoire", cooldown: 30, damage: 70, range: 100, arc: Math.PI / 2, 
    staminaCost: 20, swordLen: 35, swordWidth: 5, hitStopFrames: 6,
    description: "Devastating area magic"
  }
];

/** Get weapons array for a given class */
export function getWeaponsForClass(className: string): Weapon[] {
  switch (className) {
    case 'assassin': return ASSASSIN_WEAPONS;
    case 'mage': return MAGE_WEAPONS;
    default: return WARRIOR_WEAPONS;
  }
}

// Keep backward compatibility
export const WEAPONS = WARRIOR_WEAPONS;
