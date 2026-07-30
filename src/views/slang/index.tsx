import { useRef, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useSlang, type SlangMode } from '@/stores/slang';

import { DropBar, DropPane } from './drop-pane';
import { PaisaBar, PaisaPane, usePaisaInput } from './paisa-pane';
import './slang.css';

/* Vista SLANG — REDISEÑO al lenguaje visual del chat de CHARLA (encargo de Gus:
   "rediséñenla con el chat de conversación libre y que tenga botón de regresar").

   Lo que se copia de src/views/talk/charla-session.tsx (sin editar nada de allí):
   · COLUMNA de 640 px centrada compartida por barra de arriba, tarjeta y barra
     de abajo — antes los mandos se estiraban a todo el ancho;
   · barra de sesión con el ← redondo (borde --borde-sutil sobre --bg-surface) y
     el título mono uppercase pequeño en --accent;
   · el contenido vive DENTRO de una <Card> rounded-[22px] shadow-sm que hace de
     scroller, con la barra de scroll apagada por utilidades (SIN_BARRA);
   · la acción principal baja a una barra inferior, como la ConversationBar: el
     botón DROP en CALLE/TRABAJO y el compositor de frase en PAISA.

   Lo que NO cambia (funcionalidad intacta): los tres modos y su patrón de tabs
   accesible (flechas + roving tabindex), CALLE y TRABAJO comparten feed y solo
   cambian la categoría del prompt, PAISA sigue siendo su isla con resultados
   invertidos, y el modo NO se persiste (al recargar vuelve a CALLE).

   Alcance sin tocar: el "DROP del día" (rodeo_drop_hoy / rodeo_drop_manana) es
   el motor de STORY — ver la nota de alcance en `src/stores/slang.ts`. */

const TABS: { modo: SlangMode; label: string }[] = [
  { modo: 'calle', label: 'CALLE' },
  { modo: 'trabajo', label: 'TRABAJO' },
  { modo: 'paisa', label: 'PAISA → GRINGO' },
];

const idTab = (m: SlangMode) => `rd-slang-tab-${m}`;
/* CALLE y TRABAJO comparten pane (mismo feed), así que comparten panel: el
   tabpanel se identifica por el pane que se está pintando, no por la pestaña. */
const idPanel = (m: SlangMode) => `rd-slang-panel-${m === 'paisa' ? 'paisa' : 'drop'}`;

/* Mismas dos constantes que la sesión de charla, con el mismo porqué: la vista
   es una COLUMNA (no una sábana) y el scroll funciona sin pintar barra. */
const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

export default function SlangView() {
  const mode = useSlang((s) => s.mode);
  const setMode = useSlang((s) => s.setMode);
  const setView = useApp((s) => s.setView);
  const tablistRef = useRef<HTMLDivElement | null>(null);

  /* El compositor de PAISA vive en la barra de abajo y sus resultados en la
     tarjeta, así que el texto se sostiene aquí (un solo hook, siempre montado:
     en CALLE/TRABAJO simplemente no se usa). Sin esto, el "Intentar de nuevo"
     del error —que se pinta dentro del feed— no podría reenviar la frase. */
  const paisa = usePaisaInput();

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
      {/* ── Barra de sección ────────────────────────────────────────────────
          En la MISMA columna que la tarjeta y la barra de abajo. Dos filas a
          propósito: en 390 px no caben el ← + el título + los tres segmentos. */}
      <div className={cn(COLUMNA, 'flex shrink-0 flex-col gap-2.5 pb-3')}>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setView('home')}
            aria-label="Volver al inicio"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
            style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          >
            <ArrowLeft size={17} strokeWidth={2} />
          </motion.button>
          <span
            className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            Slang · el que sí se usa
          </span>
        </div>

        {/* Segmentos: el mismo gesto de las píldoras de antes, pero agrupadas en
            un control con carril. La pastilla lima viaja con layoutId (motion),
            así que el cambio de modo se lee como un movimiento y no como dos
            colores que parpadean. */}
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Modo de Slang"
          onKeyDown={porTeclado}
          className="flex shrink-0 gap-1 rounded-full border p-1"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--chip-bg)' }}
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
                whileTap={{ scale: 0.97 }}
                onClick={() => setMode(modo)}
                className="relative min-h-10 flex-1 cursor-pointer rounded-full px-1.5 font-mono text-[0.6rem] font-bold tracking-[0.05em] whitespace-nowrap uppercase transition-colors sm:text-[0.7rem] sm:tracking-[0.08em]"
                style={{ color: activa ? 'var(--accent-ink)' : 'var(--text-secondary)' }}
              >
                {activa && (
                  <motion.span
                    layoutId="rd-slang-segmento"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'var(--accent)',
                      boxShadow: '0 3px 14px color-mix(in oklch, var(--accent) 26%, transparent)',
                    }}
                    transition={{ type: 'spring', stiffness: 430, damping: 38 }}
                  />
                )}
                {/* `relative` para que el rótulo pinte POR ENCIMA de la pastilla
                    (va después en el DOM y ambos quedan posicionados). */}
                <span className="relative">{label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── La tarjeta ──────────────────────────────────────────────────────
          Un solo scroller para los dos panes, como #slang-scroll en el viejo.
          Hace de tabpanel: es scrollable, así que lleva tabIndex 0 para poder
          recorrerlo con teclado. */}
      <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
        <div
          role="tabpanel"
          id={idPanel(mode)}
          aria-labelledby={idTab(mode)}
          tabIndex={0}
          className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 sm:px-4', SIN_BARRA)}
        >
          {mode === 'paisa' ? <PaisaPane onReintentar={paisa.enviar} /> : <DropPane />}
        </div>
      </Card>

      {/* ── La barra de abajo ───────────────────────────────────────────────
          El sitio del que la charla dispara su turno: aquí dispara el DROP o la
          traducción, según el modo. */}
      <div className={cn(COLUMNA, 'shrink-0 pt-3')}>
        {mode === 'paisa' ? <PaisaBar ctrl={paisa} /> : <DropBar />}
      </div>
    </div>
  );
}
