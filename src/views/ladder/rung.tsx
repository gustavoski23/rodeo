import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';

import { callJSON } from '@/lib/api';
import { crearReconocedor, type Reconocedor } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { MicButton } from '@/components/rodeo/mic-button';

import { msgsJuez, type Judge } from './prompts';
import type { Rung } from '@/stores/ladder';

/* El peldaño: cara frontal (B2) → zona de intento → cara trasera (C1 + swap +
   veredicto). Port de showRung / openRungInput / revealRung / flipToBack /
   selfJudge (public/legacy.html:6931-7057).

   La diferencia con el viejo: aquí el giro es un flip 3D de verdad (rotateY
   con spring sobre .lad-flip-inner) en vez de un re-render con el rotate()
   cambiado de signo. Lo que NO cambia: las dos caras están montadas desde el
   primer frame, así que la respuesta se ve aunque la animación no llegue a
   correr (pestaña de fondo, reduced-motion). */

/* CARD_THEMES L4721-4727 — ciclo de 5 por índice. Las clases dark-text /
   light-text del viejo son legado inerte: toda card lee con tinta oscura. */
export const CARD_THEMES = [
  { bg: 'var(--card-blue)' },
  { bg: 'var(--card-green)' },
  { bg: 'var(--card-yellow)' },
  { bg: 'var(--card-coral)' },
  { bg: 'var(--card-paper)' },
];

const ROTS = [-1.2, 0.8, -0.6, 1.1, -0.9];

/* Mapa exacto del veredicto → chip (L6998-7002). Cualquier otro valor: sin
   chip (el modelo a veces inventa una cuarta etiqueta). */
const VCHIP: Record<string, { txt: string; bg: string; color: string }> = {
  nailed: { txt: 'CLAVADO', bg: 'oklch(87% 0.21 128 / 0.3)', color: 'var(--swap-new)' },
  close: { txt: 'CASI', bg: 'oklch(85% 0.16 95 / 0.4)', color: 'oklch(38% 0.11 92)' },
  off: { txt: 'BÁSICO', bg: 'oklch(66% 0.20 27 / 0.28)', color: 'oklch(34% 0.20 27)' },
};

/* El swap llega como "old→new" pero el separador varía según el humor del
   modelo. Si falta uno de los dos lados NO se pinta: no se inventa (§9.23). */
export function partirSwap(swap: string): [string, string] | null {
  const [oldW, newW] = String(swap || '')
    .split(/\s*(?:→|->|=>|➔|»)\s*/)
    .map((x) => (x || '').trim());
  return oldW && newW ? [oldW, newW] : null;
}

type Fase = 'front' | 'back';

