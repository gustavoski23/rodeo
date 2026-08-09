import { motion } from 'motion/react';

import { BorderBeam } from '@/components/magicui/border-beam';
import type { A1Scene, A1Unit } from '@/content/a1/tipos';

import { AlfredBloque, ENTRADA, Eyebrow } from './alfred';
import { Cabecera } from './cabecera';

/* PORTADA DE UNIDAD — la antesala entre el mapa y el loop.

   Acá vive `companionSetup_es`: las dos líneas con las que Alfred presenta la
   situación completa ("bueno, primer día, respira…"). El legacy nunca las
   pintó y por eso se sentía que uno caía en la escena 1 sin que nadie le
   dijera en qué se estaba metiendo. Un principiante necesita saber a qué
   entra ANTES de que aparezca la primera palabra en inglés.

   Solo se muestra la PRIMERA vez que se abre la unidad (unidadVirgen): la
   presentación es una bienvenida, no un peaje. Quien vuelve a la unidad ya
   sabe de qué va y entra derecho a la escena que le toca. Retomar por "seguí
   donde ibas" tampoco pasa por acá — ahí uno viene a terminar algo, no a que
   se lo presenten.

   SE FUE LA TARJETA "LA SITUACIÓN" (emoji gigante + título + subtítulo). Dos
   razones, y la segunda no es de gusto:

   1. Repetía lo que la cabecera del tramo ya dijo en el mapa, en el mismo
      toque con el que se llegó acá. Gus la tachó en rojo.
   2. NO CABÍA. Medido a 390×844: el scroller es un flex column y sus hijos
      encogen antes que desbordar, así que la tarjeta se comía media pantalla
      y aun así quedaba recortada por su `overflow-hidden` — el título
      "Las que ya sabes" salía partido por la mitad y el subtítulo no se
      pintaba nunca. El fallo #1 de CLAUDE.md, en vivo.

   Quién presenta la unidad ahora: Alfred, que es lo que ya hacía con
   companionSetup_es y encima con voz de persona. */

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
  const desde = Math.max(unit.scenes.findIndex((s) => s.id === scene.id), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Cabecera activo={desde} total={Math.max(unit.scenes.length, 1)} sub="ANTES DE ARRANCAR" onSalir={onSalir} onPanico={onPanico} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* DOS CLASES QUE PARECEN DE ADORNO Y NO LO SON:

            `m-auto` centra el bloque en el alto que sobra. Sin la tarjeta y con
            los 130px recuperados, la unidad 1 (dos líneas de Alfred + tres
            escenas) dejaba 398px de vacío medidos entre la última tarjeta y el
            CTA: casi media pantalla que se leía como "se acabó el contenido" y
            no como aire. Con márgenes automáticos el bloque flota en el centro
            y las unidades largas no notan nada — cuando el contenido pasa del
            alto disponible, los auto se resuelven a 0 solos.
            `m-auto` y NO `justify-center` a propósito: justify-center en un
            contenedor con scroll recorta el principio del contenido cuando
            desborda, y ahí no hay forma de llegar a lo de arriba.

            `[&>*]:shrink-0` es el seguro contra el fallo #1. En un flex column
            con overflow-y-auto los hijos ENCOGEN antes que provocar scroll, y
            encoger un bloque con overflow-hidden dentro es recortarlo en
            silencio: así se perdía el subtítulo de la tarjeta que se acaba de
            ir (el título salía partido por la mitad en la captura). Con esto, si
            algún día el contenido no cabe, aparece scroll en vez de perderse
            texto. */}
        <div className="m-auto flex w-full shrink-0 flex-col gap-4 py-2 [&>*]:shrink-0">
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
