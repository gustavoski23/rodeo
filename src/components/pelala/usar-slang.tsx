/* Mini-chat "úsalo tú" — invita a usar el slang/phrasal verb en una frase propia
   y lo corrige: felicitación pequeña si suena natural, o explica por qué no.
   El juicio real lo hace la AI (api/chat.js) en la integración; aquí va el
   evaluador local para el demo (ver @/lib/pelala/coach).

   REDISEÑO al contrato visual: CERO colores crudos (neutral-x, dark:) — todo por
   tokens del tema. Segunda pasada (auditoría de pulido): se lee como CONVERSACIÓN
   —burbuja del usuario a la derecha, respuesta del tutor a la izquierda con avatar—
   y el input se vacía al enviar. Antes era un input + una caja de validación a
   ancho completo, que parecía un formulario, no un chat. */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

import confetti from 'canvas-confetti';
import { Mic, Send, Sparkles } from 'lucide-react';

import type { SlangTerm } from '@/content/pelala/deck';
import { evaluarUso, type Veredicto } from '@/lib/pelala/coach';

/* Tinte de la burbuja del tutor por token semántico (color-mix para fondo/borde;
   el texto va en --text-primary para leerse en cualquier tema). */
const TINTE: Record<Veredicto['estado'], { bg: string; border: string }> = {
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
      className="mt-3 rounded-[22px] p-4"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--borde-sutil)', boxShadow: 'var(--sticker-shadow)' }}
    >
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
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
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
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
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
            pendiente de voz. Marcado como no disponible para AT. */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full opacity-60"
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
          aria-label={`Escribe una frase usando ${term.term}`}
          placeholder={`p. ej. usa “${term.term}”…`}
          className="h-10 min-w-0 flex-1 rounded-full px-4 text-[0.9rem] outline-none transition placeholder:text-[var(--text-muted)]"
          style={{ background: 'var(--bg-deep)', border: '1px solid var(--borde-sutil)', color: 'var(--text-primary)' }}
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
    </div>
  );
}
