// ============================================================
// input.ts - Input manager with cleanup support
// Fixed: Memory leak from event listeners never being removed
// ============================================================

class InputManager {
  keys: Record<string, boolean> = {};
  mouse: { x: number; y: number; worldX: number; worldY: number; down: boolean; rightDown: boolean } = {
    x: 0, y: 0, worldX: 0, worldY: 0, down: false, rightDown: false,
  };

  private boundHandlers: {
    keydown: (e: KeyboardEvent) => void;
    keyup: (e: KeyboardEvent) => void;
    mousemove: (e: MouseEvent) => void;
    mousedown: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
    contextmenu: (e: Event) => void;
  };

  private attached: boolean = false;

  constructor() {
    this.boundHandlers = {
      keydown: this.onKeyDown.bind(this),
      keyup: this.onKeyUp.bind(this),
      mousemove: this.onMouseMove.bind(this),
      mousedown: this.onMouseDown.bind(this),
      mouseup: this.onMouseUp.bind(this),
      contextmenu: (e: Event) => e.preventDefault(),
    };

    if (typeof window !== 'undefined') {
      this.attach();
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') this.keys['space'] = true;
    // Prevent default for game keys
    if (['space', 'e', 'q', 'w', 'a', 's', 'd', '1', '2', '3', 'escape', 'tab'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys[e.key.toLowerCase()] = false;
    if (e.key === ' ') this.keys['space'] = false;
  }

  private onMouseMove(e: MouseEvent) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button === 0) this.mouse.down = true;
    if (e.button === 2) this.mouse.rightDown = true;
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) this.mouse.down = false;
    if (e.button === 2) this.mouse.rightDown = false;
  }

  /** Attach event listeners to window */
  attach() {
    if (this.attached || typeof window === 'undefined') return;
    window.addEventListener('keydown', this.boundHandlers.keydown);
    window.addEventListener('keyup', this.boundHandlers.keyup);
    window.addEventListener('mousemove', this.boundHandlers.mousemove);
    window.addEventListener('mousedown', this.boundHandlers.mousedown);
    window.addEventListener('mouseup', this.boundHandlers.mouseup);
    window.addEventListener('contextmenu', this.boundHandlers.contextmenu);
    this.attached = true;
  }

  /** Detach event listeners (cleanup on unmount) */
  detach() {
    if (!this.attached || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.boundHandlers.keydown);
    window.removeEventListener('keyup', this.boundHandlers.keyup);
    window.removeEventListener('mousemove', this.boundHandlers.mousemove);
    window.removeEventListener('mousedown', this.boundHandlers.mousedown);
    window.removeEventListener('mouseup', this.boundHandlers.mouseup);
    window.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
    this.attached = false;
  }

  /** Reset all input states (useful on scene change) */
  reset() {
    this.keys = {};
    this.mouse.down = false;
    this.mouse.rightDown = false;
  }
}

// Singleton pattern, accessible from anywhere
export const Input = new InputManager();
