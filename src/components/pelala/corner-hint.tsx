/* Pista "desliza aquí" — reemplaza al borde azul del engine.
   En la esquina superior derecha (la que marcó Gus), una flechita que señala
   hacia el sticker + etiqueta, con el gesto de arrastre. Solo la primera vez
   (el reto la marca como vista al pelar y además hace un auto-peel de muestra).
   CSS keyframes (no GSAP), respeta prefers-reduced-motion. */

import { ArrowDownLeft } from 'lucide-react';

export function CornerHint() {
  return (
    <div
      className="pointer-events-none absolute right-[7%] top-[15%] z-20 flex items-center gap-0.5"
      aria-hidden="true"
    >
      <span className="pelala-hint-label rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg backdrop-blur-sm">
        desliza aquí
      </span>
      <span className="pelala-hint-arrow text-white">
        <ArrowDownLeft size={18} strokeWidth={2.75} />
      </span>
      <style>{`
        @keyframes pelala-hint-drag {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-7px, 7px); }
        }
        @keyframes pelala-hint-fade {
          0%, 100% { opacity: 0.95; }
          50%      { opacity: 0.55; }
        }
        .pelala-hint-arrow {
          display: inline-block;
          animation: pelala-hint-drag 1.3s ease-in-out infinite;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55));
        }
        .pelala-hint-label {
          animation: pelala-hint-fade 1.3s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pelala-hint-arrow, .pelala-hint-label { animation: none; }
        }
      `}</style>
    </div>
  );
}
