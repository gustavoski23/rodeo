'use client';
import { CurlGlRenderer } from './glRenderer.mjs';

class CurlWebglPool {
  constructor(createRenderer = (canvas) => new CurlGlRenderer(canvas)) {
    this.createRenderer = createRenderer;
    this.renderer = null;
    this.canvas = null;
    this.owner = null;
    this.failed = false;
  }
  /**
   * Borrow the shared renderer for one folding page. Last-wins: a new owner
   * steals the lease (the queue makes overlap impossible in practice; the
   * previous holder's `release` then becomes a no-op). Returns `null` when
   * WebGL is unavailable — latched, so the caller can fall back to flat.
   */
  acquire(owner) {
    if (this.failed) {
      return null;
    }
    if (!this.renderer) {
      const canvas = document.createElement("canvas");
      try {
        this.renderer = this.createRenderer(canvas);
      } catch {
        this.failed = true;
        return null;
      }
      this.canvas = canvas;
    }
    this.owner = owner;
    return { renderer: this.renderer, canvas: this.canvas };
  }
  /** Return the lease. Parks the canvas out of the DOM so the previous page's
   * last frame can never flash under the next fold. No-op for stale owners. */
  release(owner) {
    if (this.owner === owner) {
      this.owner = null;
      this.canvas?.remove();
    }
  }
  /** True teardown (Book unmount): reclaim the GPU context slot. */
  dispose() {
    this.renderer?.loseContext();
    this.canvas?.remove();
    this.renderer = null;
    this.canvas = null;
    this.owner = null;
  }
}

export { CurlWebglPool };
