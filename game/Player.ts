// src/game/Player.ts
import { Input } from './input';
import { isSolid, WORLD_W, WORLD_H, TileType } from './CityGenerator';
import { WEAPONS, Weapon } from './Weapons';
import { Sprite } from './Sprite'; 

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
  
  // Normal Dodge Roll
  isDashing: boolean = false; dashTimer: number = 0; dashSpeed: number = 18; dashDuration: number = 7; dashCooldown: number = 0;
  
  // Basic Attack
  isAttacking: boolean = false; attackCooldown: number = 0;
  attackType: 'none' | 'thrust' | 'sideSlash' | 'heavySlash' = 'none';
  attackFrame: number = 0; attackMaxFrames: number = 10;
  
  // === SKILL: ZENITSU DASH ===
  isZenitsuDashing: boolean = false;
  zenitsuDashTimer: number = 0;
  zenitsuDashMaxFrames: number = 12; // Durasi dash dalam frame
  zenitsuDashSpeed: number = 30; // Sangat cepat!
  zenitsuDashAngle: number = 0; // Arah dash (dikunci pas mulai)
  zenitsuDashCost: number = 30; // Pake 30 Rage
  
  xp: number = 0; xpToLevel: number = 50; level: number = 1;
  damageMultiplier: number = 1;

  // SPRITE ASSETS
  idleSprite: Sprite = new Sprite('/Warrior_Idle.png', 192, 192, 8, 10); 
  runSprite: Sprite = new Sprite('/hero_run.png', 192, 192, 6, 6);
  attackSprite: Sprite = new Sprite('/hero_attack.png', 192, 192, 4, 5);
  
  currentSprite: Sprite; 

  constructor(x: number, y: number) { 
    this.x = x; this.y = y; 
    this.currentSprite = this.idleSprite;
  }

  getWeapon(): Weapon { return WEAPONS[this.currentWeaponIndex]; }

  takeDamage(dmg: number): number {
    // Kebs invincible kalau lagi dodge roll ATAU zenitsu dash
    if (this.invulnerableTimer > 0 || this.isDashing || this.isZenitsuDashing || !this.isAlive) return 0;
    this.hp -= dmg; this.invulnerableTimer = 15;
    if (this.hp <= 0) { this.hp = 0; this.isAlive = false; }
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
    if (index >= 0 && index < WEAPONS.length && index !== this.currentWeaponIndex) {
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

    // ========== SKILL ACTIVATION (ZENITSU DASH) ==========
    if (Input.keys['q'] && !this.isZenitsuDashing && !this.isDashing && this.rage >= this.zenitsuDashCost && !this.isAttacking) {
      this.isZenitsuDashing = true;
      this.zenitsuDashTimer = this.zenitsuDashMaxFrames;
      this.zenitsuDashAngle = this.angle; // Kunci arah lurus ke mouse
      this.rage -= this.zenitsuDashCost;
      this.invulnerableTimer = this.zenitsuDashMaxFrames + 5; // Invincible selama dash
      Input.keys['q'] = false; // Cegah spam
    }

    let moveX = 0, moveY = 0;
    if (Input.keys['a']) moveX -= 1; if (Input.keys['d']) moveX += 1;
    if (Input.keys['w']) moveY -= 1; if (Input.keys['s']) moveY += 1;
    
    // STATE MACHINE (Zenitsu > Attack > Run > Idle)
    if (this.isZenitsuDashing) {
      this.currentSprite = this.attackSprite; // Atau runSprite, terserah kamu
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
    if (Input.keys['space'] && this.dashCooldown <= 0 && this.stamina >= 25 && (moveX !== 0 || moveY !== 0) && !this.isZenitsuDashing) {
      this.isDashing = true; this.dashTimer = this.dashDuration; this.dashCooldown = 25; this.stamina -= 25;
    }

    let prevX = this.x, prevY = this.y;
    
    // ========== MOVEMENT EXECUTION ==========
    if (this.isZenitsuDashing) {
      // Zenitsu Dash: Gerak lurus paksa sesuai sudut yang dikunci
      this.zenitsuDashTimer--;
      this.x += Math.cos(this.zenitsuDashAngle) * this.zenitsuDashSpeed;
      this.y += Math.sin(this.zenitsuDashAngle) * this.zenitsuDashSpeed;
      
      if (this.zenitsuDashTimer <= 0) {
        this.isZenitsuDashing = false;
      }
      
      // Kalau nubruk tembok saat dash, langsung stop biar gak masuk dalem rumah
      if (this.checkCollision(map)) {
        this.x = prevX; this.y = prevY; 
        this.isZenitsuDashing = false; 
      }
    } 
    else if (this.isDashing) {
      this.dashTimer--; this.x += moveX * this.dashSpeed; this.y += moveY * this.dashSpeed;
      if (this.dashTimer <= 0) this.isDashing = false;
    } 
    else {
      this.x += moveX * currentSpeed; this.y += moveY * currentSpeed;
    }

    if (!this.isZenitsuDashing && this.checkCollision(map)) { 
      this.x = prevX; this.y = prevY; 
    }
    
    this.x = Math.max(this.radius, Math.min(WORLD_W - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(WORLD_H - this.radius, this.y));
    if (this.dashCooldown > 0) this.dashCooldown--;

    if (!this.isDashing && !this.isZenitsuDashing) this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen);
    if (this.attackCooldown > 0) this.attackCooldown--;
    
    if (Input.keys['1']) this.switchWeapon(0);
    if (Input.keys['2']) this.switchWeapon(1);
    if (Input.keys['3']) this.switchWeapon(2);
  }

  startAttack(type: 'thrust' | 'sideSlash' | 'heavySlash') {
    if (this.isAttacking || this.isZenitsuDashing) return; // Jangan bisa attack pas Zenitsu
    this.isAttacking = true; this.attackType = type; this.attackFrame = 0;
    this.attackSprite.currentFrame = 0; 
    
    if (type === 'thrust') this.attackMaxFrames = 10;
    else if (type === 'sideSlash') this.attackMaxFrames = 12;
    else if (type === 'heavySlash') this.attackMaxFrames = 18;
  }

  private checkCollision(map: TileType[][]): boolean {
    return isSolid(map, this.x - this.radius, this.y) || isSolid(map, this.x + this.radius, this.y) ||
           isSolid(map, this.x, this.y - this.radius) || isSolid(map, this.x, this.y + this.radius);
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.invulnerableTimer > 0 && !this.isZenitsuDashing && Math.floor(this.invulnerableTimer / 3) % 2 === 0) return;

    // 1. DRAW SHADOW
    ctx.save(); ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath(); ctx.ellipse(0, this.radius * 0.8, this.radius * 1.2, this.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const flipX = Input.mouse.worldX < this.x;

    // Kalau lagi Zenitsu Dash, buat efek afterimage (warna biru/putih kebaca)
    if (this.isZenitsuDashing) {
      ctx.globalAlpha = 0.6; // Agak transparan
      ctx.filter = 'brightness(2) hue-rotate(180deg)'; // Efek silau/biru
    }

    this.currentSprite.draw(ctx, this.x, this.y, flipX, 1.0); // Gue ubah scale ke 2.0 sesuai saran sebelumnya

    if (this.isZenitsuDashing) {
      ctx.globalAlpha = 1.0;
      ctx.filter = 'none';
    }
  }
}