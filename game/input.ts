// src/game/Input.ts

class InputManager {
  keys: Record<string, boolean> = {};
  mouse: { x: number; y: number; worldX: number; worldY: number; down: boolean; rightDown: boolean } = {
    x: 0, y: 0, worldX: 0, worldY: 0, down: false, rightDown: false,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        this.keys[e.key.toLowerCase()] = true;
        if (e.key === ' ') this.keys['space'] = true;
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
        if (e.key === ' ') this.keys['space'] = false;
      });
      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
      window.addEventListener('mousedown', (e) => {
        if (e.button === 0) this.mouse.down = true;
        if (e.button === 2) this.mouse.rightDown = true;
      });
      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.mouse.down = false;
        if (e.button === 2) this.mouse.rightDown = false;
      });
      window.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }
}

// Singleton pattern, biar bisa dipanggil dari mana aja
export const Input = new InputManager();