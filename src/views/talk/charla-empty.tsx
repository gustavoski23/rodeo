import { useState, type FormEvent, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { BorderBeam as PulseBeam } from 'border-beam';
import { Send } from 'lucide-react';

import { GlassButton } from '@/components/ui/sign-up';
import { cn } from '@/lib/utils';
import { esTemaClaro } from '@/lib/theme';
import { useApp } from '@/stores/app';

/* Estado vacío de CHARLA — REDISEÑO (encargo de Gus): fuera la tarjeta de
   "producción básica" (saludo por nombre + bloque de Dibujo libre + los 9
   chips de escenario). En su lugar, un CHAT PURO: un compositor minimal
   envuelto en el Border Beam "Pulse" (border-beam.com), flotando centrado.
   Escribes en inglés, envías, y arranca la conversación libre con el coach
   (tu mensaje es el primer turno; el coach responde). Los chips de escenario
   no volvieron: se fueron con el rediseño y su última casa —la pestaña
   ESCENAS— se borró entera el 2026-08-17.

   Border Beam: paquete `border-beam` (pulse-inner). colorVariant "sunset"
   (naranja-amarillo-rojo, CERO verde) por REGLA 7 del contrato —no el
   "colorful" arcoíris de la referencia, que trae verde. El tema (claro/oscuro/
   gradiente) se mapea al modo dark/light del beam desde el store. */

const COLUMNA = 'mx-auto w-full max-w-[640px]';

/* GlassButton (sign-up.tsx, INTOCABLE) envuelve el <button> en un <div> con un
   onClick "click fix" que, si el evento no nace del botón exacto, vuelve a
   dispararlo — DOS ejecuciones por toque. Enviar dos veces abriría la sesión y
   duplicaría el turno. Se corta la propagación en el propio botón (mismo patrón
   que la sesión de charla): el div nunca recibe el evento y su fix no corre. */
const unSoloClick =
  (fn: () => void) =>
  (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fn();
  };

export function CharlaEmpty({ onSend }: { onSend: (texto: string) => void }) {
  const tema = useApp((s) => s.tema);
  const beamTheme = esTemaClaro(tema) ? 'light' : 'dark';
  const [texto, setTexto] = useState('');

  const enviar = () => {
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    onSend(t);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    enviar();
  };

  const vacio = !texto.trim();

  return (
    /* SIN role="tabpanel". Lo llevaba junto con id="rd-talk-panel-charla" y
       aria-labelledby="rd-talk-tab-charla" cuando TALK era dos pestañas; al
       borrarse ESCENAS y con ella el tablist, ese aria-labelledby apuntaba a un
       id que ya no existe —referencia colgante en el árbol de accesibilidad— y
       un tabpanel sin tab no significa nada. Ahora es lo que es: el cuerpo de
       la vista. El tabIndex={0} también se va: un div sin rol no debe estar en
       el orden de tabulación (parada muerta para quien navega con teclado). */
    <div className={cn(COLUMNA, 'flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-1 pb-4')}>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-[440px] text-center text-[0.95rem] leading-[1.5]"
        style={{ color: 'var(--text-secondary)' }}
      >
        Escribe en inglés lo que quieras y arranca. Te sigo el hilo y te corrijo
        sin cortarte el flow.
      </motion.p>

      {/* Compositor con Border Beam "Pulse" (sunset, cero verde). El beam
          autodetecta el radio del hijo; se lo paso explícito por robustez. */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.06 }}
        className="w-full max-w-[560px]"
      >
        <PulseBeam
          size="pulse-inner"
          colorVariant="sunset"
          staticColors
          theme={beamTheme}
          borderRadius={20}
          className="w-full"
        >
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 rounded-[20px] border px-2.5 py-2"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-sutil)' }}
          >
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-label="Escribe en inglés para empezar a hablar"
              placeholder="Escribe en inglés y arranca…"
              autoComplete="off"
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-[1rem] outline-none placeholder:text-[var(--text-muted)]"
              style={{ color: 'var(--text-primary)' }}
            />
            <GlassButton
              type="submit"
              size="icon"
              onClick={unSoloClick(enviar)}
              disabled={vacio}
              aria-label="Empezar a hablar"
              className={cn('shrink-0', vacio && 'pointer-events-none opacity-40')}
              contentClassName="text-[var(--text-primary)]!"
            >
              <Send size={17} />
            </GlassButton>
          </form>
        </PulseBeam>
      </motion.div>
    </div>
  );
}
