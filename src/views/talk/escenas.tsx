import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Dices } from 'lucide-react';

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
   una generación por debajo. */

/* Skeletons de carga. El viejo usaba un shimmer con background-position; aquí
   basta el pulse de Tailwind: son 3 rectángulos que dicen "vienen en camino",
   no una pieza de diseño. */
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
    <div className="scroll-area flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4">
      {/* ── HÉROE ──
          El telón deja de estar en absolute detrás del titular: mandarlo al
          fondo (-z-10) no arreglaba nada porque es lima sobre lima y el trazo
          se comía la S de HABLES. Ahora es una columna hermana — el texto
          nunca pasa por debajo, y el titular parte donde tiene que partir. */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Eyebrow>Roleplay · teatro jugable</Eyebrow>
          <p className="font-display mt-3 mb-3 text-[clamp(2.1rem,9vw,3.1rem)] leading-[0.92] font-extrabold tracking-[-0.035em]">
            ACTÚA.
            <br />
            NO SOLO <span style={{ color: 'var(--accent)' }}>HABLES.</span>
          </p>
          <p className="max-w-[330px] text-[0.92rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
            Una escena, un objetivo, alguien que se te opone.
          </p>
        </div>

        {/* Telón + máscara: el motivo teatral del viejo, line-art lima. */}
        <div
          aria-hidden="true"
          className="pointer-events-none mt-1 h-[104px] w-[104px] shrink-0 opacity-85 max-[359px]:hidden"
          style={{ color: 'var(--accent)' }}
        >
          <svg
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="block h-full w-full"
          >
            <path d="M14 12 H86" />
            <path d="M22 12 C22 40 18 58 30 58 C40 58 36 34 36 12" />
            <path d="M50 12 C50 44 44 66 60 66 C72 66 66 40 66 12" />
            <path d="M78 12 C78 40 82 58 70 58" />
            <path d="M40 78 C40 62 44 56 52 56 C60 56 64 62 64 78 Q52 88 40 78 Z" />
            <path d="M47 68 L47 68" strokeWidth="6" />
            <path d="M57 68 L57 68" strokeWidth="6" />
          </svg>
        </div>
      </div>

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
        className="flex flex-col gap-4"
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

      {/* ── Sorpréndeme ── */}
      <div className="flex justify-center pb-4">
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => void rpSorprende()}
          disabled={genBusy}
          className="inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2.5 rounded-full border-0 px-[22px] py-3 text-[0.95rem] font-bold disabled:cursor-default disabled:opacity-50"
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
