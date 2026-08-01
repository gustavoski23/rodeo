/* try-me-button.tsx — botón "TRY ME" con anillo giratorio (referencia pegada por
   Gus, hablarte). VERBATIM salvo UNA adaptación declarada:

   · REGLA 7 (cero verde en la app): el "status dot" del anillo venía en LIMA
     (--orbit-status: #c5ed24 / #c8ed23 / #caed24 en los tres temas) con un glow
     verde. Se retinta al acento de marca —var(--accent), hoy durazno— para que el
     punto siga al color de RODEO y NO reintroduzca el verde que quitamos de toda
     la app. Es el ÚNICO cambio: la geometría, la animación, las sombras y la
     estructura quedan idénticas al original.

   El componente es autocontenido (React + TS + Tailwind; sin shadcn/Radix/lucide
   ni imágenes): sus estilos de superficie y la animación viven en el <style>
   interno para que sea portable. */
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
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

.hablarte-try-me__status {
  position: absolute;
  top: 8.5%;
  left: 50%;
  width: 6.5%;
  aspect-ratio: 1;
  transform: translateX(-50%);
  border: 1px solid rgba(20, 18, 13, 0.45);
  border-radius: 9999px;
  background: var(--orbit-status);
  box-shadow: 0 0 0 2px rgba(255, 248, 228, 0.08), 0 0 10px rgba(217, 156, 102, 0.3);
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
  return Array.from({ length: 8 }, () => `${label.toLocaleUpperCase()}  •  `).join("");
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
    const orbitRef = useRef<HTMLSpanElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const playbackRateRef = useRef(1);
    const hoveringRef = useRef(false);
    const focusingRef = useRef(false);
    const [isEngaged, setIsEngaged] = useState(false);

    const visualLabel = label.trim() || "TRY ME";
    const cssSize = typeof size === "number" ? `${size}px` : size;
    const ringCopy = makeRingCopy(visualLabel);
    const accessibleLabel = nativeAriaLabel ?? ariaLabel ?? visualLabel;
    const buttonStyle: CSSProperties = { width: cssSize, height: cssSize, ...style };

    useEffect(() => {
      const orbit = orbitRef.current;
      if (!orbit || disabled || typeof window === "undefined") return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (reduceMotion.matches) return;

      const animation = orbit.getAnimations()[0];
      if (!animation) return;

      const targetRate = isEngaged ? 4.25 : 1;
      window.cancelAnimationFrame(animationFrameRef.current ?? 0);

      const easePlaybackRate = () => {
        const delta = targetRate - playbackRateRef.current;
        const nextRate = playbackRateRef.current + delta * 0.14;

        playbackRateRef.current = Math.abs(delta) < 0.01 ? targetRate : nextRate;
        animation.playbackRate = playbackRateRef.current;

        if (playbackRateRef.current !== targetRate) {
          animationFrameRef.current = window.requestAnimationFrame(easePlaybackRate);
        }
      };

      animationFrameRef.current = window.requestAnimationFrame(easePlaybackRate);

      return () => {
        window.cancelAnimationFrame(animationFrameRef.current ?? 0);
      };
    }, [disabled, isEngaged]);

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
        onMouseEnter={(event) => {
          hoveringRef.current = true;
          setIsEngaged(true);
          onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          hoveringRef.current = false;
          setIsEngaged(focusingRef.current);
          onMouseLeave?.(event);
        }}
        onFocus={(event) => {
          focusingRef.current = true;
          setIsEngaged(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          focusingRef.current = false;
          setIsEngaged(hoveringRef.current);
          onBlur?.(event);
        }}
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
          ref={orbitRef}
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
              fontFamily={'"Avenir Next", "Satoshi", "Helvetica Neue", sans-serif'}
              fontSize="13"
              fontWeight="700"
              letterSpacing="2.3"
            >
              <textPath href={`#${pathId}`} startOffset="1%" textLength="477" lengthAdjust="spacing">
                {ringCopy}
              </textPath>
            </text>
          </svg>
          <span className="hablarte-try-me__status" />
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
