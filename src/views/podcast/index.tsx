import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, AudioLines } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';

import './podcast.css';
import { Reproductor } from './reproductor';

/* Vista PODCAST — el MENÚ de episodios, al patrón canónico de DNA/SLANG:
   barra mono arriba con el ← de volver, y una Card que es el scroller único.

   Los episodios NO viven en el código: se leen de public/podcasts/index.json.
   Es a propósito — los 10 episodios reales (con sus miniaturas) se hornean por
   fuera y aterrizan como assets; añadir uno tiene que ser tocar el manifest,
   no recompilar la app. Mientras una miniatura no exista (imagen: ""), la
   tarjeta pinta un gradiente con los colores de la aurora del Home: mejor un
   placeholder del sistema que un <img> roto.

   Al tocar un episodio se abre el REPRODUCTOR sincronizado (reproductor.tsx)
   DENTRO de esta vista: estado local `seleccionado`, no una vista nueva en el
   store — el ← del reproductor vuelve a este menú, y el ← del menú sigue
   yendo al carrusel vía carruselAlVolver. */

/** Shape de cada entrada del manifest (public/podcasts/index.json). El
    reproductor carga `pack` (transcript + glosario + onda, ~33KB) al abrir. */
export type Episodio = {
  id: string;
  titulo_en: string;
  titulo_es: string;
  hosts: { A: string; B: string };
  duracion: string;
  imagen: string;
  audio: string;
  timing: string;
  pack: string;
};

/* Las dos constantes del patrón, redeclaradas aquí a propósito (misma
   convención que dna/index.tsx): COLUMNA de 640 px y scroll sin barra. */
const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

export default function PodcastView() {
  const setView = useApp((s) => s.setView);
  /* null = cargando; [] = manifest vacío o roto (se enseña el estado de error:
     un menú en blanco sin explicación parecería la app colgada). */
  const [episodios, setEpisodios] = useState<Episodio[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Episodio | null>(null);

  useEffect(() => {
    /* AbortController y no un flag: si el usuario entra y sale rápido, el
       fetch muere con la vista en vez de resolver sobre un componente
       desmontado. */
    const ctrl = new AbortController();
    fetch('/podcasts/index.json', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { episodios?: Episodio[] }) => setEpisodios(data.episodios ?? []))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        console.error('[podcast] manifest:', e);
        setFallo(true);
      });
    return () => ctrl.abort();
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección ─────────────────────────────────────────────── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          /* Con un episodio abierto el ← primero cierra el episodio: salir de
             la sección desde ahí sería perder el menú que acabas de mirar. En
             el menú hace lo de toda vista: setView('home') — quién entra por
             el carrusel ya dejó `carruselAlVolver` en alto (lo pone la carta,
             ver carrusel-features.tsx) y el Home reabre la vitrina solo. */
          onClick={() => (seleccionado ? setSeleccionado(null) : setView('home'))}
          aria-label={seleccionado ? 'Volver a los episodios' : 'Volver al inicio'}
          className="rd-toque-44 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Podcast · dos voces, inglés real
        </span>
      </div>

      {/* ── La tarjeta ─────────────────────────────────────────────────────
          Scroller único: la lista de episodios (o el estado del episodio). */}
      <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
        <div className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3.5 py-4 sm:px-5', SIN_BARRA)}>
          {seleccionado ? (
            /* key: cambiar de episodio remonta el reproductor entero — audio,
               karaoke y coach arrancan limpios, sin estados del anterior. */
            <Reproductor key={seleccionado.id} episodio={seleccionado} onVolver={() => setSeleccionado(null)} />
          ) : fallo ? (
            <p className="text-[0.88rem]" style={{ color: 'var(--text-muted)' }}>
              No se pudo cargar la lista de episodios. Revisa la conexión y vuelve a entrar.
            </p>
          ) : episodios === null ? (
            <p className="text-[0.88rem]" style={{ color: 'var(--text-secondary)' }}>
              Cargando episodios…
            </p>
          ) : (
            <>
              <p className="shrink-0 text-[0.88rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
                Escucha, toca lo que no entiendas, pregunta.
              </p>
              <div className="flex shrink-0 flex-col gap-2.5 pb-1">
                {episodios.map((ep) => (
                  <FilaEpisodio key={ep.id} episodio={ep} onAbrir={() => setSeleccionado(ep)} />
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

/* Una fila del menú: miniatura + títulos + voces, y la duración a la derecha.
   El título en inglés manda (es lo que vas a escuchar); el español debajo es
   la muleta, como en las cards de los libros. */
function FilaEpisodio({ episodio, onAbrir }: { episodio: Episodio; onAbrir: () => void }) {
  return (
    <button type="button" className="pod-fila" onClick={onAbrir}>
      <Miniatura episodio={episodio} />
      <span className="pod-fila__texto">
        <span className="pod-fila__en">{episodio.titulo_en}</span>
        <span className="pod-fila__es">{episodio.titulo_es}</span>
        <span className="pod-fila__voces">
          {episodio.hosts.A} &amp; {episodio.hosts.B}
        </span>
      </span>
      <span className="pod-fila__duracion">{episodio.duracion}</span>
    </button>
  );
}

/* Miniatura del episodio. Sin imagen todavía (los 10 reales llegan con las
   suyas): gradiente con los tokens de la aurora — colores que ya son de la
   casa, no un gris de "falta algo". */
function Miniatura({ episodio }: { episodio: Episodio }) {
  if (episodio.imagen) {
    return <img className="pod-mini" src={episodio.imagen} alt="" loading="lazy" decoding="async" />;
  }
  return (
    <span className="pod-mini pod-mini--pronto" aria-hidden="true">
      <AudioLines size={22} strokeWidth={1.8} />
    </span>
  );
}
