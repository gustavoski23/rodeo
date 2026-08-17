import { motion } from 'motion/react';

import type { JobPack, JobPackId } from '@/content/a1/tipos';

/* Selector de pack por trabajo.

   Elegir trabajo es la única decisión de identidad que toma el usuario en el
   módulo, así que se pinta con el vocabulario más "físico" que tiene la app:
   la tarjeta-sticker pastel de las tarjetas de escena de TALK (borradas con ESCENAS el 2026-08-17). Cuatro papelitos
   de colores en una grilla se leen como "escoge uno", no como un formulario.

   Este componente NO decide dónde se guarda la elección: solo avisa con
   onPick. Quién persiste (rodeo_a1_job) y cuándo, lo cablea el integrador —
   así el picker sirve igual en el onboarding que en un cambio posterior.

   Accesibilidad: son <button> con aria-pressed, no radios, porque tocar una
   tarjeta dispara una acción (elegir pack) y no rellena un campo. Y el estado
   seleccionado NO se juega solo al color: el borde lima va acompañado de un
   check, que es lo que se ve cuando el color no se distingue. */

/* Un pastel por rol, fijo. La consistencia importa más que la variedad: el
   que vuelve a la pantalla busca "el azul" o "el durazno", no el segundo de
   la fila. Los mismos pasteles que llevan las unidades de cada pack. */
const PASTEL: Record<JobPackId, string> = {
  tech: 'var(--card-blue)',
  ventas: 'var(--card-green)',
  soporte: 'var(--card-lavender)',
  recepcion: 'var(--card-peach)',
};

/* Inclinación mínima por posición: lo justo para que se lea "pegatina" y no
   "tarjeta torcida". Se endereza al tocarla. */
const GIRO = [-0.7, 0.6, 0.5, -0.6];

export function JobPicker({
  packs,
  seleccionado,
  onPick,
}: {
  packs: JobPack[];
  seleccionado: JobPackId | null;
  onPick: (id: JobPackId) => void;
}) {
  return (
    /* DOS COLUMNAS SIEMPRE. En una sola columna las cuatro pegatinas medían
       más que la pantalla de 390 px y la salida secundaria ("Después elijo")
       caía por debajo del pliegue del scroller, sin ninguna pista de que
       hubiera más abajo. Apiladas de dos en dos, la decisión entera —las cuatro
       opciones y la salida— cabe de un vistazo, que es lo que pide una
       pantalla de elegir. */
    <motion.div
      className="grid grid-cols-2 gap-2.5 sm:gap-3.5"
      initial="oculta"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
    >
      {packs.map((pack, i) => {
        const activo = pack.id === seleccionado;
        const giro = GIRO[i % GIRO.length];

        return (
          <motion.button
            key={pack.id}
            type="button"
            aria-pressed={activo}
            onClick={() => onPick(pack.id)}
            variants={{
              oculta: { opacity: 0, y: 18, rotate: giro },
              visible: { opacity: 1, y: 0, rotate: activo ? 0 : giro },
            }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            whileHover={{ y: -3, rotate: 0, boxShadow: 'var(--shadow-sticker-lift)' }}
            whileTap={{ scale: 0.985, rotate: 0 }}
            className="flex w-full cursor-pointer flex-col rounded-[22px] border-2 px-3.5 pt-3.5 pb-3.5 text-left shadow-sticker sm:px-[18px] sm:pt-[18px] sm:pb-4"
            style={{
              background: PASTEL[pack.id],
              /* El borde vive siempre (border-2), solo cambia de color: si
                 apareciera al seleccionar, la tarjeta daría un brinco de 2px. */
              borderColor: activo ? 'var(--accent)' : 'var(--card-borde)',
              color: 'var(--card-ink)',
              boxShadow: activo
                ? '0 0 0 4px color-mix(in oklch, var(--accent) 22%, transparent), var(--shadow-sticker-lift)'
                : 'var(--shadow-sticker)',
            }}
          >
            <div className="mb-2.5 flex items-start justify-between gap-2">
              <span aria-hidden="true" className="text-[1.7rem] leading-none">
                {pack.emoji}
              </span>

              {/* El check del seleccionado: la señal que no depende del color. */}
              {activo && (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                  aria-hidden="true"
                  className="grid size-[22px] shrink-0 place-items-center rounded-full font-mono text-[0.7rem] font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                >
                  ✓
                </motion.span>
              )}
            </div>

            <span
              className="font-display text-[1.15rem] leading-tight font-extrabold tracking-[-0.02em] break-words"
              style={{ color: 'var(--card-ink)' }}
            >
              {pack.nombre_es}
            </span>

            <span
              className="mt-1.5 text-[0.78rem] leading-[1.4] sm:mt-2 sm:text-[0.82rem] sm:leading-[1.45]"
              style={{ color: 'var(--card-ink-soft)' }}
            >
              {pack.promesa_es}
            </span>

            {/* Etiqueta de estado en texto: el lector de pantalla ya tiene el
                aria-pressed, pero en pantalla ayuda a confirmar la elección. */}
            <span
              className="mt-2.5 font-mono text-[0.58rem] font-bold tracking-[0.14em] uppercase sm:mt-3"
              style={{ color: 'var(--card-ink-soft)', opacity: activo ? 1 : 0.7 }}
            >
              {activo ? 'Tu pack · listo' : 'Elegir →'}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
