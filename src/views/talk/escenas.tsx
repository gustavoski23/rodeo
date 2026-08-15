import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Dices } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useEscenas } from '@/stores/escenas';

import { EscenaCard } from './escena-card';
import { EscenasSession } from './escenas-session';
import { RP_CANONICO } from './escenas-prompts';
import { RpDebriefSheet } from './rp-debrief-sheet';
import { generarEscenas, rpSorprende, startRoleplay } from './rp-turn';

/* Pane ESCENAS — port de #escenas-pane (public/legacy.html:2452-2521),
   renderRoleplayHome (L7142) y el cableado de la portada (L7586-7591).

   La portada tiene una sola regla no obvia: NO se repinta si hay una sesión
   viva (L7143). En React sale gratis — con `session` se monta la sesión y la
   portada ni existe — pero el efecto de generación también tiene que
   respetarla, porque una escena sorpresa que llega tarde no debe disparar
   una generación por debajo.

   REDISEÑO al patrón canónico (el de src/views/slang/index.tsx): fuera el
   héroe "ACTÚA. NO SOLO HABLES." y el telón SVG — el título de la vista lo
   pone ahora la barra mono de talk/index (que también trae el ← : aquí NO se
   duplica). El escenario clásico y las escenas frescas viven dentro de una
   Card scroller, y SORPRÉNDEME baja a la barra de acción de abajo, donde la
   charla dispara su turno. Todo lo demás intacto. */

/* Skeletons de carga. El viejo usaba un shimmer con background-position; aquí
   basta el pulse de Tailwind: son 3 rectángulos que dicen "vienen en camino",
   no una pieza de diseño. */
/* Las dos constantes del patrón, redeclaradas aquí (convención del repo). */
const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

function Skeletons() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-[150px] animate-pulse rounded-[22px]"
          style={{ background: 'var(--bg-surface)', animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </>
  );
}

function Eyebrow({ children, mudo }: { children: React.ReactNode; mudo?: boolean }) {
  return (
    <p
      className="flex items-center gap-2.5 font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
      style={{ color: mudo ? 'var(--text-muted)' : 'var(--accent)' }}
    >
      <span className="h-0.5 w-6 shrink-0 rounded-sm bg-current" />
      {children}
    </p>
  );
}

function BotonTexto({
  children,
  onClick,
  disabled,
  ...rest
}: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent px-1.5 py-1 font-mono text-[0.66rem] tracking-[0.04em] underline underline-offset-[3px] disabled:cursor-default disabled:opacity-40"
      style={{ color: 'var(--text-muted)' }}
      {...rest}
    >
      {children}
    </button>
  );
}

function RoleplayHome() {
  const cards = useEscenas((s) => s.cards);
  const estado = useEscenas((s) => s.cardsEstado);
  const genBusy = useEscenas((s) => s.genBusy);

  /* renderRoleplayHome (L7142): al entrar al pane, si no hay cartas se piden.
     Si ya las hay, no se toca nada — son caras y viven en memoria hasta que
     Gus pida otras. */
  useEffect(() => {
    const s = useEscenas.getState();
    if (s.session || s.cards.length || s.genBusy) return;
    void generarEscenas();
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── La tarjeta ──────────────────────────────────────────────────────
          Un solo scroller para toda la portada. Es el tabpanel del segmentado
          que pinta talk/index (de ahí el id fijo), y como es scrollable lleva
          tabIndex 0 para poder recorrerlo con teclado. */}
      <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
        <div
          role="tabpanel"
          id="rd-talk-panel-escenas"
          aria-labelledby="rd-talk-tab-escenas"
          tabIndex={0}
          className={cn('flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4 sm:px-4', SIN_BARRA)}
        >
          {/* Un titular moderado dentro de la tarjeta: el rótulo grande de la
              vista ya lo lleva la barra mono de arriba. */}
          <p className="text-[0.92rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
            Una escena, un objetivo, alguien que se te opone. <strong style={{ color: 'var(--text-primary)' }}>Actúa, no solo hables.</strong>
          </p>

          {/* ── El clásico de la casa ── */}
          <Eyebrow mudo>El clásico de la casa</Eyebrow>
          <motion.div initial="oculta" animate="visible">
            <EscenaCard sc={RP_CANONICO} canon onEnter={startRoleplay} />
          </motion.div>

          {/* ── Escenas frescas ── */}
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>Escenas frescas para ti</Eyebrow>
            <BotonTexto onClick={() => void generarEscenas(true)} disabled={genBusy} aria-label="Generar otras escenas">
              otras escenas
            </BotonTexto>
          </div>

          {/* La cascada: las tres entran escalonadas, como el --i * 0.06s del viejo. */}
          <motion.div
            className="flex flex-col gap-4 pb-1"
            initial="oculta"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          >
            {(estado.tipo === 'cargando' || estado.tipo === 'espera') && <Skeletons />}

            {estado.tipo === 'espera' && (
              <p className="text-[0.82rem] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
                Estoy terminando otra cosa — tus escenas cargan solas en cuanto acabe ·{' '}
                <BotonTexto onClick={() => void generarEscenas(true)}>cargar ya</BotonTexto>
              </p>
            )}

            {estado.tipo === 'error' && (
              <p className="text-[0.88rem] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
                {estado.msg} · <BotonTexto onClick={() => void generarEscenas(true)}>reintentar</BotonTexto>
              </p>
            )}

            {estado.tipo === 'ok' &&
              cards.map((sc, i) => (
                <EscenaCard key={`${sc.title}-${i}`} sc={sc} i={i} onEnter={startRoleplay} />
              ))}
          </motion.div>
        </div>
      </Card>

      {/* ── La barra de abajo ───────────────────────────────────────────────
          El sitio del que la charla dispara su turno: aquí dispara la escena
          sorpresa. */}
      <div className={cn(COLUMNA, 'shrink-0 pt-3')}>
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => void rpSorprende()}
          disabled={genBusy}
          className="inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-0 px-[22px] py-3 text-[0.95rem] font-bold disabled:cursor-default disabled:opacity-50"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            boxShadow: '0 0 32px color-mix(in oklch, var(--accent) 25%, transparent)',
          }}
        >
          <Dices size={17} strokeWidth={2} aria-hidden="true" />
          SORPRÉNDEME
        </motion.button>
      </div>
    </div>
  );
}

export default function EscenasPane() {
  const enEscena = useEscenas((s) => s.session !== null);

  return (
    <>
      {enEscena ? <EscenasSession /> : <RoleplayHome />}
      <RpDebriefSheet />
    </>
  );
}
