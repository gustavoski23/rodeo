import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { cn } from '@/lib/utils';
import { useToast, type ToastItem } from '@/stores/toast';
import { useEnSesion } from '@/stores/talk';

/* Píldora glass de aviso. El viejo la ponía arriba (top:18px) porque el chat
   ocupaba la pantalla entera; aquí va abajo, por encima de la tab bar, donde
   está el pulgar. Estilo del viejo: glass, radio 100, sombra larga. */

function Toast({ item, enSesion }: { item: ToastItem; enSesion: boolean }) {
  const dismiss = useToast((s) => s.dismiss);

  useEffect(() => {
    const h = setTimeout(() => dismiss(item.id), item.ms);
    return () => clearTimeout(h);
  }, [item.id, item.ms, dismiss]);

  // Entra desde el borde por el que aparece: arriba baja, abajo sube.
  const desde = enSesion ? -16 : 16;

  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: desde, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: desde / 2, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onClick={() => dismiss(item.id)}
      className="pointer-events-auto max-w-[min(92vw,420px)] cursor-pointer rounded-full border px-[22px] py-3 text-center text-[0.85rem] font-semibold backdrop-blur-xl"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--borde-sutil)',
        color: 'var(--text-primary)',
        boxShadow: '0 16px 40px oklch(0% 0 0 / 0.5)',
      }}
    >
      {item.msg}
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  /* En sesión el aviso vuelve ARRIBA, como en el viejo (top:18px). Abajo está
     el dock de voz: el mic héroe ocupa exactamente la franja donde vivía el
     toast y un error de red tapaba el botón principal justo cuando hay que
     reintentar. Fuera de sesión se queda donde está el pulgar, sobre la tab
     bar. */
  const enSesion = useEnSesion();

  return (
    <div
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-0 z-[200] flex flex-col items-center gap-2 px-4',
        enSesion ? 'top-[calc(14px+env(safe-area-inset-top))]' : 'bottom-[calc(96px+env(safe-area-inset-bottom))]',
      )}
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Toast key={t.id} item={t} enSesion={enSesion} />
        ))}
      </AnimatePresence>
    </div>
  );
}
