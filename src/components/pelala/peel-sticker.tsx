/* PeelSticker — wrapper React sobre el web component <sticker-forge>
   (vendored MIT de CatsJuice, ver src/lib/sticker-forge/LICENSE).

   El renderer es un custom element imperativo con su propio canvas WebGL. Lo
   creamos con document.createElement (no por JSX) para no augmentar
   JSX.IntrinsicElements globalmente — así este módulo queda 100% aislado y no
   roza nada del shell que el otro agente está reescribiendo.

   Contrato:
   - `source`   : qué pinta el sticker (texto enriquecido o imagen).
   - `sourceKey`: id estable; cuando cambia, hacemos setSource + reappear
                  (la animación de entrada del término siguiente).
   - onDetach   : dispara cuando el usuario despega del todo (detachcomplete).
   - onPeel     : progreso continuo 0..1 mientras se pela (para pistas).
   El padre decide qué hacer en onDetach (avanzar el mazo); al cambiar sourceKey
   el sticker siguiente entra solo. */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

import {
  defineStickerForge,
  type StickerOptions,
  type StickerSource,
} from '@/lib/sticker-forge/sticker-forge';

/* Registrar el custom element una sola vez en toda la app. */
let registered = false;
function ensureRegistered() {
  if (registered) return;
  if (typeof window !== 'undefined' && !customElements.get('sticker-forge')) {
    defineStickerForge();
  }
  registered = true;
}

/* El elemento real expone estos métodos (ver StickerForgeElement). */
type StickerForgeEl = HTMLElement & {
  setSource: (source: StickerSource) => Promise<void>;
  setOptions: (options: Partial<StickerOptions>) => void;
  setPeelProgress: (progress: number) => void;
  setBackgroundRemovalEffect: (active: boolean) => void;
  reset: () => void;
  reappear: () => void;
};

export type PeelStickerHandle = {
  /** Trae el término siguiente con la animación de entrada. */
  reappear: () => void;
  /** Cambia el contenido sin animación de entrada. */
  setSource: (source: StickerSource) => void;
  /** Re-pega el sticker actual (vuelve al estado inicial). */
  reset: () => void;
  /** Pela el sticker programáticamente (recompensa al acertar en Pélala). */
  peelOff: () => void;
  /** Barrido holográfico rosado (el mismo de la entrada) sobre el sticker actual. */
  sweep: () => void;
  /** El elemento crudo, por si el padre necesita algo puntual. */
  el: () => StickerForgeEl | null;
};

export type PeelStickerProps = {
  source: StickerSource;
  sourceKey: string;
  options?: Partial<StickerOptions>;
  /** detachcomplete — el usuario despegó del todo. */
  onDetach?: () => void;
  /** peelchange — progreso 0..1 (para asomar pistas al pelar a medias). */
  onPeel?: (progress: number) => void;
  /** peelstart / peelend. */
  onPeelStart?: () => void;
  onPeelEnd?: () => void;
  onReady?: () => void;
  className?: string;
};

