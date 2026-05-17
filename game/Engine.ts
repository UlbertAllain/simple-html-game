// ============================================================
// Engine.ts - Main game engine (REWRITTEN)
// Bug fixes: Removed duplicate portal check, proper types,
//            input cleanup, sprite caching, death animations
// New features: Audio, Save, Artifacts, Projectiles, Minimap,
//               Multiple enemy types, class skills, gold system
// ============================================================

import { Player } from './Player';
import { Enemy, ArcherEnemy, MageEnemy, createEnemy, getRandomEnemyType } from './Enemy';
import { generateCity, drawTile, MAP_COLS, MAP_ROWS, TileType, TILE_SIZE, WORLD_W, WORLD_H, isSolid } from './CityGenerator';
import { Input } from './input';
import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';
import { rollRandomArtifact, getArtifact, getRarityColor } from './Artifact';
import {
  Particle, SlashEffect, AoeEffect, LootItem, FloatingText,
  DashTrailEffect, Projectile, UpgradeOption, GameStats,
  PlayerClass, EnemyType, LootType
} from './types';

// Re-export types that components need
export type { UpgradeOption, GameStats } from './types';

// Dash cloud asset
let dashCloudImg: HTMLImageElement | null = null;

export class Engine {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
  animationId: number = 0; camera = { x: 0, y: 0 };
  hitStopFrames: number = 0; shakeIntensity: number = 0; shakeDuration: number = 0;
  isPaused: boolean = false;
  isUserPaused: boolean = false; // Pause by user (Escape key)

  portalOpen: boolean = false;
  enemiesKilled: number = 0;
  killQuota: number = 10;
  isEliteSpawned: boolean = false;
  gameTimer: number = 0;
  selectedClass: PlayerClass = 'warrior';
  
  player!: Player; map!: TileType[][]; enemies: Enemy[] = [];
  particles: Particle[] = []; slashEffects: SlashEffect[] = []; aoeEffects: AoeEffect[] = [];
  lootDrops: LootItem[] = []; floatingTexts: FloatingText[] = [];
  dashTrailEffects: DashTrailEffect[] = [];
  projectiles: Projectile[] = [];
  
  spawnTimer: number = 0; currentZone: number = 1;
  exitPortal = { x: 0, y: 0, radius: 30 };

  // Callbacks
  onStatsChange?: (stats: GameStats) => void;
  onLevelUp?: (options: UpgradeOption[]) => void;
  onGameOver?: () => void;   
  onGameWin?: () => void;
  onArtifactPickup?: (artifact: { name: string; description: string; rarity: string; icon: string }) => void;

  // Audio initialized flag
  private audioInitialized: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d')!;
    
