// ============================================================
// Player.ts - Player class with Warrior/Assassin/Mage variants
// Fixed: Type safety, sprite caching, class system
// ============================================================

import { Input } from './input';
import { isSolid, WORLD_W, WORLD_H, TileType } from './CityGenerator';
import { getWeaponsForClass, Weapon } from './Weapons';
import { Sprite } from './Sprite';
import { PlayerClass, AttackType } from './types';

export class Player {
  x: number; y: number; radius: number = 14; 
  baseSpeed: number = 4.5; speed: number = 4.5;
  hp: number = 100; maxHp: number = 100;
  stamina: number = 100; maxStamina: number = 100; staminaRegen: number = 0.8;
  rage: number = 0; maxRage: number = 100;
  potions: number = 3; maxPotions: number = 3; 
  currentWeaponIndex: number = 0;
  angle: number = 0; invulnerableTimer: number = 0;
  isAlive: boolean = true;
  className: PlayerClass = 'warrior';
  
  // Normal Dodge Roll
  isDashing: boolean = false; dashTimer: number = 0; dashSpeed: number = 18; dashDuration: number = 7; dashCooldown: number = 0;
  
  // Basic Attack
  isAttacking: boolean = false; attackCooldown: number = 0;
  attackType: AttackType = 'none';
  attackFrame: number = 0; attackMaxFrames: number = 10;
  
  // === SKILL: ZENITSU DASH (Warrior) ===
  isZenitsuDashing: boolean = false;
  zenitsuDashTimer: number = 0;
  zenitsuDashMaxFrames: number = 12;
  zenitsuDashSpeed: number = 30;
  zenitsuDashAngle: number = 0;
  zenitsuDashCost: number = 30;
  
  // === SKILL: SHADOW STEP (Assassin) ===
  isShadowStepping: boolean = false;
  shadowStepTimer: number = 0;
  shadowStepMaxFrames: number = 6;
  shadowStepSpeed: number = 35;
  shadowStepAngle: number = 0;
  shadowStepCost: number = 20;

  // === SKILL: ARCANE BLAST (Mage) ===
  isArcaneBlasting: boolean = false;
  arcaneBlastTimer: number = 0;
  arcaneBlastMaxFrames: number = 20;
  arcaneBlastCost: number = 40;
  
  xp: number = 0; xpToLevel: number = 50; level: number = 1;
  damageMultiplier: number = 1;
  rageGainMultiplier: number = 1;
  gold: number = 0;
  
  // Artifacts collected this run
  collectedArtifacts: string[] = [];

  // SPRITE ASSETS
  idleSprite: Sprite;
  runSprite: Sprite;
  attackSprite: Sprite;
  currentSprite: Sprite;

  // Phoenix feather revive
  hasPhoenixFeather: boolean = false;

  constructor(x: number, y: number, playerClass: PlayerClass = 'warrior') { 
    this.x = x; this.y = y;
    this.className = playerClass;
    
    // Apply class-specific stats
    this.applyClassStats(playerClass);
    
    // Load sprites based on class
    this.idleSprite = new Sprite('/Warrior_Idle.png', 192, 192, 8, 10); 
    this.runSprite = new Sprite('/hero_run.png', 192, 192, 6, 6);
    this.attackSprite = new Sprite('/hero_attack.png', 192, 192, 4, 5);
    this.currentSprite = this.idleSprite;
  }

  private applyClassStats(cls: PlayerClass) {
    switch (cls) {
      case 'warrior':
        this.baseSpeed = 4.5; this.speed = 4.5;
        this.hp = 100; this.maxHp = 100;
        this.maxStamina = 100; this.staminaRegen = 0.8;
        this.maxRage = 100;
        this.maxPotions = 3; this.potions = 3;
        this.radius = 14;
        break;
      case 'assassin':
        this.baseSpeed = 6.0; this.speed = 6.0;
        this.hp = 70; this.maxHp = 70;
        this.maxStamina = 120; this.staminaRegen = 1.2;
        this.maxRage = 80;
        this.maxPotions = 2; this.potions = 2;
        this.radius = 12;
        this.dashSpeed = 22;
        break;
      case 'mage':
        this.baseSpeed = 3.8; this.speed = 3.8;
        this.hp = 80; this.maxHp = 80;
        this.maxStamina = 80; this.staminaRegen = 0.6;
        this.maxRage = 120;
        this.maxPotions = 4; this.potions = 4;
        this.radius = 14;
        break;
    }
    this.stamina = this.maxStamina;
    this.rage = 0;
  }

