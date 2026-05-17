// ============================================================
// Sprite.ts - Sprite animation using cached images
// Fixed: Now uses SpriteCache instead of creating new Image per instance
// ============================================================

import { getSprite } from './SpriteCache';

export class Sprite {
    image: HTMLImageElement;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    currentFrame: number = 0;
    frameTimer: number = 0;
    frameInterval: number;

    constructor(imageSrc: string, frameWidth: number, frameHeight: number, frameCount: number, frameInterval: number = 8) {
        // Use cache instead of new Image() every time
        this.image = getSprite(imageSrc);
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frameCount = frameCount;
        this.frameInterval = frameInterval;
    }

    update() {
        this.frameTimer++;
        if (this.frameTimer >= this.frameInterval) {
            this.frameTimer = 0;
            this.currentFrame++;
            if (this.currentFrame >= this.frameCount) {
                this.currentFrame = 0;
            }
        }
    }

    /** Set a specific frame (useful for attack animations) */
    setFrame(frame: number) {
        this.currentFrame = Math.max(0, Math.min(frame, this.frameCount - 1));
    }

    /** Check if sprite image is loaded */
    get isLoaded(): boolean {
        return this.image.complete && this.image.naturalHeight !== 0;
    }

    draw(ctx: CanvasRenderingContext2D, x: number, y: number, flipX: boolean = false, scale: number = 1) {
        if (!this.image.complete || this.image.naturalHeight === 0) return;

        const srcX = this.currentFrame * this.frameWidth;
        
        ctx.save();
        ctx.translate(x, y);
        
        // FLIP LOGIC: If mouse is to the left, flip horizontally
        if (flipX) {
            ctx.scale(-1, 1); 
        }

        const drawW = this.frameWidth * scale;
        const drawH = this.frameHeight * scale;

        ctx.drawImage(
            this.image,
            srcX, 0, this.frameWidth, this.frameHeight,
            -drawW / 2, -drawH / 2, drawW, drawH
        );

        ctx.restore();
    }
}