export const PeelSticker = forwardRef<PeelStickerHandle, PeelStickerProps>(
  function PeelSticker(props, ref) {
    const {
      source,
      sourceKey,
      options,
      onDetach,
      onPeel,
      onPeelStart,
      onPeelEnd,
      onReady,
      className,
    } = props;

    const hostRef = useRef<HTMLDivElement | null>(null);
    const elRef = useRef<StickerForgeEl | null>(null);

    /* Callbacks en refs: los listeners se montan una vez y siempre leen la
       versión fresca sin re-suscribir. */
    const cb = useRef({ onDetach, onPeel, onPeelStart, onPeelEnd, onReady });
    cb.current = { onDetach, onPeel, onPeelStart, onPeelEnd, onReady };

    /* Última source, para el set inicial sin meterla en deps. */
    const sourceRef = useRef(source);
    sourceRef.current = source;

    useImperativeHandle(ref, () => ({
      reappear: () => elRef.current?.reappear(),
      setSource: (s) => void elRef.current?.setSource(s),
      reset: () => elRef.current?.reset(),
      peelOff: () => elRef.current?.setPeelProgress(1),
      sweep: () => elRef.current?.setBackgroundRemovalEffect(true),
      el: () => elRef.current,
    }));

    /* Montaje / desmontaje del custom element. */
    useEffect(() => {
      ensureRegistered();
      const host = hostRef.current;
      if (!host) return;

      const el = document.createElement('sticker-forge') as StickerForgeEl;
      el.style.width = '100%';
      el.style.height = '100%';
      elRef.current = el;

      const onDetachEvt = () => cb.current.onDetach?.();
      const onPeelEvt = (e: Event) => {
        const detail = (e as CustomEvent<{ progress?: number }>).detail;
        cb.current.onPeel?.(detail?.progress ?? 0);
      };
      const onStartEvt = () => cb.current.onPeelStart?.();
      const onEndEvt = () => cb.current.onPeelEnd?.();
      const onReadyEvt = () => cb.current.onReady?.();

      el.addEventListener('detachcomplete', onDetachEvt);
      el.addEventListener('peelchange', onPeelEvt);
      el.addEventListener('peelstart', onStartEvt);
      el.addEventListener('peelend', onEndEvt);
      el.addEventListener('ready', onReadyEvt);

      host.appendChild(el);

      /* Quitar el anillo de foco CUADRADO del canvas al pelar (el engine hace
         .focus() en pointerdown). Se inyecta en el shadow root para no tocar el
         engine; se conserva el foco de teclado vía :focus-visible (a11y). */
      if (el.shadowRoot) {
        const fix = document.createElement('style');
        fix.textContent =
          'canvas:focus:not(:focus-visible){outline:none!important}';
        el.shadowRoot.appendChild(fix);
      }

      void el.setSource(sourceRef.current);
      if (options) el.setOptions(options);

      return () => {
        el.removeEventListener('detachcomplete', onDetachEvt);
        el.removeEventListener('peelchange', onPeelEvt);
        el.removeEventListener('peelstart', onStartEvt);
        el.removeEventListener('peelend', onEndEvt);
        el.removeEventListener('ready', onReadyEvt);
        el.remove();
        elRef.current = null;
      };
      // Montar una sola vez; el contenido se actualiza en el efecto de abajo.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Cambio de término: nuevo sourceKey → setSource + reappear. */
    const firstRender = useRef(true);
    useEffect(() => {
      const el = elRef.current;
      if (!el) return;
      if (firstRender.current) {
        firstRender.current = false;
        return; // el set inicial ya lo hizo el efecto de montaje
      }
      void el.setSource(sourceRef.current).then(() => el.reappear());
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceKey]);

    return <div ref={hostRef} className={className} />;
  },
);

/* ---------------------------------------------------------------------------
   Helper: construir una source de texto de dos líneas (término grande +
   subtítulo pequeño), con el mismo layout que el sticker "PEEL ME / @handle".
   --------------------------------------------------------------------------- */

export function slangTextSource(
  term: string,
  subtitle: string,
  opts?: { baseColor?: string; accentColor?: string },
): StickerSource {
  const base = opts?.baseColor ?? '#19191d';
  const accent = opts?.accentColor ?? 'rgb(36, 126, 245)';
  // Dos tonos como el "PEEL ME" original: primera palabra oscura, el resto azul.
  // Término de una sola palabra → azul completo.
  const words = term.split(/\s+/);
  const termRuns =
    words.length > 1
      ? [
          { text: words[0] + ' ', color: base, fontSize: 30, fontWeight: 900 },
          {
            text: words.slice(1).join(' '),
            color: accent,
            fontSize: 30,
            fontWeight: 900,
          },
        ]
      : [{ text: term, color: accent, fontSize: 30, fontWeight: 900 }];
  return {
    type: 'text',
    text: `${term}\n${subtitle}`,
    color: base,
    fontFamily: 'Arial Rounded MT Bold, Arial Black, sans-serif',
    fontWeight: 900,
    richText: {
      blocks: [
        { align: 'center', lineHeight: 1.1, runs: termRuns },
        {
          align: 'center',
          lineHeight: 1.2,
          runs: [{ text: subtitle, color: accent, fontSize: 12, fontWeight: 600 }],
        },
      ],
    },
  };
}
