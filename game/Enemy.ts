// src/game/Enemy.ts
import { isSolid, TileType } from './CityGenerator';
import { Player } from './Player';
import { Sprite } from './Sprite';

// --- ENEMY TYPE DEFINITIONS ---
export type EnemyType = 'lancer' | 'archer' | 'brute' | 'ninja' | 'mage';

export interface EnemyConfig {
  type: EnemyType;
  baseHp: number;
  baseSpeed: number;
  radius: number;
  attackRange: number;
  aggroRange: number;
  attackCooldown: number;
  damage: number;
  chaseBehavior: 'direct' | 'circle' | 'rush' | 'kite' | 'teleport';
  isRanged: boolean;
  projectileSpeed?: number;
  color: string;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  lancer: {
    type: 'lancer', baseHp: 80, baseSpeed: 1.8, radius: 20,
    attackRange: 90, aggroRange: 400, attackCooldown: 80, damage: 20,
    chaseBehavior: 'direct', isRanged: false, color: '#ff4444'
  },
  archer: {
    type: 'archer', baseHp: 50, baseSpeed: 1.2, radius: 18,
    attackRange: 300, aggroRange: 450, attackCooldown: 100, damage: 15,
    chaseBehavior: 'kite', isRanged: true, projectileSpeed: 8, color: '#44ff44'
  },
  brute: {
    type: 'brute', baseHp: 200, baseSpeed: 1.0, radius: 28,
    attackRange: 70, aggroRange: 350, attackCooldown: 120, damage: 40,
    chaseBehavior: 'rush', isRanged: false, color: '#ff8800'
  },
  ninja: {
    type: 'ninja', baseHp: 45, baseSpeed: 3.2, radius: 16,
    attackRange: 55, aggroRange: 500, attackCooldown: 50, damage: 30,
    chaseBehavior: 'teleport', isRanged: false, color: '#aa44ff'
  },
  mage: {
    type: 'mage', baseHp: 60, baseSpeed: 1.0, radius: 19,
    attackRange: 350, aggroRange: 450, attackCooldown: 130, damage: 35,
    chaseBehavior: 'kite', isRanged: true, projectileSpeed: 5, color: '#ff44ff'
  }
};

// --- PROJECTILE ---
export interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  speed: number;
  damage: number;
  radius: number;
  angle: number;
  type: 'arrow' | 'fireball';
  lifetime: number;
  owner: Enemy;
  img: HTMLImageElement | null;
}

// Sprite cache biar gak load berulang kali
const spriteCache: Record<string, Sprite> = {};
function getSprite(path: string, fw: number, fh: number, fc: number, interval: number): Sprite {
  if (!spriteCache[path]) {
    spriteCache[path] = new Sprite(path, fw, fh, fc, interval);
  }
  return spriteCache[path];
}

// Cache for projectile images
const projectileImgCache: Record<string, HTMLImageElement> = {};

export class Enemy {
  x: number; y: number;
  radius: number;
  speed: number;
  hp: number; maxHp: number;
  angle: number = 0;
  knockback: number = 0; knockbackAngle: number = 0; flashTimer: number = 0;

  state: 'idle' | 'chase' | 'prepare_attack' | 'attack' | 'retreat' | 'stuck' = 'idle';
  attackCooldownTimer: number = 0;
  lungeSpeed: number = 0; lungeDir: number = 0; hasLunged: boolean = false;
  isElite: boolean = false;
  isBoss: boolean = false;

  enemyType: EnemyType;
  config: EnemyConfig;

  // AI Variables
  stuckTimer: number = 0;
  lastX: number = 0; lastY: number = 0;
  wanderAngle: number = 0;
  wanderTimer: number = 0;
  attackAnimTimer: number = 0;
  prepareTimer: number = 0;
  teleportCooldown: number = 0;
  teleportState: 'ready' | 'vanish' | 'appear' = 'ready';
  vanishTimer: number = 0;

  pendingProjectile: Projectile | null = null;

  runSprite: Sprite;
  attackSprite: Sprite;
  currentSprite: Sprite;

