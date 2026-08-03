/* try-me-button.tsx — botón "TRY ME" con anillo giratorio (referencia pegada por
   Gus, hablarte). VERBATIM salvo las adaptaciones declaradas abajo:

   · REGLA 7 (cero verde en la app): el "status dot" del anillo venía en LIMA
     (--orbit-status: #c5ed24 / #c8ed23 / #caed24 en los tres temas) con un glow
     verde. Se retintó al acento de marca —var(--accent), hoy durazno—.
   · PUNTO FUERA (pedido de Gus, r2): «quítale el puntito naranja que tiene». El
     `<span class="…__status">` y su bloque CSS se eliminan. La variable
     --orbit-status SE QUEDA porque el anillo de foco (:focus-visible) se pinta
     con ella: sin el punto, sigue siendo el único acento del componente.
   · TIPOGRAFÍA DEL ANILLO (pedido de Gus, r2): «que el "TRY ME" sea la misma
     letra de Alan Sans que tiene el home de ¿Qué quieres practicar hoy?». El
     <text> pasa de la pila "Avenir Next"/Satoshi a la MISMA de
     .aurora-home__question (aurora.css:56-58): 'Alan Sans','Archivo',sans-serif
     con font-variation-settings 'wght' 760 (Alan Sans es variable y el eje se
     fija igual que en el Home; font-weight solo no llega a 760).
   · DENSIDAD DEL ANILLO (pedido de Gus, r2): «solo déjale 4 TRY ME, agranda la
     letra 2 tamaños hacia arriba». Las repeticiones bajan de 8 a 4 y el
     font-size sube de 13 a 17 (dos escalones de 2px). El letter-spacing baja de
     2.3 a 0.6 porque el textLength=477 (= la circunferencia del path, 2π·76)
     sigue fijo: con la letra más grande, el espaciado natural pasaba de 477 y
     lengthAdjust="spacing" lo COMPRIMÍA hasta pegar los glifos.
   · UNA SOLA VELOCIDAD (pedido de Gus, r3): «que no se mueva más rápido, solo
     como se mueve suavecito por default». Fuera el easing de playbackRate en
     hover/focus (el useEffect que subía a 4.25× al engancharse) y los refs
     hoveringRef/focusingRef/animationFrameRef/playbackRateRef que solo servían
     para eso. Los handlers on{MouseEnter,Leave,Focus,Blur} se conservan como
     pass-through de la API pública. La animación @keyframes 18s linear sigue
     tal cual; ahora es la única velocidad del anillo.

   El componente es autocontenido (React + TS + Tailwind; sin shadcn/Radix/lucide
   ni imágenes): sus estilos de superficie y la animación viven en el <style>
   interno para que sea portable. */
import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type CSSProperties,
} from "react";

export type TryMeTheme = "dark" | "light" | "alternate";
export type TryMeButtonSize = number | string;

export interface TryMeButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "aria-label" | "children" | "className" | "disabled" | "onClick"
  > {
  /** The visual palette. */
  theme?: TryMeTheme;
  /** Diameter in pixels or any valid CSS length, e.g. "clamp(132px, 15vw, 172px)". */
  size?: TryMeButtonSize;
  /** The repeated text on the rotating outer ring. Defaults to "TRY ME". */
  label?: string;
  /** Accessible control name. If omitted, label is used. */
  ariaLabel?: string;
  /** Native alias for ariaLabel, useful when passing props through. */
  "aria-label"?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  disabled?: boolean;
  className?: string;
}

