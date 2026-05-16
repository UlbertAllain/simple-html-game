// src/game/CityGenerator.ts

export const TILE_SIZE = 40;
export const MAP_COLS = 50;
export const MAP_ROWS = 50;
export const WORLD_W = MAP_COLS * TILE_SIZE;
export const WORLD_H = MAP_ROWS * TILE_SIZE;

// TAMBAH TYPE 9 (WALL) & 10 (WATER)
export type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

let buildingTypes: HTMLImageElement[] = [];
let rockTypes: HTMLImageElement[] = [];
let bushTypes: HTMLImageElement[] = [];
let treeTypes: HTMLImageElement[] = []; 
let duckImg: HTMLImageElement | null = null;
// Tambahin variabel ini di atas
let waterBaseImg: HTMLImageElement | null = null;
let waterFoamImg: HTMLImageElement | null = null;

function initAssets() {
  if (typeof window === 'undefined' || buildingTypes.length > 0) return;

  const h1 = new Image(); h1.src = '/House.png';
  const h2 = new Image(); h2.src = '/House2.png';
  const h3 = new Image(); h3.src = '/House3.png';
  const tw = new Image(); tw.src = '/Tower.png';
  buildingTypes = [h1, h2, h3, tw];

  const r1 = new Image(); r1.src = '/rock.png';
  const r2 = new Image(); r2.src = '/rock2.png';
  rockTypes = [r1, r2];

  const b1 = new Image(); b1.src = '/bush.png';
  const b2 = new Image(); b2.src = '/bush2.png';
  bushTypes = [b1, b2];

  const t1 = new Image(); t1.src = '/Tree1.png';
  const t2 = new Image(); t2.src = '/Tree3.png';
  treeTypes = [t1, t2];

  duckImg = new Image(); duckImg.src = '/Duck.png';
  
  // LOAD ASSET AIR BARU
  waterBaseImg = new Image(); waterBaseImg.src = '/water_base.png';
  waterFoamImg = new Image(); waterFoamImg.src = '/water_foam.png';
}

function hashCoords(x: number, y: number, seed: number = 0): number {
    return (((x + seed) * 2654435761) ^ ((y + seed) * 2246822519)) >>> 0; 
}

function isImageValid(img: HTMLImageElement | null): boolean {
  return !!img && img.complete && img.naturalHeight !== 0;
}

function drawAsset(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, px: number, py: number, scale: number = 0.9, offsetY: number = 0) {
  if (!img || !img.complete || img.naturalHeight === 0) return;
  let srcX = 0; let srcW = img.naturalWidth; let srcH = img.naturalHeight;
  if (img.naturalWidth > img.naturalHeight * 1.5) { srcW = img.naturalHeight; srcX = 0; }
  const drawW = srcW * scale; const drawH = srcH * scale;
  const drawX = (px + TILE_SIZE / 2) - (drawW / 2);
  const drawY = (py + TILE_SIZE) - drawH + offsetY;
  ctx.drawImage(img, srcX, 0, srcW, srcH, drawX, drawY, drawW, drawH);
}

