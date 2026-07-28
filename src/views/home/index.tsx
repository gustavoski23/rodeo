import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpenText, ChevronDown } from 'lucide-react';

import { AuroraPillButton } from '@/components/rodeo/aurora-pill-button';
import { MenuToggle } from '@/components/rodeo/menu-toggle';
import { useApp } from '@/stores/app';
import { lanzarLibreAurora } from '@/views/talk/use-coach-turn';

/* HOME — el de la referencia aprobada por Gus (.aurora-home): pantalla negra
   casi vacía, hamburguesa arriba a la izquierda, saludo pequeño, titular en la
   redondeada, UN AuroraPillButton "Conversación libre" y un chevron que revela
   solamente "Modo historia". Nada más: el resto de la app vive tras el menú y
   tras las vistas.

   "Conversación libre" NO navega al toque: la píldora se hunde 950 ms
   (aria-busy, bloqueada) y al soltar entra al flujo existente de dibujo libre
   con la cápsula `Pensando` (ver lanzarLibreAurora). "Modo historia" navega a
   STORY — hoy la vista placeholder hasta que se porte; el cableado ya queda. */

export default function HomeView({ menuOpen, onMenuToggle }: { menuOpen: boolean; onMenuToggle: () => void }) {
  const nombre = useApp((s) => s.nombre);
  const setView = useApp((s) => s.setView);
  const [masOpciones, setMasOpciones] = useState(false);

  function lanzar(viaTeclado: boolean) {
    if (lanzarLibreAurora({ focoVolver: viaTeclado })) setView('talk');
  }

  return (
    <div className="aurora-home flex min-h-dvh flex-col px-6 pt-5 pb-8">
      <div className="shrink-0">
        <MenuToggle open={menuOpen} onToggle={onMenuToggle} />
      </div>

      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-[1.05rem] font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-home)' }}>
          {nombre ? `Hola, ${nombre}` : 'Hola'}
        </p>
        <h1
          className="mb-7 text-[clamp(2rem,8.4vw,2.9rem)] leading-[1.05] font-extrabold tracking-tight text-balance"
          style={{ fontFamily: 'var(--font-home)' }}
        >
          ¿Qué quieres practicar hoy?
        </h1>

        <AuroraPillButton className="h-[104px]" onLaunch={lanzar}>
          Conversación libre
        </AuroraPillButton>

        {/* El chevron: revela SOLO "Modo historia" (brief). Gira al abrir. */}
        <button
          type="button"
          onClick={() => setMasOpciones((v) => !v)}
          aria-expanded={masOpciones}
          aria-label={masOpciones ? 'Ocultar más opciones' : 'Ver más opciones'}
          className="mt-4 inline-flex size-12 cursor-pointer items-center justify-center rounded-full border transition-colors hover:bg-[var(--superficie-t)]"
          style={{ borderColor: 'var(--borde-sutil)', color: 'var(--text-secondary)' }}
        >
          <motion.span
            animate={{ rotate: masOpciones ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="inline-flex"
          >
            <ChevronDown className="size-5" strokeWidth={2} />
          </motion.span>
        </button>

        <AnimatePresence>
          {masOpciones && (
            <motion.div
              key="mas"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="w-full overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setView('story')}
                className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border px-8 py-4 text-[1.02rem] font-bold transition-colors hover:bg-[var(--superficie-t)]"
                style={{ borderColor: 'var(--borde-medio)', color: 'var(--text-primary)', fontFamily: 'var(--font-home)' }}
              >
                <BookOpenText className="size-5" strokeWidth={2} style={{ color: 'var(--accent)' }} />
                Modo historia
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
