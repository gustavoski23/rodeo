/* Mini-chat "úsalo tú" — invita a usar el slang/phrasal verb en una frase propia
   y lo corrige: felicitación pequeña si suena natural, o explica por qué no.
   El juicio real lo hace la AI (api/chat.js) en la integración; aquí va el
   evaluador local para el demo (ver @/lib/pelala/coach). */

import { useEffect, useRef, useState } from 'react';

import confetti from 'canvas-confetti';
import { Send } from 'lucide-react';

import type { SlangTerm } from '@/content/pelala/deck';
import { evaluarUso, type Veredicto } from '@/lib/pelala/coach';

const BURBUJA: Record<Veredicto['estado'], string> = {
  bien: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  forzado: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  falta: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300',
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
      className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        Ahora úsalo tú — escribe una frase con{' '}
        <span className="font-bold text-neutral-800 dark:text-neutral-100">
          «{term.term}»
        </span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          aria-label="Hablar (próximamente)"
          title="Hablar — se conecta al STT en la integración"
        >
          🎤
        </button>
        <input
          value={frase}
          onChange={(e) => setFrase(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void enviar();
          }}
          placeholder={`p. ej. usa "${term.term}"…`}
          className="h-10 flex-1 rounded-full border border-neutral-300 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
        />
        <button
          type="button"
          onClick={() => void enviar()}
          disabled={!frase.trim() || revisando}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgb(36,126,245)] text-white transition hover:opacity-90 disabled:opacity-40"
          aria-label="Enviar"
        >
          <Send size={16} />
        </button>
      </div>

      {revisando && (
        <p className="mt-2 text-xs text-neutral-400">Revisando…</p>
      )}
      {veredicto && (
        <div
          className={
            'mt-2 rounded-xl border px-3 py-2 text-sm ' + BURBUJA[veredicto.estado]
          }
        >
          {veredicto.mensaje}
        </div>
      )}
    </div>
  );
}
