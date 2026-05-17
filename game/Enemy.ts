// ============================================================
// Enemy.ts - Base Enemy class + all enemy types
// Expanded: Archer, Brute, Mage, Ninja enemy types
// Fixed: Sprite caching, proper typing
// ============================================================

import { isSolid, TileType } from './CityGenerator';
import { Player } from './Player';
import { Sprite } from './Sprite';
import { EnemyType, EnemyState } from './types';

// ============================================================
// BASE ENEMY CLASS
// ============================================================
export class Enemy {
  x: number; y: number; radius: number = 20; speed: number = 1.8;
  hp: number = 80; maxHp: number = 80;
  angle: number = 0;
  knockback: number = 0; knockbackAngle: number = 0; flashTimer: number = 0;
  
  state: EnemyState = 'chase';
  attackCooldown: number = 100; lungeSpeed: number = 0; lungeDir: number = 0; hasLunged: boolean = false;
  isElite: boolean = false;
  isBoss: boolean = false;
  enemyType: EnemyType = 'lancer';

  // Unique ID for projectile tracking
  uid: number = Enemy._nextUid++;

  // Detection & leash range
  aggroRange: number = 400;
  deaggroRange: number = 600;

  // Sprites
  runSprite: Sprite;
  attackSprite: Sprite;
  currentSprite: Sprite;

  // Death animation
  isDying: boolean = false;
  deathTimer: number = 0;
  deathMaxFrames: number = 20;

  private static _nextUid: number = 0;

  constructor(x: number, y: number, type: EnemyType = 'lancer') {
    this.x = x; this.y = y;
    this.enemyType = type;
    
    // Default lancer sprites
    this.runSprite = new Sprite('/Lancer_Run.png', 320, 320, 6, 6);
    this.attackSprite = new Sprite('/Lancer_Attack.png', 320, 320, 3, 3);
    this.currentSprite = this.runSprite;
  }

  update(player: Player, map: TileType[][]) {
    // Death animation
    if (this.isDying) {
      this.deathTimer++;
      this.currentSprite.update();
      return;
    }

    if (this.flashTimer > 0) this.flashTimer--;
    let prevX = this.x, prevY = this.y;

    if (this.knockback > 0) {
      this.x += Math.cos(this.knockbackAngle) * this.knockback;
      this.y += Math.sin(this.knockbackAngle) * this.knockback;
      this.knockback *= 0.6; if (this.knockback < 0.5) this.knockback = 0;
    } else {
      this.updateAI(player, map);
    }

    // Collision Map
    if (isSolid(map, this.x - this.radius, this.y) || isSolid(map, this.x + this.radius, this.y) || 
        isSolid(map, this.x, this.y - this.radius) || isSolid(map, this.x, this.y + this.radius)) {
      this.x = prevX; this.y = prevY; this.angle += Math.PI / 2; 
    }

    // Sprite state machine
    if (this.state === 'attack' || this.state === 'prepare_attack' || this.state === 'cast') {
      this.currentSprite = this.attackSprite;
    } else {
      this.currentSprite = this.runSprite;
    }
    this.currentSprite.update();
  }

  /** Override in subtypes for different AI behavior */
  protected updateAI(player: Player, map: TileType[][]) {
    const distP = Math.hypot(player.x - this.x, player.y - this.y);

    // Deaggro if too far
    if (distP > this.deaggroRange && this.state !== 'idle') {
      this.state = 'idle';
      return;
    }

    if (this.state === 'idle') {
      if (distP < this.aggroRange) this.state = 'chase';
      return;
    }

    if (this.state === 'chase') {
      this.angle = Math.atan2(player.y - this.y, player.x - this.x);
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      if (distP < 90) { this.state = 'prepare_attack'; this.attackCooldown = 20; }
    } 
    else if (this.state === 'prepare_attack') {
      this.attackCooldown--;
      if (this.attackCooldown <= 0) { 
        this.state = 'attack'; this.lungeSpeed = 14; 
        this.lungeDir = Math.atan2(player.y - this.y, player.x - this.x); 
        this.hasLunged = false; 
      }
    } 
    else if (this.state === 'attack') {
      this.x += Math.cos(this.lungeDir) * this.lungeSpeed; 
      this.y += Math.sin(this.lungeDir) * this.lungeSpeed; 
      this.lungeSpeed *= 0.85;
      if (distP < player.radius + this.radius + 5 && !this.hasLunged) {
        this.hasLunged = true;
      }
      if (this.lungeSpeed < 1) { this.state = 'chase'; this.attackCooldown = 80; }
    }
  }

  /** Start death animation */
  startDeath() {
    this.isDying = true;
    this.deathTimer = 0;
  }

  /** Check if death animation is complete */
  get isDeathComplete(): boolean {
    return this.isDying && this.deathTimer >= this.deathMaxFrames;
  }

