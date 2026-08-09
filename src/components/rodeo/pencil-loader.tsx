import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import './pencil.css';

/* Loader de espera — trazo que se dibuja solo (adaptado de "Animated Loading
   SVG" de @zacharybydesign, 21st.dev). SUSTITUYE al lápiz de Uiverse que vivía
   aquí antes: mismo sitio, misma API (`size`, `label`, `children`), otro dibujo.
   Al conservar el nombre `PencilLoader` los ~9 sitios que lo importan (TALK,
   libro, ladder, dna, slang, coach) cambian de golpe, sin tocar una línea suya.

   POR QUÉ este trazo y no el lápiz: el lápiz eran ~60 líneas de keyframes con
   goma, punta y cuerpo girando; se leía recargado y "de plantilla". Este es un
   solo path que se traza y se destraza en bucle — más limpio, más nuestro, y
   pesa una fracción.

   La longitud del path se mide UNA vez con getTotalLength y se cachea a nivel de
   módulo (con dos loaders a la vez el segundo no vuelve a medir). El trazo se
   pinta con animación desde el primer frame usando el default de --path-length
   en el CSS; el valor medido solo lo afina. Así NUNCA hay un frame invisible —
   ni antes de medir, ni en headless, ni con reduced-motion (ahí queda dibujado y
   quieto). Es la regla #1 del repo: el loader nunca desaparece.

   El color sale de var(--accent): cambia con el tema sin tocar el SVG, igual que
   el lápiz. El tamaño va en `em` (5.2em era el de la espera del libro): heredar
   la unidad tipográfica deja escalarlo dentro de una burbuja o una tarjeta sin
   recalcular nada, y el viewBox 19×19 escala sin pérdida. */

// Longitud del trazo (getTotalLength). Cacheada entre montajes e instancias.
let cachedPathLength = 0;

export function PencilLoader({
  size = 5.2,
  strokeWidth = 2,
  className,
  children,
  label = 'Pensando',
}: {
  /** Lado del SVG en em. 5.2 = el de la espera del libro. */
  size?: number;
  /** Grosor del trazo, en unidades del viewBox (19). */
  strokeWidth?: number;
  className?: string;
  /** Lo que va a la derecha del trazo (p.ej. el contador de segundos). */
  children?: ReactNode;
  label?: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(cachedPathLength);

  useEffect(() => {
    if (!cachedPathLength && pathRef.current) {
      cachedPathLength = pathRef.current.getTotalLength();
      setPathLength(cachedPathLength);
    }
  }, []);

  return (
    <div className={cn('rd-pensando', className)}>
      <svg
        className="rd-loader"
        role="img"
        aria-label={label}
        viewBox="0 0 19 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: `${size}em`, height: `${size}em` }}
      >
        <path
          ref={pathRef}
          d="M4.43431 2.42415C-0.789139 6.90104 1.21472 15.2022 8.434 15.9242C15.5762 16.6384 18.8649 9.23035 15.9332 4.5183C14.1316 1.62255 8.43695 0.0528911 7.51841 3.33733C6.48107 7.04659 15.2699 15.0195 17.4343 16.9241"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="rd-loader__stroke"
          // Solo el valor MEDIDO se pasa inline; el default vive en el CSS para
          // que el trazo anime aunque el JS no haya corrido todavía.
          style={
            pathLength > 0
              ? ({
                  strokeDasharray: pathLength,
                  '--path-length': pathLength,
                } as React.CSSProperties)
              : undefined
          }
        />
      </svg>
      {children}
    </div>
  );
}
