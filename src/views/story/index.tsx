import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';

/* Vista STORY — la carta del carrusel ya navegaba aquí, pero 'story' caía en el
   VistaPendiente del shell: un titular gigante sin ← del que solo se salía con
   el menú. Esto la convierte en una vista de verdad con el patrón canónico de
   SLANG/CHARLA (barra ← + título mono en COLUMNA de 640, contenido dentro de la
   Card rounded-[22px]).

   Es un teaser, no una feature: sin store, sin lógica y sin datos. Lo único que
   pinta es la ilustración de Gus (public/carrusel/story.jpg, la MISMA que lleva
   la carta del carrusel — al pulsarla la imagen continúa, y el viaje se lee como
   un zoom y no como un salto a otra pantalla) y el copy de "próximamente".

   Por qué la imagen NO cambia con el tema: es una ilustración oscura con acentos
   lima, no un fondo. El velo va SIEMPRE oscuro y el texto de encima SIEMPRE
   claro (color literal, no token) porque viven sobre la foto, no sobre la
   superficie de la Card. Todo lo que sí toca superficie —la barra, el borde del
   ←— usa tokens y por tanto funciona en claro, oscuro y gradiente. */

const COLUMNA = 'mx-auto w-full max-w-[640px]';

export default function StoryView() {
  const setView = useApp((s) => s.setView);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección ─────────────────────────────────────────────── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setView('home')}
          aria-label="Volver al inicio"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{
            borderColor: 'var(--borde-sutil)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
          }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Story · thriller por capítulos
        </span>
      </div>

      {/* ── La tarjeta ───────────────────────────────────────────────────────
          La ilustración va A SANGRE: absolute + object-cover llenando la Card,
          así que recorta por el centro en 390px de ancho y en 1280 sin dejar
          bandas. El texto se apoya en la mitad de abajo del velo. */}
      <Card
        className={cn(
          COLUMNA,
          'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm',
        )}
      >
        <img
          src="/carrusel/story.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover"
        />
        {/* Velo de lectura, siempre oscuro (ver nota de arriba). Sube hasta el
            72% para que el eyebrow tampoco caiga sobre una zona clara de la
            ilustración. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, oklch(8% 0.012 265 / 0.94) 0%, oklch(8% 0.012 265 / 0.78) 26%, oklch(8% 0.012 265 / 0.28) 54%, transparent 78%)',
          }}
        />

        <div className="relative flex min-h-0 flex-1 flex-col justify-end p-6 sm:p-8">
          <p
            className="font-mono text-[0.56rem] font-bold tracking-[0.2em] uppercase"
            style={{ color: 'oklch(95% 0.004 265 / 0.66)' }}
          >
            Próximamente
          </p>
          <h2
            className="font-display mt-2 text-[2rem] leading-[0.92] font-extrabold tracking-[-0.034em] sm:text-[2.6rem]"
            style={{ color: 'oklch(98% 0 0)' }}
          >
            {/* El punto NO va con var(--accent): el velo de esta tarjeta es
                SIEMPRE oscuro (ver la nota de cabecera), y en tema claro la lima
                de acento baja a L50 — sobre el velo negro el punto desaparecía.
                Literal, como el resto del texto que vive sobre la foto. */}
            Story<span style={{ color: 'oklch(87% 0.21 128)' }}>.</span>
          </h2>
          <p
            className="mt-3 max-w-[34ch] text-[0.88rem] leading-[1.55]"
            style={{
              color: 'oklch(96% 0.003 265 / 0.82)',
              textShadow: '0 1px 12px oklch(6% 0.012 265 / 0.55)',
            }}
          >
            Un thriller por capítulos donde practicás sin darte cuenta: leés por saber qué pasa
            después, y el inglés se te queda de paso.
          </p>
          <p
            className="mt-2.5 max-w-[34ch] text-[0.82rem] leading-[1.5]"
            style={{ color: 'oklch(95% 0.003 265 / 0.6)' }}
          >
            El primer capítulo llega pronto.
          </p>
        </div>
      </Card>
    </div>
  );
}
