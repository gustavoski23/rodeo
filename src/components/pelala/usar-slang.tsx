/* Mini-chat "úsalo tú" — invita a usar el slang/phrasal verb en una frase propia
   y lo corrige: felicitación pequeña si suena natural, o explica por qué no.
   El juicio real lo hace la AI (api/chat.js) en la integración; aquí va el
   evaluador local para el demo (ver @/lib/pelala/coach).

   REDISEÑO al contrato visual: CERO colores crudos (neutral-x, dark:) — todo por
   tokens del tema. Mismo lenguaje de superficie que la tarjeta de significado (rounded-[22px],
   --bg-surface, --borde-sutil), botón de enviar en la lima de marca (--accent) y
   veredictos con los tokens semánticos (--success / --warn / --danger). El mic es
   stub declarado (se conecta a src/lib/speech.ts en el pendiente de STT). */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

import confetti from 'canvas-confetti';
import { Mic, Send } from 'lucide-react';

import type { SlangTerm } from '@/content/pelala/deck';
import { evaluarUso, type Veredicto } from '@/lib/pelala/coach';

/* Estilo de cada veredicto por token semántico (color-mix para el tinte del
   fondo/borde; el texto va en --text-primary para leerse en cualquier tema). */
const BURBUJA: Record<Veredicto['estado'], { bg: string; border: string }> = {
  bien: {
    bg: 'color-mix(in oklch, var(--success) 15%, transparent)',
    border: 'color-mix(in oklch, var(--success) 38%, transparent)',
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

export function UsarSlang({ term }: { term: SlangTerm }) {
  const [frase, setFrase] = useState('');
  const [veredicto, setVeredicto] = useState<Veredicto | null>(null);
  const [revisando, setRevisando] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  /* Reset al cambiar de término (al pelar y entrar el siguiente). */
  useEffect(() => {
    setFrase('');
    setVeredicto(null);
    setRevisando(false);
  }, [term.id]);

  const enviar = async () => {
    if (!frase.trim() || revisando) return;
    setRevisando(true);
    setVeredicto(null);
    const v = await evaluarUso(term, frase);
    setVeredicto(v);
    setRevisando(false);
    if (v.estado === 'bien') celebrar();
  };

  /* Felicitación pequeña, centrada sobre el chat. */
  const celebrar = () => {
    const host = hostRef.current;
    const opts: confetti.Options = { particleCount: 45, spread: 60, scalar: 0.7, ticks: 120 };
    if (host) {
      const r = host.getBoundingClientRect();
      opts.origin = {
        x: (r.left + r.width / 2) / window.innerWidth,
        y: (r.top + r.height / 2) / window.innerHeight,
      };
    }
    void confetti(opts);
  };

  return (
    <div
      ref={hostRef}
      className="mt-3 rounded-[22px] p-4"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--borde-sutil)' }}
    >
      <p className="mb-2.5 text-[0.8rem]" style={{ color: 'var(--text-secondary)' }}>
        Ahora úsalo tú: escribe{' '}
        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>«{term.term}»</span>{' '}
        en una frase y te digo si suena natural.
      </p>

      <div className="flex items-center gap-2">
        {/* Mic — stub declarado: se conecta al STT (src/lib/speech.ts) en el
            pendiente de voz. Estilado conforme para no romper el visual. */}
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--borde-sutil)', color: 'var(--text-muted)' }}
          aria-label="Hablar (próximamente)"
          title="Hablar — se conecta al micrófono en la próxima entrega"
        >
          <Mic size={17} />
        </button>
        <input
          value={frase}
          onChange={(e) => setFrase(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void enviar();
          }}
          placeholder={`p. ej. usa “${term.term}”…`}
          className="h-10 min-w-0 flex-1 rounded-full px-4 text-[0.9rem] outline-none transition placeholder:text-[var(--text-muted)]"
          style={{ background: 'var(--bg-void)', border: '1px solid var(--borde-sutil)', color: 'var(--text-primary)' }}
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => void enviar()}
          disabled={!frase.trim() || revisando}
          className="flex size-10 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          aria-label="Enviar frase"
        >
          <Send size={16} />
        </motion.button>
      </div>

      {revisando && (
        <p className="mt-2.5 text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>Revisando…</p>
      )}
      {veredicto && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="mt-2.5 rounded-2xl px-3.5 py-2.5 text-[0.85rem] leading-snug"
          style={{
            background: BURBUJA[veredicto.estado].bg,
            border: `1px solid ${BURBUJA[veredicto.estado].border}`,
            color: 'var(--text-primary)',
          }}
        >
          {veredicto.mensaje}
        </motion.div>
      )}
    </div>
  );
}
