import { AnimatePresence, motion } from 'motion/react';
import { Dna, Palette, TrendingUp, X } from 'lucide-react';

import { useApp, type View } from '@/stores/app';

/* Menú del botón ☰. Por ahora solo PERSONALIZAR: el resto (TU DNA, SUBE, y lo
   que venga) se va agregando con diseños propios sobre la línea del Home
   aurora — el código de esas vistas sigue en el repo, solo no se listan aún.
   Cuando toque re-activarlas, se devuelven a ENTRADAS. */

const ENTRADAS: { view: View; titulo: string; sub: string; Icon: typeof Dna }[] = [
  // { view: 'dna', titulo: 'TU DNA', sub: 'Tus errores, tu jerga y tus upgrades', Icon: Dna },
  // { view: 'ladder', titulo: 'SUBE', sub: 'Peldaños B2 → C1 con juez', Icon: TrendingUp },
];
// Referencias conservadas para cuando se re-activen las entradas de arriba.
void Dna;
void TrendingUp;

export function MenuSheet({
  open,
  onClose,
  onPersonalizar,
}: {
  open: boolean;
  onClose: () => void;
  /** Abre el personalizador del aurora del Home (hoja aparte). */
  onPersonalizar: () => void;
}) {
  const setView = useApp((s) => s.setView);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="velo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <motion.div
            key="hoja"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            initial={{ y: '104%' }}
            animate={{ y: 0 }}
            exit={{ y: '104%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--glass-border)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
                menú
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar menú"
                className="text-muted-foreground hover:text-foreground inline-flex size-9 cursor-pointer items-center justify-center rounded-xl"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {/* PERSONALIZAR: el aurora del Home a tu gusto (paletas, masas,
                  luz, intensidad, velocidad). Vive primero: es la entrada
                  nueva del brief del Home. */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPersonalizar();
                }}
                className="flex cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors hover:bg-[var(--superficie-t)]"
                style={{ borderColor: 'var(--borde-sutil)' }}
              >
                <Palette className="size-5 shrink-0" strokeWidth={2} style={{ color: 'var(--accent)' }} />
                <span className="flex flex-col">
                  <span className="font-display text-[1.02rem] font-bold tracking-tight">PERSONALIZAR</span>
                  <span className="text-[0.8rem]" style={{ color: 'var(--text-secondary)' }}>
                    El botón del inicio, a tu gusto
                  </span>
                </span>
              </button>

              {ENTRADAS.map(({ view, titulo, sub, Icon }) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => {
                    setView(view);
                    onClose();
                  }}
                  className="flex cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors hover:bg-[var(--superficie-t)]"
                  style={{ borderColor: 'var(--borde-sutil)' }}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={2} style={{ color: 'var(--accent)' }} />
                  <span className="flex flex-col">
                    <span className="font-display text-[1.02rem] font-bold tracking-tight">{titulo}</span>
                    <span className="text-[0.8rem]" style={{ color: 'var(--text-secondary)' }}>
                      {sub}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-[0.74rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Perfil, nivel, intereses, premium y cuenta llegan con la fase de sincronización.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
