/* Mini-chat "úsalo tú" — invita a usar el slang/phrasal verb en una frase propia
   y lo corrige: felicitación pequeña si suena natural, o explica por qué no.
   El juicio real lo hace la AI (api/chat.js) en la integración; aquí va el
   evaluador local para el demo (ver @/lib/pelala/coach).

   REDISEÑO al contrato visual: CERO colores crudos (neutral-x, dark:) — todo por
   tokens del tema. Segunda pasada (auditoría de pulido): se lee como CONVERSACIÓN
   —burbuja del usuario a la derecha, respuesta del tutor a la izquierda con avatar—
   y el input se vacía al enviar. Antes era un input + una caja de validación a
   ancho completo, que parecía un formulario, no un chat.

   AHORA es la ZONA DE PRÁCTICA del DockPractica: ya no trae caja propia (fondo,
   borde ni sombra) — solo un divisor superior (border-top) que la separa del
   significado dentro de la MISMA superficie glass. El borde animado lo pinta el
   dock (BorderBeam del paquete, config en el store useBeam). Los mandos
   mic/enviar (GlassButton) se quedan EXACTOS: es el vidrio que Gus marcó como
   bueno en la captura. */

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { motion } from 'motion/react';

import confetti from 'canvas-confetti';
import { Mic, Send, Sparkles } from 'lucide-react';

import { GlassButton, GlassStyles } from '@/components/ui/sign-up';
import type { SlangTerm } from '@/content/pelala/deck';
import { evaluarUso, type Veredicto } from '@/lib/pelala/coach';
import { cn } from '@/lib/utils';

/* Tinte de la burbuja del tutor por token semántico (color-mix para fondo/borde;
   el texto va en --text-primary para leerse en cualquier tema).

   REGLA 7 del contrato (pedido de Gus, ya aplicada en la sesión de charla): el
   verde lima es "el verde de producción / AI-slop" y NO va en NINGUNA parte. El
   estado 'bien' usaba var(--success) —que es la MISMA lima que --accent— así que
   pasa a un tinte NEUTRO premium (film de --text-primary): "correcto" se celebra
   con el confeti y el mensaje, no con verde. 'forzado' (ámbar) y 'falta' (coral)
   se quedan: no son verdes y su semántica de aviso/error es estándar. */
const TINTE: Record<Veredicto['estado'], { bg: string; border: string }> = {
  bien: {
    bg: 'color-mix(in oklch, var(--text-primary) 9%, transparent)',
    border: 'color-mix(in oklch, var(--text-primary) 22%, transparent)',
  },
  forzado: {
    bg: 'color-mix(in oklch, var(--warn) 16%, transparent)',
    border: 'color-mix(in oklch, var(--warn) 40%, transparent)',
  },
  falta: {
    bg: 'var(--danger-dim)',
    border: 'color-mix(in oklch, var(--danger) 34%, transparent)',
  },
};

/* GlassButton (sign-up.tsx, INTOCABLE) envuelve el <button> en un <div> con un
   onClick "click fix" que, si el evento no nace del botón exacto, vuelve a
   dispararlo — DOS ejecuciones por toque. Enviar dos veces duplicaría el turno
   del usuario. Se corta la propagación en el propio botón (mismo patrón que la
   sesión de charla): el div nunca recibe el evento y su fix no corre. */
const unSoloClick =
  (fn: () => void) =>
  (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fn();
  };

type Mensaje =
  | { rol: 'user'; texto: string }
  | { rol: 'tutor'; texto: string; estado: Veredicto['estado'] };

