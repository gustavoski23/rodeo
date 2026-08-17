import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { GlassStyles } from '@/components/ui/sign-up';
import { onCostChange } from '@/lib/api';
import { pedirPermisoMic } from '@/lib/permisos';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useTalk } from '@/stores/talk';

import { CharlaEmpty } from './charla-empty';
import { CharlaSession } from './charla-session';
import { DebriefSheet } from './debrief-sheet';
import { FirstTip } from './first-tip';
import { useCoachTurn } from './use-coach-turn';

/* Vista TALK — port de #view-talk (public/legacy.html:2318-2522).

   TALK ES CHARLA. La pestaña ESCENAS (el roleplay de "La princesa y el
   azafrán") se borró el 2026-08-17 a pedido de Gus, con toda su feature: store,
   portada, tarjetas, sesión, prompts, motor de turnos, burbujas y hoja de
   debrief. Con un solo pane, el `role="tablist"` de dos segmentos y la
   navegación por flechas se fueron con ella — un tablist de una pestaña no es
   un tablist, y encima ocupaba una fila entera del alto que la portada
   necesita. Queda la barra canónica: ← al Home + rótulo. */

/* Misma COLUMNA que la sesión de charla y que SLANG: la portada de TALK deja
   de ser una sábana y comparte ancho y centro con lo que hay debajo. Se
   redeclara aquí a propósito (convención del repo: cada fichero la suya). */
const COLUMNA = 'mx-auto w-full max-w-[640px]';

export default function TalkView() {
  const session = useTalk((s) => s.session);
  const enSesion = session !== null;
  const setView = useApp((s) => s.setView);
  const motor = useCoachTurn();
  const barraSeccionRef = useRef<HTMLDivElement | null>(null);

  /* El ticker de coste. En el viejo, callAPI mutaba state.cost y llamaba a
     updateCostTicker(); aquí la capa de API avisa y el store de la app guarda
     el total (rodeo_cost lo escribe api.ts, esto solo lo refleja). */
  useEffect(() => onCostChange((total) => useApp.getState().setCost(total)), []);

  /* El permiso de micrófono se pide AL ENTRAR, no al primer toque del mic: así
     el navegador pregunta cuando el usuario acaba de decidir que quiere
     practicar hablando, y para cuando llega al botón el permiso ya está
     resuelto. Fire-and-forget: no bloquea el render ni la primera respuesta
     del coach. */
  useEffect(() => {
    void pedirPermisoMic();
  }, []);

  /* MEDIDA REAL para el tip de primera vez, fuera de sesión (mismo patrón que
     --rd-tip-abajo en charla-session.tsx). FirstTip traía el offset
     `top: 80px + safe-area`, calibrado contra el Header de marca que la regla 3
     ELIMINÓ: sin header, la píldora lavanda aterrizaba encima del ← , del
     rótulo «TALK · COACH EN VIVO» y a medias sobre la fila de tabs (auditoría
     r3, los tres temas). En vez de recalibrar otra constante a ojo —que es
     justo lo que caducó—, quien monta la cabecera publica dónde TERMINA de
     verdad: el borde de abajo de esta barra de sección más un respiro de 10 px.
     Se recalcula si la barra crece (tabs que envuelven al rotar, notch) y se
     retira al entrar en sesión, donde manda --rd-tip-abajo. */
  useEffect(() => {
    const el = barraSeccionRef.current;
    if (!el) {
      document.documentElement.style.removeProperty('--rd-tip-arriba');
      return;
    }
    const medir = () => {
      const y = el.getBoundingClientRect().bottom + 10;
      document.documentElement.style.setProperty('--rd-tip-arriba', `${Math.round(y)}px`);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener('resize', medir);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', medir);
      document.documentElement.style.removeProperty('--rd-tip-arriba');
    };
  }, [enSesion]);

  return (
    /* `vidrio-tema` (aurora.css) va en la RAÍZ, no solo en la cabecera: declara
       las dos crudas --background/--foreground que consume el CSS del vidrio
       (GlassStyles) y tiene que alcanzar también al CTA de la portada y a los
       botones de la sesión, que se pintan más abajo en este mismo árbol. Solo
       declara variables: ni layout, ni fondo, ni tamaño. */
    <div className="vidrio-tema flex min-h-0 flex-1 flex-col">
      {/* El CSS del vidrio (@property --angle-1/-2, .glass-button*) se monta UNA
          vez aquí: fuera del gate no existe en ningún otro sitio, y todo lo que
          usa vidrio en TALK (CTA de la portada, barra de audio de la sesión)
          cuelga de este árbol. */}
      <GlassStyles />

      {/* ── Barra de sección ────────────────────────────────────────────────
          Con sesión viva desaparece entera: el ← de la barra de sesión es la
          única vuelta, igual que body.rd-sesion en el viejo. Sin sesión es la
          barra canónica: ← al Home + rótulo, en UNA sola fila. Eran dos
          mientras existió el toggle CHARLA/ESCENAS («en 390px no caben ← +
          título + segmentos»); sin segmentos, la segunda fila era alto
          regalado. */}
      {!enSesion && (
        <div ref={barraSeccionRef} className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setView('home')}
            aria-label="Volver al inicio"
            className="rd-toque-44 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
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
      )}

      {session ? <CharlaSession motor={motor} /> : <CharlaEmpty onSend={motor.startLibreConTexto} />}

      <FirstTip />
      <DebriefSheet />
    </div>
  );
}
