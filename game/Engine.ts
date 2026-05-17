// src/game/Engine.ts - REWRITTEN with all bug fixes
import { Player } from './Player';
import { Enemy, EnemyType, Projectile, ENEMY_CONFIGS } from './Enemy';
import { generateCity, drawTile, MAP_COLS, MAP_ROWS, TileType, TILE_SIZE, WORLD_W, WORLD_H, isSolid } from './CityGenerator';
import { Input } from './input';
import { AudioManager } from './AudioManager';

interface Particle { x: number; y: number; vx: number; vy: number; radius: number; color: string; alpha: number; decay: number; gravity: number; }
interface SlashEffect { x: number; y: number; angle: number; radius: number; arc: number; alpha: number; decay: number; color: string; }
interface AoeEffect { x: number; y: number; radius: number; maxRadius: number; alpha: number; decay: number; }
interface LootItem { x: number; y: number; type: 'potion' }
interface FloatingText { x: number; y: number; text: string; color: string; alpha: number; vy: number; size: number }
interface DashTrailEffect { x: number; y: number; angle: number; frame: number; alpha: number; decay: number; scale: number; }

let dashCloudImg: HTMLImageElement | null = null;

export interface UpgradeOption { id: string; title: string; description: string; apply: () => void; }

// Zone-specific enemy spawn pools
const ZONE_ENEMY_POOLS: Record<number, EnemyType[]> = {
  1: ['lancer', 'lancer', 'lancer', 'archer'],
  2: ['lancer', 'archer', 'archer', 'brute'],
  3: ['lancer', 'archer', 'brute', 'mage'],
  4: ['lancer', 'archer', 'brute', 'mage', 'ninja'],
  5: ['brute', 'brute', 'mage', 'ninja', 'ninja', 'archer']
};