  draw(ctx: CanvasRenderingContext2D, player: { x: number; y: number }) {
    // Death animation: shrink and fade
    if (this.isDying) {
      const progress = this.deathTimer / this.deathMaxFrames;
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      const scale = 1 + progress * 0.3;
      const flipX = player.x < this.x;
      this.currentSprite.draw(ctx, this.x, this.y - progress * 20, flipX, scale);
      ctx.restore();
      return;
    }

    // Shadow
    ctx.save(); ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath(); ctx.ellipse(0, this.radius * 0.8, this.radius * 1.2, this.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const flipX = player.x < this.x;

    // Elite glow
    if (this.isElite) {
      ctx.shadowBlur = 20; 
      ctx.shadowColor = '#ff0000';
    }

    // Flash on hit
    if (this.flashTimer > 0) {
      ctx.filter = 'brightness(3)';
    } else if (this.isElite) {
      ctx.filter = 'hue-rotate(300deg) saturate(2) brightness(1.2)';
    }

    const scale = this.isBoss ? 1.3 : (this.isElite ? 1.1 : 1.0);
    this.currentSprite.draw(ctx, this.x, this.y, flipX, scale);

    // Reset filter
    ctx.filter = 'none';
    ctx.shadowBlur = 0;

    // Boss HP bar
    if (this.isBoss) {
      this.drawBossHpBar(ctx);
    }
    // Elite indicator
    else if (this.isElite) {
      this.drawEliteIndicator(ctx);
    }
  }

  protected drawBossHpBar(ctx: CanvasRenderingContext2D) {
    const barWidth = 60;
    const barHeight = 6;
    const yOffset = -this.radius - 20;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(this.x - barWidth/2, this.y + yOffset, barWidth, barHeight);
    
    const hpRatio = this.hp / this.maxHp;
    ctx.fillStyle = hpRatio > 0.3 ? '#dc2626' : '#ff0000';
    ctx.fillRect(this.x - barWidth/2, this.y + yOffset, barWidth * hpRatio, barHeight);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x - barWidth/2, this.y + yOffset, barWidth, barHeight);
    
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', this.x, this.y + yOffset - 5);
  }

  protected drawEliteIndicator(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('★', this.x, this.y - this.radius - 8);
  }
}

// ============================================================
// ARCHER ENEMY - Ranged, shoots arrows, keeps distance
// ============================================================
export class ArcherEnemy extends Enemy {
  shootCooldown: number = 0;
  shootCooldownMax: number = 90;
  preferredDistance: number = 250;

  constructor(x: number, y: number) {
    super(x, y, 'archer');
    this.speed = 1.5;
    this.hp = 60; this.maxHp = 60;
    this.radius = 16;
    this.aggroRange = 500;
    this.deaggroRange = 700;
  }

  protected updateAI(player: Player, map: TileType[][]) {
    const distP = Math.hypot(player.x - this.x, player.y - this.y);
    this.angle = Math.atan2(player.y - this.y, player.x - this.x);

    if (distP > this.deaggroRange) {
      this.state = 'idle';
      return;
    }

    // Keep distance - flee if too close
    if (distP < 100) {
      this.state = 'flee';
      this.x -= Math.cos(this.angle) * this.speed * 1.5;
      this.y -= Math.sin(this.angle) * this.speed * 1.5;
    }
    // Move to preferred distance
    else if (distP > this.preferredDistance + 50) {
      this.state = 'chase';
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
    }
    else {
      this.state = 'chase'; // Stay in position
    }

    // Shoot arrows
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (distP < this.aggroRange && this.shootCooldown <= 0) {
      this.state = 'prepare_attack';
      this.shootCooldown = this.shootCooldownMax;
    }
  }
}

// ============================================================
// BRUTE ENEMY - Slow, tanky, heavy slam attacks
// ============================================================
export class BruteEnemy extends Enemy {
  slamCooldown: number = 0;

  constructor(x: number, y: number) {
    super(x, y, 'brute');
    this.speed = 1.0;
    this.hp = 150; this.maxHp = 150;
    this.radius = 28;
    this.aggroRange = 300;
  }

  protected updateAI(player: Player, map: TileType[][]) {
    const distP = Math.hypot(player.x - this.x, player.y - this.y);

    if (this.state === 'chase') {
      this.angle = Math.atan2(player.y - this.y, player.x - this.x);
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      if (distP < 70) { 
        this.state = 'prepare_attack'; 
        this.attackCooldown = 40; // Slow wind-up
      }
    }
    else if (this.state === 'prepare_attack') {
      this.attackCooldown--;
      // Slowly face player during wind-up
      this.angle = Math.atan2(player.y - this.y, player.x - this.x);
      if (this.attackCooldown <= 0) {
        this.state = 'attack';
        this.lungeSpeed = 8;
        this.lungeDir = Math.atan2(player.y - this.y, player.x - this.x);
        this.hasLunged = false;
      }
    }
    else if (this.state === 'attack') {
      this.x += Math.cos(this.lungeDir) * this.lungeSpeed;
      this.y += Math.sin(this.lungeDir) * this.lungeSpeed;
      this.lungeSpeed *= 0.9;
      if (this.lungeSpeed < 0.5) {
        this.state = 'chase';
        this.attackCooldown = 120; // Long recovery
      }
    }
    else if (this.state === 'idle') {
      if (distP < this.aggroRange) this.state = 'chase';
    }
  }
}

