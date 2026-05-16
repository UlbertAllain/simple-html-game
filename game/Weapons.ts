// src/game/Weapons.ts

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
}

export const WEAPONS: Weapon[] = [
  {
    name: "Greatsword", cooldown: 26, damage: 55, range: 75, arc: Math.PI / 1.5, 
    staminaCost: 15, swordLen: 35, swordWidth: 8, hitStopFrames: 7 // Hitstop diperlama, arc dilebarin
  },
  {
    name: "Spear", cooldown: 18, damage: 35, range: 130, arc: Math.PI / 8, 
    staminaCost: 12, swordLen: 55, swordWidth: 3, hitStopFrames: 3 // Range dilebihin
  },
  {
    name: "Daggers", cooldown: 8, damage: 18, range: 50, arc: Math.PI / 2.5, 
    staminaCost: 5, swordLen: 20, swordWidth: 2, hitStopFrames: 1 // Cooldown dipercepat, stamina dipermurah
  }
];