import { useEffect, useRef, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { GlassButton, GlassStyles } from '@/components/ui/sign-up';
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
    /* `vidrio-tema` (aurora.css) va en la RAÍZ, no solo en la cabecera: declara
       las dos crudas --background/--foreground que consume el CSS del vidrio
       (GlassStyles) y tiene que alcanzar también al CTA de la portada y a los
       botones de la sesión, que se pintan más abajo en este mismo árbol. Solo
       declara variables: ni layout, ni fondo, ni tamaño. */
    <div className="vidrio-tema flex min-h-0 flex-1 flex-col">
      {/* El CSS del vidrio (@property --angle-1/-2, .glass-button*) se monta UNA
          vez aquí: fuera del gate no existe en ningún otro sitio, y todo lo que
          usa vidrio en TALK (tabs, CTA, barra de audio de la sesión) cuelga de
          este árbol. */}
      <GlassStyles />

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

          {/* Segmentado en VIDRIO (regla 6 del contrato): fuera el carril con
              pastilla lima; cada pane es ahora un GlassButton del login, el
              mismo material. El vidrio NO se tiñe al activarse — la pestaña
              activa se marca tipográficamente (negrita + subrayado en
              var(--accent)), que es lo que distingue sin romper el material.

              El wrapper de GlassButton mete un <div> entre el tablist y cada
              <button role="tab">, así que la relación ARIA se declara con
              aria-owns: el patrón de tabs sigue siendo válido (tablist → tabs)
              aunque el DOM tenga el envoltorio del vidrio en medio. El
              onKeyDown sigue en el contenedor: los eventos de teclado de los
              botones burbujean hasta aquí igual que antes. */}
          <div
            ref={tablistRef}
            role="tablist"
            aria-label="Modo de Talk"
            aria-owns={TABS.map((t) => idTab(t.modo)).join(' ')}
            onKeyDown={porTeclado}
            className="flex shrink-0 flex-wrap items-center gap-3"
          >
            {TABS.map(({ modo, label }) => {
              const activa = talkMode === modo;
              return (
                <GlassButton
                  key={modo}
                  type="button"
                  size="sm"
                  role="tab"
                  id={idTab(modo)}
                  aria-selected={activa}
                  aria-controls={idPanel(modo)}
                  tabIndex={activa ? 0 : -1}
                  onClick={() => setTalkMode(modo)}
                  contentClassName={cn(
                    /* `!` porque .glass-button-text trae tracking-tighter de
                       serie y aquí el rótulo es mono espaciado. */
                    'font-mono text-[0.7rem] tracking-[0.14em]! whitespace-nowrap uppercase',
                    activa
                      ? 'font-bold underline decoration-2 underline-offset-[6px] decoration-[var(--accent)]'
                      : 'font-medium no-underline',
                  )}
                >
                  {label}
                </GlassButton>
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
