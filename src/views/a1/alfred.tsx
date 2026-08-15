import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';

import { A1_CURSO } from '@/content/a1/core';

/** La cara de Alfred. Si el archivo no está —o falla la descarga— el avatar cae
    a la inicial de siempre en vez de dejar un hueco: el compañero no puede
    desaparecer porque un PNG no cargó. */
const CARA = '/assets/alfred/cara.webp';

/* Alfred en pantalla — port de alfredAvatar/bubbleOnly/alfredBlock/dotsHTML
   (public/js/a1-office.js:152-173, 609-614).

   Alfred no es un adorno: es quien sostiene la mano del principiante. Por eso
   está en TODOS los momentos en que el viejo lo ponía (el mapa, cada paso del
   loop, la misión, el cierre) y en ninguno más — un compañero que habla cuando
   no toca deja de ser compañía y pasa a ser ruido.

   Las burbujas comparten geometría con las del coach de TALK (esquina cuadrada
   del lado de quien habla, radios 20/4, superficie translúcida): es la misma
   app, no dos. Lo que cambia es que acá nunca hay stream ni glosa — el texto
   es contenido autorado y se pinta tal cual. */

export const ENTRADA = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
};

export function AlfredAvatar({ size = 30 }: { size?: number }) {
  /* El durazno de fondo NO se ve mientras haya foto: la imagen es opaca y cubre
     el círculo entero. Se queda porque es exactamente el avatar de siempre, y
     por eso el fallback no es un estado de error sino el estado anterior — si
     la imagen no carga, Alfred sigue estando.
     Lo de reconocerlo a 30 px lo resuelve el propio recorte: se probó a 30, 34 y
     66, y a 30 todavía se le leen los ojos y la sonrisa porque el naranja del
     fondo le da contraste al pelo oscuro. Un recorte a fondo plano oscuro se
     volvía una mancha a ese tamaño. */
  const [sinCara, setSinCara] = useState(false);

  return (
    <span
      aria-hidden="true"
      className="font-display relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.44),
        background: 'var(--card-peach)',
        color: 'var(--card-ink)',
        boxShadow: '0 2px 10px oklch(0% 0 0 / 0.28)',
      }}
    >
      {sinCara ? (
        A1_CURSO.companion.avatarInitial
      ) : (
        <img
          src={CARA}
          alt=""
          onError={() => setSinCara(true)}
          /* `object-cover` + un pelín de escala: una cara recortada en cuadrado
             y metida en un círculo pierde el mentón y la coronilla. Subirla un
             2% deja la mirada en el centro óptico, que es donde el ojo la busca. */
          className="size-full object-cover"
          style={{ objectPosition: '50% 42%' }}
          draggable={false}
        />
      )}
    </span>
  );
}

export function Burbuja({ children }: { children: ReactNode }) {
  return (
    <div
      className="max-w-full rounded-[4px_20px_20px_20px] border px-[17px] py-3 text-[0.98rem] leading-[1.58] break-words"
      style={{
        background: 'var(--superficie-t)',
        borderColor: 'var(--borde-sutil)',
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </div>
  );
}

/** Un turno de Alfred: su avatar y una o varias burbujas apiladas. */
export function AlfredBloque({ lineas }: { lineas: readonly (string | null | undefined)[] }) {
  const dichas = lineas.filter((l): l is string => !!l);
  if (!dichas.length) return null;
  return (
    <motion.div {...ENTRADA} className="flex items-start gap-2.5">
      <AlfredAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {dichas.map((l, i) => (
          <Burbuja key={i}>{l}</Burbuja>
        ))}
      </div>
    </motion.div>
  );
}

/** Los puntos de posición del loop: en qué frase de la sesión vas. */
export function Puntos({ activo, total }: { activo: number; total: number }) {
  return (
    <div role="presentation" aria-hidden="true" className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          animate={{ width: i === activo ? 18 : 6, opacity: i === activo ? 1 : i < activo ? 0.55 : 0.25 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="h-1.5 rounded-full"
          style={{ background: i <= activo ? 'var(--accent)' : 'var(--text-muted)' }}
        />
      ))}
    </div>
  );
}

/** Eyebrow del sistema (regla + texto en mono), en acento o apagado. */
export function Eyebrow({ children, acento }: { children: ReactNode; acento?: boolean }) {
  return (
    <p
      className="flex items-center gap-2 font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase"
      style={{ color: acento ? 'var(--accent)' : 'var(--text-muted)' }}
    >
      <span
        aria-hidden="true"
        className="h-px w-5 shrink-0"
        style={{ background: acento ? 'var(--accent)' : 'var(--borde-medio)' }}
      />
      {children}
    </p>
  );
}

/** Barra de progreso honesta (la del mapa y la del logro). */
export function Barra({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--borde-sutil)' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ type: 'spring', stiffness: 160, damping: 30 }}
        className="h-full rounded-full"
        style={{ background: 'var(--accent)' }}
      />
    </div>
  );
}