export function RungCard({
  r,
  idx,
  total,
  combo,
  busy,
  setBusy,
  onSelfJudge,
  onSiguiente,
}: {
  r: Rung;
  idx: number;
  total: number;
  combo: number;
  busy: boolean;
  setBusy: (v: boolean) => void;
  /** selfJudge L7031: sube XP/combo/DNA. Lo hace la vista, no la tarjeta. */
  onSelfJudge: (r: Rung, nailed: boolean) => void;
  onSiguiente: () => void;
}) {
  const rot = ROTS[idx % ROTS.length];
  const theme = CARD_THEMES[idx % CARD_THEMES.length];

  const [fase, setFase] = useState<Fase>('front');
  const [zonaAbierta, setZonaAbierta] = useState(false);
  const [texto, setTexto] = useState('');
  const [attempt, setAttempt] = useState('');
  const [judge, setJudge] = useState<Judge | null>(null);
  const [esperando, setEsperando] = useState(false);
  // Guard anti doble-tap del viejo (`nb.disabled`, §9.9): una vez elegido,
  // ni dos toques rápidos ni un re-render vuelven a sumar XP.
  const [elegido, setElegido] = useState<'nailed' | 'casi' | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<Reconocedor | null>(null);
  const [grabando, setGrabando] = useState(false);

  // Un onend tardío no debe disparar el juez sobre un peldaño ya pasado.
  useEffect(() => () => recRef.current?.abort(), []);

  useEffect(() => {
    if (zonaAbierta) inputRef.current?.focus();
  }, [zonaAbierta]);

  async function revealRung(intento: string) {
    if (busy) return; // guard global compartido (§9.21)
    recRef.current?.abort();
    setGrabando(false);
    setAttempt(intento);

    let veredicto: Judge | null = null;
    if (intento) {
      // Sin intento NO se llama al modelo: "muéstrame la respuesta" es gratis.
      setBusy(true);
      setEsperando(true);
      try {
        const { parsed } = await callJSON('chat', msgsJuez(r.b2, r.c1, intento), 1500);
        veredicto = parsed as Judge;
      } catch {
        /* si el juez falla, seguimos sin él — en silencio, sin toast (§9.7) */
      }
      setEsperando(false);
      setBusy(false);
    }
    setJudge(veredicto);
    setFase('back');
  }

  function toggleMic() {
    if (grabando) {
      recRef.current?.stop();
      return;
    }
    if (!recRef.current) {
      recRef.current = crearReconocedor(
        'ladder',
        (t) => setTexto(t), // el viejo escribía el interim en el input
        (final) => {
          setGrabando(false);
          // continuous:false ⇒ el navegador corta al detectar silencio y ESE
          // es el envío. Sin texto no pasa nada (L6352).
          if (final) {
            setTexto('');
            void revealRung(final);
          }
        },
      );
    }
    if (!recRef.current) return; // sin STT: crearReconocedor ya avisó
    recRef.current.start();
    setGrabando(true);
  }

  function elegir(nailed: boolean) {
    if (elegido) return;
    setElegido(nailed ? 'nailed' : 'casi');
    onSelfJudge(r, nailed);
  }

  const swap = partirSwap(r.swap);
  const chip = judge && judge.verdict ? VCHIP[judge.verdict] : undefined;
  const esUltimo = idx + 1 >= total;

  return (
    <div>
      <div className="mb-2.5 font-mono text-[0.62rem] tracking-[0.16em] uppercase" style={{ color: 'var(--text-muted)' }}>
        Peldaño {idx + 1} / {total}
        {combo > 1 ? ` · combo x${combo}` : ''}
      </div>

      {/* rd-in: entrada de 0.9s con expo.out. Va en el envoltorio, no en las
          caras, para no pelearse con el rotateY del flip. */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="lad-flip"
        data-cara={fase}
      >
        <motion.div
          className="lad-flip-inner"
          animate={{ rotateY: fase === 'back' ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 110, damping: 17, mass: 0.9 }}
        >
          {/* ── CARA FRONTAL: el B2 ── */}
          <div className="lad-face lad-face--front" aria-hidden={fase === 'back'}>
            <div
              className="lad-card"
              style={{
                background: theme.bg,
                transform: `rotate(${rot}deg)`,
                opacity: esperando ? 0.6 : 1, // única señal de espera del viejo
                transition: 'opacity .25s ease',
              }}
            >
              <span className="lad-label-mini">B2 · {r.context_en || ''}</span>
              <div className="lad-term mt-2">{r.b2}</div>

              {!zonaAbierta ? (
                <button
                  type="button"
                  onClick={() => setZonaAbierta(true)}
                  disabled={fase === 'back'}
                  className="mt-[18px] inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-0 px-[22px] py-3 text-[0.9rem] font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                >
                  SÚBELA ↑
                </button>
              ) : (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <MicButton
                      ctx="ladder"
                      recording={grabando}
                      onToggle={toggleMic}
                      size={44}
                      variant="plain"
                      showLabel={false}
                      disabled={esperando || fase === 'back'}
                    />
                    <input
                      ref={inputRef}
                      type="text"
                      className="lad-input"
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void revealRung(texto.trim());
                      }}
                      placeholder="tu versión C1..."
                      aria-label="Tu versión C1"
                      autoComplete="off"
                      disabled={esperando || fase === 'back'}
                    />
                    <button
                      type="button"
                      onClick={() => void revealRung(texto.trim())}
                      disabled={esperando || fase === 'back'}
                      aria-label="Enviar"
                      className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent disabled:opacity-40"
                      style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                    >
                      <Send size={17} strokeWidth={2} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revealRung('')}
                    disabled={esperando || fase === 'back'}
                    className="mt-2 w-full cursor-pointer rounded-full border bg-transparent px-4 py-2.5 text-[0.78rem]"
                    style={{ borderColor: 'var(--borde-medio)', color: 'var(--card-ink-soft)' }}
                  >
                    muéstrame la respuesta
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── CARA TRASERA: el C1. Montada desde el primer frame (L7021). ── */}
          <div className="lad-face lad-face--back" aria-hidden={fase === 'front'}>
            <motion.div
              className="lad-card"
              /* rd-pop de la respuesta: 0.45s con back.out. Se dispara al
                 llegar a la cara trasera, no al montar. */
              animate={fase === 'back' ? { scale: [0.88, 1], opacity: [0, 1] } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ background: theme.bg, transform: `rotate(${-rot}deg)` }}
            >
              <span className="lad-label-mini">C1{r.register ? ` · ${r.register}` : ''}</span>
              <div className="lad-term lad-term--back mt-2">{r.c1}</div>

              {swap && (
                <div className="my-2.5 text-[1rem]">
                  <span className="lad-swap-old">{swap[0]}</span> → <span className="lad-swap-new">{swap[1]}</span>
                </div>
              )}
              <div className="text-[0.9rem]" style={{ color: 'var(--card-ink-soft)' }}>
                {r.note_es || ''}
              </div>

              {attempt && (
                <div className="mt-3 border-t border-dashed pt-2.5" style={{ borderColor: 'currentColor' }}>
                  <div className="text-[0.78rem]" style={{ color: 'var(--card-ink-soft)' }}>
                    tú escribiste: "{attempt}"
                  </div>
                  {chip && (
                    <div className="mt-1.5">
                      <span className="lad-vchip" style={{ background: chip.bg, color: chip.color }}>
                        {chip.txt}
                      </span>
                    </div>
                  )}
                  {judge && judge.one_liner_es && <div className="mt-1.5 text-[0.82rem]">{judge.one_liner_es}</div>}
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Autoevaluación + SIGUIENTE. Fuera del flip: no gira con la tarjeta. */}
      {fase === 'back' && (
        <>
          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={() => elegir(true)}
              disabled={!!elegido}
              className={cn('flex-1 cursor-pointer rounded-full border-0 px-5 text-[0.85rem] font-bold')}
              style={{
                minHeight: 48,
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                opacity: elegido ? (elegido === 'nailed' ? 1 : 0.4) : 1,
              }}
            >
              LA CLAVÉ ✓
            </button>
            <button
              type="button"
              onClick={() => elegir(false)}
              disabled={!!elegido}
              className="cursor-pointer rounded-full border bg-transparent px-5 text-[0.85rem] font-bold"
              style={{
                minHeight: 48,
                borderColor: 'var(--texto-mal)',
                color: 'var(--texto-mal)',
                opacity: elegido ? (elegido === 'casi' ? 1 : 0.4) : 1,
              }}
            >
              CASI
            </button>
          </div>

          {elegido && (
            <div className="mt-3.5">
              <button
                type="button"
                onClick={onSiguiente}
                className="w-full cursor-pointer rounded-full border-0 px-5 py-3.5 text-[0.9rem] font-bold"
                style={{ minHeight: 48, background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                {esUltimo ? 'TERMINAR' : 'SIGUIENTE ↑'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
