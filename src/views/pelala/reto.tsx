/* Pélala — la experiencia de SLANG: un sticker que muestra un término; lo pelas
   cuando ya te lo sabes y entra el siguiente. Debajo, la "tarjeta de significado"
   (revelable con el ojo + guardable) y el mini-chat para usarlo.

   REDISEÑO al contrato visual de RODEO (encargo de Gus, integración en SLANG):
   · Sin header propio: la fila Menu + toggler la pone el shell (App/FilaSuperior).
     Aquí va la barra de sección CANÓNICA (misma que SLANG y la sesión de charla):
     ← circular (borde --borde-sutil sobre --bg-surface) + título mono uppercase en
     --accent + contador, y una barra de progreso fina del mazo.
   · CERO colores crudos (neutral-x, dark:) — todo por tokens del tema (claro/oscuro/gradiente).
   · El ← vuelve AL ORIGEN: como toda vista hace setView('home'); el Home reabre el
     carrusel porque la carta dejó levantado `carruselAlVolver` (regla 5).

   Segunda pasada tras auditoría adversarial de pulido/temas:
   · El "pozo" del significado usa --bg-deep (no --bg-void): --bg-void sobre --bg-surface
     casi no se distingue en claro y lee como agujero negro en oscuro. --bg-deep + borde
     da un hundido consistente en los 3 temas.
   · El significado oculto se cubre con un overlay de FROST real (backdrop-blur uniforme),
     no con blur sobre el propio texto (que sangraba con bordes sucios).
   · El término se resalta NEUTRO (negrita + --text-primary), no en --accent: el sticker
     ya lo pinta AZUL, y usar la lima a pocos cm ponía la misma palabra en dos colores.
   · Sticker más compacto + caption anclada + barra de progreso: menos aire muerto y una
     columna cohesionada en vez de dos islas. */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Bookmark, BookmarkCheck, Eye, EyeOff } from 'lucide-react';

import { CornerHint } from '@/components/pelala/corner-hint';
import { PeelSticker, slangTextSource, type PeelStickerHandle } from '@/components/pelala/peel-sticker';
import { UsarSlang } from '@/components/pelala/usar-slang';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { usePelala } from '@/stores/pelala';

const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* Resalta el término dentro de su frase de ejemplo. NEUTRO a propósito (negrita +
   --text-primary, no --accent): el sticker ya pinta el término en AZUL y la lima
   a pocos cm pondría la MISMA palabra en dos colores distintos (confunde). Un solo
   tratamiento = "esta es la expresión que estás aprendiendo". */
function resaltarTermino(context: string, target: string): ReactNode {
  const i = context.toLowerCase().indexOf(target.toLowerCase());
  if (i === -1) return context;
  return (
    <>
      {context.slice(0, i)}
      <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{context.slice(i, i + target.length)}</span>
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

  // Mazo siempre poblado (el store arranca con DECK); guarda defensivo por si acaso.
  const term = orden[retoIndex % orden.length];
  if (!term) return null;
  const guardado = guardados.includes(term.id);
  const progreso = (retoIndex + 1) / orden.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección canónica (misma que SLANG) ──────────────────── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-2')}>
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

      {/* Barra de progreso fina del mazo. */}
      <div className={cn(COLUMNA, 'shrink-0 pb-3')}>
        <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--chip-bg)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--accent)' }}
            initial={false}
            animate={{ width: `${Math.round(progreso * 100)}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
          />
        </div>
      </div>

      {/* ── Scroller: sticker flotante + significado + mini-chat ──────────── */}
      <div className={cn(COLUMNA, 'flex min-h-0 flex-1 flex-col overflow-y-auto', SIN_BARRA)}>
        {/* El sticker, flotando sobre el fondo del tema (compacto: menos canvas
            vacío alrededor del gráfico → columna cohesionada). */}
        <div className="relative aspect-[2/1] w-full shrink-0 select-none">
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

        {/* ── Tarjeta de significado (revelable + guardable) ──────────────── */}
        <div
          className="mt-1 rounded-[22px] p-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--borde-sutil)', boxShadow: 'var(--sticker-shadow)' }}
        >
          {/* Caption anclada arriba de la tarjeta (ya no flota huérfana). */}
          <p className="mb-3 text-center text-[0.76rem]" style={{ color: 'var(--text-muted)' }}>
            Cuando ya te lo sepas, <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>pela el sticker</span> para el siguiente ✌️
          </p>

          {/* Cabecera: emoji + término (dominante) + chip de tipo · guardar. */}
          <div className="flex items-start gap-2.5">
            <span aria-hidden="true" className="mt-0.5 text-2xl leading-none">{term.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1.15rem] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {term.term}
              </p>
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 font-mono text-[0.55rem] font-bold tracking-[0.12em] uppercase"
                style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)' }}
              >
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
                borderColor: guardado ? 'transparent' : 'var(--borde-medio)',
                background: guardado ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                color: guardado ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {guardado ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
            </motion.button>
          </div>

          {/* Pozo del significado: --bg-deep + borde (hundido consistente en los
              3 temas). El texto oculto se cubre con FROST real (backdrop-blur del
              overlay), no con blur sobre el propio texto. */}
          <div
            className="relative mt-3 overflow-hidden rounded-2xl"
            style={{ background: 'var(--bg-deep)', border: '1px solid var(--borde-sutil)' }}
          >
            <div className="px-4 py-3.5">
              <p className="text-[0.95rem] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {term.gloss_es}
              </p>
              <p className="mt-1.5 text-[0.82rem] leading-snug" style={{ color: 'var(--text-muted)' }}>
                “{resaltarTermino(term.context_en, term.target)}”
              </p>
            </div>

            {/* Overlay de revelar (frost uniforme sobre el texto). */}
            {!revelado && (
              <button
                type="button"
                onClick={() => setRevelado(true)}
                aria-label="Revelar el significado"
                className="absolute inset-0 flex items-center justify-center backdrop-blur-md"
                style={{ background: 'color-mix(in oklch, var(--bg-deep) 45%, transparent)' }}
              >
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.8rem] font-semibold shadow-lg"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--borde-medio)', color: 'var(--text-primary)' }}
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
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full transition-colors"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--borde-sutil)', color: 'var(--text-secondary)' }}
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