    // Load dash cloud asset once
    if (!dashCloudImg) {
      dashCloudImg = new Image();
      dashCloudImg.src = '/dash_cloud.png';
    }
  }

  private getUpgradeOptions(): UpgradeOption[] {
    const base: UpgradeOption[] = [
      { id: 'hp', title: 'Vitality+', description: 'Max HP +30 & Heal', icon: '❤️', rarity: 'common',
        apply: () => { this.player.maxHp += 30; this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30); } },
      { id: 'speed', title: 'Swift Feet', description: 'Move Speed +15%', icon: '👢', rarity: 'common',
        apply: () => { this.player.speed *= 1.15; } },
      { id: 'damage', title: 'Brutality', description: 'Weapon Damage +20%', icon: '🗡️', rarity: 'common',
        apply: () => { this.player.damageMultiplier *= 1.2; } },
      { id: 'potion', title: 'Flask Capacity', description: 'Max Potions +1', icon: '🧪', rarity: 'common',
        apply: () => { this.player.maxPotions++; this.player.potions++; } },
      { id: 'stamina', title: 'Endurance', description: 'Stamina Regen +50%', icon: '⚡', rarity: 'common',
        apply: () => { this.player.staminaRegen *= 1.5; } },
      { id: 'rage_cap', title: 'Inner Fire', description: 'Max Rage +25', icon: '🔥', rarity: 'rare',
        apply: () => { this.player.maxRage += 25; } },
      { id: 'crit', title: 'Keen Edge', description: 'Crit Chance +10%', icon: '⚔️', rarity: 'rare',
        apply: () => { /* Tracked in damage calc */ } },
      { id: 'lifesteal', title: 'Vampiric Touch', description: 'Heal 3 HP per hit', icon: '🩸', rarity: 'rare',
        apply: () => { /* Tracked in damage calc */ } },
      { id: 'dodge_master', title: 'Shadow Step', description: 'Dodge Cooldown -40%', icon: '💨', rarity: 'epic',
        apply: () => { /* Tracked in dodge calc */ } },
      { id: 'armor_up', title: 'Iron Skin', description: 'Take 15% less damage', icon: '🛡️', rarity: 'epic',
        apply: () => { /* Tracked in damage calc */ } },
    ];
    return base;
  }

  initGame(resetStats: boolean = true, playerClass: PlayerClass = 'warrior') {
    this.selectedClass = playerClass;
    this.map = generateCity(this.currentZone);
    
    if (resetStats) {
      const meta = SaveManager.meta;
      this.player = new Player(3 * TILE_SIZE, (Math.floor(MAP_ROWS / 2)) * TILE_SIZE, playerClass);
      // Apply meta-progression bonuses
      this.player.maxHp += meta.bonusHp;
      this.player.hp = this.player.maxHp;
      this.player.damageMultiplier += meta.bonusDamage;
      this.player.speed += meta.bonusSpeed;
      this.player.maxPotions += meta.bonusPotions;
      this.player.potions = this.player.maxPotions;
      this.currentZone = 1;
      this.gameTimer = 0;
      this.enemiesKilled = 0;
      SaveManager.clearRunArtifacts();
    } else {
      this.player.x = 3 * TILE_SIZE;
      this.player.y = (Math.floor(MAP_ROWS / 2)) * TILE_SIZE;
      this.player.invulnerableTimer = 60;
    }
    
    this.enemies = []; this.lootDrops = []; this.aoeEffects = []; this.floatingTexts = [];
    this.projectiles = []; this.slashEffects = []; this.particles = [];
    this.exitPortal.x = (MAP_COLS - 3) * TILE_SIZE;
    this.exitPortal.y = (Math.floor(MAP_ROWS / 2)) * TILE_SIZE;
    
    // Reset portal state
    this.portalOpen = false;
    this.isEliteSpawned = false;
    this.killQuota = this.currentZone === 5 ? 15 : (8 + (this.currentZone * 2));

    if (!resetStats) {
      this.spawnFloatingText(
        this.player.x, this.player.y - 100, 
        `DISTRICT ${this.currentZone}`, 
        this.currentZone >= 4 ? "#ff4444" : "#ffff00", 40
      );
    }

    // Start zone music
    if (this.audioInitialized) {
      AudioManager.startMusic(this.currentZone);
    }
  }

  /** Initialize audio (must be called from user gesture) */
  initAudio() {
    if (this.audioInitialized) return;
    AudioManager.init();
    AudioManager.updateSettings(SaveManager.settings);
    AudioManager.startMusic(this.currentZone);
    this.audioInitialized = true;
  }

  start() { 
    this.stop();
    this.loop(); 
  }
  
  stop() { 
    if (this.animationId) {
      cancelAnimationFrame(this.animationId); 
    }
    AudioManager.stopMusic();
  }
  
  /** Full cleanup on unmount */
  destroy() {
    this.stop();
    Input.detach();
  }

  loop = () => { 
    this.update(); 
    this.draw(); 
    this.animationId = requestAnimationFrame(this.loop); 
  };

  spawnParticles(x: number, y: number, color: string, count: number, hasGravity: boolean = false) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2; const s = Math.random() * 6 + 2;
      this.particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s-(hasGravity?2:0), radius: Math.random()*3+1, color, alpha: 1, decay: Math.random()*0.03+0.02, gravity: hasGravity?0.15:0 });
    }
  }

  spawnFloatingText(x: number, y: number, text: string, color: string, size: number = 20) {
    this.floatingTexts.push({ x, y, text, color, alpha: 1.5, vy: -2, size });
  }

  triggerLevelUp() {
    this.isPaused = true;
    const allUpgrades = this.getUpgradeOptions(); 
    const shuffled = allUpgrades.sort(() => 0.5 - Math.random());
    this.onLevelUp?.(shuffled.slice(0, 3));
    AudioManager.playLevelUp();
  }

  selectUpgrade() { this.isPaused = false; }

  // ========== MAIN UPDATE ==========
  update() {
    if (!this.isPaused && this.player.isAlive) this.gameTimer++;
    
    // User pause toggle (Escape)
    if (Input.keys['escape']) {
      Input.keys['escape'] = false;
      this.isUserPaused = !this.isUserPaused;
      this.isPaused = this.isUserPaused;
    }
    
    if (!this.player.isAlive) { this.onGameOver?.(); AudioManager.playGameOver(); return; }
    if (this.isPaused || this.hitStopFrames > 0) { if(this.hitStopFrames > 0) this.hitStopFrames--; return; }

    const rect = this.canvas.getBoundingClientRect();
    Input.mouse.worldX = Input.mouse.x - rect.left + this.camera.x;
    Input.mouse.worldY = Input.mouse.y - rect.top + this.camera.y;

    this.player.update(this.map);

    // === POTION (E key) ===
    if (Input.keys['e']) {
      const healed = this.player.usePotion();
      if (healed > 0) {
        this.spawnFloatingText(this.player.x, this.player.y - 20, `+${healed}`, '#00ff00', 22);
        this.spawnParticles(this.player.x, this.player.y, '#00ff00', 15, true);
        AudioManager.playHeal();
      }
      Input.keys['e'] = false;
    }

    const wep = this.player.getWeapon();

    // === ATTACK LOGIC ===
    if (Input.mouse.down && this.player.attackCooldown <= 0 && this.player.stamina >= wep.staminaCost && !this.player.isDashing && !this.player.isZenitsuDashing && !this.player.isShadowStepping) {
      let animType: 'thrust' | 'sideSlash' | 'heavySlash' | 'magicBolt' | 'shadowStrike' = 'thrust';
      let slashColor = '#ffffff';
      
      if (this.player.className === 'mage') {
        animType = 'magicBolt';
        slashColor = '#a855f7';
      } else if (this.player.className === 'assassin') {
        animType = 'shadowStrike';
        slashColor = '#6366f1';
      } else if (wep.name === 'Daggers' || wep.name.includes('Blade') || wep.name.includes('Kunai') || wep.name.includes('Claw')) {
        animType = 'sideSlash';
        slashColor = '#aaccff';
      } else if (wep.name === 'Greatsword') {
        animType = 'heavySlash';
        slashColor = '#ffaa00';
      } else if (wep.name === 'Spear' || wep.name.includes('Staff')) {
        animType = 'thrust';
        slashColor = '#00ffcc';
      }

      this.player.startAttack(animType);
      this.player.attackCooldown = wep.cooldown; this.player.stamina -= wep.staminaCost;
      
      // Slash visual
      this.slashEffects.push({ 
        x: this.player.x, y: this.player.y, 
        angle: this.player.angle, 
        radius: wep.range,
        arc: wep.arc,
        alpha: wep.name === 'Greatsword' ? 2.0 : 1.5,
        decay: wep.name.includes('Dagger') || wep.name.includes('Blade') || wep.name.includes('Claw') ? 0.5 : 0.3,
        color: slashColor 
      });

      // Play weapon SFX
      if (animType === 'heavySlash') AudioManager.playHeavyHit();
      else if (animType === 'thrust') AudioManager.playStab();
      else if (animType === 'sideSlash' || animType === 'shadowStrike') AudioManager.playSlash(1000);
      else if (animType === 'magicBolt') AudioManager.playMagicCast();
      else AudioManager.playSlash();

      // Hit detection
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]; 
        if (e.isDying) continue;
        const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist < wep.range + e.radius) {
          let ae = Math.atan2(e.y - this.player.y, e.x - this.player.x); 
          let ad = Math.abs(this.player.angle - ae); if (ad > Math.PI) ad = (2 * Math.PI) - ad;
          if (ad < wep.arc / 2) {
            let finalDmg = Math.floor(wep.damage * this.player.damageMultiplier);
            
            // Crit chance (10% base)
            const isCrit = Math.random() < 0.1;
            if (isCrit) finalDmg = Math.floor(finalDmg * 1.5);

            // Berserker Mark artifact check
            if (this.player.hp < this.player.maxHp * 0.3 && this.player.collectedArtifacts.includes('berserker_mark')) {
              finalDmg = Math.floor(finalDmg * 1.5);
            }

            e.hp -= finalDmg; e.flashTimer = 6; 
            
            // Weapon-specific knockback & effects
            let kbForce = 18, shakeInt = 10, shakeDur = 8, particleCount = 10;
            let particleColor = '#8b0000';

            if (wep.name === 'Greatsword') { kbForce = 40; shakeInt = 18; shakeDur = 15; particleCount = 25; particleColor = '#ff6600'; }
            else if (wep.name === 'Spear' || wep.name.includes('Staff')) { kbForce = 25; shakeInt = 6; particleColor = '#00ffcc'; }
            else if (wep.name.includes('Dagger') || wep.name.includes('Blade') || wep.name.includes('Kunai') || wep.name.includes('Claw')) { kbForce = 8; shakeInt = 4; shakeDur = 4; particleCount = 5; particleColor = '#aaccff'; }
            else if (wep.name.includes('Wand') || wep.name.includes('Grimoire')) { kbForce = 15; shakeInt = 8; particleColor = '#a855f7'; }

            e.knockback = kbForce; 
            e.knockbackAngle = this.player.angle;
            
            this.hitStopFrames = wep.hitStopFrames; 
            this.shakeIntensity = shakeInt; this.shakeDuration = shakeDur;
            
            this.spawnParticles(e.x, e.y, particleColor, particleCount, true);
            const dmgColor = isCrit ? '#ffcc00' : '#ff4444';
            const dmgSize = isCrit ? 28 : 20;
            this.spawnFloatingText(e.x, e.y - 10, `${isCrit ? 'CRIT! ' : ''}-${finalDmg}`, dmgColor, dmgSize);
            
            // Lifesteal artifact
            if (this.player.collectedArtifacts.includes('blood_amulet')) {
              const healAmt = Math.max(1, Math.floor(finalDmg * 0.05));
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
            }

            // Stamina vampire artifact
            if (this.player.collectedArtifacts.includes('stamina_vampire')) {
              this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 5);
            }

            // Rage gain
            this.player.rage = Math.min(this.player.maxRage, this.player.rage + (wep.name.includes('Dagger') || wep.name.includes('Blade') ? 5 : 10));
            
            // Enemy death
            if (e.hp <= 0) {
              this.handleEnemyDeath(e, i);
            }
          }
        }
      }
    } else if (this.player.attackCooldown <= wep.cooldown / 2) { this.player.isAttacking = false; }

    // === SHOCKWAVE (RMB) ===
    if (Input.mouse.rightDown && this.player.rage >= 50) {
      this.player.rage -= 50; this.shakeIntensity = 15; this.shakeDuration = 15;
      this.spawnParticles(this.player.x, this.player.y, '#0088ff', 40, false);
      this.aoeEffects.push({ x: this.player.x, y: this.player.y, radius: 10, maxRadius: 150, alpha: 1, decay: 0.05, color: '#0088ff' });
      AudioManager.playShockwave();
      
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]; if (e.isDying) continue;
        const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist < 180) {
          e.hp -= 60; e.flashTimer = 6; e.knockback = 30; e.knockbackAngle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
          this.spawnParticles(e.x, e.y, '#0088ff', 8, true);
          this.spawnFloatingText(e.x, e.y - 10, `-60`, '#0088ff');
          if (e.hp <= 0) this.handleEnemyDeath(e, i);
        }
      }
      Input.mouse.rightDown = false;
    }

    // === ZENITSU DASH (Warrior Q) ===
    if (this.player.isZenitsuDashing) {
      this.handleZenitsuDash();
    }

    // === SHADOW STEP (Assassin Q) ===
    if (this.player.isShadowStepping) {
      this.handleShadowStep();
    }

    // === ARCANE BLAST (Mage Q) ===
    if (this.player.isArcaneBlasting) {
      this.handleArcaneBlast();
    }

    // === ENEMY AI & COMBAT ===
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(this.player, this.map);

      // Remove completed death animations
      if (e.isDeathComplete) {
        this.enemies.splice(i, 1);
        continue;
      }
      if (e.isDying) continue;

      // Enemy attack player
      const distP = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      
      // Melee attack (Lancer, Brute, Ninja dash)
      if (e.enemyType !== 'archer' && e.enemyType !== 'mage') {
        if (distP < this.player.radius + e.radius + 5 && e.state === 'attack' && !e.hasLunged) {
          let dmg = 20 + this.currentZone * 5;
          if (e.enemyType === 'brute') dmg *= 1.5; // Brute hits harder
          if (e.enemyType === 'ninja') dmg *= 0.8; // Ninja hits lighter but faster
          
          const dmgTaken = this.player.takeDamage(dmg);
          if (dmgTaken > 0) {
            this.spawnFloatingText(this.player.x, this.player.y - 20, `-${dmgTaken}`, '#ff0000', 24);
            this.shakeIntensity = 12; this.shakeDuration = 12;
            this.spawnParticles(this.player.x, this.player.y, '#ff0000', 10, true);
            AudioManager.playPlayerHurt();
          }
          e.hasLunged = true;
        }
      }

      // Archer shoots arrows
      if (e.enemyType === 'archer' && e instanceof ArcherEnemy && e.shootCooldown <= 0 && e.state === 'prepare_attack') {
        this.spawnProjectile(e.x, e.y, Math.atan2(this.player.y - e.y, this.player.x - e.x), 6, 15 + this.currentZone * 3, 5, '#ff6600', true);
        AudioManager.playArrowShot();
      }

      // Mage casts spells
      if (e.enemyType === 'mage' && e instanceof MageEnemy && e.castCooldown <= 0 && e.state === 'cast') {
        // Fire 3 bolts in a spread
        const baseAngle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
        for (let j = -1; j <= 1; j++) {
          this.spawnProjectile(e.x, e.y, baseAngle + j * 0.3, 4, 20 + this.currentZone * 4, 4, '#a855f7', true);
        }
        AudioManager.playMagicCast();
      }
    }

    // === PROJECTILE UPDATE ===
    this.updateProjectiles();

    // === LOOT PICKUP ===
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const loot = this.lootDrops[i];
      if (Math.hypot(this.player.x - loot.x, this.player.y - loot.y) < 30) {
        this.handleLootPickup(loot);
        this.lootDrops.splice(i, 1);
      }
      // Despawn old loot
      if (loot.type === 'gold') {
        // Gold fades after a while - not needed, but keep it clean
      }
    }

    // === PORTAL CHECK (FIXED: No duplicate) ===
    if (this.portalOpen && Math.hypot(this.player.x - this.exitPortal.x, this.player.y - this.exitPortal.y) < 40) {
      if (this.currentZone >= 5) { 
        this.isPaused = true; 
        this.onGameWin?.(); 
        AudioManager.playVictory();
        SaveManager.recordRun(this.currentZone, this.enemiesKilled, this.player.level * 100 + this.enemiesKilled * 10);
      } else { 
        this.currentZone++; 
        this.initGame(false); 
      }
    }

    // === ENEMY SPAWNING ===
    this.spawnTimer++; 
    if (this.spawnTimer >= 120 && this.enemies.filter(e => !e.isDying).length < 8 + this.currentZone * 3) {
      const a = Math.random() * Math.PI * 2; const d = 700;
      let ex = this.player.x + Math.cos(a) * d; let ey = this.player.y + Math.sin(a) * d;
      ex = Math.max(50, Math.min(WORLD_W - 50, ex)); ey = Math.max(50, Math.min(WORLD_H - 50, ey));
      if (!isSolid(this.map, ex, ey)) {
        const enemyType = getRandomEnemyType(this.currentZone);
        const enemy = createEnemy(enemyType, ex, ey);
        enemy.speed += this.currentZone * 0.2; 
        enemy.maxHp += this.currentZone * 30; 
        enemy.hp = enemy.maxHp;
        this.enemies.push(enemy);
      }
      this.spawnTimer = 0;
    }
    
    // === ELITE & BOSS LOGIC ===
    if (!this.portalOpen && this.enemiesKilled >= this.killQuota && !this.isEliteSpawned) {
      this.isEliteSpawned = true;
      const a = Math.random() * Math.PI * 2; const d = 500;
      let ex = this.player.x + Math.cos(a) * d; let ey = this.player.y + Math.sin(a) * d;
      ex = Math.max(50, Math.min(WORLD_W - 50, ex)); ey = Math.max(50, Math.min(WORLD_H - 50, ey));
      
      // Boss in District 5
      if (this.currentZone >= 5) {
        const enemy = createEnemy('brute', ex, ey); // Boss is a brute type
        enemy.isElite = true;
        enemy.isBoss = true;
        enemy.radius = 35;
        enemy.maxHp = 800 + (this.player.level * 50);
        enemy.hp = enemy.maxHp;
        enemy.speed = 1.8;
        
        this.spawnFloatingText(this.player.x, this.player.y - 80, "BOSS HAS AWAKENED!", "#ff00ff", 36);
        this.shakeIntensity = 25; this.shakeDuration = 40;
        AudioManager.playBossRoar();
        this.enemies.push(enemy);
      } else {
        // Elite enemy
        const eliteType: EnemyType = this.currentZone >= 3 ? 'ninja' : 'lancer';
        const enemy = createEnemy(eliteType, ex, ey);
        enemy.isElite = true;
        enemy.radius = 24;
        enemy.maxHp = 150 + (this.currentZone * 50);
        enemy.hp = enemy.maxHp;
        enemy.speed += this.currentZone * 0.2;
        
        this.spawnFloatingText(this.player.x, this.player.y - 50, "ELITE HAS APPEARED!", "#ff0000", 30);
        this.shakeIntensity = 15; this.shakeDuration = 30;
        AudioManager.playHeavyHit();
        this.enemies.push(enemy);
      }
    }

    // Check if elite is dead to open portal
    if (this.isEliteSpawned && !this.portalOpen) {
      const eliteAlive = this.enemies.some(e => e.isElite && !e.isDying);
      if (!eliteAlive) {
        this.portalOpen = true;
        this.spawnFloatingText(this.exitPortal.x, this.exitPortal.y - 40, "EXIT UNLOCKED!", "#ffff00", 28);
        AudioManager.playPortalOpen();
      }
    }

    // === UPDATE EFFECTS ===
    for (let i = this.particles.length - 1; i >= 0; i--) { 
      const p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.alpha -= p.decay; 
      if (p.alpha <= 0) this.particles.splice(i, 1); 
    }
    for (let i = this.slashEffects.length - 1; i >= 0; i--) { 
      this.slashEffects[i].alpha -= this.slashEffects[i].decay; 
      if (this.slashEffects[i].alpha <= 0) this.slashEffects.splice(i, 1); 
    }
    for (let i = this.aoeEffects.length - 1; i >= 0; i--) { 
      const a = this.aoeEffects[i]; a.radius += (a.maxRadius - a.radius) * 0.2; a.alpha -= a.decay; 
      if (a.alpha <= 0) this.aoeEffects.splice(i, 1); 
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) { 
      const t = this.floatingTexts[i]; t.y += t.vy; t.alpha -= 0.03; 
      if (t.alpha <= 0) this.floatingTexts.splice(i, 1); 
    }
    for (let i = this.dashTrailEffects.length - 1; i >= 0; i--) { 
      this.dashTrailEffects[i].alpha -= this.dashTrailEffects[i].decay; 
      if (this.dashTrailEffects[i].alpha <= 0) this.dashTrailEffects.splice(i, 1); 
    }
    
    if (this.shakeDuration > 0) this.shakeDuration--; else this.shakeIntensity = 0;

    // Camera
    this.camera.x = this.player.x - this.canvas.width / 2; 
    this.camera.y = this.player.y - this.canvas.height / 2;
    this.camera.x = Math.max(0, Math.min(WORLD_W - this.canvas.width, this.camera.x));
    this.camera.y = Math.max(0, Math.min(WORLD_H - this.canvas.height, this.camera.y));

    // Stats callback
    this.onStatsChange?.({ 
      hp: this.player.hp, maxHp: this.player.maxHp, 
      stamina: Math.floor(this.player.stamina), maxStamina: this.player.maxStamina,
      rage: Math.floor(this.player.rage), maxRage: this.player.maxRage,
      potions: this.player.potions, zone: this.currentZone,
      weaponName: this.player.getWeapon().name, weaponIndex: this.player.currentWeaponIndex,
      level: this.player.level, xp: this.player.xp, xpToLevel: this.player.xpToLevel,
      kills: this.enemiesKilled, quota: this.killQuota, portalOpen: this.portalOpen,
      bossHp: this.enemies.find(e => e.isBoss)?.hp ?? 0,
      bossMaxHp: this.enemies.find(e => e.isBoss)?.maxHp ?? 0,
      time: this.gameTimer,
      gold: this.player.gold,
      className: this.player.className,
      artifactCount: this.player.collectedArtifacts.length,
    });

    // Auto-save periodically
    SaveManager.autoSave();
  }

  // ========== HELPER METHODS ==========

  private handleEnemyDeath(e: Enemy, index: number) {
    e.startDeath();
    AudioManager.playEnemyDeath();

    if (e.isBoss) {
      this.spawnParticles(e.x, e.y, '#ff00ff', 60, true);
      this.spawnParticles(e.x, e.y, '#ffff00', 40, true);
      this.shakeIntensity = 30; this.shakeDuration = 40;
      this.spawnFloatingText(e.x, e.y - 20, "BOSS DEFEATED!", "#ffff00", 36);
    } else {
      this.spawnParticles(e.x, e.y, '#5a0000', 30, true);
    }

    this.player.rage = Math.min(this.player.maxRage, this.player.rage + 20);
    this.enemiesKilled++;

    // Loot drops
    const roll = Math.random();
    if (roll < 0.3) this.lootDrops.push({ x: e.x, y: e.y, type: 'potion' });
    if (roll < 0.4) this.lootDrops.push({ x: e.x + 15, y: e.y, type: 'gold', value: 5 + this.currentZone * 2 });
    if (e.isElite && roll < 0.5) this.lootDrops.push({ x: e.x - 15, y: e.y, type: 'artifact' });
    if (e.isBoss) {
      this.lootDrops.push({ x: e.x, y: e.y + 15, type: 'gold', value: 50 });
      this.lootDrops.push({ x: e.x - 20, y: e.y, type: 'artifact' });
      this.lootDrops.push({ x: e.x + 20, y: e.y, type: 'heart' });
    }
    // Rare heart drop
    if (Math.random() < 0.05) this.lootDrops.push({ x: e.x, y: e.y - 10, type: 'heart' });

    // XP
    const xpAmount = e.isBoss ? 100 : (e.isElite ? 50 : 25);
    if (this.player.addXp(xpAmount)) this.triggerLevelUp();
  }

  private handleLootPickup(loot: LootItem) {
    switch (loot.type) {
      case 'potion':
        this.player.potions = Math.min(this.player.maxPotions, this.player.potions + 1);
        this.spawnFloatingText(loot.x, loot.y - 10, '+Potion', '#00ff00', 16);
        break;
      case 'gold':
        const goldAmount = loot.value || 5;
        this.player.gold += goldAmount;
        this.spawnFloatingText(loot.x, loot.y - 10, `+${goldAmount}g`, '#ffd700', 18);
        break;
      case 'heart':
        const healAmt = 15;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
        this.spawnFloatingText(loot.x, loot.y - 10, `+${healAmt} HP`, '#ff6b6b', 16);
        break;
      case 'artifact': {
        const artifact = rollRandomArtifact();
        this.player.collectedArtifacts.push(artifact.id);
        SaveManager.addRunArtifact(artifact.id);
        artifact.effect(this);
        if (artifact.id === 'phoenix_feather') this.player.hasPhoenixFeather = true;
        this.spawnFloatingText(loot.x, loot.y - 10, `${artifact.name}!`, getRarityColor(artifact.rarity), 22);
        this.onArtifactPickup?.({
          name: artifact.name,
          description: artifact.description,
          rarity: artifact.rarity,
          icon: artifact.icon,
        });
        break;
      }
    }
    AudioManager.playPickup();
  }

  private handleZenitsuDash() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]; if (e.isDying) continue;
      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (dist < 50) { 
        let ae = Math.atan2(e.y - this.player.y, e.x - this.player.x); 
        let ad = Math.abs(this.player.zenitsuDashAngle - ae); if (ad > Math.PI) ad = (2 * Math.PI) - ad;
        if (ad < Math.PI / 3) {
          const finalDmg = Math.floor(80 * this.player.damageMultiplier);
          e.hp -= finalDmg; e.flashTimer = 10; e.knockback = 25; e.knockbackAngle = this.player.zenitsuDashAngle;
          this.spawnParticles(e.x, e.y, '#0088ff', 15, true);
          this.spawnFloatingText(e.x, e.y - 10, `-${finalDmg}`, '#00ccff', 28);
          this.hitStopFrames = 5; this.shakeIntensity = 8; this.shakeDuration = 10;
          if (e.hp <= 0) this.handleEnemyDeath(e, i);
        }
      }
    }
    // Spawn trail
    if (this.player.zenitsuDashTimer % 3 === 0) {
      this.dashTrailEffects.push({
        x: this.player.x + (Math.random()-0.5)*10,
        y: this.player.y + (Math.random()-0.5)*10,
        angle: this.player.zenitsuDashAngle + Math.PI,
        frame: Math.floor(Math.random() * 5),
        alpha: 1.2, decay: 0.06, scale: 1.5
      });
    }
  }

  private handleShadowStep() {
    // Assassin's shadow step - deals damage in a line like Zenitsu but faster
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]; if (e.isDying) continue;
      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (dist < 45) {
        let ae = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        let ad = Math.abs(this.player.shadowStepAngle - ae); if (ad > Math.PI) ad = (2 * Math.PI) - ad;
        if (ad < Math.PI / 3) {
          const finalDmg = Math.floor(60 * this.player.damageMultiplier);
          e.hp -= finalDmg; e.flashTimer = 8; e.knockback = 15; e.knockbackAngle = this.player.shadowStepAngle;
          this.spawnParticles(e.x, e.y, '#6366f1', 12, true);
          this.spawnFloatingText(e.x, e.y - 10, `-${finalDmg}`, '#818cf8', 24);
          this.hitStopFrames = 3; this.shakeIntensity = 5; this.shakeDuration = 6;
          if (e.hp <= 0) this.handleEnemyDeath(e, i);
        }
      }
    }
    // Shadow trail
    if (this.player.shadowStepTimer % 2 === 0) {
      this.particles.push({
        x: this.player.x, y: this.player.y,
        vx: 0, vy: 0, radius: this.player.radius,
        color: '#6366f1', alpha: 0.5, decay: 0.1, gravity: 0
      });
    }
  }

  private handleArcaneBlast() {
    this.player.arcaneBlastTimer--;
    // Periodic AOE damage around player
    if (this.player.arcaneBlastTimer % 5 === 0 && this.player.arcaneBlastTimer > 5) {
      const blastRadius = 120;
      this.spawnParticles(this.player.x, this.player.y, '#a855f7', 5, false);
      this.aoeEffects.push({ 
        x: this.player.x, y: this.player.y, 
        radius: 20, maxRadius: blastRadius, 
        alpha: 0.6, decay: 0.08, color: '#a855f7' 
      });
      
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]; if (e.isDying) continue;
        const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist < blastRadius) {
          const finalDmg = Math.floor(25 * this.player.damageMultiplier);
          e.hp -= finalDmg; e.flashTimer = 4;
          e.knockback = 10; e.knockbackAngle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
          this.spawnFloatingText(e.x, e.y - 10, `-${finalDmg}`, '#c084fc', 18);
          if (e.hp <= 0) this.handleEnemyDeath(e, i);
        }
      }
    }
    if (this.player.arcaneBlastTimer <= 0) {
      this.player.isArcaneBlasting = false;
    }
  }

  // ========== PROJECTILES ==========

  spawnProjectile(x: number, y: number, angle: number, speed: number, damage: number, radius: number, color: string, fromEnemy: boolean) {
    this.projectiles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage, radius, speed, angle, color,
      lifetime: 0, maxLifetime: 120,
      fromEnemy, piercing: false,
      hitEntities: new Set(),
    });
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx; p.y += p.vy;
      p.lifetime++;
      
      // Despawn if too old or off map
      if (p.lifetime > p.maxLifetime || p.x < 0 || p.x > WORLD_W || p.y < 0 || p.y > WORLD_H) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Hit solid tile
      if (isSolid(this.map, p.x, p.y)) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Hit logic
      if (p.fromEnemy) {
        // Enemy projectile hits player
        const distP = Math.hypot(this.player.x - p.x, this.player.y - p.y);
        if (distP < this.player.radius + p.radius) {
          const dmgTaken = this.player.takeDamage(p.damage);
          if (dmgTaken > 0) {
            this.spawnFloatingText(this.player.x, this.player.y - 20, `-${dmgTaken}`, '#ff0000', 22);
            this.shakeIntensity = 8; this.shakeDuration = 8;
            this.spawnParticles(this.player.x, this.player.y, p.color, 6, true);
            AudioManager.playPlayerHurt();
          }
          this.projectiles.splice(i, 1);
          continue;
        }
      }
    }
  }

  // ========== MINIMAP DATA ==========
  getMinimapData(): { playerX: number; playerY: number; enemies: { x: number; y: number; isElite: boolean }[]; portalX: number; portalY: number; portalOpen: boolean; mapCols: number; mapRows: number } {
    return {
      playerX: this.player.x / TILE_SIZE,
      playerY: this.player.y / TILE_SIZE,
      enemies: this.enemies.filter(e => !e.isDying).map(e => ({ x: e.x / TILE_SIZE, y: e.y / TILE_SIZE, isElite: e.isElite || e.isBoss })),
      portalX: this.exitPortal.x / TILE_SIZE,
      portalY: this.exitPortal.y / TILE_SIZE,
      portalOpen: this.portalOpen,
      mapCols: MAP_COLS,
      mapRows: MAP_ROWS,
    };
  }

  // ========== DRAW ==========
  draw() {
    const { ctx, canvas } = this; ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (this.shakeIntensity > 0) ctx.translate((Math.random()-0.5)*this.shakeIntensity*2, (Math.random()-0.5)*this.shakeIntensity*2);
    ctx.translate(-this.camera.x, -this.camera.y);

    // Draw tiles
    const startCol = Math.floor(this.camera.x / TILE_SIZE); const endCol = Math.ceil((this.camera.x + canvas.width) / TILE_SIZE);
    const startRow = Math.floor(this.camera.y / TILE_SIZE); const endRow = Math.ceil((this.camera.y + canvas.height) / TILE_SIZE);
    for (let y = startRow; y <= endRow && y < MAP_ROWS; y++) { 
      for (let x = startCol; x <= endCol && x < MAP_COLS; x++) { 
        if (x >= 0 && y >= 0) drawTile(ctx, x, y, this.map[y][x], this.map);
      } 
    }

    // Portal glow
    ctx.save();
    ctx.translate(this.exitPortal.x, this.exitPortal.y);
    if (this.portalOpen) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.15)'; ctx.shadowBlur = 60; ctx.shadowColor = '#ffff00';
    } else {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.05)'; ctx.shadowBlur = 20; ctx.shadowColor = '#666666';
    }
    ctx.fillRect(-25, -25, 50, 50);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Loot drops
    for (const l of this.lootDrops) {
      ctx.font = '16px Arial'; ctx.textAlign = 'center';
      switch (l.type) {
        case 'potion': ctx.fillText('🧪', l.x, l.y + 6); break;
        case 'gold': ctx.fillText('🪙', l.x, l.y + 6); break;
        case 'artifact': ctx.fillText('💎', l.x, l.y + 6); break;
        case 'heart': ctx.fillText('❤️', l.x, l.y + 6); break;
      }
    }

    // Slash effects
    for (const s of this.slashEffects) { 
      ctx.globalAlpha = Math.min(1, s.alpha); ctx.beginPath(); ctx.moveTo(s.x, s.y); 
      ctx.arc(s.x, s.y, s.radius + 15, s.angle - s.arc / 2, s.angle + s.arc / 2); 
      ctx.closePath(); ctx.fillStyle = `rgba(255,255,255,${s.alpha*0.3})`; ctx.fill(); 
      ctx.lineWidth = 6; ctx.strokeStyle = s.color; ctx.shadowBlur = 20; ctx.shadowColor = s.color; 
      ctx.stroke(); ctx.shadowBlur=0; 
    }
    ctx.globalAlpha = 1.0;

    // AOE effects
    for (const a of this.aoeEffects) { 
      ctx.beginPath(); ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2); 
      ctx.strokeStyle = `rgba(${a.color === '#a855f7' ? '168,85,247' : '0,150,255'},${a.alpha})`; 
      ctx.lineWidth = 8; ctx.shadowBlur = 20; ctx.shadowColor = a.color; ctx.stroke(); 
      ctx.fillStyle = `rgba(${a.color === '#a855f7' ? '168,85,247' : '0,100,255'},${a.alpha*0.2})`; 
      ctx.fill(); ctx.shadowBlur = 0; 
    }

    // Projectiles
    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10; ctx.shadowColor = p.color;
      
      if (p.fromEnemy && p.color === '#ff6600') {
        // Arrow shape
        ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(-5, -3); ctx.lineTo(-5, 3);
        ctx.closePath(); ctx.fill();
      } else {
        // Magic bolt
        ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Enemies
    for (const e of this.enemies) e.draw(ctx, this.player);
    
    // Player
    this.player.draw(ctx);

    // Zenitsu dash trail
    if (dashCloudImg && dashCloudImg.complete) {
      for (const trail of this.dashTrailEffects) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, trail.alpha);
        ctx.translate(trail.x, trail.y);
        ctx.rotate(trail.angle);
        const frameW = dashCloudImg.naturalWidth / 5;
        const srcX = trail.frame * frameW;
        ctx.shadowBlur = 15; ctx.shadowColor = '#00ccff';
        ctx.filter = 'hue-rotate(180deg) brightness(1.8)';
        ctx.drawImage(
          dashCloudImg, srcX, 0, frameW, dashCloudImg.naturalHeight,
          -frameW * trail.scale / 2, -dashCloudImg.naturalHeight * trail.scale / 2, 
          frameW * trail.scale, dashCloudImg.naturalHeight * trail.scale
        );
        ctx.filter = 'none'; ctx.shadowBlur = 0;
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1.0;

    // Floating texts
    for (const t of this.floatingTexts) {
      ctx.globalAlpha = Math.min(1, t.alpha);
      ctx.font = `bold ${t.size}px Arial`;
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 5; ctx.shadowColor = '#000';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;

    ctx.restore(); 

    // District atmosphere vignette
    let gradient;
    if (this.currentZone <= 2) {
      gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.5, canvas.width/2, canvas.height/2, canvas.width*0.8);
      gradient.addColorStop(0, 'rgba(0,0,0,0)'); 
      gradient.addColorStop(1, 'rgba(30, 58, 138, 0.3)');
    } 
    else if (this.currentZone === 3) {
      gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.4, canvas.width/2, canvas.height/2, canvas.width*0.8);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(146, 64, 14, 0.6)');
    }
    else if (this.currentZone === 4) {
      gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.3, canvas.width/2, canvas.height/2, canvas.width*0.8);
      gradient.addColorStop(0, 'rgba(10,10,30,0.2)');
      gradient.addColorStop(1, 'rgba(30, 10, 60, 0.8)');
    }
    else {
      gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.2, canvas.width/2, canvas.height/2, canvas.width*0.8);
      gradient.addColorStop(0, 'rgba(0,0,0,0.4)');
      gradient.addColorStop(1, 'rgba(127, 29, 29, 0.9)');
    }
    ctx.fillStyle = gradient; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw minimap overlay
    this.drawMinimap(ctx, canvas);
  }

  // ========== MINIMAP ==========
  private drawMinimap(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    if (!SaveManager.settings.showMinimap) return;

    const mapSize = 120;
    const padding = 10;
    const mx = canvas.width - mapSize - padding;
    const my = padding;
    const scaleX = mapSize / MAP_COLS;
    const scaleY = mapSize / MAP_ROWS;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(mx, my, mapSize, mapSize);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mapSize, mapSize);

    // Simple tile representation
    const step = 2; // Draw every 2nd tile for performance
    for (let y = 0; y < MAP_ROWS; y += step) {
      for (let x = 0; x < MAP_COLS; x += step) {
        const tile = this.map[y][x];
        if (tile === 9) ctx.fillStyle = '#4b5563'; // Wall
        else if (tile === 2 || tile === 8) ctx.fillStyle = '#92400e'; // Building
        else if (tile === 1) ctx.fillStyle = '#a16207'; // Road
        else if (tile === 10) ctx.fillStyle = '#22d3ee'; // Water
        else continue; // Skip grass
        ctx.fillRect(mx + x * scaleX, my + y * scaleY, scaleX * step, scaleY * step);
      }
    }

    // Portal
    if (this.portalOpen) {
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(mx + (this.exitPortal.x / TILE_SIZE) * scaleX - 2, my + (this.exitPortal.y / TILE_SIZE) * scaleY - 2, 4, 4);
    }

    // Enemies
    for (const e of this.enemies) {
      if (e.isDying) continue;
      ctx.fillStyle = e.isElite ? '#ff0000' : (e.isBoss ? '#ff00ff' : '#ef4444');
      ctx.fillRect(mx + (e.x / TILE_SIZE) * scaleX - 1, my + (e.y / TILE_SIZE) * scaleY - 1, 2, 2);
    }

    // Player
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(mx + (this.player.x / TILE_SIZE) * scaleX - 2, my + (this.player.y / TILE_SIZE) * scaleY - 2, 4, 4);

    // Zone label
    ctx.fillStyle = '#9ca3af';
    ctx.font = '8px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`D-${this.currentZone}`, mx + 4, my + mapSize - 4);
  }
}