  getWeapon(): Weapon { 
    return getWeaponsForClass(this.className)[this.currentWeaponIndex]; 
  }

  getWeapons(): Weapon[] {
    return getWeaponsForClass(this.className);
  }

  takeDamage(dmg: number): number {
    if (this.invulnerableTimer > 0 || this.isDashing || this.isZenitsuDashing || this.isShadowStepping || !this.isAlive) return 0;
    this.hp -= dmg; this.invulnerableTimer = 15;
    if (this.hp <= 0) {
      // Phoenix feather check
      if (this.hasPhoenixFeather) {
        this.hp = Math.floor(this.maxHp * 0.5);
        this.hasPhoenixFeather = false;
        this.invulnerableTimer = 60;
        return 0; // Revived, no damage shown
      }
      this.hp = 0; this.isAlive = false;
    }
    return dmg;
  }

  usePotion(): number {
    if (this.potions > 0 && this.hp < this.maxHp && this.isAlive) {
      this.potions--; const healAmount = Math.min(40, this.maxHp - this.hp);
      this.hp += healAmount; return healAmount;
    }
    return 0;
  }

  switchWeapon(index: number) {
    const weapons = this.getWeapons();
    if (index >= 0 && index < weapons.length && index !== this.currentWeaponIndex) {
      this.currentWeaponIndex = index; this.attackCooldown = 15; this.attackType = 'none';
    }
  }

  addXp(amount: number): boolean {
    this.xp += amount;
    if (this.xp >= this.xpToLevel) {
      this.xp -= this.xpToLevel; this.level++; this.xpToLevel = Math.floor(this.xpToLevel * 1.4);
      return true;
    }
    return false;
  }

  update(map: TileType[][]) {
    if (!this.isAlive) return;

    this.angle = Math.atan2(Input.mouse.worldY - this.y, Input.mouse.worldX - this.x);
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;

    if (this.isAttacking) {
      this.attackFrame++;
      if (this.attackFrame >= this.attackMaxFrames) {
        this.isAttacking = false; this.attackType = 'none'; this.attackFrame = 0;
      }
    }

    // ========== SKILL ACTIVATION ==========
    if (Input.keys['q'] && !this.isZenitsuDashing && !this.isShadowStepping && !this.isArcaneBlasting && !this.isDashing && !this.isAttacking) {
      switch (this.className) {
        case 'warrior':
          if (this.rage >= this.zenitsuDashCost) {
            this.isZenitsuDashing = true;
            this.zenitsuDashTimer = this.zenitsuDashMaxFrames;
            this.zenitsuDashAngle = this.angle;
            this.rage -= this.zenitsuDashCost;
            this.invulnerableTimer = this.zenitsuDashMaxFrames + 5;
          }
          break;
        case 'assassin':
          if (this.rage >= this.shadowStepCost) {
            this.isShadowStepping = true;
            this.shadowStepTimer = this.shadowStepMaxFrames;
            this.shadowStepAngle = this.angle;
            this.rage -= this.shadowStepCost;
            this.invulnerableTimer = this.shadowStepMaxFrames + 5;
          }
          break;
        case 'mage':
          if (this.rage >= this.arcaneBlastCost) {
            this.isArcaneBlasting = true;
            this.arcaneBlastTimer = this.arcaneBlastMaxFrames;
            this.rage -= this.arcaneBlastCost;
          }
          break;
      }
      Input.keys['q'] = false;
    }

    let moveX = 0, moveY = 0;
    if (Input.keys['a']) moveX -= 1; if (Input.keys['d']) moveX += 1;
    if (Input.keys['w']) moveY -= 1; if (Input.keys['s']) moveY += 1;
    
    // STATE MACHINE
    if (this.isZenitsuDashing || this.isShadowStepping) {
      this.currentSprite = this.attackSprite;
    } else if (this.isArcaneBlasting) {
      this.currentSprite = this.attackSprite;
    } else if (this.isAttacking) {
      this.currentSprite = this.attackSprite;
    } else if (moveX !== 0 || moveY !== 0) {
      this.currentSprite = this.runSprite;
    } else {
      this.currentSprite = this.idleSprite;
    }

    this.currentSprite.update();

    if (moveX !== 0 || moveY !== 0) { moveX *= 0.7071; moveY *= 0.7071; }

    let currentSpeed = this.speed;
    if (this.isAttacking && this.attackType === 'heavySlash' && this.attackFrame < 6) currentSpeed *= 0.3;

    // Normal Dodge Roll (Space)
    if (Input.keys['space'] && this.dashCooldown <= 0 && this.stamina >= 25 && (moveX !== 0 || moveY !== 0) && !this.isZenitsuDashing && !this.isShadowStepping) {
      this.isDashing = true; this.dashTimer = this.dashDuration; this.dashCooldown = 25; this.stamina -= 25;
    }

    let prevX = this.x, prevY = this.y;
    
    // ========== MOVEMENT EXECUTION ==========
    if (this.isZenitsuDashing) {
      this.zenitsuDashTimer--;
      this.x += Math.cos(this.zenitsuDashAngle) * this.zenitsuDashSpeed;
      this.y += Math.sin(this.zenitsuDashAngle) * this.zenitsuDashSpeed;
      if (this.zenitsuDashTimer <= 0) this.isZenitsuDashing = false;
      if (this.checkCollision(map)) {
        this.x = prevX; this.y = prevY; this.isZenitsuDashing = false;
      }
    } 
    else if (this.isShadowStepping) {
      this.shadowStepTimer--;
      this.x += Math.cos(this.shadowStepAngle) * this.shadowStepSpeed;
      this.y += Math.sin(this.shadowStepAngle) * this.shadowStepSpeed;
      if (this.shadowStepTimer <= 0) this.isShadowStepping = false;
      if (this.checkCollision(map)) {
        this.x = prevX; this.y = prevY; this.isShadowStepping = false;
      }
    }
    else if (this.isDashing) {
      this.dashTimer--; this.x += moveX * this.dashSpeed; this.y += moveY * this.dashSpeed;
      if (this.dashTimer <= 0) this.isDashing = false;
    } 
    else {
      this.x += moveX * currentSpeed; this.y += moveY * currentSpeed;
    }

    if (!this.isZenitsuDashing && !this.isShadowStepping && this.checkCollision(map)) { 
      this.x = prevX; this.y = prevY; 
    }
    
    this.x = Math.max(this.radius, Math.min(WORLD_W - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(WORLD_H - this.radius, this.y));
    if (this.dashCooldown > 0) this.dashCooldown--;

    if (!this.isDashing && !this.isZenitsuDashing && !this.isShadowStepping) 
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen);
    if (this.attackCooldown > 0) this.attackCooldown--;
    
    // Weapon switch (1-3)
    if (Input.keys['1']) this.switchWeapon(0);
    if (Input.keys['2']) this.switchWeapon(1);
    if (Input.keys['3']) this.switchWeapon(2);
  }

