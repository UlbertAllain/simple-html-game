// ============================================================
// SpriteCache.ts - Singleton sprite cache to avoid loading
// images multiple times per Enemy/Player instance
// ============================================================

const cache = new Map<string, HTMLImageElement>();

/**
 * Load an image once and cache it. Returns the cached Image
 * if already loaded. Safe to call from any number of instances.
 */
export function getSprite(src: string): HTMLImageElement {
  const existing = cache.get(src);
  if (existing) return existing;

  const img = new Image();
  img.src = src;
  cache.set(src, img);
  return img;
}

/**
 * Preload a list of sprite paths. Call on game init so images
 * are ready by the time they're first drawn.
 */
export function preloadSprites(sources: string[]): Promise<void[]> {
  return Promise.all(
    sources.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = getSprite(src);
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Don't block on missing assets
          }
        })
    )
  );
}

/** Clear the entire cache (useful for hot-reload in dev) */
export function clearSpriteCache(): void {
  cache.clear();
}
