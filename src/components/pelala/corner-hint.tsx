/* Pista "desliza aquí" — reemplaza al borde azul del engine.
   Va sobre la ESQUINA SUPERIOR DERECHA (la que agarra el auto-peel:
   peel-sticker origin {x:0.9, y:0.12}) — la que marcó Gus. Una flecha
   dibujada a mano apunta a esa esquina y debajo va la etiqueta. Solo la
   primera vez (el reto la marca como vista al pelar y hace un auto-peel de
   muestra). CSS keyframes (no GSAP), respeta prefers-reduced-motion.

   REDISEÑO premium (encargo de Gus: la versión plana —lozenge maciza +
   flecha lucide recta— leía como "AI slop"):
   · Flecha CURVA dibujada a mano (SVG, gesto de arrastre), no el glifo recto.
   · Chip afinado: tipografía Alan Sans (la de la app), sombra en capas para
     profundidad y un aro fino que lo despega de cualquier fondo.
   · Micro-gesto de arrastre hacia la esquina (la flecha viaja hacia arriba-
     derecha y vuelve), no un simple vaivén diagonal.

   Colores TOKENIZADOS con inversión (auditoría de temas): la pista flota
   sobre el sticker (brillante) y a veces sobre el fondo del tema, que cambia
   (papel claro / void oscuro / gradiente). La píldora invertida —fondo
   var(--text-primary), tinta var(--bg-void)— más un aro de var(--bg-void) es
   SIEMPRE alto contraste y se recorta contra cualquier fondo. La flecha va en
   var(--text-primary) con drop-shadow para leerse encima de todo. */

export function CornerHint() {
  return (
    <div
      className="pelala-hint pointer-events-none absolute right-[28%] top-[13%] z-20 flex flex-col items-end gap-1"
      aria-hidden="true"
    >
      {/* Etiqueta invertida (alto contraste garantizado en los 3 temas), en el
          hueco de arriba-derecha para no tapar el sticker. */}
      <span
        className="pelala-hint-label rounded-full px-2.5 py-[3px] text-[10px] font-semibold tracking-[0.01em]"
        style={{
          background: 'var(--text-primary)',
          color: 'var(--bg-void)',
          boxShadow:
            '0 0 0 1px color-mix(in oklch, var(--bg-void) 28%, transparent), 0 6px 16px -4px rgba(0,0,0,0.5)',
        }}
      >
        desliza aquí
      </span>

      {/* Flecha curva "a mano" que baja hacia la ESQUINA DE PELADO (arriba-dcha
          del sticker, abajo-izquierda de la etiqueta). Gesto de arrastre. */}
      <span
        className="pelala-hint-arrow mr-1"
        style={{ color: 'var(--text-primary)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
      >
        <svg width="34" height="34" viewBox="0 0 30 30" fill="none" aria-hidden="true">
          <path
            d="M24 6 C 21 15, 14 19, 7 22"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M7 22 L 13.7 22 M7 22 L 8.3 15.3"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <style>{`
        @keyframes pelala-hint-drag {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-5px, 5px); }
        }
        @keyframes pelala-hint-fade {
          0%, 100% { opacity: 0.96; }
          50%      { opacity: 0.62; }
        }
        .pelala-hint-arrow {
          display: inline-block;
          animation: pelala-hint-drag 1.35s ease-in-out infinite;
        }
        .pelala-hint-label {
          animation: pelala-hint-fade 1.35s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pelala-hint-arrow, .pelala-hint-label { animation: none; }
        }
      `}</style>
    </div>
  );
}
