/* Pista "desliza para pelar" — reemplaza al borde azul del engine.
   En la esquina superior derecha (la que marcó Gus), un dedo que hace el gesto
   de arrastre hacia adentro + una etiqueta clara. Solo la primera vez (el reto
   la marca como vista al pelar y se persiste). CSS keyframes (no GSAP), según
   la regla de oro de Rodeo, y respeta prefers-reduced-motion. */

export function CornerHint() {
  return (
    <div
      className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1.5"
      aria-hidden="true"
    >
      <span className="pelala-hint-label rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg backdrop-blur-sm">
        desliza para pelar
      </span>
      <span className="pelala-hint-finger text-xl leading-none">👆</span>
      <style>{`
        @keyframes pelala-hint-drag {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-8px, 8px); }
        }
        @keyframes pelala-hint-fade {
          0%, 100% { opacity: 0.95; }
          50%      { opacity: 0.55; }
        }
        .pelala-hint-finger {
          display: inline-block;
          animation: pelala-hint-drag 1.4s ease-in-out infinite;
        }
        .pelala-hint-label {
          animation: pelala-hint-fade 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pelala-hint-finger, .pelala-hint-label { animation: none; }
        }
      `}</style>
    </div>
  );
}