export function generateCity(zone: number = 1): TileType[][] {
  initAssets();
  const map: TileType[][] = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_COLS; x++) map[y][x] = 0;
  }

  // 1. BIKIN TEMBOK DI PINGGIR MAP
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      if (y === 0 || y === MAP_ROWS - 1 || x === 0 || x === MAP_COLS - 1) {
        map[y][x] = 9; // Wall
      }
    }
  }

  // 2. MAIN ROADS (Sedikit di-offset biar gak pas di tengah tembok)
  const mainRoadH = Math.floor(MAP_ROWS / 2); 
  const mainRoadV = Math.floor(MAP_COLS / 2);
  for (let i = 1; i < MAP_COLS - 1; i++) { map[mainRoadH][i] = 1; map[mainRoadH - 1][i] = 1; map[mainRoadH + 1][i] = 1; }
  for (let i = 1; i < MAP_ROWS - 1; i++) { map[i][mainRoadV] = 1; map[i][mainRoadV - 1] = 1; map[i][mainRoadV + 1] = 1; }

  // 3. BIKIN DANAU RANDOM (WATER)
  const numLakes = 1 + Math.floor(hashCoords(zone, zone * 2) % 2); // 1-2 danau per zone
  for(let l = 0; l < numLakes; l++) {
    let lakeCX = 10 + Math.floor(hashCoords(l, zone * 3) % (MAP_COLS - 20));
    let lakeCY = 10 + Math.floor(hashCoords(zone * 3, l) % (MAP_ROWS - 20));
    let lakeR = 2 + Math.floor(hashCoords(l, l) % 2); // Radius 2-3 tile

    // Jangan bikin danau pas di jalan utama
    if (Math.abs(lakeCY - mainRoadH) < 5 && Math.abs(lakeCX - mainRoadV) < 5) continue;

    for (let y = lakeCY - lakeR; y <= lakeCY + lakeR; y++) {
      for (let x = lakeCX - lakeR; x <= lakeCX + lakeR; x++) {
        if (y > 0 && y < MAP_ROWS - 1 && x > 0 && x < MAP_COLS - 1) {
          // Buat bentuk danau gak sempurna kotak
          const dist = Math.hypot(x - lakeCX, y - lakeCY);
          if (dist <= lakeR + (hashCoords(x, y, zone) % 2) * 0.5) {
            map[y][x] = 10; // Water
          }
        }
      }
    }
  }

  // 4. POPULATE MAP (Rumah, Pohon, Batu)
  for (let y = 3; y < MAP_ROWS - 3; y++) {
    for (let x = 3; x < MAP_COLS - 3; x++) {
      if (map[y][x] !== 0) continue; // Skip jika udah ada jalan/tembok/air

      const h = hashCoords(x, y, zone * 100); 
      let houseChance = 0.05, treeChance = 0.02, rockChance = 0.01;

      if (zone <= 2) { houseChance = 0.06; treeChance = 0.02; rockChance = 0.01; }
      else if (zone <= 3) { houseChance = 0.03; treeChance = 0.06; rockChance = 0.03; }
      else { houseChance = 0.01; treeChance = 0.10; rockChance = 0.05; }

      const roll = (h % 100) / 100;

      if (roll < houseChance) {
        let canPlace = true;
        for (let fy = -2; fy <= 0; fy++) { 
          for (let fx = -1; fx <= 1; fx++) { 
            if (map[y+fy]?.[x+fx] === 1 || map[y+fy]?.[x+fx] === 2 || map[y+fy]?.[x+fx] === 10) canPlace = false; // Jangan taruh rumah di air
          }
        }
        if (canPlace) {
          map[y][x] = 2; 
          for (let fy = -2; fy <= 0; fy++) {
            for (let fx = -1; fx <= 1; fx++) {
              if (fy === 0 && fx === 0) continue; 
              if (map[y+fy]?.[x+fx] !== undefined && map[y+fy]?.[x+fx] === 0) map[y+fy][x+fx] = 8; 
            }
          }
        }
      } 
      else {
        const nearHouseBase = (map[y-1]?.[x] === 2 || map[y+1]?.[x] === 2 || map[y]?.[x-1] === 2 || map[y]?.[x+1] === 2);
        if (!nearHouseBase) {
          if (roll < houseChance + treeChance) map[y][x] = 7;
          else if (roll < houseChance + treeChance + rockChance) map[y][x] = 4;
        }
      }
      
      const nearRoad = (map[y-1]?.[x] === 1 || map[y+1]?.[x] === 1 || map[y]?.[x-1] === 1 || map[y]?.[x+1] === 1);
      const nearHouseBase2 = (map[y-1]?.[x] === 2 || map[y+1]?.[x] === 2 || map[y]?.[x-1] === 2 || map[y]?.[x+1] === 2);
      if (nearRoad && !nearHouseBase2 && map[y][x] === 0 && (h % 100) / 100 < 0.1) map[y][x] = 5;
    }
  }

  map[mainRoadH][MAP_COLS - 3] = 6; 
  return map;
}

export function isSolid(map: TileType[][], x: number, y: number): boolean {
  const tileX = Math.floor(x / TILE_SIZE); const tileY = Math.floor(y / TILE_SIZE);
  if (tileX < 0 || tileX >= MAP_COLS || tileY < 0 || tileY >= MAP_ROWS) return true;
  const tile = map[tileY][tileX];
  // Type 9 (Wall) & 10 (Water) JUGA SOLID!
  return tile === 2 || tile === 4 || tile === 7 || tile === 8 || tile === 9 || tile === 10; 
}

