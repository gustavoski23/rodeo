/* Port EXACTO de `store` de la app original (public/legacy.html:2933-2944).
   Mismas claves, misma serialización JSON → los datos de los usuarios
   existentes se leen tal cual, sin migración. NO cambiar el formato.

   `set` notifica a supabase-sync vía window.sbOnLocalChange, igual que hoy:
   mientras el sync viva como script legacy (F0-F5) el hook entra por window;
   cuando se porte (F6) apuntará al módulo nuevo. */

declare global {
  interface Window {
    sbOnLocalChange?: (key: string) => void;
  }
}

// El original mostraba un toast al fallar el guardado (almacenamiento lleno).
// El sistema de toasts llega con el shell; mientras tanto es enchufable.
let onSetError: (msg: string) => void = (msg) => console.warn('[storage]', msg);
export function setStorageErrorHandler(fn: (msg: string) => void) {
  onSetError = fn;
}

export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, val: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      onSetError('No pude guardar — almacenamiento lleno o bloqueado');
    }
    // Sync a la nube (supabase-sync): no-op sin sesión o sin config.
    if (window.sbOnLocalChange) window.sbOnLocalChange(key);
  },
};
