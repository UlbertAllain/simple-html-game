// src/game/Sprite.ts

export class Sprite {
    image: HTMLImageElement;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    currentFrame: number = 0;
    frameTimer: number = 0;
    frameInterval: number;

    constructor(imageSrc: string, frameWidth: number, frameHeight: number, frameCount: number, frameInterval: number = 8) {
        this.image = new Image();
        this.image.src = imageSrc;
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

    // TAMBAHIN PARAMETER flipX (default false)
    draw(ctx: CanvasRenderingContext2D, x: number, y: number, flipX: boolean = false, scale: number = 1) {
        if (!this.image.complete || this.image.naturalHeight === 0) return;

        const srcX = this.currentFrame * this.frameWidth;
        
        ctx.save();
        ctx.translate(x, y);
        
        // FLIP LOGIC: Kalau mouse di kiri, balik gambar secara horizontal
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