export function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, type: TileType, map: TileType[][]) {
  const px = x * TILE_SIZE; const py = y * TILE_SIZE;

  // 1. SELALU GAMBAR RUMPUT DASAR DI SEMUA TILE (BIAR GAK ITEM)
  ctx.fillStyle = '#5b8c3e'; 
  ctx.fillRect(px, py, TILE_SIZE + 1, TILE_SIZE + 1); 
  
  // 2. DETIL TIAP TILE
  if (type === 1) { // JALAN
    ctx.fillStyle = '#c9a96e'; ctx.fillRect(px, py, TILE_SIZE + 1, TILE_SIZE + 1);
    ctx.fillStyle = '#b89860'; 
    const isHorizontal = (y > 0 && map[y-1][x] === 1) || (y < MAP_ROWS-1 && map[y+1][x] === 1);
    if (isHorizontal && x % 3 === 0) ctx.fillRect(px + 5, py + TILE_SIZE / 2 - 1, 30, 2);
    else if (!isHorizontal && y % 3 === 0) ctx.fillRect(px + TILE_SIZE / 2 - 1, py + 5, 2, 30);
  }
  else if (type === 0 || type === 3 || type === 8) { // RUMPUT
    const h1 = hashCoords(x, y);
    const h2 = hashCoords(x + 99, y + 99);
    if (h1 % 7 === 0) { ctx.fillStyle = '#4e7a33'; ctx.fillRect(px + 10, py + 15, 15, 8); }
    else if (h1 % 5 === 0) { ctx.fillStyle = '#689e4a'; ctx.fillRect(px + 5, py + 20, 20, 5); }
    if (h2 % 15 === 0) { ctx.fillStyle = '#fcd34d'; ctx.fillRect(px + 20, py + 10, 3, 3); } 
    else if (h2 % 13 === 0) { ctx.fillStyle = '#f472b6'; ctx.fillRect(px + 8, py + 28, 3, 3); } 
    if (h1 % 4 === 0) { ctx.fillStyle = '#6b9c4e'; ctx.fillRect(px + 15, py + 18, 2, 6); ctx.fillRect(px + 25, py + 8, 2, 5); }
  }
  else if (type === 2) { // RUMAH
    if (buildingTypes.length > 0) {
        const imgIndex = hashCoords(x, y) % buildingTypes.length;
        drawAsset(ctx, buildingTypes[imgIndex], px, py, 0.9, 0); 
    }
  }
  else if (type === 4) { // BATU
    if (rockTypes.length > 0) {
        const imgIndex = hashCoords(x, y) % rockTypes.length;
        drawAsset(ctx, rockTypes[imgIndex], px, py, 1.0, 0);
    }
  }
  else if (type === 5) { // SEMAK
    if (bushTypes.length > 0) {
        const imgIndex = hashCoords(x, y) % bushTypes.length;
        drawAsset(ctx, bushTypes[imgIndex], px, py, 1.2, 0);
    }
  }
  else if (type === 7) { // POHON
    if (treeTypes.length > 0) {
        const imgIndex = hashCoords(x, y) % treeTypes.length;
        const img = treeTypes[imgIndex];
        if (isImageValid(img)) {
            const frameCount = 8;
            const frameW = img.naturalWidth / frameCount; 
            const frameIndex = hashCoords(x + 500, y + 500) % frameCount; 
            const srcX = frameIndex * frameW;
            const scale = 0.6; 
            const drawW = frameW * scale;
            const drawH = img.naturalHeight * scale;
            const drawX = (px + TILE_SIZE / 2) - (drawW / 2);
            const drawY = (py + TILE_SIZE) - drawH + 8; 
            ctx.drawImage(img, srcX, 0, frameW, img.naturalHeight, drawX, drawY, drawW, drawH);
        }
    }
  }
  else if (type === 6) { // BEBEK
    drawAsset(ctx, duckImg, px, py, 1.5, -2);
  }
  // --- TILE BARU ---
    // --- TILE BARU ---
  else if (type === 9) { // TEMBOK
    // Kita pake Canvas Pixel Art aja biar gak ribet crop Tilemap_color1.png
    ctx.fillStyle = '#6b7280'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); // Base abu
    ctx.fillStyle = '#4b5563'; 
    ctx.fillRect(px, py, TILE_SIZE/2, TILE_SIZE/2); // Kiri atas
    ctx.fillRect(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2); // Kanan bawah
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(px + 2, py + 2, 4, 4); // Highlight bata
  }
  else if (type === 10) { // AIR (DANAU)
    // 1. Gambar base air (warna solid cyan dari asset kamu)
    if (waterBaseImg && waterBaseImg.complete && waterBaseImg.naturalHeight !== 0) {
      ctx.drawImage(waterBaseImg, px, py, TILE_SIZE, TILE_SIZE);
    } else {
      ctx.fillStyle = '#22d3ee'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); // Fallback kalau gambar belom load
    }

    // 2. Gambar animasi foam/ombak di atasnya
    if (waterFoamImg && waterFoamImg.complete && waterFoamImg.naturalHeight !== 0) {
      ctx.globalAlpha = 0.7; // Agar transparan sedikit, gak nutupin base
      
      // Asumsi Water Foam.png punya 4 frame kotak sejajar (spritesheet)
      const foamFrames = 4; 
      const frameW = waterFoamImg.naturalWidth / foamFrames;
      
      // Animasi bergantian berdasarkan waktu dan posisi tile
      const frameIndex = Math.floor((Date.now() / 300 + x + y) % foamFrames); 
      const srcX = frameIndex * frameW;
      
      // Efek naik turun ombak
      const waveOffset = Math.sin(Date.now() / 250 + x + y) * 2; 
      
      // Gambar potongan spritesheet foam
      ctx.drawImage(
        waterFoamImg, 
        srcX, 0, frameW, waterFoamImg.naturalHeight, // Source (potong gambar)
        px, py + waveOffset, TILE_SIZE, TILE_SIZE // Destination (taruh di map)
      );
      
      ctx.globalAlpha = 1.0; // Reset alpha
    }
  }
}