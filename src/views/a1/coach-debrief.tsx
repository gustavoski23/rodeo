import { motion } from 'motion/react';

import type { A1UnitRuta } from '@/content/a1/tipos-ruta';
import type { Cierre } from '@/lib/coach-a1';
import { Sheet } from '@/views/talk/sheet';

import { AlfredAvatar, Eyebrow } from './alfred';
import { reintentarCierre, salirCoach, terminarCoach } from './coach-turno';
import { BotonAudio, BotonEstrella } from './frase-card';

/* LA HOJA DE CIERRE — tres bloques, en este orden, y nada más:

     1. lo que lograste   2. UNA cosa   3. la frase que ganaste

   Lo que NO está acá, y la lista importa tanto como el contenido: no hay nota,
   ni puntaje, ni porcentaje, ni "tuviste 12 errores", ni comparación con la
   sesión de ayer, ni el listado de lo que salió mal. Si hubo doce errores, once
   se fueron al SRS y ninguno se nombra. El usuario tampoco ve el JSON: lo que
   llega acá es un `Cierre` ya resuelto, y el `srs` se aplicó en silencio antes
   de que esta hoja existiera.

   Acá y solo acá aparece Alfred. Durante la conversación habló el personaje de
   la escena; el que cierra es el compañero que enseña. Esa separación es la que
   deja que equivocarse delante del mesero no se sienta como equivocarse delante
   del profesor.

   La ★ de la frase ganada guarda a "Mis frases" con un toque (R7). */

function Bloque({
  eyebrow,
  children,
  fondo,
}: {
  eyebrow: string;
  children: React.ReactNode;
  fondo?: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[20px] border px-4 py-4"
      style={{ background: fondo ?? 'var(--bg-surface)', borderColor: 'var(--borde-sutil)' }}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      {children}
    </div>
  );
}

export function CoachDebrief({
  cierre,
  error,
  unit,
  onListo,
}: {
  cierre: Cierre | null;
  error: string | null;
  unit: A1UnitRuta;
  onListo: () => void;
}) {
  const abierta = !!cierre || !!error;

  return (
    <Sheet
      abierta={abierta}
      onClose={() => {
        // Escape / clic afuera: cerrar la hoja buena es "listo"; cerrar la de
        // fallo es salir sin cierre. Las dos terminan la conversación.
        if (cierre) terminarCoach();
        else salirCoach();
        onListo();
      }}
      labelledBy="coach-cierre-titulo"
    >
      {cierre && (
        <div className="flex flex-col gap-4">
          {/* Alfred entra recién acá. */}
          <div className="flex items-center gap-2.5">
            <AlfredAvatar size={34} />
            <span
              className="font-mono text-[0.6rem] font-bold tracking-[0.16em] uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              {unit.title_es}
            </span>
          </div>

          <p
            id="coach-cierre-titulo"
            className="font-display text-[clamp(1.9rem,9vw,2.5rem)] leading-[0.94] font-extrabold tracking-[-0.035em]"
          >
            HABLASTE
            <span style={{ color: 'var(--accent)' }}>.</span>
          </p>

          {/* 1 · LO QUE LOGRASTE */}
          <Bloque eyebrow="Lo que lograste" fondo="var(--accent-dim)">
            <p className="text-[0.98rem] leading-[1.5] font-semibold">{cierre.logro_es}</p>
          </Bloque>

          {/* 2 · UNA COSA. Una. La más rentable. */}
          <Bloque eyebrow="Una cosa para la próxima">
            <p className="text-[0.95rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
              {cierre.unaCosa_es}
            </p>
          </Bloque>

          {/* 3 · LA FRASE QUE GANASTE. Nunca vacío: si el modelo no eligió una,
              el motor elige la primera que NO cayó al repaso (ver elegirFrase). */}
          {cierre.frase && (
            <Bloque eyebrow="La frase que ganaste">
              <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-display text-[1.25rem] leading-[1.15] font-bold tracking-[-0.02em] break-words">
                    {cierre.frase.en}
                  </span>
                  {/* La traducción se calla cuando es la misma palabra. Medio
                      Tramo 0 son cognados —taxi, hotel, information— y "taxi /
                      taxi" se lee como un bug, no como una traducción. */}
                  {cierre.frase.es.trim().toLowerCase() !== cierre.frase.en.trim().toLowerCase() && (
                    <span className="text-[0.86rem]" style={{ color: 'var(--text-secondary)' }}>
                      {cierre.frase.es}
                    </span>
                  )}
                  {cierre.frase.sounds_es && (
                    <span className="font-mono text-[0.68rem]" style={{ color: 'var(--text-muted)' }}>
                      suena: {cierre.frase.sounds_es}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <BotonEstrella chunk={cierre.frase} tamano={42} tono="claro" />
                  <BotonAudio en={cierre.frase.en} tamano={42} tono="claro" />
                </div>
              </div>
            </Bloque>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              terminarCoach();
              onListo();
            }}
            className="mt-1 inline-flex min-h-13 w-full cursor-pointer items-center justify-center rounded-full text-[0.95rem] font-bold"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            Listo
          </motion.button>
        </div>
      )}

      {/* Fallar el cierre NO destruye la conversación: se reintenta o se sale.
          Perder una charla que salió bien por un rate-limit sería una traición. */}
      {!cierre && error && (
        <div className="flex flex-col gap-4">
          <p id="coach-cierre-titulo" className="font-display text-[1.8rem] leading-none font-extrabold">
            SE CORTÓ
            <span style={{ color: 'var(--accent)' }}>.</span>
          </p>
          <p className="text-[0.92rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
            {error} Tu conversación sigue acá.
          </p>
          <button
            type="button"
            onClick={reintentarCierre}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full text-[0.95rem] font-bold"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => {
              salirCoach();
              onListo();
            }}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border text-[0.9rem] font-semibold"
            style={{ borderColor: 'var(--borde-medio)', color: 'var(--text-primary)' }}
          >
            Salir sin cierre
          </button>
        </div>
      )}
    </Sheet>
  );
}
