/* Pélala — la experiencia de SLANG: un sticker que muestra un término; lo pelas
   cuando ya te lo sabes y entra el siguiente. Debajo, la "tarjeta de significado"
   (revelable con el ojo + guardable) y el mini-chat para usarlo.

   REDISEÑO al contrato visual de RODEO (encargo de Gus, integración en SLANG):
   · Sin header propio: la fila Menu + toggler la pone el shell (App/FilaSuperior).
     Aquí va la barra de sección CANÓNICA (misma que SLANG y la sesión de charla):
     ← circular (borde --borde-sutil sobre --bg-surface) + título mono uppercase en
     --accent, y un contador mono a la derecha.
   · CERO colores crudos (neutral-x, dark:) — todo por tokens del tema (claro/oscuro/gradiente).
   · El ← vuelve AL ORIGEN: como toda vista, hace setView('home'); el Home reabre el
     carrusel porque la carta dejó levantado `carruselAlVolver` (regla 5). No usa el
     `toPicker` del store (el picker no se rutea en la integración).

   El sticker FLOTA sobre el fondo del tema (más inmersivo que encajarlo en una
   Card, y su propia sombra WebGL le da relieve); lo de abajo vive en superficies
   con tokens. El barrido holográfico rosado (entrada y al empezar a pelar) es del
   engine vendored — no se inventa nada. */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Bookmark, BookmarkCheck, Eye, EyeOff } from 'lucide-react';

import { CornerHint } from '@/components/pelala/corner-hint';
import { PeelSticker, slangTextSource, type PeelStickerHandle } from '@/components/pelala/peel-sticker';
import { UsarSlang } from '@/components/pelala/usar-slang';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { usePelala } from '@/stores/pelala';

/* Misma COLUMNA y SIN_BARRA que SLANG y la sesión de charla (convención del repo:
   cada fichero la suya). */
const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* Resalta el término dentro de su frase de ejemplo (en --accent), para que la
   vista enseñe DÓNDE cae el phrasal/slang en una oración real. */
function resaltarTermino(context: string, target: string): ReactNode {
  const i = context.toLowerCase().indexOf(target.toLowerCase());
  if (i === -1) return context;
  return (
    <>
      {context.slice(0, i)}
      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{context.slice(i, i + target.length)}</span>
      {context.slice(i + target.length)}
    </>
  );
}

const ETIQUETA_KIND: Record<'phrasal' | 'slang', string> = {
  phrasal: 'phrasal verb',
  slang: 'slang',
};

