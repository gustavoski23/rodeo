const MEDIA_MODO_LIGERO = '(max-width: 767px), (pointer: coarse), (prefers-reduced-motion: reduce)';

/**
 * Phones and reduced-motion devices get the same low-cost rendering path.
 * It is intentionally decided at startup: rotating a phone must not suddenly
 * mount WebGL canvases or restart decorative animation loops mid-session.
 */
export const MODO_LIGERO =
  typeof window !== 'undefined' && window.matchMedia(MEDIA_MODO_LIGERO).matches;
