// src/game/Engine.ts
import { Player } from './Player';
import { Enemy } from './Enemy';
import { generateCity, drawTile, MAP_COLS, MAP_ROWS, TileType, TILE_SIZE, WORLD_W, WORLD_H, isSolid } from './CityGenerator';
import { Input } from './input';

interface Particle { x: number; y: number; vx: number; vy: number; radius: number; color: string; alpha: number; decay: number; gravity: number; }
interface SlashEffect { x: number; y: number; angle: number; radius: number; arc: number; alpha: number; decay: number; color: string; }
interface AoeEffect { x: number; y: number; radius: number; maxRadius: number; alpha: number; decay: number; }
interface LootItem { x: number; y: number; type: 'potion' }
interface FloatingText { x: number; y: number; text: string; color: string; alpha: number; vy: number; size: number }
interface DashTrailEffect { 
  x: number; y: number; 
  angle: number; 
  frame: number; // Pakai frame ke berapa dari spritesheet (0-4)
  alpha: number; 
  decay: number; 
  scale: number;
}

// Tambahin ini di luar class, buat load assetnya
let dashCloudImg: HTMLImageElement | null = null;

export interface UpgradeOption { id: string; title: string; description: string; apply: () => void; }

export class Engine {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
  animationId: number = 0; camera = { x: 0, y: 0 };
  hitStopFrames: number = 0; shakeIntensity: number = 0; shakeDuration: number = 0;
  isPaused: boolean = false; 

  portalOpen: boolean = false;
  enemiesKilled: number = 0;
  killQuota: number = 10; // Bunuh 10 musuh buat buka portal
  isEliteSpawned: boolean = false;
  gameTimer: number = 0; // Taruh di bagian variabel atas
  
  player!: Player; map!: TileType[][]; enemies: Enemy[] = [];
  particles: Particle[] = []; slashEffects: SlashEffect[] = []; aoeEffects: AoeEffect[] = [];
  lootDrops: LootItem[] = []; floatingTexts: FloatingText[] = []; // ARRAY BARU
  dashTrailEffects: DashTrailEffect[] = [];
  
  spawnTimer: number = 0; currentZone: number = 1;
  exitPortal = { x: 0, y: 0, radius: 30 };

  onStatsChange?: (stats: any) => void;
  onLevelUp?: (options: UpgradeOption[]) => void;
  onGameOver?: () => void;   
  onGameWin?: () => void;    

 constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d')!;
    
    // Load Asset Skill
    if (!dashCloudImg) {
      dashCloudImg = new Image();
      dashCloudImg.src = '/dash_cloud.png';
    }

