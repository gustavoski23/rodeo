/* Precarga de SLANG — al ENTRAR a la vista (clic en «Slang») se bajan TODOS los
   stickers ilustrados detrás del mismo lápiz que usan los libros, y recién con
   todo abajo se muestra Pélala. Pedido de Gus: «que se descarguen todos con una
   pantalla de carga como la de los libros».

   Mismo patrón que views/libro/index.tsx (usePrecarga): tandas con límite de
   concurrencia (el pico de memoria no se dispara), `decode()` para esperar el
   bitmap LISTO (no solo bajado), techo de tiempo para que una red mala no deje a
   nadie encerrado, y un flag persistido para que la 2ª visita entre directo.

   La clave del flag lleva la CUENTA de stickers: al sumar stickers nuevos, la
   clave cambia y se vuelve a precargar UNA vez (si no, un disco viejo se saltaría
   los nuevos). El service worker/caché del navegador hace el resto. */

import { useEffect, useRef, useState } from 'react';

import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { STICKER_IMG } from '@/content/pelala/sticker-images';
import { store } from '@/lib/storage';

const CONCURRENCIA = 6;
const TECHO_MS = 12_000;

const URLS = Object.values(STICKER_IMG);
const CLAVE = `pelala_stickers_precargados_v${URLS.length}`;

export function usePrecargaStickers(): { listo: boolean; hechas: number; total: number } {
  const yaEstaba = useRef(store.get<boolean>(CLAVE, false));
  const [hechas, setHechas] = useState(0);
  const [listo, setListo] = useState(yaEstaba.current);

  useEffect(() => {
    if (store.get<boolean>(CLAVE, false) || URLS.length === 0) {
      setListo(true);
      return;
    }
    let vivo = true;
    let n = 0;
    let i = 0;

    const unaImg = (src: string) =>
      new Promise<void>((res) => {
        const img = new Image();
        const fin = () => res();
        img.onload = () => (img.decode ? img.decode().then(fin, fin) : fin());
        img.onerror = fin;
        img.src = src;
      });

    const worker = async () => {
      while (vivo && i < URLS.length) {
        await unaImg(URLS[i++]!);
        if (!vivo) return;
        n++;
        setHechas(n);
        if (n >= URLS.length) {
          store.set(CLAVE, true);
          setListo(true);
        }
      }
    };
    for (let k = 0; k < Math.min(CONCURRENCIA, URLS.length); k++) void worker();

    const techo = setTimeout(() => {
      if (vivo) setListo(true); // red mala: se entra igual, sin marcar el flag
    }, TECHO_MS);

    return () => {
      vivo = false;
      clearTimeout(techo);
    };
  }, []);

  return { listo, hechas, total: URLS.length };
}

/** La espera de SLANG, con el mismo lápiz durazno que la del libro. */
export function CargandoSlang({ hechas, total }: { hechas: number; total: number }) {
  const pct = total ? Math.round((hechas / total) * 100) : 100;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <PencilLoader size={5.2} label="Preparando SLANG" />
      <div className="flex flex-col items-center gap-2">
        <p className="font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--text-secondary)' }}>
          Preparando SLANG
        </p>
        <p className="max-w-[30ch] text-[0.82rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Son {total} stickers ilustrados. Se bajan una sola vez y después SLANG
          abre al instante, incluso sin señal.
        </p>
        <div
          className="mt-1 h-1 w-40 overflow-hidden rounded-full"
          style={{ background: 'var(--borde-sutil)' }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Cargando los stickers de SLANG"
        >
          <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
        </div>
      </div>
    </div>
  );
}