export function UsarSlang({ term }: { term: SlangTerm }) {
  const [frase, setFrase] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [revisando, setRevisando] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  /* Reset al cambiar de término (al pelar y entrar el siguiente). */
  useEffect(() => {
    setFrase('');
    setMensajes([]);
    setRevisando(false);
  }, [term.id]);

  const enviar = async () => {
    const t = frase.trim();
    if (!t || revisando) return;
    setMensajes((m) => [...m, { rol: 'user', texto: t }]);
    setFrase('');
    setRevisando(true);
    const v = await evaluarUso(term, t);
    setMensajes((m) => [...m, { rol: 'tutor', texto: v.mensaje, estado: v.estado }]);
    setRevisando(false);
    if (v.estado === 'bien') celebrar();
  };

  /* Felicitación CONTENIDA: burst denso y corto que cae rápido (ticks bajos +
     gravity alta + poca velocidad de salida) y se origina en la parte baja del
     chat, para que no se quede flotando sobre el texto de las burbujas ni suba
     hasta la definición/sticker (auditoría). */
  const celebrar = () => {
    const host = hostRef.current;
    const opts: confetti.Options = {
      particleCount: 55,
      spread: 58,
      scalar: 0.7,
      ticks: 55,
      startVelocity: 18,
      gravity: 1.8,
      decay: 0.92,
      /* Paleta AURORA (rosa/durazno/crema/blanco), NO la de canvas-confetti por
         defecto —que incluye lima #88ff5a y amarillo-verde #fcff42—: REGLA 7,
         cero verde ni siquiera en el confeti. Hace juego con el borde-pulso. */
      colors: ['#B85D8A', '#D99C66', '#EBE0C5', '#ffffff'],
    };
    if (host) {
      const r = host.getBoundingClientRect();
      opts.origin = {
        x: (r.left + r.width / 2) / window.innerWidth,
        y: (r.bottom - r.height * 0.12) / window.innerHeight,
      };
    }
    void confetti(opts);
  };

  return (
    <div
      ref={hostRef}
      className="relative p-4"
      /* Sin caja propia: es la zona de práctica DENTRO del dock. El único borde
         es el DIVISOR superior (hairline) que la separa del significado en la
         misma superficie glass. El material del vidrio (vidrio-tema) y la sombra
         los pone el DockPractica, que es ancestro. */
      style={{ borderTop: '1px solid var(--borde-sutil)' }}
    >
      {/* CSS del vidrio del login para los mandos (mic/enviar): .glass-button* y
          los @property se montan una vez aquí; las crudas --background/--foreground
          por tema las declara `vidrio-tema` en el DockPractica ancestro. */}
      <GlassStyles />

      {/* Intro (solo si aún no hay turnos). */}
      {mensajes.length === 0 && (
        <p className="mb-3 text-[0.8rem]" style={{ color: 'var(--text-secondary)' }}>
          Ahora úsalo tú: escribe{' '}
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>«{term.term}»</span>{' '}
          en una frase y te digo si suena natural.
        </p>
      )}

      {/* Log de conversación. */}
      {mensajes.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {mensajes.map((m, i) =>
            m.rol === 'user' ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                className="max-w-[85%] self-end rounded-2xl rounded-br-md px-3.5 py-2 text-[0.85rem] leading-snug"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                {m.texto}
              </motion.div>
            ) : (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                className="flex max-w-[92%] items-start gap-2 self-start"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--borde-sutil)', color: 'var(--text-secondary)' }}
                >
                  <Sparkles size={14} />
                </span>
                <div
                  className="rounded-2xl rounded-bl-md px-3.5 py-2 text-[0.85rem] leading-snug"
                  style={{ background: TINTE[m.estado].bg, border: `1px solid ${TINTE[m.estado].border}`, color: 'var(--text-primary)' }}
                >
                  {m.texto}
                </div>
              </motion.div>
            ),
          )}
          {revisando && (
            <div className="flex items-center gap-2 self-start">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--borde-sutil)', color: 'var(--text-secondary)' }}
              >
                <Sparkles size={14} />
              </span>
              <span className="text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>Revisando…</span>
            </div>
          )}
        </div>
      )}

      {/* Compositor. */}
      <div className="flex items-center gap-2">
        {/* Mic — stub declarado: se conecta al STT (src/lib/speech.ts) en el
            pendiente de voz. En el vidrio del login (REGLA 7), apagado. */}
        <GlassButton
          type="button"
          size="icon"
          disabled
          aria-disabled="true"
          className="pointer-events-none shrink-0 opacity-40"
          contentClassName="text-[var(--text-muted)]!"
          aria-label="Hablar (próximamente)"
          title="Hablar — se conecta al micrófono en la próxima entrega"
        >
          <Mic size={17} />
        </GlassButton>
        <input
          value={frase}
          onChange={(e) => setFrase(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void enviar();
          }}
          aria-label={`Escribe una frase usando ${term.term}`}
          placeholder={`p. ej. usa “${term.term}”…`}
          className="h-10 min-w-0 flex-1 rounded-full px-4 text-[0.9rem] outline-none transition placeholder:text-[var(--text-muted)]"
          style={{ background: 'var(--bg-deep)', border: '1px solid var(--borde-sutil)', color: 'var(--text-primary)' }}
        />
        {/* Enviar en el vidrio del login (REGLA 7): mismo material que el gate,
            cero lima. `unSoloClick` evita el doble disparo del wrapper. */}
        <GlassButton
          type="button"
          size="icon"
          onClick={unSoloClick(() => void enviar())}
          disabled={!frase.trim() || revisando}
          aria-label="Enviar frase"
          className={cn('shrink-0', (!frase.trim() || revisando) && 'pointer-events-none opacity-40')}
          contentClassName="text-[var(--text-primary)]!"
        >
          <Send size={16} />
        </GlassButton>
      </div>
      {/* El borde animado ya NO vive aquí: era un BorderBeam viajero SIEMPRE
          activo. Ahora lo pinta el DockPractica y solo pulsa en interacción
          (foco/enviar/feedback) — Parte 4 del encargo de Gus. */}
    </div>
  );
}
