import { useEffect } from 'react';
import { motion } from 'motion/react';

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

export default function TalkView() {
  const talkMode = useTalk((s) => s.talkMode);
  const setTalkMode = useTalk((s) => s.setTalkMode);
  const session = useTalk((s) => s.session);
  const enSesion = useTalk((s) => s.session !== null || s.roleplayActivo);
  const motor = useCoachTurn();

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toggle de panes. Con sesión viva desaparece: el ← de la barra de
          sesión es la única vuelta, igual que body.rd-sesion en el viejo. */}
      {!enSesion && (
        <div role="tablist" aria-label="Modo de Talk" className="flex shrink-0 gap-2 pb-4">
          {TABS.map(({ modo, label }) => {
            const activa = talkMode === modo;
            return (
              <motion.button
                key={modo}
                type="button"
                role="tab"
                aria-selected={activa}
                whileTap={{ scale: 0.96 }}
                onClick={() => setTalkMode(modo)}
                className={cn(
                  'min-h-11 cursor-pointer rounded-full border px-[18px] py-2.5 font-mono text-[0.76rem] font-bold tracking-[0.06em] uppercase transition-colors',
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