const orbitStyles = `
@keyframes hablarte-try-me-orbit {
  to { transform: rotate(360deg); }
}

.hablarte-try-me {
  --orbit-face-top: #28251f;
  --orbit-face: #161512;
  --orbit-face-bottom: #0d0c0a;
  --orbit-highlight: rgba(255, 247, 224, 0.13);
  --orbit-shade: rgba(0, 0, 0, 0.38);
  --orbit-rim: rgba(243, 224, 183, 0.75);
  --orbit-rim-shadow: rgba(255, 246, 220, 0.2);
  --orbit-type: #f7eddc;
  --orbit-center: #f6eddd;
  --orbit-center-top: #fffaf0;
  --orbit-center-ink: #181511;
  --orbit-status: var(--accent);
  --orbit-shadow: 0 20px 36px rgba(20, 15, 9, 0.3), 0 5px 11px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 250, 231, 0.08), inset 0 -2px 5px rgba(0, 0, 0, 0.38);
  --orbit-center-shadow: 0 6px 13px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.86), inset 0 -2px 3px rgba(113, 88, 57, 0.11);
}

.hablarte-try-me[data-theme="light"] {
  --orbit-face-top: #fffdf7;
  --orbit-face: #f2eee5;
  --orbit-face-bottom: #dfd5c5;
  --orbit-highlight: rgba(255, 255, 255, 0.94);
  --orbit-shade: rgba(90, 65, 38, 0.16);
  --orbit-rim: rgba(178, 147, 96, 0.6);
  --orbit-rim-shadow: rgba(255, 255, 255, 0.75);
  --orbit-type: #191714;
  --orbit-center: #1d1c19;
  --orbit-center-top: #2e2d28;
  --orbit-center-ink: #f7eddd;
  --orbit-status: var(--accent);
  --orbit-shadow: 0 18px 35px rgba(79, 58, 36, 0.17), 0 4px 8px rgba(74, 51, 26, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.94), inset 0 -2px 4px rgba(121, 92, 59, 0.14);
  --orbit-center-shadow: 0 5px 10px rgba(74, 56, 35, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.12), inset 0 -2px 4px rgba(0, 0, 0, 0.35);
}

.hablarte-try-me[data-theme="alternate"] {
  --orbit-face-top: #432477;
  --orbit-face: #2b1156;
  --orbit-face-bottom: #160c33;
  --orbit-highlight: rgba(222, 176, 255, 0.2);
  --orbit-shade: rgba(7, 3, 23, 0.46);
  --orbit-rim: rgba(241, 222, 166, 0.76);
  --orbit-rim-shadow: rgba(255, 240, 201, 0.22);
  --orbit-type: #faeed8;
  --orbit-center: #f5e8d5;
  --orbit-center-top: #fff8ea;
  --orbit-center-ink: #24113f;
  --orbit-status: var(--accent);
  --orbit-shadow: 0 20px 38px rgba(20, 4, 45, 0.34), 0 5px 11px rgba(10, 2, 30, 0.48), inset 0 1px 0 rgba(255, 245, 221, 0.11), inset 0 -2px 5px rgba(16, 3, 39, 0.38);
  --orbit-center-shadow: 0 6px 13px rgba(15, 4, 36, 0.27), inset 0 1px 1px rgba(255, 255, 255, 0.88), inset 0 -2px 3px rgba(118, 75, 60, 0.12);
}

.hablarte-try-me__surface {
  background:
    radial-gradient(circle at 30% 23%, var(--orbit-highlight), transparent 32%),
    radial-gradient(circle at 68% 80%, var(--orbit-shade), transparent 47%),
    linear-gradient(145deg, var(--orbit-face-top) 0%, var(--orbit-face) 48%, var(--orbit-face-bottom) 100%);
  box-shadow: var(--orbit-shadow);
}

.hablarte-try-me__surface::before {
  position: absolute;
  inset: 1px;
  border: 1px solid var(--orbit-rim);
  border-radius: inherit;
  box-shadow: inset 0 1px 0 var(--orbit-rim-shadow), inset 0 -1px 0 rgba(0, 0, 0, 0.28);
  content: "";
}

.hablarte-try-me__surface::after {
  position: absolute;
  inset: 5px;
  border: 1px solid rgba(255, 247, 223, 0.06);
  border-radius: inherit;
  background: conic-gradient(from 220deg, transparent 0deg, rgba(255, 244, 212, 0.12) 45deg, transparent 107deg, rgba(0, 0, 0, 0.22) 214deg, transparent 315deg);
  content: "";
  opacity: 0.75;
}

.hablarte-try-me__grain {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.42'/%3E%3C/svg%3E");
  background-size: 118px 118px;
  mix-blend-mode: soft-light;
  opacity: 0.12;
}

.hablarte-try-me__orbit {
  animation: hablarte-try-me-orbit 18s linear infinite;
  will-change: transform;
}

.hablarte-try-me__center {
  width: 35%;
  aspect-ratio: 1;
  color: var(--orbit-center-ink);
  transform: translateY(0) scale(1);
  border: 1px solid rgba(255, 248, 227, 0.58);
  border-radius: 9999px;
  background: linear-gradient(145deg, var(--orbit-center-top), var(--orbit-center) 65%, rgba(182, 151, 114, 0.12));
  box-shadow: var(--orbit-center-shadow);
  transition: transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.hablarte-try-me:not(:disabled):is(:hover, :focus-visible) .hablarte-try-me__center {
  transform: translateY(1px) scale(1.025);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -2px 3px rgba(113, 88, 57, 0.12);
}

.hablarte-try-me:focus-visible {
  outline: 2px solid var(--orbit-status);
  outline-offset: 6px;
}

.hablarte-try-me:disabled .hablarte-try-me__orbit {
  animation-play-state: paused;
}

/* El anillo gira SIEMPRE a 18s (pedido de Gus, r3 + r4): la ronda de
   optimización móvil lo apagó en teléfonos y Gus pidió que "siga rodando
   lentamente como estaba". Fuera el (max-width: 767px) y el (pointer: coarse)
   de la query — solo prefers-reduced-motion apaga la animación, para quien
   pidió menos movimiento en el sistema. */
@media (prefers-reduced-motion: reduce) {
  .hablarte-try-me,
  .hablarte-try-me__center {
    transition-duration: 1ms !important;
  }

  .hablarte-try-me__orbit {
    animation: none !important;
  }
}
`;

function joinClassNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

function makeRingCopy(label: string) {
  return Array.from({ length: 4 }, () => `${label.toLocaleUpperCase()}  •  `).join("");
}

export const TryMeButton = forwardRef<HTMLButtonElement, TryMeButtonProps>(
  function TryMeButton(
    {
      theme = "dark",
      size = 156,
      label = "TRY ME",
      ariaLabel,
      "aria-label": nativeAriaLabel,
      onClick,
      disabled = false,
      className,
      style,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      ...buttonProps
    },
    ref,
  ) {
    const pathId = `hablarte-try-me-path-${useId().replace(/:/g, "")}`;

    const visualLabel = label.trim() || "TRY ME";
    const cssSize = typeof size === "number" ? `${size}px` : size;
    const ringCopy = makeRingCopy(visualLabel);
    const accessibleLabel = nativeAriaLabel ?? ariaLabel ?? visualLabel;
    const buttonStyle: CSSProperties = { width: cssSize, height: cssSize, ...style };

    return (
      <button
        {...buttonProps}
        ref={ref}
        type={buttonProps.type ?? "button"}
        aria-label={accessibleLabel}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        data-theme={theme}
        className={joinClassNames(
          "hablarte-try-me relative isolate inline-grid aspect-square shrink-0 appearance-none place-items-center border-0 bg-transparent p-0 align-middle transition-[filter,opacity] duration-500 ease-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-45",
          className,
        )}
        style={buttonStyle}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <style>{orbitStyles}</style>

        <span
          aria-hidden="true"
          className="hablarte-try-me__surface absolute inset-0 overflow-hidden rounded-full"
        />
        <span
          aria-hidden="true"
          className="hablarte-try-me__grain pointer-events-none absolute inset-[2px] overflow-hidden rounded-full"
        />

        <span
          aria-hidden="true"
          className="hablarte-try-me__orbit pointer-events-none absolute inset-0"
        >
          <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
            <defs>
              <path
                id={pathId}
                d="M 100,100 m -76,0 a 76,76 0 1,1 152,0 a 76,76 0 1,1 -152,0"
              />
            </defs>
            <text
              fill="var(--orbit-type)"
              fontFamily={'"Alan Sans", "Archivo", sans-serif'}
              fontSize="17"
              fontWeight="760"
              letterSpacing="0.6"
              style={{ fontVariationSettings: "'wght' 760" }}
            >
              <textPath href={`#${pathId}`} startOffset="1%" textLength="477" lengthAdjust="spacing">
                {ringCopy}
              </textPath>
            </text>
          </svg>
        </span>

        <span
          aria-hidden="true"
          className="hablarte-try-me__center relative z-10 grid place-items-center"
        >
          <svg viewBox="0 0 24 24" className="h-[42%] w-[42%]" fill="none">
            <path
              d="m6.75 9.5 5.25 5 5.25-5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
            />
          </svg>
        </span>
      </button>
    );
  },
);

TryMeButton.displayName = "TryMeButton";
