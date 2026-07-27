import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { create } from 'zustand';

import { store } from '@/lib/storage';

/* Tip de primera vez — port de tipPrimeraVez (public/legacy.html:3220-3234)
   y su CSS .rd-tip (L564-581).

   Una línea, UNA sola vez por flujo (banderas en rodeo_tips, misma clave y
   misma forma {clave: 1}). Es un mini-banner propio y no un toast: el toast se
   usa para errores y en el viejo quedaba enterrado bajo los overlays.
   Autocierre a los 8 s o con la ✕. */

type TipState = { texto: string | null; mostrar: (t: string) => void; cerrar: () => void };

const useTip = create<TipState>((set) => ({
  texto: null,
  mostrar: (texto) => set({ texto }),
  cerrar: () => set({ texto: null }),
}));

/** Imperativo, como el viejo: lo llaman los arranques de sesión, no un render. */
export function tipPrimeraVez(key: string, texto: string): void {
  const vistos = store.get<Record<string, number>>('rodeo_tips', {});
  if (vistos && vistos[key]) return;
  store.set('rodeo_tips', { ...(vistos || {}), [key]: 1 });
  useTip.getState().mostrar(texto);
}

export function FirstTip() {
  const texto = useTip((s) => s.texto);
  const cerrar = useTip((s) => s.cerrar);

  useEffect(() => {
    if (!texto) return;
    const h = setTimeout(cerrar, 8000);
    return () => clearTimeout(h);
  }, [texto, cerrar]);

  return (
    <AnimatePresence>
      {texto && (
        <motion.div
          initial={{ opacity: 0, y: 16, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 10, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          /* z-990: por encima de CUALQUIER overlay de la app, igual que el
             viejo — el tip llega justo cuando se abre una sesión. */
          className="fixed bottom-[calc(120px+env(safe-area-inset-bottom))] left-1/2 z-[990] flex max-w-[min(92vw,420px)] items-center gap-2.5 rounded-full py-[11px] pr-3.5 pl-4 text-[0.85rem] font-semibold"
          style={{
            background: 'var(--card-lavender)',
            color: 'var(--card-ink)',
            boxShadow: '0 12px 32px oklch(0% 0 0 / 0.45)',
          }}
        >
          <span>{texto}</span>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar el tip"
            className="cursor-pointer border-0 bg-transparent p-1 text-[0.95rem] leading-none"
            style={{ color: 'var(--card-ink-soft)' }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
