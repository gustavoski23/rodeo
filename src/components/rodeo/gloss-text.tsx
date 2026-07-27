import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { create } from 'zustand';

import { replySpans, type Gloss } from '@/lib/gloss';
import { dnaTieneSlang, saveDNA } from '@/lib/dna';
import { toast } from '@/stores/toast';
import { cn } from '@/lib/utils';

/* Fase 2 del pintado de una respuesta del coach — port de renderReply +
   spansToHTML + #gloss-tip (public/legacy.html:3290-3452).

   El viejo componía HTML a mano y lo metía con innerHTML, así que tenía que
   escapar todo con esc()/escAttr(). Aquí salen NODOS: el texto del modelo pasa
   por React, que ya lo trata como texto. Sin innerHTML no hay superficie de
   inyección — y el escapado deja de ser algo que se pueda olvidar. */

export type { Gloss };

/* Tooltip ÚNICO para toda la app, como el <div id="gloss-tip"> del viejo
   colgado del body: abrir una glosa cierra la que estuviera abierta, aunque
   viva en otra burbuja. Va en un store de módulo porque el "hay uno solo" es
   global, no de un componente. */
type TipAbierto = {
  owner: number;
  el: HTMLElement;
  es: string;
  term: string | null;
  fijado: boolean;
};

const useTip = create<{
  tip: TipAbierto | null;
  abrir: (t: TipAbierto) => void;
  cerrar: () => void;
}>((set) => ({
  tip: null,
  abrir: (tip) => set({ tip }),
  cerrar: () => set({ tip: null }),
}));

let seqOwner = 0;

function GlossTip({ tip }: { tip: TipAbierto }) {
  const cerrar = useTip((s) => s.cerrar);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999, w: 300 });
  const [guardado, setGuardado] = useState(() => (tip.term ? dnaTieneSlang(tip.term) : false));

  /* posicionarTip (L3397): centrado sobre la palabra, clampeado a 12 px de los
     bordes, y si no cabe arriba se va abajo. Se posiciona con JS porque el
     tooltip vive en el body: dentro del scroll del chat se recortaría. */
  const colocar = useCallback(() => {
    const tipEl = ref.current;
    if (!tipEl) return;
    const r = tip.el.getBoundingClientRect();
    const w = Math.min(300, window.innerWidth - 24);
    const th = tipEl.offsetHeight;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
    let top = r.top - th - 8;
    if (top < 8) top = r.bottom + 8; // sin espacio arriba → abajo
    setPos({ left, top, w });
  }, [tip.el]);

  useLayoutEffect(() => {
    colocar();
  }, [colocar, tip.es, tip.fijado, guardado]);

  // El chat scrolla bajo el tooltip: sin esto se quedaría flotando lejos de su
  // palabra (el viejo no lo cubría porque el tip moría al primer clic fuera).
  useEffect(() => {
    const h = () => colocar();
    window.addEventListener('resize', h);
    document.addEventListener('scroll', h, true);
    return () => {
      window.removeEventListener('resize', h);
      document.removeEventListener('scroll', h, true);
    };
  }, [colocar]);

  // Clic fuera con el tip fijado → cerrar. Los clics DENTRO del tooltip (el
  // botón de guardar) y los de otra glosa se ignoran aquí: los maneja quien
  // corresponde, y así el tip no se cierra al guardar.
  useEffect(() => {
    if (!tip.fijado) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('[data-gloss-tip]')) return;
      if (t?.closest?.('[data-gloss]')) return;
      cerrar();
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [tip.fijado, cerrar]);

  const guardar = () => {
    if (!tip.term) return;
    saveDNA({ type: 'slang', term: tip.term, meaning: tip.es || '', example: '' });
    setGuardado(true);
    toast(`"${tip.term}" · guardado en tu DNA`);
  };

  return (
    <motion.div
      ref={ref}
      data-gloss-tip
      role="tooltip"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 520, damping: 34 }}
      className="fixed z-[300] rounded-[10px] border px-3 py-[9px] font-sans text-[0.82rem] leading-[1.4]"
      style={{
        left: pos.left,
        top: pos.top,
        maxWidth: pos.w,
        background: 'var(--bg-elevated)',
        borderColor: 'color-mix(in oklch, var(--warn) 40%, transparent)',
        color: 'var(--text-primary)',
        boxShadow: '0 12px 34px oklch(0% 0 0 / 0.55)',
        pointerEvents: tip.fijado && tip.term ? 'auto' : 'none',
      }}
    >
      <div className={tip.fijado && tip.term ? 'mb-[9px]' : undefined}>{tip.es}</div>
      {tip.fijado && tip.term && (
        <button
          type="button"
          onClick={guardar}
          disabled={guardado}
          className="flex min-h-[34px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-0 px-3 py-[7px] font-sans text-[0.76rem] font-bold disabled:cursor-default"
          style={
            guardado
              ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
              : { background: 'var(--accent)', color: 'var(--accent-ink)' }
          }
        >
          {guardado ? '✓ en tu DNA' : '＋ guardar a DNA'}
        </button>
      )}
    </motion.div>
  );
}

