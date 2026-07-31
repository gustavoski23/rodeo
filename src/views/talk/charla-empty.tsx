import { useState, type MouseEvent } from 'react';
import { motion } from 'motion/react';

import { TextAnimate } from '@/components/magicui/text-animate';
import { Card } from '@/components/ui/card';
import { GlassButton } from '@/components/ui/sign-up';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';

import { CHIPS, elegirRompehielos, type ScenarioKey } from './prompts';

/* Estado vacío de CHARLA — port de #talk-empty (public/legacy.html:2332-2390):
   tarjeta de dibujo libre con su rompehielos y los 9 chips en dos secciones.
   Mismo contenido y mismos textos; el chrome se rehace con tokens.

   REDISEÑO al patrón canónico (src/views/slang/index.tsx): fuera el héroe
   "¿DE QUÉ HABLAMOS HOY?" y la ilustración line-art del coach — el rótulo de la
   vista lo pone ahora la barra mono de talk/index, que también trae el ←. Lo
   que queda vive dentro de una Card scroller.

   FUERA DE ALCANCE (spec §8 trampa 32): el botón "Rétame" (#retame-btn) vive
   en este markup pero su lógica es js/cards-mode.js, una isla que no se porta.
   Aquí no se pinta: un botón que no hace nada es peor que no tenerlo.

   El rompehielos se sortea al MONTAR. Es el mismo momento que en el viejo:
   allí refrescarRompehielos() corría al entrar a la vista y al cerrar sesión,
   que es exactamente cuando este componente aparece. */

/* Las dos constantes del patrón, redeclaradas aquí (convención del repo). */
const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* ── UN solo disparo por toque en el CTA de vidrio ─────────────────────────
   Mismo helper que charla-session.tsx. GlassButton (sign-up.tsx, INTOCABLE)
   envuelve el <button> en un <div> con un onClick "click fix": si el evento no
   viene del botón exacto, llama a `button.click()`. El toque real cae SIEMPRE
   en el <span> interior (.glass-button-text), así que el evento burbujea al
   botón —el handler corre— y sigue hasta el div, que vuelve a dispararlo: DOS
   ejecuciones por toque. Aquí eso arrancaba la sesión dos veces y duplicaba la
   llamada de pago (medido: 2 POST /api/tts por un solo click).

   Cortamos la propagación en el propio botón: el div nunca recibe el evento y
   su "fix" no llega a correr; el toque que cae en el margen del envoltorio
   sigue funcionando (ahí el fix sí es útil). No toca sign-up.tsx. */
const unSoloClick =
  (fn: () => void) =>
  (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fn();
  };

export function CharlaEmpty({
  onLibre,
  onScenario,
}: {
  onLibre: (ice: string) => void;
  onScenario: (key: ScenarioKey) => void;
}) {
  const nombre = useApp((s) => s.nombre);
  const [ice, setIce] = useState(elegirRompehielos);

  return (
    <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
      {/* Es el tabpanel del segmentado que pinta talk/index (de ahí el id
          fijo), y como es scrollable lleva tabIndex 0 para el teclado. */}
      <div
        role="tabpanel"
        id="rd-talk-panel-charla"
        aria-labelledby="rd-talk-tab-charla"
        tabIndex={0}
        className={cn('flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-4 sm:px-4', SIN_BARRA)}
      >
        {/* El saludo por nombre entra animado: es lo único personal de la
            pantalla y merece que se note que te está hablando a ti. */}
        <TextAnimate
          key={nombre ?? 'anon'}
          as="p"
          animation="blurInUp"
          by="word"
          once
          duration={0.5}
          className="text-[0.92rem] leading-[1.55]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {nombre
            ? `Hey ${nombre} — elige tema y habla. Te corrijo sin cortarte el flow.`
            : 'Elige tema, habla — te corrijo sin cortarte el flow.'}
        </TextAnimate>

        {/* ── Dibujo libre: el coach arranca, sin gastar llamada ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
          className="rounded-[20px] border px-[18px] pt-4 pb-[15px]"
          style={{
            borderColor: 'color-mix(in oklch, var(--accent) 24%, transparent)',
            background:
              'linear-gradient(158deg, color-mix(in oklch, var(--accent) 7%, transparent), var(--chip-bg))',
          }}
        >
          <span
            className="inline-flex items-center gap-[7px] font-mono text-[0.6rem] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            <span
              aria-hidden="true"
              className="size-[7px] rounded-full"
              style={{ background: 'var(--accent)', boxShadow: '0 0 0 4px color-mix(in oklch, var(--accent) 14%, transparent)' }}
            />
            Dibujo libre · el coach arranca
          </span>
          <p className="my-[11px] min-h-[1.5em] text-[1.06rem] leading-[1.5] font-medium" style={{ color: 'var(--text-primary)' }}>
            {ice}
          </p>
          <div className="flex flex-wrap items-center gap-3.5">
            {/* CTA en VIDRIO (regla 6 del contrato): era una pastilla lima
                maciza; ahora es el GlassButton del login, tamaño default. El
                material y el color los pone .vidrio-tema, que talk/index.tsx
                declara en la raíz de la vista — aquí no hay que teñir nada.
                El `!` es por el tracking-tighter que trae .glass-button-text. */}
            <GlassButton
              type="button"
              onClick={unSoloClick(() => onLibre(ice))}
              contentClassName="text-[0.95rem] font-bold tracking-normal!"
            >
              Sígueme el hilo →
            </GlassButton>
            <button
              type="button"
              onClick={() => setIce(elegirRompehielos())}
              aria-label="Otro rompehielos"
              className="cursor-pointer border-0 bg-transparent px-1 py-1.5 font-mono text-[0.74rem] tracking-[0.04em] underline underline-offset-[3px]"
              style={{ color: 'var(--text-muted)' }}
            >
              otro tema
            </button>
          </div>
        </motion.div>

        {/* ── Chips de escenario ── */}
        {CHIPS.map(({ seccion, items }) => (
          <div key={seccion}>
            <p className="mb-3 flex items-center gap-2.5 font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
              <span className="h-0.5 w-6 shrink-0 rounded-sm bg-current" />
              {seccion}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {items.map(({ key, emoji, label }) => (
                <motion.button
                  key={key}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onScenario(key)}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-[18px] py-3 text-left text-[0.9rem] font-medium transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]"
                  style={{
                    borderColor: 'var(--borde-sutil)',
                    background: 'var(--chip-bg-fuerte)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {emoji}
                  </span>
                  {label}
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