export function Pelala() {
  const orden = usePelala((s) => s.orden);
  const retoIndex = usePelala((s) => s.retoIndex);
  const retoSiguiente = usePelala((s) => s.retoSiguiente);
  const guardados = usePelala((s) => s.guardados);
  const toggleGuardar = usePelala((s) => s.toggleGuardar);
  const peelHintVisto = usePelala((s) => s.peelHintVisto);
  const marcarPeelHintVisto = usePelala((s) => s.marcarPeelHintVisto);

  const term = orden[retoIndex % orden.length];
  const guardado = guardados.includes(term.id);

  const [revelado, setRevelado] = useState(false);
  const stickerRef = useRef<PeelStickerHandle>(null);

  /* ← AL ORIGEN: como toda vista, vuelve al Home, que reabre el carrusel. */
  const volver = useCallback(() => useApp.getState().setView('home'), []);

  /* Al empezar a pelar: barrido holográfico (el mismo de la entrada). */
  const onPeelStart = useCallback(() => {
    stickerRef.current?.sweep();
    marcarPeelHintVisto(); // al pelar por primera vez, la pista ya no vuelve
  }, [marcarPeelHintVisto]);

  /* Primera vez: tras la entrada, el sticker se auto-pela en bucle desde la
     esquina hasta que el usuario pela por primera vez (luego no vuelve). */
  useEffect(() => {
    if (peelHintVisto) return;
    const t = window.setTimeout(() => stickerRef.current?.peelPreview(), 1100);
    return () => {
      window.clearTimeout(t);
      stickerRef.current?.stopPeelPreview();
    };
  }, [peelHintVisto]);

  /* Al despegar del todo: entra el siguiente término (significado reseteado). */
  const onDetach = useCallback(() => {
    setRevelado(false);
    retoSiguiente();
  }, [retoSiguiente]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección canónica (misma que SLANG) ──────────────────── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={volver}
          aria-label="Volver al inicio"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Slang · pélala y aprende
        </span>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[0.62rem] font-bold tracking-[0.08em] tabular-nums"
          style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)', border: '1px solid var(--borde-sutil)' }}
        >
          {retoIndex + 1}/{orden.length}
        </span>
      </div>

      {/* ── Scroller: sticker flotante + significado + mini-chat ──────────── */}
      <div className={cn(COLUMNA, 'flex min-h-0 flex-1 flex-col overflow-y-auto', SIN_BARRA)}>
        {/* El sticker, flotando sobre el fondo del tema. */}
        <div className="relative mt-1 aspect-[5/3] w-full shrink-0 select-none">
          <PeelSticker
            ref={stickerRef}
            key="reto"
            source={slangTextSource(term.term, '¿cómo se dice?')}
            sourceKey={term.id}
            onPeelStart={onPeelStart}
            onDetach={onDetach}
            className="h-full w-full"
          />
          {!peelHintVisto && <CornerHint />}
        </div>

        <p className="mt-1 mb-3 text-center text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>
          Cuando ya te lo sepas, <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>pela el sticker</span> para el siguiente ✌️
        </p>

        {/* ── Tarjeta de significado (revelable + guardable) ──────────────── */}
        <div
          className="rounded-[22px] p-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--borde-sutil)', boxShadow: 'var(--sticker-shadow)' }}
        >
          {/* Cabecera: emoji + término + chip de tipo · guardar */}
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="text-2xl leading-none">{term.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1.05rem] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {term.term}
              </p>
              <span className="font-mono text-[0.6rem] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--text-muted)' }}>
                {ETIQUETA_KIND[term.kind]}
              </span>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.86 }}
              onClick={() => toggleGuardar(term.id)}
              aria-label={guardado ? 'Quitar de guardados' : 'Guardar término'}
              aria-pressed={guardado}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors"
              style={{
                borderColor: guardado ? 'transparent' : 'var(--borde-sutil)',
                background: guardado ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                color: guardado ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {guardado ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
            </motion.button>
          </div>

          {/* Cuerpo revelable: significado + ejemplo (con el término resaltado). */}
          <div className="relative mt-3 overflow-hidden rounded-2xl" style={{ background: 'var(--bg-void)' }}>
            <div
              className={cn(
                'px-4 py-3.5 transition-[filter,opacity] duration-300',
                revelado ? 'opacity-100 blur-0' : 'pointer-events-none select-none opacity-70 blur-[7px]',
              )}
            >
              <p className="text-[0.98rem] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {term.gloss_es}
              </p>
              <p className="mt-1.5 text-[0.85rem] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                “{resaltarTermino(term.context_en, term.target)}”
              </p>
            </div>

            {/* Overlay de revelar (cuando está oculto). */}
            {!revelado && (
              <button
                type="button"
                onClick={() => setRevelado(true)}
                aria-label="Revelar el significado"
                className="absolute inset-0 flex items-center justify-center"
              >
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.8rem] font-semibold shadow-lg backdrop-blur-sm"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
                >
                  <Eye size={16} /> toca para ver el significado
                </span>
              </button>
            )}

            {/* Ocultar de nuevo (cuando está revelado). */}
            {revelado && (
              <button
                type="button"
                onClick={() => setRevelado(false)}
                aria-label="Ocultar el significado"
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full backdrop-blur-sm"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}
              >
                <EyeOff size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ── Mini-chat "úsalo tú" ─────────────────────────────────────────── */}
        <UsarSlang term={term} />

        <div className="h-2 shrink-0" />
      </div>
    </div>
  );
}