  constructor(x: number, y: number, type: EnemyType = 'lancer') {
    this.x = x; this.y = y;
    this.enemyType = type;
    this.config = { ...ENEMY_CONFIGS[type] };
    this.radius = this.config.radius;
    this.speed = this.config.baseSpeed;
    this.hp = this.config.baseHp;
    this.maxHp = this.config.baseHp;

    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    this.runSprite = getSprite(`/${typeName}_Run.png`, 320, 320, 4, 6);
    this.attackSprite = getSprite(`/${typeName}_Attack.png`, 320, 320, 3, 4);
    this.currentSprite = this.runSprite;
    this.attackCooldownTimer = Math.floor(Math.random() * 30) + 20;
    this.lastX = x; this.lastY = y;
  }

  update(player: Player, map: TileType[][]) {
    if (this.flashTimer > 0) this.flashTimer--;
    let prevX = this.x, prevY = this.y;

    // Knockback
    if (this.knockback > 0) {
      this.x += Math.cos(this.knockbackAngle) * this.knockback;
      this.y += Math.sin(this.knockbackAngle) * this.knockback;
      this.knockback *= 0.6;
      if (this.knockback < 0.5) this.knockback = 0;
      this.resolveCollision(map, prevX, prevY);
      this.updateSprite();
      return;
    }

    // Teleport state for Ninja
    if (this.teleportState === 'vanish') {
      this.vanishTimer--;
      if (this.vanishTimer <= 0) {
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = 60 + Math.random() * 40;
        this.x = player.x + Math.cos(offsetAngle) * offsetDist;
        this.y = player.y + Math.sin(offsetAngle) * offsetDist;
        this.teleportState = 'appear';
        this.vanishTimer = 8;
      }
      this.updateSprite();
      return;
    }
    if (this.teleportState === 'appear') {
      this.vanishTimer--;
      if (this.vanishTimer <= 0) {
        this.teleportState = 'ready';
        this.state = 'attack';
        this.lungeSpeed = 16;
        this.lungeDir = Math.atan2(player.y - this.y, player.x - this.x);
        this.hasLunged = false;
      }
      this.updateSprite();
      return;
    }

    const distP = Math.hypot(player.x - this.x, player.y - this.y);
    if (this.attackCooldownTimer > 0) this.attackCooldownTimer--;

    // Stuck detection
    const moved = Math.hypot(this.x - this.lastX, this.y - this.lastY);
    if (moved < 0.5 && this.state === 'chase') {
      this.stuckTimer++;
    } else {
      this.stuckTimer = 0;
    }
    this.lastX = this.x; this.lastY = this.y;

    // STATE MACHINE
    switch (this.state) {
      case 'idle':
        this.wanderTimer--;
        if (this.wanderTimer <= 0) {
          this.wanderAngle = Math.random() * Math.PI * 2;
          this.wanderTimer = 60 + Math.floor(Math.random() * 60);
        }
        this.x += Math.cos(this.wanderAngle) * this.speed * 0.3;
        this.y += Math.sin(this.wanderAngle) * this.speed * 0.3;
        if (distP < this.config.aggroRange) this.state = 'chase';
        break;

      case 'chase':
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);

        if (this.stuckTimer > 30) {
          this.wanderAngle = this.angle + (Math.random() - 0.5) * Math.PI;
          this.x += Math.cos(this.wanderAngle) * this.speed * 3;
          this.y += Math.sin(this.wanderAngle) * this.speed * 3;
          this.stuckTimer = 0;
          break;
        }

        switch (this.config.chaseBehavior) {
          case 'direct':
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            break;
          case 'kite':
            if (distP < 120) {
              this.x -= Math.cos(this.angle) * this.speed * 1.2;
              this.y -= Math.sin(this.angle) * this.speed * 1.2;
            } else if (distP > this.config.attackRange * 0.7) {
              this.x += Math.cos(this.angle) * this.speed;
              this.y += Math.sin(this.angle) * this.speed;
            } else {
              const strafeAngle = this.angle + Math.PI / 2;
              this.x += Math.cos(strafeAngle) * this.speed * 0.7;
              this.y += Math.sin(strafeAngle) * this.speed * 0.7;
            }
            break;
          case 'rush':
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            break;
          case 'teleport':
            if (distP > 250 && this.teleportCooldown <= 0) {
              this.teleportState = 'vanish';
              this.vanishTimer = 15;
              this.teleportCooldown = 180;
              break;
            }
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            break;
          case 'circle':
            const circAngle = this.angle + Math.PI / 3;
            this.x += Math.cos(circAngle) * this.speed;
            this.y += Math.sin(circAngle) * this.speed;
            break;
        }
        if (this.teleportCooldown > 0) this.teleportCooldown--;

        // Transisi ke attack
        if (this.config.isRanged) {
          if (distP < this.config.attackRange && this.attackCooldownTimer <= 0) {
            this.state = 'prepare_attack';
            this.prepareTimer = 20;
          }
        } else {
          if (distP < this.config.attackRange && this.attackCooldownTimer <= 0) {
            this.state = 'prepare_attack';
            this.prepareTimer = this.config.type === 'brute' ? 30 : 12;
          }
        }
        break;

      case 'prepare_attack':
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.prepareTimer--;
        if (this.config.type === 'brute') {
          this.x += Math.cos(this.angle) * this.speed * 0.3;
          this.y += Math.sin(this.angle) * this.speed * 0.3;
        }
        if (this.prepareTimer <= 0) {
          this.state = 'attack';
          if (this.config.isRanged) {
            this.spawnProjectile(player);
            this.attackAnimTimer = 15;
          } else {
            this.lungeSpeed = this.config.type === 'brute' ? 12 : 14;
            this.lungeDir = Math.atan2(player.y - this.y, player.x - this.x);
            this.hasLunged = false;
          }
        }
        break;

      case 'attack':
        if (this.config.isRanged) {
          this.attackAnimTimer--;
          if (this.attackAnimTimer <= 0) {
            this.state = 'chase';
            this.attackCooldownTimer = this.config.attackCooldown;
          }
        } else {
          this.x += Math.cos(this.lungeDir) * this.lungeSpeed;
          this.y += Math.sin(this.lungeDir) * this.lungeSpeed;
          this.lungeSpeed *= 0.85;
          const attackDist = Math.hypot(player.x - this.x, player.y - this.y);
          if (attackDist < player.radius + this.radius + 5 && !this.hasLunged) {
            this.hasLunged = true;
          }
          if (this.lungeSpeed < 1) {
            this.state = 'chase';
            this.attackCooldownTimer = this.config.attackCooldown;
          }
        }
        break;

      case 'retreat':
        const retreatAngle = Math.atan2(this.y - player.y, this.x - player.x);
        this.x += Math.cos(retreatAngle) * this.speed * 0.8;
        this.y += Math.sin(retreatAngle) * this.speed * 0.8;
        this.wanderTimer--;
        if (this.wanderTimer <= 0) this.state = 'chase';
        break;

      case 'stuck':
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.x += Math.cos(this.wanderAngle) * this.speed * 4;
        this.y += Math.sin(this.wanderAngle) * this.speed * 4;
        this.stuckTimer = 0;
        this.state = 'chase';
        break;
    }