export class Engine {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
  animationId: number = 0; camera = { x: 0, y: 0 };
  hitStopFrames: number = 0; shakeIntensity: number = 0; shakeDuration: number = 0;
  isPaused: boolean = false;
  portalOpen: boolean = false;
  enemiesKilled: number = 0;
  totalKills: number = 0; // Total kills across all districts
  killQuota: number = 10;
  isEliteSpawned: boolean = false;
  gameTimer: number = 0;
  lastMusicZone: number = 0;
  player!: Player; map!: TileType[][]; enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = []; slashEffects: SlashEffect[] = []; aoeEffects: AoeEffect[] = [];
  lootDrops: LootItem[] = []; floatingTexts: FloatingText[] = [];
  dashTrailEffects: DashTrailEffect[] = [];
  spawnTimer: number = 0; currentZone: number = 1;
  exitPortal = { x: 0, y: 0, radius: 30 };
  onStatsChange?: (stats: any) => void;
  onLevelUp?: (options: UpgradeOption[]) => void;
  onGameOver?: () => void;
  onGameWin?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d')!;
    if (!dashCloudImg) { dashCloudImg = new Image(); dashCloudImg.src = '/dash_cloud.png'; }
    this.initGame();
  }

  private getUpgradeOptions(): UpgradeOption[] {
    return [
      { id: 'hp', title: 'Vitality+', description: 'Max HP +30 & Heal', apply: () => { this.player.maxHp += 30; this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30); } },
      { id: 'speed', title: 'Swift Feet', description: 'Move Speed +15%', apply: () => { this.player.speed *= 1.15; } },
      { id: 'damage', title: 'Brutality', description: 'Weapon Damage +20%', apply: () => { this.player.damageMultiplier *= 1.2; } },
      { id: 'potion', title: 'Flask Capacity', description: 'Max Potions +1', apply: () => { this.player.maxPotions++; this.player.potions++; } },
      { id: 'stamina', title: 'Endurance', description: 'Stamina Regen +50%', apply: () => { this.player.staminaRegen *= 1.5; } },
      { id: 'rage', title: 'Inner Fire', description: 'Rage Gain +30%', apply: () => { this.player.rageGainMultiplier *= 1.3; } },
    ];
  }

  initGame(resetStats: boolean = true) {
    this.map = generateCity(this.currentZone);
    if (resetStats) {
      this.player = new Player(3 * TILE_SIZE, (Math.floor(MAP_ROWS / 2)) * TILE_SIZE);
      this.currentZone = 1;
      this.totalKills = 0;
    } else {
      this.player.x = 3 * TILE_SIZE;
      this.player.y = (Math.floor(MAP_ROWS / 2)) * TILE_SIZE;
      this.player.invulnerableTimer = 60;
    }
    this.enemies = []; this.lootDrops = []; this.aoeEffects = []; this.floatingTexts = [];
    this.projectiles = [];
    this.exitPortal.x = (MAP_COLS - 3) * TILE_SIZE;
    this.exitPortal.y = (Math.floor(MAP_ROWS / 2)) * TILE_SIZE;
    // BUG FIX #1: Reset kill count per district
    this.portalOpen = false;
    this.enemiesKilled = 0;
    this.isEliteSpawned = false;
    this.killQuota = this.currentZone === 5 ? 15 : (8 + (this.currentZone * 2));
    if (!resetStats) {
      this.spawnFloatingText(this.player.x, this.player.y - 100, `DISTRICT ${this.currentZone}`, this.currentZone >= 4 ? "#ff4444" : "#ffff00", 40);
      if (this.currentZone !== this.lastMusicZone) {
        AudioManager.playDistrictMusic(this.currentZone);
        this.lastMusicZone = this.currentZone;
      }
    } else {
      AudioManager.playDistrictMusic(1);
      this.lastMusicZone = 1;
    }
  }

  start() { this.stop(); this.loop(); }
  stop() { if (this.animationId) cancelAnimationFrame(this.animationId); AudioManager.stopMusic(); }
  loop = () => { this.update(); this.draw(); this.animationId = requestAnimationFrame(this.loop); };

  spawnParticles(x: number, y: number, color: string, count: number, hasGravity: boolean = false) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2; const s = Math.random() * 6 + 2;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (hasGravity ? 2 : 0), radius: Math.random() * 3 + 1, color, alpha: 1, decay: Math.random() * 0.03 + 0.02, gravity: hasGravity ? 0.15 : 0 });
    }
  }

  spawnFloatingText(x: number, y: number, text: string, color: string, size: number = 20) {
    this.floatingTexts.push({ x, y, text, color, alpha: 1.5, vy: -2, size });
  }

  triggerLevelUp() {
    this.isPaused = true;
    AudioManager.playSfx('levelup');
    const allUpgrades = this.getUpgradeOptions();
    const shuffled = allUpgrades.sort(() => 0.5 - Math.random());
    this.onLevelUp?.(shuffled.slice(0, 3));
  }

  selectUpgrade() { this.isPaused = false; }

  private getRandomEnemyType(): EnemyType {
    const pool = ZONE_ENEMY_POOLS[this.currentZone] || ZONE_ENEMY_POOLS[1];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  update() {
    if (!this.isPaused && this.player.isAlive) this.gameTimer++;
    if (!this.player.isAlive) { AudioManager.playSfx('death'); this.onGameOver?.(); return; }
    if (this.isPaused || this.hitStopFrames > 0) { if (this.hitStopFrames > 0) this.hitStopFrames--; return; }

    const rect = this.canvas.getBoundingClientRect();
    Input.mouse.worldX = Input.mouse.x - rect.left + this.camera.x;
    Input.mouse.worldY = Input.mouse.y - rect.top + this.camera.y;
    this.player.update(this.map);

    if (Input.keys['e']) {
      const healed = this.player.usePotion();
      if (healed > 0) { this.spawnFloatingText(this.player.x, this.player.y - 20, `+${healed}`, '#00ff00', 22); this.spawnParticles(this.player.x, this.player.y, '#00ff00', 15, true); }
      Input.keys['e'] = false;
    }

    const wep = this.player.getWeapon();

    // ATTACK
    if (Input.mouse.down && this.player.attackCooldown <= 0 && this.player.stamina >= wep.staminaCost && !this.player.isDashing && !this.player.isZenitsuDashing) {
      let animType: 'thrust' | 'sideSlash' | 'heavySlash' = 'thrust';
      let slashColor = '#ffffff';
      if (wep.name === 'Daggers') { animType = 'sideSlash'; slashColor = '#aaccff'; }
      else if (wep.name === 'Greatsword') { animType = 'heavySlash'; slashColor = '#ffaa00'; }
      else if (wep.name === 'Spear') { animType = 'thrust'; slashColor = '#00ffcc'; }

      this.player.startAttack(animType);
      this.player.attackCooldown = wep.cooldown; this.player.stamina -= wep.staminaCost;
      AudioManager.playSfx('slash');
      this.slashEffects.push({ x: this.player.x, y: this.player.y, angle: this.player.angle, radius: wep.range, arc: wep.arc, alpha: wep.name === 'Greatsword' ? 2.0 : 1.5, decay: wep.name === 'Daggers' ? 0.5 : 0.3, color: slashColor });

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]; const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist < wep.range + e.radius) {
          let ae = Math.atan2(e.y - this.player.y, e.x - this.player.x);
          let ad = Math.abs(this.player.angle - ae); if (ad > Math.PI) ad = (2 * Math.PI) - ad;
          if (ad < wep.arc / 2) {
            const finalDmg = Math.floor(wep.damage * this.player.damageMultiplier);
            e.hp -= finalDmg; e.flashTimer = 6;
            let kbForce = 18; let shakeInt = 10; let shakeDur = 8; let particleCount = 10; let particleColor = '#8b0000';
            if (wep.name === 'Greatsword') { kbForce = 40; shakeInt = 18; shakeDur = 15; particleCount = 25; particleColor = '#ff6600'; }
            else if (wep.name === 'Spear') { kbForce = 25; shakeInt = 6; particleColor = '#00ffcc'; }
            else if (wep.name === 'Daggers') { kbForce = 8; shakeInt = 4; shakeDur = 4; particleCount = 5; particleColor = '#aaccff'; }

            e.knockback = kbForce; e.knockbackAngle = this.player.angle;
            this.hitStopFrames = wep.hitStopFrames; this.shakeIntensity = shakeInt; this.shakeDuration = shakeDur;
            AudioManager.playSfx('hit');
            this.spawnParticles(e.x, e.y, particleColor, particleCount, true);
            this.spawnFloatingText(e.x, e.y - 10, `-${finalDmg}`, '#ff4444');
            this.player.rage = Math.min(this.player.maxRage, this.player.rage + (wep.name === 'Daggers' ? 5 : 10) * this.player.rageGainMultiplier);
            if (e.hp <= 0) this.handleEnemyDeath(e, i);
          }
        }
      }
    } else if (this.player.attackCooldown <= wep.cooldown / 2) { this.player.isAttacking = false; }

    // SHOCKWAVE
    if (Input.mouse.rightDown && this.player.rage >= 50) {
      this.player.rage -= 50; this.shakeIntensity = 15; this.shakeDuration = 15;
      this.spawnParticles(this.player.x, this.player.y, '#0088ff', 40, false);
      this.aoeEffects.push({ x: this.player.x, y: this.player.y, radius: 10, maxRadius: 150, alpha: 1, decay: 0.05 });
      AudioManager.playSfx('dash');
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]; const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist < 180) {
          e.hp -= 60; e.flashTimer = 6; e.knockback = 30; e.knockbackAngle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
          this.spawnParticles(e.x, e.y, '#0088ff', 8, true); this.spawnFloatingText(e.x, e.y - 10, `-60`, '#0088ff');
          if (e.hp <= 0) this.handleEnemyDeath(e, i);
        }
      }
      Input.mouse.rightDown = false;
    }

    // ZENITSU DASH
    if (this.player.isZenitsuDashing) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]; const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist < 50) {
          let ae = Math.atan2(e.y - this.player.y, e.x - this.player.x);
          let ad = Math.abs(this.player.zenitsuDashAngle - ae); if (ad > Math.PI) ad = (2 * Math.PI) - ad;
          if (ad < Math.PI / 3) {
            const finalDmg = Math.floor(80 * this.player.damageMultiplier);
            e.hp -= finalDmg; e.flashTimer = 10; e.knockback = 25; e.knockbackAngle = this.player.zenitsuDashAngle;
            this.spawnParticles(e.x, e.y, '#0088ff', 15, true); this.spawnFloatingText(e.x, e.y - 10, `-${finalDmg}`, '#00ccff', 28);
            this.hitStopFrames = 5; this.shakeIntensity = 8; this.shakeDuration = 10;
            if (e.hp <= 0) this.handleEnemyDeath(e, i);
          }
        }
      }
      if (this.player.zenitsuDashTimer % 3 === 0) {
        this.dashTrailEffects.push({ x: this.player.x + (Math.random() - 0.5) * 10, y: this.player.y + (Math.random() - 0.5) * 10, angle: this.player.zenitsuDashAngle + Math.PI, frame: Math.floor(Math.random() * 5), alpha: 1.2, decay: 0.06, scale: 1.5 });
      }
    }

    // ENEMY LOGIC
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(this.player, this.map);
      if (e.pendingProjectile) { this.projectiles.push(e.pendingProjectile); AudioManager.playSfx(e.pendingProjectile.type === 'fireball' ? 'fireball' : 'arrow'); e.pendingProjectile = null; }
      const distP = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      if (!e.config.isRanged && distP < this.player.radius + e.radius + 5 && e.state === 'attack' && !e.hasLunged) {
        const dmgTaken = this.player.takeDamage(e.config.damage + this.currentZone * 3);
        if (dmgTaken > 0) {
          this.spawnFloatingText(this.player.x, this.player.y - 20, `-${dmgTaken}`, '#ff0000', 24);
          this.shakeIntensity = 12; this.shakeDuration = 12;
          this.spawnParticles(this.player.x, this.player.y, '#ff0000', 10, true);
          AudioManager.playSfx('hit');
        }
        e.hasLunged = true;
      }
    }

    // PROJECTILE UPDATE
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx; p.y += p.vy; p.lifetime--;
      const distToPlayer = Math.hypot(this.player.x - p.x, this.player.y - p.y);
      if (distToPlayer < this.player.radius + p.radius) {
        const dmgTaken = this.player.takeDamage(p.damage);
        if (dmgTaken > 0) {
          this.spawnFloatingText(this.player.x, this.player.y - 20, `-${dmgTaken}`, p.type === 'fireball' ? '#ff44ff' : '#ff4444', 22);
          this.shakeIntensity = 6; this.shakeDuration = 8;
          this.spawnParticles(p.x, p.y, p.type === 'fireball' ? '#ff44ff' : '#ff4444', 8, true);
          AudioManager.playSfx('hit');
        }
        this.projectiles.splice(i, 1); continue;
      }
      if (isSolid(this.map, p.x, p.y)) { this.spawnParticles(p.x, p.y, p.type === 'fireball' ? '#ff44ff' : '#aaaaaa', 5, false); this.projectiles.splice(i, 1); continue; }
      if (p.lifetime <= 0) { this.projectiles.splice(i, 1); continue; }
    }

    // LOOT
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      if (Math.hypot(this.player.x - this.lootDrops[i].x, this.player.y - this.lootDrops[i].y) < 30) {
        if (this.lootDrops[i].type === 'potion') this.player.potions = Math.min(this.player.maxPotions, this.player.potions + 1);
        this.lootDrops.splice(i, 1);
      }
    }

    // BUG FIX: Portal check only when portal is open (removed duplicate)
    if (this.portalOpen && Math.hypot(this.player.x - this.exitPortal.x, this.player.y - this.exitPortal.y) < 40) {
      if (this.currentZone >= 5) { this.isPaused = true; AudioManager.playSfx('levelup'); this.onGameWin?.(); }
      else { AudioManager.playSfx('portal'); this.currentZone++; this.initGame(false); }
    }

    // ENEMY SPAWNING with zone-based pools
    this.spawnTimer++;
    const maxEnemies = 6 + this.currentZone * 2;
    if (this.spawnTimer >= 90 && this.enemies.length < maxEnemies && !this.portalOpen) {
      const a = Math.random() * Math.PI * 2; const d = 600 + Math.random() * 200;
      let ex = this.player.x + Math.cos(a) * d; let ey = this.player.y + Math.sin(a) * d;
      ex = Math.max(50, Math.min(WORLD_W - 50, ex)); ey = Math.max(50, Math.min(WORLD_H - 50, ey));
      if (!isSolid(this.map, ex, ey)) {
        const enemyType = this.getRandomEnemyType();
        const enemy = new Enemy(ex, ey, enemyType);
        const zoneMultiplier = 1 + (this.currentZone - 1) * 0.15;
        enemy.speed = enemy.config.baseSpeed * zoneMultiplier;
        enemy.maxHp = Math.floor(enemy.config.baseHp * (1 + (this.currentZone - 1) * 0.3));
        enemy.hp = enemy.maxHp;
        this.enemies.push(enemy);
      }
      this.spawnTimer = 0;
    }

    // ELITE & PORTAL
    if (!this.portalOpen && this.enemiesKilled >= this.killQuota && !this.isEliteSpawned) {
      this.isEliteSpawned = true;
      const a = Math.random() * Math.PI * 2; const d = 500;
      let ex = this.player.x + Math.cos(a) * d; let ey = this.player.y + Math.sin(a) * d;
      ex = Math.max(50, Math.min(WORLD_W - 50, ex)); ey = Math.max(50, Math.min(WORLD_H - 50, ey));
      const enemy = new Enemy(ex, ey, 'lancer');
      enemy.isElite = true;
      if (this.currentZone >= 5) {
        enemy.isBoss = true; enemy.radius = 35; enemy.maxHp = 800 + (this.player.level * 50); enemy.hp = enemy.maxHp; enemy.speed = 1.8;
        AudioManager.playSfx('boss_appear');
        this.spawnFloatingText(this.player.x, this.player.y - 80, "BOSS HAS AWAKENED!", "#ff00ff", 36);
        this.shakeIntensity = 25; this.shakeDuration = 40;
      } else {
        enemy.radius = 24; enemy.maxHp = 150 + (this.currentZone * 50); enemy.hp = enemy.maxHp; enemy.speed += this.currentZone * 0.2;
        this.spawnFloatingText(this.player.x, this.player.y - 50, "ELITE HAS APPEARED!", "#ff0000", 30);
        this.shakeIntensity = 15; this.shakeDuration = 30;
      }
      this.enemies.push(enemy);
    }
    if (this.isEliteSpawned && !this.portalOpen) {
      const eliteAlive = this.enemies.some(e => e.isElite);
      if (!eliteAlive) { this.portalOpen = true; AudioManager.playSfx('portal'); this.spawnFloatingText(this.exitPortal.x, this.exitPortal.y - 40, "EXIT UNLOCKED!", "#ffff00", 28); }
    }

    // UPDATE EFFECTS
    for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.alpha -= p.decay; if (p.alpha <= 0) this.particles.splice(i, 1); }
    for (let i = this.slashEffects.length - 1; i >= 0; i--) { this.slashEffects[i].alpha -= this.slashEffects[i].decay; if (this.slashEffects[i].alpha <= 0) this.slashEffects.splice(i, 1); }
    for (let i = this.aoeEffects.length - 1; i >= 0; i--) { const a = this.aoeEffects[i]; a.radius += (a.maxRadius - a.radius) * 0.2; a.alpha -= a.decay; if (a.alpha <= 0) this.aoeEffects.splice(i, 1); }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) { const t = this.floatingTexts[i]; t.y += t.vy; t.alpha -= 0.03; if (t.alpha <= 0) this.floatingTexts.splice(i, 1); }
    for (let i = this.dashTrailEffects.length - 1; i >= 0; i--) { const t = this.dashTrailEffects[i]; t.alpha -= t.decay; if (t.alpha <= 0) this.dashTrailEffects.splice(i, 1); }
    if (this.shakeDuration > 0) this.shakeDuration--; else this.shakeIntensity = 0;

    this.camera.x = this.player.x - this.canvas.width / 2; this.camera.y = this.player.y - this.canvas.height / 2;
    this.camera.x = Math.max(0, Math.min(WORLD_W - this.canvas.width, this.camera.x));
    this.camera.y = Math.max(0, Math.min(WORLD_H - this.canvas.height, this.camera.y));

    this.onStatsChange?.({
      hp: this.player.hp, maxHp: this.player.maxHp,
      stamina: Math.floor(this.player.stamina), maxStamina: this.player.maxStamina,
      rage: Math.floor(this.player.rage), maxRage: this.player.maxRage,
      potions: this.player.potions, zone: this.currentZone,
      weaponName: this.player.getWeapon().name, weaponIndex: this.player.currentWeaponIndex,
      level: this.player.level, xp: this.player.xp, xpToLevel: this.player.xpToLevel,
      kills: this.enemiesKilled, totalKills: this.totalKills, quota: this.killQuota, portalOpen: this.portalOpen,
      bossHp: this.enemies.find(e => e.isBoss)?.hp ?? 0,
      bossMaxHp: this.enemies.find(e => e.isBoss)?.maxHp ?? 0,
      time: this.gameTimer
    });
  }

  private handleEnemyDeath(e: Enemy, index: number) {
    if (e.isBoss) { this.spawnParticles(e.x, e.y, '#ff00ff', 60, true); this.spawnParticles(e.x, e.y, '#ffff00', 40, true); this.shakeIntensity = 30; this.shakeDuration = 40; this.spawnFloatingText(e.x, e.y - 20, "BOSS DEFEATED!", "#ffff00", 36); }
    else if (e.isElite) { this.spawnParticles(e.x, e.y, '#ff6600', 40, true); this.spawnFloatingText(e.x, e.y - 20, "ELITE SLAIN!", "#ff6600", 28); }
    else { this.spawnParticles(e.x, e.y, '#5a0000', 20, true); }
    this.player.rage += 20; this.enemiesKilled++; this.totalKills++;
    if (Math.random() < 0.3) this.lootDrops.push({ x: e.x, y: e.y, type: 'potion' });
    this.enemies.splice(index, 1);
    if (this.player.addXp(e.isBoss ? 100 : (e.isElite ? 50 : 25))) this.triggerLevelUp();
  }

  draw() {
    const { ctx, canvas } = this; ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (this.shakeIntensity > 0) ctx.translate((Math.random() - 0.5) * this.shakeIntensity * 2, (Math.random() - 0.5) * this.shakeIntensity * 2);
    ctx.translate(-this.camera.x, -this.camera.y);
    const startCol = Math.floor(this.camera.x / TILE_SIZE); const endCol = Math.ceil((this.camera.x + canvas.width) / TILE_SIZE);
    const startRow = Math.floor(this.camera.y / TILE_SIZE); const endRow = Math.ceil((this.camera.y + canvas.height) / TILE_SIZE);
    for (let y = startRow; y <= endRow && y < MAP_ROWS; y++) { for (let x = startCol; x <= endCol && x < MAP_COLS; x++) { if (x >= 0 && y >= 0) drawTile(ctx, x, y, this.map[y][x], this.map); } }
    ctx.save(); ctx.translate(this.exitPortal.x, this.exitPortal.y);
    ctx.fillStyle = 'rgba(255, 255, 0, 0.1)'; ctx.shadowBlur = 40; ctx.shadowColor = '#ffff00';
    ctx.fillRect(-25, -25, 50, 50); ctx.shadowBlur = 0; ctx.restore();
    for (const l of this.lootDrops) { ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.fillText('🧪', l.x, l.y + 8); }
    for (const s of this.slashEffects) { ctx.globalAlpha = s.alpha; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, s.radius + 15, s.angle - s.arc / 2, s.angle + s.arc / 2); ctx.closePath(); ctx.fillStyle = `rgba(255,255,255,${s.alpha * 0.3})`; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = s.color; ctx.shadowBlur = 20; ctx.shadowColor = s.color; ctx.stroke(); ctx.shadowBlur = 0; }
    ctx.globalAlpha = 1.0;
    for (const a of this.aoeEffects) { ctx.beginPath(); ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2); ctx.strokeStyle = `rgba(0,150,255,${a.alpha})`; ctx.lineWidth = 8; ctx.shadowBlur = 20; ctx.shadowColor = '#0088ff'; ctx.stroke(); ctx.fillStyle = `rgba(0,100,255,${a.alpha * 0.2})`; ctx.fill(); ctx.shadowBlur = 0; }
    for (const e of this.enemies) e.draw(ctx, this.player);
    this.player.draw(ctx);
    // Projectiles
    for (const p of this.projectiles) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      if (p.img && p.img.complete && p.img.naturalHeight !== 0) {
        const scale = p.type === 'fireball' ? 0.08 : 0.06;
        ctx.drawImage(p.img, -p.img.naturalWidth * scale / 2, -p.img.naturalHeight * scale / 2, p.img.naturalWidth * scale, p.img.naturalHeight * scale);
      } else {
        if (p.type === 'fireball') { ctx.fillStyle = '#ff44ff'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff44ff'; ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
        else { ctx.fillStyle = '#ccccaa'; ctx.fillRect(-8, -1, 16, 2); ctx.fillRect(5, -3, 3, 6); }
      }
      ctx.restore();
    }
    // Zenitsu trail
    if (dashCloudImg && dashCloudImg.complete) {
      for (const trail of this.dashTrailEffects) {
        ctx.save(); ctx.globalAlpha = Math.max(0, trail.alpha); ctx.translate(trail.x, trail.y); ctx.rotate(trail.angle);
        const frameW = dashCloudImg.naturalWidth / 5; const srcX = trail.frame * frameW;
        ctx.shadowBlur = 15; ctx.shadowColor = '#00ccff'; ctx.filter = 'hue-rotate(180deg) brightness(1.8)';
        ctx.drawImage(dashCloudImg, srcX, 0, frameW, dashCloudImg.naturalHeight, -frameW * trail.scale / 2, -dashCloudImg.naturalHeight * trail.scale / 2, frameW * trail.scale, dashCloudImg.naturalHeight * trail.scale);
        ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.restore();
      }
    }
    ctx.globalAlpha = 1.0;
    for (const t of this.floatingTexts) { ctx.globalAlpha = t.alpha; ctx.font = `bold ${t.size}px Arial`; ctx.fillStyle = t.color; ctx.textAlign = 'center'; ctx.shadowBlur = 5; ctx.shadowColor = '#000'; ctx.fillText(t.text, t.x, t.y); }
    ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;
    ctx.restore();
    // Vignette
    let gradient;
    if (this.currentZone <= 2) { gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.5, canvas.width / 2, canvas.height / 2, canvas.width * 0.8); gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(1, 'rgba(30, 58, 138, 0.3)'); }
    else if (this.currentZone === 3) { gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.4, canvas.width / 2, canvas.height / 2, canvas.width * 0.8); gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(1, 'rgba(146, 64, 14, 0.6)'); }
    else if (this.currentZone === 4) { gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.3, canvas.width / 2, canvas.height / 2, canvas.width * 0.8); gradient.addColorStop(0, 'rgba(10,10,30,0.2)'); gradient.addColorStop(1, 'rgba(30, 10, 60, 0.8)'); }
    else { gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.2, canvas.width / 2, canvas.height / 2, canvas.width * 0.8); gradient.addColorStop(0, 'rgba(0,0,0,0.4)'); gradient.addColorStop(1, 'rgba(127, 29, 29, 0.9)'); }
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
