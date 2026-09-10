/* Selector de categorías de SLANG — la hoja que abre el botón «explorar» del
   header de Pélala. Lista CATEGORIAS (deck) con su conteo y marca la activa.

   Es una bottom-sheet temada con tokens (NO vidrio: el vidrio es solo el botón
   que la dispara, como pidió Gus). Cero lima (REGLA 7): la categoría activa se
   señala con tinta encendida + borde más fuerte + check, no con --accent. */

import { motion, AnimatePresence } from 'motion/react';
import { Bitcoin, Briefcase, Check, Compass, Dices, Sparkles, X, type LucideIcon } from 'lucide-react';

import { CATEGORIAS, DECK, categoriaDe, type CategoriaId } from '@/content/pelala/deck';

const ICONO_CAT: Record<CategoriaId, LucideIcon> = {
  'dia-a-dia': Sparkles,
  oficina: Briefcase,
  crypto: Bitcoin,
  aleatoria: Dices,
};

/* La categoría «aleatoria» lleva un DADO en badge de VIDRIO esmerilado (pedido de
   Gus: «un simbolito en glass de dados»). El vidrio va inline (no depende del
   vidrio-tema del dock, que no está en scope en este overlay): translúcido +
   blur + brillo superior. */
const CAT_VIDRIO: Partial<Record<CategoriaId, boolean>> = { aleatoria: true };

function conteo(cat: CategoriaId): number {
  return DECK.filter((t) => categoriaDe(t) === cat).length;
}

export function SelectorCategorias({
  abierto,
  activa,
  onElegir,
  onCerrar,
}: {
  abierto: boolean;
  activa: CategoriaId;
  onElegir: (c: CategoriaId) => void;
  onCerrar: () => void;
}) {
  return (
    <AnimatePresence>
      {abierto && (
        <>
          {/* Velo: cierra al tocar fuera. */}
          <motion.div
            key="velo"
            className="fixed inset-0 z-40"
            style={{ background: 'color-mix(in oklch, var(--bg-void) 62%, transparent)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onCerrar}
          />

          {/* Hoja: sube desde abajo; ancho de la columna en PC. */}
          <motion.div
            key="hoja"
            role="dialog"
            aria-label="Explorar categorías"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[560px] px-3 pb-[max(14px,env(safe-area-inset-bottom))]"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          >
            <div
              className="overflow-hidden rounded-[26px] p-4"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--borde-sutil)', boxShadow: 'var(--sticker-shadow)' }}
            >
              {/* Cabecera */}
              <div className="mb-3 flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--borde-sutil)', color: 'var(--text-secondary)' }}
                >
                  <Compass size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.95rem] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                    Explorar
                  </p>
                  <p className="text-[0.72rem]" style={{ color: 'var(--text-muted)' }}>
                    Elige qué inglés practicar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCerrar}
                  aria-label="Cerrar"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--borde-sutil)', color: 'var(--text-secondary)' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Categorías (con tope de alto + scroll por si crecen). */}
              <div className="flex max-h-[58dvh] flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIAS.map((c) => {
                  const Icono = ICONO_CAT[c.id];
                  const esActiva = c.id === activa;
                  const glass = !!CAT_VIDRIO[c.id];
                  return (
                    <motion.button
                      key={c.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onElegir(c.id);
                        onCerrar();
                      }}
                      aria-pressed={esActiva}
                      className="flex items-center gap-3 rounded-2xl p-3 text-left transition-colors"
                      style={{
                        background: esActiva ? 'var(--bg-elevated)' : 'var(--bg-deep)',
                        // Activa sin lima: borde más fuerte, no color de marca.
                        border: `1px solid ${esActiva ? 'var(--borde-medio)' : 'var(--borde-sutil)'}`,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                        style={
                          glass
                            ? {
                                // Dado de VIDRIO esmerilado (autocontenido).
                                background:
                                  'linear-gradient(135deg, color-mix(in oklch, var(--text-primary) 12%, transparent), color-mix(in oklch, var(--text-primary) 4%, transparent))',
                                backdropFilter: 'blur(6px)',
                                border: '1px solid color-mix(in oklch, var(--text-primary) 24%, transparent)',
                                boxShadow: 'inset 0 1px 0 color-mix(in oklch, white 34%, transparent)',
                                color: 'var(--text-primary)',
                              }
                            : {
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--borde-sutil)',
                                color: esActiva ? 'var(--text-primary)' : 'var(--text-secondary)',
                              }
                        }
                      >
                        <Icono size={20} strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[0.95rem] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                            {c.label}
                          </p>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold"
                            style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)' }}
                          >
                            {conteo(c.id)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[0.76rem] leading-snug" style={{ color: 'var(--text-muted)' }}>
                          {c.desc}
                        </p>
                      </div>
                      {esActiva && (
                        <span aria-hidden="true" className="shrink-0" style={{ color: 'var(--text-primary)' }}>
                          <Check size={18} strokeWidth={2.5} />
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