// ============================================================
// MAGE ENEMY - Ranged magic attacks, teleports away when cornered
// ============================================================
export class MageEnemy extends Enemy {
  castCooldown: number = 0;
  castCooldownMax: number = 120;
  preferredDistance: number = 300;
  teleportCooldown: number = 0;

  constructor(x: number, y: number) {
    super(x, y, 'mage');
    this.speed = 1.2;
    this.hp = 50; this.maxHp = 50;
    this.radius = 16;
    this.aggroRange = 450;
    this.deaggroRange = 650;
  }

  protected updateAI(player: Player, map: TileType[][]) {
    const distP = Math.hypot(player.x - this.x, player.y - this.y);
    this.angle = Math.atan2(player.y - this.y, player.x - this.x);

    if (this.castCooldown > 0) this.castCooldown--;
    if (this.teleportCooldown > 0) this.teleportCooldown--;

    // Teleport away if player is too close
    if (distP < 80 && this.teleportCooldown <= 0) {
      const teleportAngle = this.angle + Math.PI + (Math.random() - 0.5) * Math.PI / 2;
      this.x += Math.cos(teleportAngle) * 200;
      this.y += Math.sin(teleportAngle) * 200;
      this.teleportCooldown = 180;
      return;
    }

    // Keep distance
    if (distP < this.preferredDistance - 50) {
      this.state = 'flee';
      this.x -= Math.cos(this.angle) * this.speed * 1.3;
      this.y -= Math.sin(this.angle) * this.speed * 1.3;
    }
    else if (distP > this.preferredDistance + 80) {
      this.state = 'chase';
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
    }

    // Cast spell
    if (distP < this.aggroRange && this.castCooldown <= 0) {
      this.state = 'cast';
      this.castCooldown = this.castCooldownMax;
    }
  }
}

// ============================================================
// NINJA ENEMY - Fast, dashes at player, leaves afterimage
// ============================================================
export class NinjaEnemy extends Enemy {
  dashCooldown: number = 0;
  isDashing: boolean = false;
  dashTimer: number = 0;
  dashSpeed: number = 20;
  dashDir: number = 0;

  constructor(x: number, y: number) {
    super(x, y, 'ninja');
    this.speed = 2.5;
    this.hp = 45; this.maxHp = 45;
    this.radius = 14;
    this.aggroRange = 500;
    this.deaggroRange = 600;
  }

  protected updateAI(player: Player, map: TileType[][]) {
    const distP = Math.hypot(player.x - this.x, player.y - this.y);
    this.angle = Math.atan2(player.y - this.y, player.x - this.x);

    if (this.dashCooldown > 0) this.dashCooldown--;

    if (this.isDashing) {
      this.dashTimer--;
      this.x += Math.cos(this.dashDir) * this.dashSpeed;
      this.y += Math.sin(this.dashDir) * this.dashSpeed;
      this.dashSpeed *= 0.9;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.state = 'chase';
        this.attackCooldown = 60;
      }
      return;
    }

    // Circle around player at medium range
    if (distP < 180) {
      // Too close, circle
      const circleAngle = this.angle + Math.PI / 2;
      this.x += Math.cos(circleAngle) * this.speed;
      this.y += Math.sin(circleAngle) * this.speed;
    } else if (distP < this.aggroRange) {
      this.state = 'chase';
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
    }

    // Dash attack
    if (distP < 200 && distP > 80 && this.dashCooldown <= 0) {
      this.isDashing = true;
      this.dashTimer = 8;
      this.dashSpeed = 18;
      this.dashDir = this.angle;
      this.hasLunged = false;
      this.dashCooldown = 100;
      this.state = 'attack';
    }
  }
}

// ============================================================
// ENEMY FACTORY - Create enemies by type
// ============================================================
export function createEnemy(type: EnemyType, x: number, y: number): Enemy {
  switch (type) {
    case 'archer': return new ArcherEnemy(x, y);
    case 'brute': return new BruteEnemy(x, y);
    case 'mage': return new MageEnemy(x, y);
    case 'ninja': return new NinjaEnemy(x, y);
    default: return new Enemy(x, y, 'lancer');
  }
}

/** Get weighted random enemy type based on zone */
export function getRandomEnemyType(zone: number): EnemyType {
  const types: { type: EnemyType; weight: number }[] = [
    { type: 'lancer', weight: 40 },
    { type: 'archer', weight: 20 + zone * 5 },
    { type: 'brute', weight: 10 + zone * 3 },
  ];

  // Unlock mage from zone 2+
  if (zone >= 2) types.push({ type: 'mage', weight: 10 + zone * 3 });
  // Unlock ninja from zone 3+
  if (zone >= 3) types.push({ type: 'ninja', weight: 10 + zone * 4 });

  const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * totalWeight;
  
  for (const t of types) {
    roll -= t.weight;
    if (roll <= 0) return t.type;
  }
  return 'lancer';
}