export function GlossText({
  reply,
  glosses,
  savable = true,
  className,
}: {
  /** El reply crudo del modelo, con sus marcadores ⟦en||es⟧. */
  reply: string;
  /** El array `glosses` del JSON. Memoízalo si lo construyes al vuelo. */
  glosses?: Gloss[] | null;
  /** Con `savable` cada chunk puede irse al DNA desde el tooltip (TALK/ESCENAS). */
  savable?: boolean;
  className?: string;
}) {
  const ownerRef = useRef(0);
  if (ownerRef.current === 0) ownerRef.current = ++seqOwner;
  const owner = ownerRef.current;

  const tip = useTip((s) => s.tip);
  const abrir = useTip((s) => s.abrir);
  const cerrar = useTip((s) => s.cerrar);

  const { clean, spans } = useMemo(() => replySpans(reply, glosses), [reply, glosses]);

  const nodos = useMemo(() => {
    const out: ReactNode[] = [];
    let pos = 0;
    spans.forEach((s, i) => {
      if (s.start > pos) out.push(clean.slice(pos, s.start));
      const chunk = clean.slice(s.start, s.end);
      out.push(
        /* <span role="button">, no <button>: el legacy usaba
           <span class="gloss" tabindex="0" role="button"> (L3298) y hay un
           motivo de layout, no solo de fidelidad — el navegador "blockifica"
           todo <button> a inline-block aunque le pongas display:inline, así
           que la glosa era una caja atómica de max-content: no partía entre
           líneas y un chunk largo empujaba el scroll horizontal del chat.
           Como span sí fluye con el texto; [overflow-wrap:anywhere] remata el
           caso de un token sin espacios (una URL dentro de ⟦…||…⟧). */
        <span
          key={`g${i}`}
          role="button"
          tabIndex={0}
          data-gloss
          aria-label="Ver significado"
          className="cursor-help border-b-[1.5px] border-dotted border-[var(--warn)] underline-offset-[3px] [overflow-wrap:anywhere] hover:text-[var(--warn)] focus-visible:text-[var(--warn)] focus-visible:outline-none"
          onMouseEnter={(e) => {
            // Hover sólo si no hay nada fijado (en táctil no existe y no estorba).
            if (useTip.getState().tip?.fijado) return;
            abrir({ owner, el: e.currentTarget, es: s.es, term: savable ? chunk : null, fijado: false });
          }}
          onMouseLeave={() => {
            if (!useTip.getState().tip?.fijado) cerrar();
          }}
          onClick={(e) => {
            const actual = useTip.getState().tip;
            if (actual?.fijado && actual.el === e.currentTarget) cerrar();
            else abrir({ owner, el: e.currentTarget, es: s.es, term: savable ? chunk : null, fijado: true });
          }}
          /* Un <span> no dispara click con teclado: lo que el <button> daba
             gratis hay que devolverlo a mano (Enter y Espacio, como el rol). */
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            const actual = useTip.getState().tip;
            if (actual?.fijado && actual.el === e.currentTarget) cerrar();
            else abrir({ owner, el: e.currentTarget, es: s.es, term: savable ? chunk : null, fijado: true });
          }}
        >
          {chunk}
        </span>,
      );
      pos = s.end;
    });
    if (pos < clean.length) out.push(clean.slice(pos));
    return out;
  }, [clean, spans, abrir, cerrar, owner, savable]);

  return (
    <span className={cn(className)}>
      {nodos}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {tip && tip.owner === owner && <GlossTip key={`${tip.term ?? ''}|${tip.es}`} tip={tip} />}
          </AnimatePresence>,
          document.body,
        )}
    </span>
  );
}
