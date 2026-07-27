import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import './pencil.css';

/* Lápiz de espera (Uiverse, by gustavofusco) — port del pencilHTML del legacy
   (public/legacy.html:4025-4055) con su CSS en pencil.css. Sustituye a los tres
   puntitos en las esperas largas: TALK tarda segundos y el episodio hasta 30, y
   ahí un loader que "hace algo" cambia la percepción.

   Los colores salen de los tokens, igual que en el viejo: el lápiz cambia con
   el tema sin tocar el SVG. El tamaño va en `em` (5.2em era el del legacy):
   heredar la unidad tipográfica deja escalarlo dentro de una burbuja, de un
   botón o de una tarjeta sin recalcular nada. */
export function PencilLoader({
  size = 5.2,
  className,
  children,
  label = 'Pensando',
}: {
  /** Lado del lápiz en em. 5.2 = el de la burbuja de espera del chat. */
  size?: number;
  className?: string;
  /** Lo que va a la derecha del lápiz (p.ej. el contador de segundos). */
  children?: ReactNode;
  label?: string;
}) {
  // El clipPath de la goma es un id de documento: con dos lápices a la vez
  // (charla + escena) el segundo heredaría el recorte del primero.
  const gomaId = useId().replace(/:/g, '');

  return (
    <div className={cn('rd-pensando', className)}>
      <svg
        className="rd-pencil"
        viewBox="0 0 200 200"
        width="200"
        height="200"
        role="img"
        aria-label={label}
        style={{ width: `${size}em`, height: `${size}em` }}
      >
        <defs>
          <clipPath id={gomaId}>
            <rect rx="5" ry="5" width="30" height="30" />
          </clipPath>
        </defs>
        <g
          strokeLinecap="round"
          strokeWidth="12"
          stroke="var(--accent)"
          fill="none"
          transform="rotate(-113,100,100)"
        >
          <circle
            className="rd-pencil__stroke"
            r="70"
            cx="100"
            cy="100"
            strokeDasharray="439.82 439.82"
            strokeDashoffset="439.82"
          />
        </g>
        <g className="rd-pencil__rotate" transform="translate(100,100)">
          <g fill="none">
            <circle
              className="rd-pencil__body1"
              r="56"
              stroke="var(--accent)"
              strokeWidth="10"
              strokeDasharray="351.86 351.86"
              strokeDashoffset="351.86"
              transform="rotate(-90)"
            />
            <circle
              className="rd-pencil__body2"
              r="64.75"
              stroke="var(--text-primary)"
              strokeWidth="8"
              strokeDasharray="406.84 406.84"
              strokeDashoffset="406.84"
              transform="rotate(-90)"
            />
            <circle
              className="rd-pencil__body3"
              r="47.25"
              stroke="var(--text-primary)"
              strokeWidth="8"
              strokeDasharray="296.88 296.88"
              strokeDashoffset="296.88"
              transform="rotate(-90)"
            />
          </g>
          <g className="rd-pencil__eraser" transform="rotate(-90) translate(49,0)">
            <g className="rd-pencil__eraser-skew">
              <rect fill="var(--warn)" rx="5" ry="5" height="30" width="30" />
              <rect clipPath={`url(#${gomaId})`} fill="var(--text-primary)" opacity="0.25" height="30" width="5" />
              <rect fill="var(--card-paper)" height="20" width="30" y="-6" />
              <rect fill="var(--accent)" height="7" width="30" y="-19" />
            </g>
          </g>
          <g className="rd-pencil__point" transform="rotate(-90) translate(49,-30)">
            <polygon fill="var(--card-peach)" points="15 0,30 30,0 30" />
            <polygon fill="var(--card-ink)" points="15 0,6 30,24 30" />
            <polygon fill="var(--text-primary)" points="15 0,20 10,10 10" />
          </g>
        </g>
      </svg>
      {children}
    </div>
  );
}
