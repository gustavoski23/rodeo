import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import './pencil.css';

/* Loader de espera — trazo que se dibuja solo (adaptado de "Animated Loading
   SVG + Text Shimmer" de @zacharybydesign, 21st.dev). SUSTITUYE al lápiz de
   Uiverse que vivía aquí. Dos presentaciones del MISMO trazo:

     · <PencilLoader>       el ícono suelto, en var(--accent) (durazno de marca).
                            Lo usan las esperas grandes: libro, ladder, dna,
                            slang, coach. Mantiene el nombre y la API de antes
                            para no tocar esos call sites.
     · <LoadingBreadcrumb>  el componente del prompt TAL CUAL: trazo en gris zinc
                            + texto con brillo (shimmer) + chevron. Es la espera
                            del CHAT — ahí Gus lo quería exacto, sin durazno.

   La longitud del path se mide con getTotalLength y se cachea a nivel de módulo.
   El trazo anima desde el primer frame (default de --path-length en el CSS) y
   queda dibujado bajo prefers-reduced-motion: nunca hay un frame invisible. */

const LOADER_PATH =
  'M4.43431 2.42415C-0.789139 6.90104 1.21472 15.2022 8.434 15.9242C15.5762 16.6384 18.8649 9.23035 15.9332 4.5183C14.1316 1.62255 8.43695 0.0528911 7.51841 3.33733C6.48107 7.04659 15.2699 15.0195 17.4343 16.9241';

// Longitud del trazo (getTotalLength). Cacheada entre montajes e instancias.
let cachedPathLength = 0;

/* El SVG a secas. El color sale de `currentColor`: quien lo monta decide el
   tono (durazno en PencilLoader, zinc en LoadingBreadcrumb) sin tocar el path. */
function LoaderMark({
  width,
  height,
  strokeWidth = 2,
  label = 'Cargando',
  className,
  style,
}: {
  width: number | string;
  height: number | string;
  strokeWidth?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
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
    <svg
      className={cn('rd-loader', className)}
      role="img"
      aria-label={label}
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      style={style}
    >
      <path
        ref={pathRef}
        d={LOADER_PATH}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="rd-loader__stroke"
        style={
          pathLength > 0
            ? ({ strokeDasharray: pathLength, '--path-length': pathLength } as CSSProperties)
            : undefined
        }
      />
    </svg>
  );
}

/* El ícono suelto en durazno de marca — las esperas grandes (libro, ladder…). */
export function PencilLoader({
  size = 5.2,
  strokeWidth = 2,
  className,
  children,
  label = 'Pensando',
}: {
  /** Lado del SVG en em. 5.2 = el de la espera del libro. */
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Lo que va a la derecha del trazo (p.ej. el contador de segundos). */
  children?: ReactNode;
  label?: string;
}) {
  return (
    <div className={cn('rd-pensando', className)}>
      <LoaderMark
        width={`${size}em`}
        height={`${size}em`}
        strokeWidth={strokeWidth}
        label={label}
        style={{ color: 'var(--accent)' }}
      />
      {children}
    </div>
  );
}

/* El componente del prompt, EXACTO: trazo gris zinc + texto con brillo + chevron.
   Es la espera del CHAT. El brillo (shimmer) barre el texto con un degradado que
   se mueve; los grises zinc (no el durazno) son los del prompt, y cambian con el
   tema (claro: zinc-600/zinc-500→900 · oscuro: zinc-200/zinc-400→blanco). */
export function LoadingBreadcrumb({
  text = 'Pensando',
  className,
  children,
}: {
  text?: string;
  className?: string;
  /** Extra a la derecha del chevron (p.ej. el contador de segundos de CHARLA). */
  children?: ReactNode;
}) {
  return (
    <div className={cn('rd-breadcrumb text-[15px] font-medium tracking-wide', className)}>
      <LoaderMark width={18} height={18} strokeWidth={2.5} label={text} className="rd-loader--zinc" />
      <span className="rd-shimmer">{text}</span>
      <ChevronRight width={16} height={16} aria-hidden className="rd-chevron" />
      {children}
    </div>
  );
}
