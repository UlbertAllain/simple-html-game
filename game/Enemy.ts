// src/game/Enemy.ts
import { isSolid, TileType } from './CityGenerator';
import { Player } from './Player';
import { Sprite } from './Sprite'; // IMPORT SPRITE

export class Enemy {
  x: number; y: number; radius: number = 20; speed: number = 1.8;
  hp: number = 80; maxHp: number = 80;
  angle: number = 0;
  knockback: number = 0; knockbackAngle: number = 0; flashTimer: number = 0;
  
  state: 'chase' | 'prepare_attack' | 'attack' = 'chase';
  attackCooldown: number = 100; lungeSpeed: number = 0; lungeDir: number = 0; hasLunged: boolean = false;
    isElite: boolean = false; // Taruh di bagian atas sama hp, speed, dll
     isBoss: boolean = false; // Taruh di bawah isElite

  // --- SPRITE ASSETS MUSUH ---
  // GANTI ANGKA 64, 64, 6 SESUAI UKURAN FRAME GAMBAR MUSUH LO!
  runSprite: Sprite = new Sprite('/Lancer_Run.png', 320, 320, 6, 6);
  attackSprite: Sprite = new Sprite('/Lancer_Attack.png', 320, 320, 3, 3);
  currentSprite: Sprite;

  constructor(x: number, y: number) { 
    this.x = x; this.y = y; 
    this.currentSprite = this.runSprite; // Awalnya lari
  }

  update(player: Player, map: TileType[][]) {
    if (this.flashTimer > 0) this.flashTimer--;
    let prevX = this.x, prevY = this.y;

    if (this.knockback > 0) {
      this.x += Math.cos(this.knockbackAngle) * this.knockback;
      this.y += Math.sin(this.knockbackAngle) * this.knockback;
      this.knockback *= 0.6; if (this.knockback < 0.5) this.knockback = 0;
    } else {
      if (this.state === 'chase') {
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(this.angle) * this.speed; this.y += Math.sin(this.angle) * this.speed;
        const distP = Math.hypot(player.x - this.x, player.y - this.y);
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
        const distP = Math.hypot(player.x - this.x, player.y - this.y);
        if (distP < player.radius + this.radius + 5 && !this.hasLunged) {
          // Damage logic ada di Engine, tapi kita tandai hasLunged di sini
          this.hasLunged = true;
        }
        if (this.lungeSpeed < 1) { this.state = 'chase'; this.attackCooldown = 80; }
      }
    }

    // Collision Map
    if (isSolid(map, this.x - this.radius, this.y) || isSolid(map, this.x + this.radius, this.y) || isSolid(map, this.x, this.y - this.radius) || isSolid(map, this.x, this.y + this.radius)) {
      this.x = prevX; this.y = prevY; this.angle += Math.PI / 2; 
    }

    // --- STATE MACHINE SPRITE ---
    if (this.state === 'attack' || this.state === 'prepare_attack') {
      this.currentSprite = this.attackSprite;
    } else {
      this.currentSprite = this.runSprite;
    }
    this.currentSprite.update();
  }

  // Di Enemy.ts, ubah fungsi draw jadi gini:
  draw(ctx: CanvasRenderingContext2D, player: { x: number; y: number }) {
    // 1. DRAW SHADOW
    ctx.save(); ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath(); ctx.ellipse(0, this.radius * 0.8, this.radius * 1.2, this.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 2. HADES METHOD (Hadap kiri/kanan based on Player position)
    const flipX = player.x < this.x; // Kalau player di kiri, musuh ngadep kiri

    // 3. ELITE GLOW (Kalau Elite, kita glow merah)
    if (this.isElite) {
      ctx.shadowBlur = 20; 
      ctx.shadowColor = '#ff0000';
    }

    // FLASH PUTIH PAS KENA HIT
    if (this.flashTimer > 0) {
      ctx.filter = 'brightness(3)'; // Putih terus balik ke asli
    } else if (this.isElite) {
      ctx.filter = 'hue-rotate(300deg) saturate(2) brightness(1.2)'; // Ubah musuh biasa jadi MERAH CAHAYA
    }

    // 4. DRAW SPRITE (Scale 1.5 biar keliatan, ganti kalau kegedean)
    // Kalau elite, scale-nya dikit lebih gede (1.8)
    const scale = this.isElite ? 1.0 : 1.0; 
    this.currentSprite.draw(ctx, this.x, this.y, flipX, scale);

    // Reset Filter
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
  
if (this.isBoss) {
      const barWidth = 60;
      const barHeight = 6;
      const yOffset = -this.radius - 20; // Posisi di atas kepala
      
      // Background item
      ctx.fillStyle = '#000000';
      ctx.fillRect(this.x - barWidth/2, this.y + yOffset, barWidth, barHeight);
      
      // HP Merah
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = hpRatio > 0.3 ? '#dc2626' : '#ff0000'; // Kalo sisa dikit, merah nyala
      ctx.fillRect(this.x - barWidth/2, this.y + yOffset, barWidth * hpRatio, barHeight);
      
      // Border putih
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - barWidth/2, this.y + yOffset, barWidth, barHeight);
      
      // Teks BOSS
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', this.x, this.y + yOffset - 5);
    }

    // ctx.restore(); <--- kalau di kode kamu sebelumnya pake save/restore, pastikan ini di paling bawah
  }
}