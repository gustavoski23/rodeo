import { useRef, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';

import { cn } from '@/lib/utils';
import { useSlang, type SlangMode } from '@/stores/slang';

import { DropPane } from './drop-pane';
import { PaisaPane } from './paisa-pane';
import './slang.css';

/* Vista SLANG — port de #view-slang (public/legacy.html:2696-2749) y de todo su
   JS (L4719-4917). Tres pills, dos panes: CALLE y TRABAJO comparten feed (solo
   cambia la categoría del prompt) y PAISA es su propia isla con input y
   resultados invertidos.

   El modo NO se persiste: al recargar vuelve a CALLE, igual que el viejo.

   Alcance: esta vista es SLANG. El "DROP del día" (lectura diaria con caché
   rodeo_drop_hoy / rodeo_drop_manana) es el motor de STORY — ver la nota de
   alcance en `src/stores/slang.ts`. */

const TABS: { modo: SlangMode; label: string }[] = [
  { modo: 'calle', label: 'CALLE' },
  { modo: 'trabajo', label: 'TRABAJO' },
  { modo: 'paisa', label: 'PAISA → GRINGO' },
];

const idTab = (m: SlangMode) => `rd-slang-tab-${m}`;
/* CALLE y TRABAJO comparten pane (mismo feed), así que comparten panel: el
   tabpanel se identifica por el pane que se está pintando, no por la pestaña. */
const idPanel = (m: SlangMode) => `rd-slang-panel-${m === 'paisa' ? 'paisa' : 'drop'}`;

export default function SlangView() {
  const mode = useSlang((s) => s.mode);
  const setMode = useSlang((s) => s.setMode);
  const tablistRef = useRef<HTMLDivElement | null>(null);

  /* Patrón de tabs completo: flechas ←/→ mueven entre pestañas (Home/End a los
     extremos) y solo la activa entra en el orden de Tab (roving tabindex). Al
     moverse con flecha hay que llevar el foco a la nueva pestaña, o el lector de
     pantalla se queda anunciando la anterior. */
  function porTeclado(e: KeyboardEvent<HTMLDivElement>) {
    const teclas = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!teclas.includes(e.key)) return;
    e.preventDefault();
    const actual = TABS.findIndex((t) => t.modo === mode);
    const destino =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? TABS.length - 1
          : (actual + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    const siguiente = TABS[destino]!;
    setMode(siguiente.modo);
    tablistRef.current?.querySelector<HTMLButtonElement>(`#${idTab(siguiente.modo)}`)?.focus();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Modo de Slang"
        onKeyDown={porTeclado}
        className="flex shrink-0 gap-2 overflow-x-auto pb-4"
      >
        {TABS.map(({ modo, label }) => {
          const activa = mode === modo;
          return (
            <motion.button
              key={modo}
              type="button"
              role="tab"
              id={idTab(modo)}
              aria-selected={activa}
              aria-controls={idPanel(modo)}
              tabIndex={activa ? 0 : -1}
              whileTap={{ scale: 0.96 }}
              onClick={() => setMode(modo)}
              className={cn(
                'min-h-11 shrink-0 cursor-pointer rounded-full border px-[18px] py-2.5 font-mono text-[0.76rem] font-bold tracking-[0.06em] whitespace-nowrap uppercase transition-colors',
              )}
              style={
                activa
                  ? {
                      color: 'var(--accent-ink)',
                      background: 'var(--accent)',
                      borderColor: 'var(--accent)',
                      boxShadow: '0 3px 14px color-mix(in oklch, var(--accent) 30%, transparent)',
                    }
                  : { color: 'var(--text-secondary)', background: 'transparent', borderColor: 'var(--borde-sutil)' }
              }
            >
              {label}
            </motion.button>
          );
        })}
      </div>

      {/* Un solo scroller para los dos panes, como #slang-scroll en el viejo.
          Hace de tabpanel: es scrollable, así que lleva tabIndex 0 para que se
          pueda recorrer con teclado. */}
      <div
        role="tabpanel"
        id={idPanel(mode)}
        aria-labelledby={idTab(mode)}
        tabIndex={0}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {mode === 'paisa' ? <PaisaPane /> : <DropPane />}
      </div>
    </div>
  );
}
