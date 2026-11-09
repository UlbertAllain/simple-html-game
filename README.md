# The Last Blue — Browser RPG Prototype

Prototype game action RPG 2D yang berjalan di browser. Walaupun nama repository mengandung "html", implementasi saat ini menggunakan Next.js dan engine game TypeScript dengan aset sprite 2D.

## Cakupan prototype

- Menu utama, prolog, pemilihan, gameplay, dan halaman pengaturan.
- Engine dan entity game untuk player, musuh, senjata, sprite, serta input.
- HUD, pause menu, indikator level-up, dan notifikasi artifact.
- Modul audio dan save manager.

Tombol yang terlihat di UI tidak otomatis berarti semua fitur sudah aktif; sebagian aksi menu pada source masih berupa placeholder.

## Stack

Next.js 16, React 19, TypeScript, serta Canvas/game logic pada folder `game/`.

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`; permainan dapat diakses melalui route `/game` dan alur menu yang tersedia.

## Struktur

```text
app/             Entry halaman / game / prologue / select
game/            Engine, entity, input, audio, persistence
components/game/ HUD dan overlays
public/          Sprite, environment, dan aset visual
```

## Validasi

```bash
npm run lint
npm run build
```

**Status:** Prototype. Uji collision, input, state loading, save/load, dan konsistensi frame-rate sebelum menganggap gameplay siap dirilis.
