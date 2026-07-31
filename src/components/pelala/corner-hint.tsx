/* Pista "desliza aquí" — reemplaza al borde azul del engine.
   En la esquina superior derecha (la que marcó Gus), una flechita que señala
   hacia el sticker + etiqueta, con el gesto de arrastre. Solo la primera vez
   (el reto la marca como vista al pelar y además hace un auto-peel de muestra).
   CSS keyframes (no GSAP), respeta prefers-reduced-motion.

   Colores TOKENIZADOS con inversión (auditoría de temas): la pista se apoya sobre
   el fondo del tema, que cambia (papel claro / void oscuro / gradiente). Ni un
   negro fijo (invisible-plano en oscuro) ni un vidrio claro (invisible en papel)
   sirven en los tres. La píldora invertida —fondo var(--text-primary), tinta
   var(--bg-void)— es SIEMPRE alto contraste: pastilla oscura sobre papel en claro,
   pastilla clara sobre void en oscuro. La flecha va en var(--text-primary) con
   drop-shadow para leerse sobre cualquier fondo. */

import { ArrowDownLeft } from 'lucide-react';

export function CornerHint() {
  return (
    <div
      className="pointer-events-none absolute right-[26%] top-[20%] z-20 flex items-center gap-0.5"
      aria-hidden="true"
    >
      <span
        className="pelala-hint-label rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-lg"
        style={{ background: 'var(--text-primary)', color: 'var(--bg-void)' }}
      >
        desliza aquí
      </span>
      <span className="pelala-hint-arrow" style={{ color: 'var(--text-primary)' }}>
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
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
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
