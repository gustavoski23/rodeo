import { useCallback, useState } from 'react';
import { motion } from 'motion/react';

import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { Card } from '@/components/ui/card';
import { useSlang } from '@/stores/slang';

import { ErrorSlang } from './error-slang';
import { JergaCardView } from './jerga-card';

/* Pane JERGA → GRINGO — REDISEÑO al lenguaje del chat de CHARLA.

   La vista se parte en dos como el chat: los resultados viven en la tarjeta
   (arriba) y el compositor —input + botón de enviar— baja a la barra inferior,
   donde la charla tiene su ConversationBar. El héroe de landing pasa a estado
   vacío centrado dentro de la tarjeta.

   Comportamiento intacto: el input se limpia SOLO cuando la traducción sale
   bien (si el modelo falla, la frase sigue ahí para reintentar sin volver a
   escribirla) y los resultados se apilan con el más nuevo ARRIBA (el `prepend`
   del viejo) — al revés que el feed de jerga, y es intencional: aquí lo que
   acabas de preguntar manda.

   El texto del input lo sostiene la vista (index.tsx) con este hook, porque el
   campo y el botón "Intentar de nuevo" del error viven en dos sitios distintos
   del layout nuevo y tienen que compartir la misma frase. */
export function useJergaInput() {
  const [texto, setTexto] = useState('');
  const traducir = useSlang((s) => s.traducir);
  const traduciendo = useSlang((s) => s.traduciendo);

  const enviar = useCallback(async () => {
    const ok = await traducir(texto);
    if (ok) setTexto('');
  }, [texto, traducir]);

  return { texto, setTexto, enviar, traduciendo };
}

export type JergaCtrl = ReturnType<typeof useJergaInput>;

export function JergaPane({ onReintentar }: { onReintentar: () => void }) {
  const jerga = useSlang((s) => s.jerga);
  const traduciendo = useSlang((s) => s.traduciendo);
  const errorJerga = useSlang((s) => s.errorJerga);

  const vacio = jerga.length === 0 && !traduciendo && !errorJerga;

  return (
    /* `shrink-0` por lo mismo que en DropPane: sin él, el reparto de flex del
       scroller comprime el pane y corta las tarjetas (overflow:hidden). */
    <div className="flex min-h-full shrink-0 flex-col gap-4">
      {vacio && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-9 text-center">
          <p
            className="flex items-center gap-2.5 font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            <span className="h-0.5 w-5 shrink-0 rounded-sm bg-current" />
            Jerga → gringo
            <span className="h-0.5 w-5 shrink-0 rounded-sm bg-current" />
          </p>
          <p
            className="font-display text-[1.55rem] leading-[1.06] font-extrabold tracking-[-0.025em] uppercase"
            style={{ color: 'var(--text-primary)' }}
          >
            ¿Cómo digo eso <span style={{ color: 'var(--accent)' }}>en inglés?</span>
          </p>
          <p className="max-w-[340px] text-[0.9rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
            Escribe abajo tu frase en español —como la dirías tú, con jerga y todo— y te la
            devuelvo dicha como gringo de verdad.
          </p>
        </div>
      )}

      {traduciendo && (
        <div
          className="flex items-center gap-3 rounded-[18px] border px-4 py-3.5"
          role="status"
          aria-live="polite"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--superficie-t)' }}
        >
          <PencilLoader size={3.4} label="Traduciendo" />
          <p className="font-mono text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
            traduciendo…
          </p>
        </div>
      )}
      {!traduciendo && errorJerga && <ErrorSlang mensaje={errorJerga} onReintentar={onReintentar} />}
      {jerga.map((card) => (
        <JergaCardView key={card.id} card={card} />
      ))}
    </div>
  );
}

/* ── La barra de abajo de JERGA ────────────────────────────────────────────
   Misma silueta que la ConversationBar: Card baja, campo a la izquierda y el
   botón redondo de enviar a la derecha. Enter sigue enviando. */
export function JergaBar({ ctrl }: { ctrl: JergaCtrl }) {
  const { texto, setTexto, enviar, traduciendo } = ctrl;

  return (
    <Card className="w-full flex-row items-center gap-2 rounded-[22px] p-2 shadow-lg">
      <input
        type="text"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void enviar();
        }}
        placeholder={'"qué chimba", "está mamando gallo"...'}
        aria-label="Expresión en español"
        className="min-h-[46px] min-w-0 flex-1 rounded-full border-0 bg-transparent px-3 text-[0.95rem] outline-none placeholder:text-[0.9rem]"
        style={{ color: 'var(--text-primary)' }}
      />
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => void enviar()}
        disabled={traduciendo || !texto.trim()}
        aria-label="Traducir expresión"
        className="flex size-[46px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 disabled:cursor-default disabled:opacity-[0.45]"
        style={{
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          boxShadow: '0 3px 18px color-mix(in oklch, var(--accent) 26%, transparent)',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </motion.button>
    </Card>
  );
}