    this.initGame();
}

  private getUpgradeOptions(): UpgradeOption[] {
    return [
      { id: 'hp', title: 'Vitality+', description: 'Max HP +30 & Heal', apply: () => { this.player.maxHp += 30; this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30); } },
      { id: 'speed', title: 'Swift Feet', description: 'Move Speed +15%', apply: () => { this.player.speed *= 1.15; } },
      { id: 'damage', title: 'Brutality', description: 'Weapon Damage +20%', apply: () => { this.player.damageMultiplier *= 1.2; } },
      { id: 'potion', title: 'Flask Capacity', description: 'Max Potions +1', apply: () => { this.player.maxPotions++; this.player.potions++; } },
      { id: 'stamina', title: 'Endurance', description: 'Stamina Regen +50%', apply: () => { this.player.staminaRegen *= 1.5; } },
    ];
  }

    initGame(resetStats: boolean = true) {
    this.map = generateCity(this.currentZone); // Pastiin zona udah kebaca
    if (resetStats) {
      this.player = new Player(3 * TILE_SIZE, (Math.floor(MAP_ROWS / 2)) * TILE_SIZE);
      this.currentZone = 1;
    } else {
      this.player.x = 3 * TILE_SIZE;
      this.player.y = (Math.floor(MAP_ROWS / 2)) * TILE_SIZE;
      this.player.invulnerableTimer = 60;
    }
    this.enemies = []; this.lootDrops = []; this.aoeEffects = []; this.floatingTexts = [];
    this.exitPortal.x = (MAP_COLS - 3) * TILE_SIZE;
    this.exitPortal.y = (Math.floor(MAP_ROWS / 2)) * TILE_SIZE;
    
    // RESET PORTAL STATE
    this.portalOpen = false;
    this.enemiesKilled = 0;
    this.isEliteSpawned = false;
       // Makin lama makin banyak yang harus dibunuh, District 5 paling banyak
    this.killQuota = this.currentZone === 5 ? 15 : (8 + (this.currentZone * 2));  // Makin lama makin banyak yang harus dibunuh

        // Kasih teks district kalau ini bukan game pertama kali
       // Kasih teks district kalau ini bukan game pertama kali
    if (!resetStats) {
      this.spawnFloatingText(
        this.player.x, 
        this.player.y - 100, 
        `DISTRICT ${this.currentZone}`, 
        this.currentZone >= 4 ? "#ff4444" : "#ffff00", // Kalau zone 4/5 warna merah, kalau masih awal kuning
        40 // Ukuran font gede
      );
    
    }
  }

  start() { 
    this.stop(); // Safety first!
    this.loop(); 
  }
  
  stop() { 
    if (this.animationId) {
      cancelAnimationFrame(this.animationId); 
    }
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
  }

  selectUpgrade() { this.isPaused = false; }

  update() {
    if (!this.isPaused && this.player.isAlive) this.gameTimer++;
    if (!this.player.isAlive) { this.onGameOver?.(); return; }
    if (this.isPaused || this.hitStopFrames > 0) { if(this.hitStopFrames > 0) this.hitStopFrames--; return; }

    const rect = this.canvas.getBoundingClientRect();
    Input.mouse.worldX = Input.mouse.x - rect.left + this.camera.x;
    Input.mouse.worldY = Input.mouse.y - rect.top + this.camera.y;

    this.player.update(this.map);

    // --- FIX POTION BUG (Dipindah ke Engine) ---
    if (Input.keys['e']) {
      const healed = this.player.usePotion();
      if (healed > 0) {
        this.spawnFloatingText(this.player.x, this.player.y - 20, `+${healed}`, '#00ff00', 22);
        this.spawnParticles(this.player.x, this.player.y, '#00ff00', 15, true);
      }
      Input.keys['e'] = false; // Paksa reset tombol biar gak kebaca 2 kali
    }

    const wep = this.player.getWeapon();

    // Attack Logic
         // LOGIKA SERANGAN (KLIR KIRI)
      if (Input.mouse.down && this.player.attackCooldown <= 0 && this.player.stamina >= wep.staminaCost && !this.player.isDashing && !this.player.isZenitsuDashing) {

        let animType: 'thrust' | 'sideSlash' | 'heavySlash' = 'thrust';
        let slashColor = '#ffffff'; // Warna default
        
        if (wep.name === 'Daggers') {
          animType = 'sideSlash'; 
          slashColor = '#aaccff'; // Biru muda cepat
        } 
        else if (wep.name === 'Greatsword') {
          animType = 'heavySlash'; 
          slashColor = '#ffaa00'; // Oranye berat
        }
        else if (wep.name === 'Spear') {
          animType = 'thrust';
          slashColor = '#00ffcc'; // Hijau tosca tajam
        }

        this.player.startAttack(animType);
        this.player.attackCooldown = wep.cooldown; this.player.stamina -= wep.staminaCost;
        
        // EFEK SLASH SESUAI SENJATA
        this.slashEffects.push({ 
          x: this.player.x, y: this.player.y, 
          angle: this.player.angle, 
          radius: wep.range, // Range dari stat senjata
          arc: wep.arc,      // Lebar sudut dari stat senjata
          alpha: wep.name === 'Greatsword' ? 2.0 : 1.5, // Greatsword slash-nya tebal
          decay: wep.name === 'Daggers' ? 0.5 : 0.3,    // Dagger slash cepat hilang
          color: slashColor 
        });

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]; const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist < wep.range + e.radius) {
          let ae = Math.atan2(e.y - this.player.y, e.x - this.player.x); let ad = Math.abs(this.player.angle - ae); if (ad > Math.PI) ad = (2 * Math.PI) - ad;
                    if (ad < wep.arc / 2) {
            const finalDmg = Math.floor(wep.damage * this.player.damageMultiplier);
            e.hp -= finalDmg; e.flashTimer = 6; 
            
            // --- SENJATA UNIK KNOCKBACK & EFFECT ---
            let kbForce = 18;
            let shakeInt = 10;
            let shakeDur = 8;
            let particleCount = 10;
            let particleColor = '#8b0000'; // Default merah item

            if (wep.name === 'Greatsword') {
              kbForce = 40; // Dorong jauh
              shakeInt = 18; // Goyang layar kenceng
              shakeDur = 15;
              particleCount = 25;
              particleColor = '#ff6600'; // Partikel oranye ledakan
            } 
            else if (wep.name === 'Spear') {
              kbForce = 25; // Dorong sedikit
              shakeInt = 6;
              particleColor = '#00ffcc'; // Partikel hijau tosca
            }
            else if (wep.name === 'Daggers') {
              kbForce = 8; // Hampir gak dorong
              shakeInt = 4; // Goyang dikit
              shakeDur = 4;
              particleCount = 5;
              particleColor = '#aaccff'; // Partikel biru tajam
            }

            e.knockback = kbForce; 
            e.knockbackAngle = this.player.angle;
            
            this.hitStopFrames = wep.hitStopFrames; 
            this.shakeIntensity = shakeInt; 
            this.shakeDuration = shakeDur;
            
            this.spawnParticles(e.x, e.y, particleColor, particleCount, true);
            this.spawnFloatingText(e.x, e.y - 10, `-${finalDmg}`, '#ff4444');
            
            this.player.rage = Math.min(this.player.maxRage, this.player.rage + (wep.name === 'Daggers' ? 5 : 10)); // Dagger kasih rage dikit soalnya cepat
            
            // ... (Ini lanjut ke logic mati musuh seperti biasa)
            if (e.hp <= 0) {
              // Cek kalau yang mati Boss
              if (e.isBoss) {
                this.spawnParticles(e.x, e.y, '#ff00ff', 60, true); // Partikel ungu banyak
                this.spawnParticles(e.x, e.y, '#ffff00', 40, true); // Partikel kuning
                this.shakeIntensity = 30; this.shakeDuration = 40; // Gemeter layar summary
                this.spawnFloatingText(e.x, e.y - 20, "BOSS DEFEATED!", "#ffff00", 36);
              } else {
                this.spawnParticles(e.x, e.y, '#5a0000', 30, true);
              }

              this.player.rage += 20;
              this.enemiesKilled++;
              if (Math.random() < 0.3) this.lootDrops.push({ x: e.x, y: e.y, type: 'potion' });
              this.enemies.splice(i, 1);
              if (this.player.addXp(e.isBoss ? 100 : 25)) this.triggerLevelUp(); // Boss kasih XP banyak
            }
          }
        }
      }
    } else if (this.player.attackCooldown <= wep.cooldown / 2) { this.player.isAttacking = false; }

    // Shockwave
    if (Input.mouse.rightDown && this.player.rage >= 50) {
      this.player.rage -= 50; this.shakeIntensity = 15; this.shakeDuration = 15;
      this.spawnParticles(this.player.x, this.player.y, '#0088ff', 40, false);
      this.aoeEffects.push({ x: this.player.x, y: this.player.y, radius: 10, maxRadius: 150, alpha: 1, decay: 0.05 });
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i]; const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist < 180) {
          e.hp -= 60; e.flashTimer = 6; e.knockback = 30; e.knockbackAngle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
          this.spawnParticles(e.x, e.y, '#0088ff', 8, true);
          this.spawnFloatingText(e.x, e.y - 10, `-60`, '#0088ff'); // FLOATING DMG
          if (e.hp <= 0) { this.spawnParticles(e.x, e.y, '#5a0000', 30, true); this.enemies.splice(i, 1); if (this.player.addXp(15)) this.triggerLevelUp(); }
        }
      }
      Input.mouse.rightDown = false;
    }

            // --- ZENITSU DASH LOGIC ---
    if (this.player.isZenitsuDashing) {
      // Cek musuh yang kena di jalan dash
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        
        // Hitbox agak lebar dikit di kanan-kiri dash biar gampang kena
        if (dist < 50) { 
          let ae = Math.atan2(e.y - this.player.y, e.x - this.player.x); 
          let ad = Math.abs(this.player.zenitsuDashAngle - ae); if (ad > Math.PI) ad = (2 * Math.PI) - ad;
          
          if (ad < Math.PI / 3) { // Sudut 60 derajat di depan player
            const finalDmg = Math.floor(80 * this.player.damageMultiplier); // Damage gede
            e.hp -= finalDmg; e.flashTimer = 10; e.knockback = 25; e.knockbackAngle = this.player.zenitsuDashAngle;
            this.spawnParticles(e.x, e.y, '#0088ff', 15, true);
            this.spawnFloatingText(e.x, e.y - 10, `-${finalDmg}`, '#00ccff', 28); // Floating text biru
            this.hitStopFrames = 5; this.shakeIntensity = 8; this.shakeDuration = 10;
            
            if (e.hp <= 0) {
              this.spawnParticles(e.x, e.y, '#5a0000', 30, true); 
              if (Math.random() < 0.4) this.lootDrops.push({ x: e.x, y: e.y, type: 'potion' });
              this.enemies.splice(i, 1);
              if (this.player.addXp(30)) this.triggerLevelUp();
            }
                  // Spawn efek garis potongannya (setiap 3 frame biar gak terlalu ramai)
            
          }
          
        }
      }
            // --- SPAWN ASET JEJAK ZENITSU ---
      if (this.player.zenitsuDashTimer % 3 === 0) { // Setiap 3 frame spawn 1 awan
        this.dashTrailEffects.push({
          x: this.player.x + (Math.random()-0.5)*10, // Sedikit random biar gak sumbu x doank
          y: this.player.y + (Math.random()-0.5)*10,
          angle: this.player.zenitsuDashAngle + Math.PI, // Awan ngadep ke arah sebaliknya (jejak)
          frame: Math.floor(Math.random() * 5), // Assetmu ada 5 frame kan? random 0-4
          alpha: 1.2, 
          decay: 0.06,
          scale: 1.5 // Gedein dikit awannya
        });
      }
    }

    // Enemy Logic
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(this.player, this.map);
      // Damage Player from Enemy (Logic dipindah ke engine biar floating text kena hit muncul)
      const distP = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      if (distP < this.player.radius + e.radius + 5 && e.state === 'attack' && !e.hasLunged) {
        const dmgTaken = this.player.takeDamage(20 + this.currentZone * 5);
        if (dmgTaken > 0) {
          this.spawnFloatingText(this.player.x, this.player.y - 20, `-${dmgTaken}`, '#ff0000', 24);
          this.shakeIntensity = 12; this.shakeDuration = 12;
          this.spawnParticles(this.player.x, this.player.y, '#ff0000', 10, true);
        }
        e.hasLunged = true;
      }
    }

    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      if (Math.hypot(this.player.x - this.lootDrops[i].x, this.player.y - this.lootDrops[i].y) < 30) {
        if (this.lootDrops[i].type === 'potion') this.player.potions = Math.min(this.player.maxPotions, this.player.potions + 1);
        this.lootDrops.splice(i, 1);
      }
    }
    if (Math.hypot(this.player.x - this.exitPortal.x, this.player.y - this.exitPortal.y) < 40) {
      if (this.currentZone >= 5) { this.isPaused = true; this.onGameWin?.(); } 
      else { this.currentZone++; this.initGame(false); }
    }

    this.spawnTimer++; 
    if (this.spawnTimer >= 120 && this.enemies.length < 8 + this.currentZone * 3) {
      const a = Math.random() * Math.PI * 2; const d = 700;
      let ex = this.player.x + Math.cos(a) * d; let ey = this.player.y + Math.sin(a) * d;
      ex = Math.max(50, Math.min(WORLD_W - 50, ex)); ey = Math.max(50, Math.min(WORLD_H - 50, ey));
      if (!isSolid(this.map, ex, ey)) {
        const enemy = new Enemy(ex, ey);
        enemy.speed += this.currentZone * 0.2; enemy.maxHp += this.currentZone * 30; enemy.hp = enemy.maxHp;
        this.enemies.push(enemy);
      }
      this.spawnTimer = 0;
    }
    
      if (this.portalOpen && Math.hypot(this.player.x - this.exitPortal.x, this.player.y - this.exitPortal.y) < 40) {
      if (this.currentZone >= 5) { this.isPaused = true; this.onGameWin?.(); } 
      else { 
        this.currentZone++; 
        this.initGame(false); 
      }
    }
        // --- LOGIC ELITE & PORTAL ---
      if (!this.portalOpen && this.enemiesKilled >= this.killQuota && !this.isEliteSpawned) {
      this.isEliteSpawned = true;
      const a = Math.random() * Math.PI * 2; const d = 500;
      let ex = this.player.x + Math.cos(a) * d; let ey = this.player.y + Math.sin(a) * d;
      ex = Math.max(50, Math.min(WORLD_W - 50, ex)); ey = Math.max(50, Math.min(WORLD_H - 50, ey));
      
      const enemy = new Enemy(ex, ey);
      enemy.isElite = true; // Tetap dikategorikan Elite biar portal kebuka kalau dia mati

      // --- LOGIKA BOSS DI DISTRICT 5 ---
      if (this.currentZone >= 5) {
        enemy.isBoss = true;
        enemy.radius = 35; // Badan raksasa
        enemy.maxHp = 800 + (this.player.level * 50); // HP gila beneran
        enemy.hp = enemy.maxHp;
        enemy.speed = 1.8; // Agak pelan tapi mengancam
        
        this.spawnFloatingText(this.player.x, this.player.y - 80, "⚠️ BOSS HAS AWAKENED ⚠️", "#ff00ff", 36);
        this.shakeIntensity = 25; // Gemeter super kenceng
        this.shakeDuration = 40;
      } 
      // --- LOGIKA ELITE BIASA (ZONE 1 - 4) ---
      else {
        enemy.radius = 24;
        enemy.maxHp = 150 + (this.currentZone * 50);
        enemy.hp = enemy.maxHp;
        enemy.speed += this.currentZone * 0.2;
        
        this.spawnFloatingText(this.player.x, this.player.y - 50, "ELITE HAS APPEARED!", "#ff0000", 30);
        this.shakeIntensity = 15; this.shakeDuration = 30;
      }

      this.enemies.push(enemy);
    }
    // Cek apakah elite udah mati untuk buka portal
    if (this.isEliteSpawned && !this.portalOpen) {
      const eliteAlive = this.enemies.some(e => e.isElite);
      if (!eliteAlive) {
        this.portalOpen = true;
        this.spawnFloatingText(this.exitPortal.x, this.exitPortal.y - 40, "EXIT UNLOCKED!", "#ffff00", 28);
      }
    }

    // Update Effects & Floating Texts
    for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.alpha -= p.decay; if (p.alpha <= 0) this.particles.splice(i, 1); }
    for (let i = this.slashEffects.length - 1; i >= 0; i--) { this.slashEffects[i].alpha -= this.slashEffects[i].decay; if (this.slashEffects[i].alpha <= 0) this.slashEffects.splice(i, 1); }
    for (let i = this.aoeEffects.length - 1; i >= 0; i--) { const a = this.aoeEffects[i]; a.radius += (a.maxRadius - a.radius) * 0.2; a.alpha -= a.decay; if (a.alpha <= 0) this.aoeEffects.splice(i, 1); }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) { const t = this.floatingTexts[i]; t.y += t.vy; t.alpha -= 0.03; if (t.alpha <= 0) this.floatingTexts.splice(i, 1); }
    for (let i = this.dashTrailEffects.length - 1; i >= 0; i--) { 
      const t = this.dashTrailEffects[i]; 
      t.alpha -= t.decay; 
      if (t.alpha <= 0) this.dashTrailEffects.splice(i, 1); 
    }
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
      kills: this.enemiesKilled, quota: this.killQuota, portalOpen: this.portalOpen,
      bossHp: this.enemies.find(e => e.isBoss)?.hp ?? 0, // Cari boss, kalo ada ambil HPnya
      bossMaxHp: this.enemies.find(e => e.isBoss)?.maxHp ?? 0,
      time: this.gameTimer
    });
  }

  draw() {
    const { ctx, canvas } = this; ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (this.shakeIntensity > 0) ctx.translate((Math.random()-0.5)*this.shakeIntensity*2, (Math.random()-0.5)*this.shakeIntensity*2);
    ctx.translate(-this.camera.x, -this.camera.y);

    const startCol = Math.floor(this.camera.x / TILE_SIZE); const endCol = Math.ceil((this.camera.x + canvas.width) / TILE_SIZE);
    const startRow = Math.floor(this.camera.y / TILE_SIZE); const endRow = Math.ceil((this.camera.y + canvas.height) / TILE_SIZE);
        for (let y = startRow; y <= endRow && y < MAP_ROWS; y++) { 
        for (let x = startCol; x <= endCol && x < MAP_COLS; x++) { 
            if (x >= 0 && y >= 0) drawTile(ctx, x, y, this.map[y][x], this.map); // <--- TAMBAHIN this.map
        } 
    }
   // Di dalam fungsi draw() Engine.ts

    // HAPUS: ctx.beginPath(); ctx.arc(this.exitPortal.x, this.exitPortal.y...
    // GANTI DENGAN:
    
    // --- PORTAL BEBEK (Udah dihandle sama drawTile, tapi kita kasih glow aja) ---
    ctx.save();
    ctx.translate(this.exitPortal.x, this.exitPortal.y);
    ctx.fillStyle = 'rgba(255, 255, 0, 0.1)'; ctx.shadowBlur = 40; ctx.shadowColor = '#ffff00';
    ctx.fillRect(-25, -25, 50, 50); // Glow kotak kuning di bawah bebek
    ctx.shadowBlur = 0;
    ctx.restore();
    for (const l of this.lootDrops) { ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.fillText('🧪', l.x, l.y + 8); }

    for (const s of this.slashEffects) { ctx.globalAlpha = s.alpha; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, s.radius + 15, s.angle - s.arc / 2, s.angle + s.arc / 2); ctx.closePath(); ctx.fillStyle = `rgba(255,255,255,${s.alpha*0.3})`; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = s.color; ctx.shadowBlur = 20; ctx.shadowColor = s.color; ctx.stroke(); ctx.shadowBlur=0; }
    ctx.globalAlpha = 1.0;

    for (const a of this.aoeEffects) { ctx.beginPath(); ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2); ctx.strokeStyle = `rgba(0,150,255,${a.alpha})`; ctx.lineWidth = 8; ctx.shadowBlur = 20; ctx.shadowColor = '#0088ff'; ctx.stroke(); ctx.fillStyle = `rgba(0,100,255,${a.alpha*0.2})`; ctx.fill(); ctx.shadowBlur = 0; }

    for (const e of this.enemies) e.draw(ctx, this.player); // Kirim player biar musuh tau harus noleh kemana
    this.player.draw(ctx);
    

    
        // --- DRAW ZENITSU DASH TRAIL ---
    if (dashCloudImg && dashCloudImg.complete) {
      for (const trail of this.dashTrailEffects) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, trail.alpha); // Pastiin gak minus
        ctx.translate(trail.x, trail.y);
        ctx.rotate(trail.angle);
        
        // Hitung potongan sprite sheet (assetmu 5 frame sejajar)
        const frameW = dashCloudImg.naturalWidth / 5;
        const srcX = trail.frame * frameW;
        
        // Efek Biru Listrik (Ini rahasia biar keliatan keren)
        ctx.shadowBlur = 15; 
        ctx.shadowColor = '#00ccff';
        ctx.filter = 'hue-rotate(180deg) brightness(1.8)'; // Putih jadi Biru Nyala
        
        ctx.drawImage(
          dashCloudImg, srcX, 0, frameW, dashCloudImg.naturalHeight,
          -frameW * trail.scale / 2, -dashCloudImg.naturalHeight * trail.scale / 2, 
          frameW * trail.scale, dashCloudImg.naturalHeight * trail.scale
        );
        
        ctx.filter = 'none';
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1.0;

    // Draw Floating Texts
    for (const t of this.floatingTexts) {
      ctx.globalAlpha = t.alpha;
      ctx.font = `bold ${t.size}px Arial`;
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 5; ctx.shadowColor = '#000';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;

    ctx.restore(); 

    // Vignette
      // Vignette (Versi Siang Hari - Cerah)
     // --- DISTRICT ATMOSPHERE (DINAMIS SESUAI ZONE) ---
    let gradient;
    if (this.currentZone <= 2) {
      // ZONE 1-2: SIANG CERAH (Vignette tipis biru langit)
      gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.5, canvas.width/2, canvas.height/2, canvas.width*0.8);
      gradient.addColorStop(0, 'rgba(0,0,0,0)'); 
      gradient.addColorStop(1, 'rgba(30, 58, 138, 0.3)'); // Biru gelap tipis di pinggir
    } 
    else if (this.currentZone === 3) {
      // ZONE 3: SENJA (Vignette oranye/kuning, kayak matahari terbenam)
      gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.4, canvas.width/2, canvas.height/2, canvas.width*0.8);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(146, 64, 14, 0.6)'); // Coklat/oranye tenggelam
    }
    else if (this.currentZone === 4) {
      // ZONE 4: MALAM AWAL (Vignette ungu gelap)
      gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.3, canvas.width/2, canvas.height/2, canvas.width*0.8);
      gradient.addColorStop(0, 'rgba(10,10,30,0.2)');
      gradient.addColorStop(1, 'rgba(30, 10, 60, 0.8)'); // Ungu gelap
    }
    else {
      // ZONE 5: MALAM GELAP / VIBE PERANG (Vignette item + merah darah)
      gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.2, canvas.width/2, canvas.height/2, canvas.width*0.8);
      gradient.addColorStop(0, 'rgba(0,0,0,0.4)'); // Tengah mulai gelap
      gradient.addColorStop(1, 'rgba(127, 29, 29, 0.9)'); // Pinggir merah kelam
    }

    ctx.fillStyle = gradient; 
    ctx.fillRect(0,0, canvas.width, canvas.height);
}
}