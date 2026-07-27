import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

/* Hoja modal de SUBE — mismo patrón que src/views/talk/sheet.tsx (que no se
   toca) y mismo port de openSheet/closeSheet (public/legacy.html:5087-5124).

   Las cuatro cosas que el viejo hacía a mano y son las que se olvidan: guarda
   y restaura el foco, Escape cierra, Tab circula dentro del panel y el clic en
   el backdrop (no en la hoja) cierra. */
export function LadderSheet({
  abierta,
  onClose,
  children,
  labelledBy,
}: {
  abierta: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!abierta) return;
    focoPrevio.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || !focusables.length) return;
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const prev = focoPrevio.current;
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [abierta, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {abierta && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[150] flex items-end justify-center backdrop-blur-xl"
          style={{ background: 'oklch(9% 0.008 265 / 0.85)' }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="max-h-[88vh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] border px-6 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))] outline-none"
            style={{ background: 'var(--bg-deep)', borderColor: 'var(--borde-sutil)' }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
