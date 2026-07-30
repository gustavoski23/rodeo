import { useEffect, useRef, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { onCostChange } from '@/lib/api';
import { pedirPermisoMic } from '@/lib/permisos';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useTalk, type TalkMode } from '@/stores/talk';

import { CharlaEmpty } from './charla-empty';
import { CharlaSession } from './charla-session';
import { DebriefSheet } from './debrief-sheet';
import EscenasPane from './escenas';
import { FirstTip } from './first-tip';
import { useCoachTurn } from './use-coach-turn';

/* Vista TALK — port de #view-talk (public/legacy.html:2318-2522) y del handler
   del toggle .talk-tab (L3678-3699).

   ESCENAS entra por import normal. Estuvo detrás de un lazy() mientras el pane
   era un placeholder; ahora que existe de verdad, partir el bundle por aquí
   solo compraría un parpadeo: los dos panes comparten el motor de turnos, el
   glosado, la voz y el mic, así que lo que quedaba del otro lado del corte era
   poco más que su portada. */

const TABS: { modo: TalkMode; label: string }[] = [
  { modo: 'charla', label: 'CHARLA' },
  { modo: 'escenas', label: 'ESCENAS' },
];

const idTab = (m: TalkMode) => `rd-talk-tab-${m}`;
const idPanel = (m: TalkMode) => `rd-talk-panel-${m}`;

/* Misma COLUMNA que la sesión de charla y que SLANG: la portada de TALK deja
   de ser una sábana y comparte ancho y centro con lo que hay debajo. Se
   redeclara aquí a propósito (convención del repo: cada fichero la suya). */
const COLUMNA = 'mx-auto w-full max-w-[640px]';

export default function TalkView() {
  const talkMode = useTalk((s) => s.talkMode);
  const setTalkMode = useTalk((s) => s.setTalkMode);
  const session = useTalk((s) => s.session);
  const enSesion = useTalk((s) => s.session !== null || s.roleplayActivo);
  const setView = useApp((s) => s.setView);
  const motor = useCoachTurn();
  const tablistRef = useRef<HTMLDivElement | null>(null);

  /* El ticker de coste. En el viejo, callAPI mutaba state.cost y llamaba a
     updateCostTicker(); aquí la capa de API avisa y el store de la app guarda
     el total (rodeo_cost lo escribe api.ts, esto solo lo refleja). */
  useEffect(() => onCostChange((total) => useApp.getState().setCost(total)), []);

  /* El permiso de micrófono se pide AL ENTRAR (CHARLA y ESCENAS hablan las
     dos), no al primer toque del mic: así el navegador pregunta cuando el
     usuario acaba de decidir que quiere practicar hablando, y para cuando
     llega al botón el permiso ya está resuelto. Fire-and-forget: no bloquea el
     render ni la primera respuesta del coach. */
  useEffect(() => {
    void pedirPermisoMic();
  }, []);

  /* Patrón de tabs completo (el mismo de SLANG): ←/→ mueven entre segmentos,
     Home/End a los extremos, y solo la activa entra en el orden de Tab. Al
     moverse con flecha hay que llevar el foco, o el lector sigue anunciando la
     pestaña anterior. */
  function porTeclado(e: KeyboardEvent<HTMLDivElement>) {
    const teclas = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!teclas.includes(e.key)) return;
    e.preventDefault();
    const actual = TABS.findIndex((t) => t.modo === talkMode);
    const destino =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? TABS.length - 1
          : (actual + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    const siguiente = TABS[destino]!;
    setTalkMode(siguiente.modo);
    tablistRef.current?.querySelector<HTMLButtonElement>(`#${idTab(siguiente.modo)}`)?.focus();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección ────────────────────────────────────────────────
          Con sesión viva desaparece entera: el ← de la barra de sesión es la
          única vuelta, igual que body.rd-sesion en el viejo. Sin sesión es la
          barra canónica (← al Home + título mono) y el toggle de panes, los dos
          dentro de la COLUMNA que comparten la tarjeta y la barra de abajo.
          Dos filas a propósito: en 390 px no caben ← + título + segmentos. */}
      {!enSesion && (
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
              Talk · coach en vivo
            </span>
          </div>

          {/* Segmentado con carril: el mismo gesto de las dos píldoras de
              antes, pero la pastilla lima viaja con layoutId (layoutId propio,
              `rd-talk-segmento`, para no compartir animación con SLANG), así
              que cambiar de pane se lee como un movimiento y no como dos
              colores que parpadean. */}
          <div
            ref={tablistRef}
            role="tablist"
            aria-label="Modo de Talk"
            onKeyDown={porTeclado}
            className="flex shrink-0 gap-1 rounded-full border p-1"
            style={{ borderColor: 'var(--borde-sutil)', background: 'var(--chip-bg)' }}
          >
            {TABS.map(({ modo, label }) => {
              const activa = talkMode === modo;
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
                  onClick={() => setTalkMode(modo)}
                  className="relative min-h-10 flex-1 cursor-pointer rounded-full px-1.5 font-mono text-[0.6rem] font-bold tracking-[0.05em] whitespace-nowrap uppercase transition-colors sm:text-[0.7rem] sm:tracking-[0.08em]"
                  style={{ color: activa ? 'var(--accent-ink)' : 'var(--text-secondary)' }}
                >
                  {activa && (
                    <motion.span
                      layoutId="rd-talk-segmento"
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'var(--accent)',
                        boxShadow: '0 3px 14px color-mix(in oklch, var(--accent) 26%, transparent)',
                      }}
                      transition={{ type: 'spring', stiffness: 430, damping: 38 }}
                    />
                  )}
                  {/* `relative` para que el rótulo pinte POR ENCIMA de la
                      pastilla (va después en el DOM y ambos posicionados). */}
                  <span className="relative">{label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {talkMode === 'charla' ? (
        session ? (
          <CharlaSession motor={motor} />
        ) : (
          <CharlaEmpty onLibre={motor.startLibre} onScenario={motor.startSession} />
        )
      ) : (
        <EscenasPane />
      )}

      <FirstTip />
      <DebriefSheet />
    </div>
  );
}
