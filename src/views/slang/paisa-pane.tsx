import { useState } from 'react';
import { motion } from 'motion/react';

import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { useSlang } from '@/stores/slang';

import { ErrorSlang } from './error-slang';
import { PaisaCardView } from './paisa-card';

/* Pane PAISA → GRINGO — port de #slang-paisa-area (L2732-2747) y de
   translatePaisa (L4858-4917).

   El input se limpia SOLO cuando la traducción sale bien: si el modelo falla,
   la frase sigue ahí para reintentar sin volver a escribirla. Los resultados se
   apilan con el más nuevo ARRIBA (el `prepend` del viejo) — al revés que el
   feed de jerga, y es intencional: aquí lo que acabas de preguntar manda. */
export function PaisaPane() {
  const [texto, setTexto] = useState('');
  const paisa = useSlang((s) => s.paisa);
  const traduciendo = useSlang((s) => s.traduciendo);
  const errorPaisa = useSlang((s) => s.errorPaisa);
  const traducir = useSlang((s) => s.traducir);

  async function enviar() {
    const ok = await traducir(texto);
    if (ok) setTexto('');
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div>
        <p
          className="mb-3 flex items-center gap-2.5 font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          <span className="h-0.5 w-6 shrink-0 rounded-sm bg-current" />
          Paisa → gringo
        </p>
        <p className="font-display mb-3 text-[clamp(2.3rem,9.5vw,3.4rem)] leading-[0.92] font-extrabold tracking-[-0.035em]">
          ¿CÓMO DIGO
          <br />
          <span style={{ color: 'var(--accent)' }}>ESO EN INGLÉS?</span>
        </p>
        <p className="max-w-[330px] text-[0.92rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          Tu frase paisa, dicha como gringo de verdad.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void enviar();
          }}
          placeholder={'"qué chimba", "está mamando gallo"...'}
          aria-label="Expresión en español"
          className="min-h-[46px] flex-1 rounded-full border px-[18px] text-[0.95rem] outline-none"
          style={{
            background: 'var(--chip-bg)',
            borderColor: 'var(--borde-sutil)',
            color: 'var(--text-primary)',
          }}
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => void enviar()}
          disabled={traduciendo || !texto.trim()}
          aria-label="Traducir expresión"
          className="flex size-[46px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 disabled:cursor-default disabled:opacity-[0.45]"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
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
      </div>

      <div className="flex flex-col gap-4 pb-6">
        {traduciendo && (
          <div className="flex justify-center py-4" role="status" aria-live="polite">
            <PencilLoader size={4} label="Traduciendo" />
          </div>
        )}
        {!traduciendo && errorPaisa && <ErrorSlang mensaje={errorPaisa} onReintentar={() => void enviar()} />}
        {paisa.map((card) => (
          <PaisaCardView key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