  startAttack(type: AttackType) {
    if (this.isAttacking || this.isZenitsuDashing || this.isShadowStepping) return;
    this.isAttacking = true; this.attackType = type; this.attackFrame = 0;
    this.attackSprite.currentFrame = 0; 
    
    if (type === 'thrust') this.attackMaxFrames = 10;
    else if (type === 'sideSlash') this.attackMaxFrames = 12;
    else if (type === 'heavySlash') this.attackMaxFrames = 18;
    else if (type === 'magicBolt') this.attackMaxFrames = 16;
    else if (type === 'shadowStrike') this.attackMaxFrames = 8;
  }

  private checkCollision(map: TileType[][]): boolean {
    return isSolid(map, this.x - this.radius, this.y) || isSolid(map, this.x + this.radius, this.y) ||
           isSolid(map, this.x, this.y - this.radius) || isSolid(map, this.x, this.y + this.radius);
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.invulnerableTimer > 0 && !this.isZenitsuDashing && !this.isShadowStepping && Math.floor(this.invulnerableTimer / 3) % 2 === 0) return;

    // Shadow
    ctx.save(); ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath(); ctx.ellipse(0, this.radius * 0.8, this.radius * 1.2, this.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const flipX = Input.mouse.worldX < this.x;

    // Class-specific visual effects
    if (this.isZenitsuDashing) {
      ctx.globalAlpha = 0.6;
      ctx.filter = 'brightness(2) hue-rotate(180deg)';
    }
    else if (this.isShadowStepping) {
      ctx.globalAlpha = 0.3;
      ctx.filter = 'brightness(0.5) saturate(0)';
    }
    else if (this.isArcaneBlasting) {
      ctx.filter = 'brightness(1.5) hue-rotate(90deg)';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#a855f7';
    }

    this.currentSprite.draw(ctx, this.x, this.y, flipX, 1.0);

    if (this.isZenitsuDashing || this.isShadowStepping) {
      ctx.globalAlpha = 1.0;
      ctx.filter = 'none';
    }
    else if (this.isArcaneBlasting) {
      ctx.filter = 'none';
      ctx.shadowBlur = 0;
    }
  }
}
