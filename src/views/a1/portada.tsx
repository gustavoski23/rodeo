import { motion } from 'motion/react';

import { BorderBeam } from '@/components/magicui/border-beam';
import type { A1Scene, A1Unit } from '@/content/a1/tipos';

import { AlfredBloque, ENTRADA, Eyebrow } from './alfred';
import { Cabecera } from './cabecera';
import { tokenTema } from './mapa';

/* PORTADA DE UNIDAD — la antesala entre el mapa y el loop.

   Acá vive `companionSetup_es`: las dos líneas con las que Alfred presenta la
   situación completa ("bueno, primer día, respirá…"). El legacy nunca las
   pintó y por eso se sentía que uno caía en la escena 1 sin que nadie le
   dijera en qué se estaba metiendo. Un principiante necesita saber a qué
   entra ANTES de que aparezca la primera palabra en inglés.

   Solo se muestra la PRIMERA vez que se abre la unidad (unidadVirgen): la
   presentación es una bienvenida, no un peaje. Quien vuelve a la unidad ya
   sabe de qué va y entra derecho a la escena que le toca. Retomar por "seguí
   donde ibas" tampoco pasa por acá — ahí uno viene a terminar algo, no a que
   se lo presenten. */

export function Portada({
  unit,
  scene,
  onArrancar,
  onSalir,
  onPanico,
}: {
  unit: A1Unit;
  /** La escena por la que va a arrancar el loop (solo pa' anunciarla). */
  scene: A1Scene;
  onArrancar: () => void;
  onSalir: () => void;
  onPanico: () => void;
}) {
  const tema = tokenTema(unit.cardTheme);
  const desde = Math.max(unit.scenes.findIndex((s) => s.id === scene.id), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Cabecera activo={desde} total={Math.max(unit.scenes.length, 1)} sub="ANTES DE ARRANCAR" onSalir={onSalir} onPanico={onPanico} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-3">
        {/* ── La unidad, con su color y su cara ── */}
        <motion.div
          {...ENTRADA}
          className="relative overflow-hidden rounded-[26px] border px-5 py-5"
          style={{
            borderColor: 'var(--borde-medio)',
            background: `linear-gradient(140deg, color-mix(in oklch, ${tema} 18%, transparent), transparent 58%), var(--bg-elevated)`,
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -right-8 h-36 w-44 rounded-full opacity-40 blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--aurora-1), transparent 66%)' }}
          />
          <div className="relative flex flex-col gap-3">
            <span
              aria-hidden="true"
              className="inline-flex size-14 items-center justify-center rounded-[18px] text-[1.6rem]"
              style={{ background: tema }}
            >
              {unit.icon || unit.emoji}
            </span>
            <div className="flex flex-col gap-1.5">
              <Eyebrow acento>La situación</Eyebrow>
              <p className="font-display text-[clamp(1.45rem,7vw,2rem)] leading-[1.05] font-extrabold tracking-[-0.03em]">
                {unit.title_es}
              </p>
              <p className="text-[0.92rem] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>
                {unit.subtitle_es} {unit.arc_es}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Alfred presenta la unidad (companionSetup_es) ── */}
        <AlfredBloque lineas={unit.companionSetup_es} />

        {/* ── Qué viene: las escenas, sin números de "lecciones" ── */}
        <div className="flex flex-col gap-2.5">
          <Eyebrow>Lo que vamos a ver</Eyebrow>
          <div className="flex flex-col gap-2">
            {unit.scenes.map((s) => (
              <motion.div
                {...ENTRADA}
                key={s.id}
                className="flex items-center gap-3 rounded-[18px] border px-3.5 py-2.5"
                style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}
              >
                <span aria-hidden="true" className="text-[1.1rem]">
                  {s.icon}
                </span>
                <span className="min-w-0 flex-1 text-[0.88rem] leading-[1.35]">{s.title_es}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 pt-1">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onArrancar}
          className="relative inline-flex min-h-13 w-full cursor-pointer items-center justify-center overflow-hidden rounded-full text-[0.95rem] font-bold"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          Dale, arranquemos →
          <BorderBeam size={90} duration={7} borderWidth={1.4} colorFrom="var(--aurora-1)" colorTo="var(--aurora-2)" />
        </motion.button>
      </div>
    </div>
  );
}