    this.resolveCollision(map, prevX, prevY);
    this.x = Math.max(this.radius + 50, Math.min(this.x, 50 * 40 - this.radius - 50));
    this.y = Math.max(this.radius + 50, Math.min(this.y, 50 * 40 - this.radius - 50));
    this.updateSprite();
  }

  private resolveCollision(map: TileType[][], prevX: number, prevY: number) {
    const checks = [
      { dx: -this.radius, dy: 0 }, { dx: this.radius, dy: 0 },
      { dx: 0, dy: -this.radius }, { dx: 0, dy: this.radius },
      { dx: -this.radius * 0.7, dy: -this.radius * 0.7 },
      { dx: this.radius * 0.7, dy: -this.radius * 0.7 },
      { dx: -this.radius * 0.7, dy: this.radius * 0.7 },
      { dx: this.radius * 0.7, dy: this.radius * 0.7 },
    ];
    let collided = false;
    for (const check of checks) {
      if (isSolid(map, this.x + check.dx, this.y + check.dy)) { collided = true; break; }
    }
    if (collided) {
      let canSlideX = true, canSlideY = true;
      for (const check of checks) {
        if (isSolid(map, this.x + check.dx, prevY + check.dy)) canSlideX = false;
        if (isSolid(map, prevX + check.dx, this.y + check.dy)) canSlideY = false;
      }
      if (canSlideX) { this.y = prevY; }
      else if (canSlideY) { this.x = prevX; }
      else { this.x = prevX; this.y = prevY; }
    }
  }

  private spawnProjectile(player: Player) {
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const pType = this.config.type === 'mage' ? 'fireball' : 'arrow';
    const pSpeed = this.config.projectileSpeed || 6;
    let img: HTMLImageElement | null = null;
    if (!projectileImgCache[pType]) {
      img = new Image();
      img.src = pType === 'arrow' ? '/Arrow.png' : '/Fireball.png';
      projectileImgCache[pType] = img;
    } else {
      img = projectileImgCache[pType];
    }
    this.pendingProjectile = {
      x: this.x, y: this.y,
      vx: Math.cos(angle) * pSpeed, vy: Math.sin(angle) * pSpeed,
      speed: pSpeed, damage: this.config.damage,
      radius: pType === 'fireball' ? 10 : 6, angle: angle,
      type: pType, lifetime: 180, owner: this, img: img
    };
  }

  private updateSprite() {
    if (this.state === 'attack' || this.state === 'prepare_attack') {
      this.currentSprite = this.attackSprite;
    } else {
      this.currentSprite = this.runSprite;
    }
    this.currentSprite.update();
  }

  draw(ctx: CanvasRenderingContext2D, player: { x: number; y: number }) {
    if (this.teleportState === 'vanish') {
      ctx.globalAlpha = 0.2;
      ctx.filter = 'brightness(3) blur(4px)';
    }

    // Shadow
    ctx.save(); ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.8, this.radius * 1.2, this.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.restore();

    const flipX = player.x < this.x;
    if (this.isElite) { ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000'; }
    if (this.isBoss) { ctx.shadowBlur = 30; ctx.shadowColor = '#ff00ff'; }

    if (this.flashTimer > 0) { ctx.filter = 'brightness(3)'; }
    else if (this.isElite) { ctx.filter = 'hue-rotate(300deg) saturate(2) brightness(1.2)'; }
    else if (this.isBoss) { ctx.filter = 'hue-rotate(280deg) saturate(3) brightness(1.4)'; }

    const scale = this.isBoss ? 1.5 : (this.isElite ? 1.2 : 1.0);
    this.currentSprite.draw(ctx, this.x, this.y, flipX, scale);

    ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.globalAlpha = 1.0;

    // Boss HP Bar
    if (this.isBoss) {
      const barWidth = 60; const barHeight = 6; const yOffset = -this.radius - 20;
      ctx.fillStyle = '#000000';
      ctx.fillRect(this.x - barWidth / 2, this.y + yOffset, barWidth, barHeight);
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = hpRatio > 0.3 ? '#dc2626' : '#ff0000';
      ctx.fillRect(this.x - barWidth / 2, this.y + yOffset, barWidth * hpRatio, barHeight);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.strokeRect(this.x - barWidth / 2, this.y + yOffset, barWidth, barHeight);
      ctx.fillStyle = '#ff0000'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText('BOSS', this.x, this.y + yOffset - 5);
    }

    // Enemy type indicator dot
    if (!this.isBoss && !this.isElite) {
      ctx.fillStyle = this.config.color;
      ctx.beginPath(); ctx.arc(this.x, this.y - this.radius - 8, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Prepare attack warning circle
    if (this.state === 'prepare_attack') {
      ctx.save();
      ctx.strokeStyle = this.config.isRanged ? 'rgba(255,0,0,0.5)' : 'rgba(255,200,0,0.5)';
      ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(this.x, this.y, this.config.attackRange * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }
  }
}
