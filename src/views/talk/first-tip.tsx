import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { create } from 'zustand';

import { cn } from '@/lib/utils';
import { store } from '@/lib/storage';
import { useEnSesion } from '@/stores/talk';

/* Tip de primera vez — port de tipPrimeraVez (public/legacy.html:3220-3234)
   y su CSS .rd-tip (L564-581).

   Una línea, UNA sola vez por flujo (banderas en rodeo_tips, misma clave y
   misma forma {clave: 1}). Es un mini-banner propio y no un toast: el toast se
   usa para errores y en el viejo quedaba enterrado bajo los overlays.
   Autocierre a los 8 s o con la ✕. */

type TipState = { texto: string | null; mostrar: (t: string) => void; cerrar: () => void };

const useTip = create<TipState>((set) => ({
  texto: null,
  mostrar: (texto) => set({ texto }),
  cerrar: () => set({ texto: null }),
}));

/** Imperativo, como el viejo: lo llaman los arranques de sesión, no un render. */
export function tipPrimeraVez(key: string, texto: string): void {
  const vistos = store.get<Record<string, number>>('rodeo_tips', {});
  if (vistos && vistos[key]) return;
  store.set('rodeo_tips', { ...(vistos || {}), [key]: 1 });
  useTip.getState().mostrar(texto);
}

export function FirstTip() {
  const texto = useTip((s) => s.texto);
  const cerrar = useTip((s) => s.cerrar);
  /* El tip cambia de extremo con la sesión: en sesión se va abajo (sobre la
     barra de voz) y fuera de ella baja de la cabecera, sin pisarla.
     OJO, esto ya NO es "el contrario del toaster": el toast se mudó ARRIBA en
     todas las pantallas (ver el porqué medido en toaster.tsx). No chocan igual
     — el toast ocupa 14..60 y este tip fuera de sesión aterriza en
     --rd-tip-arriba, que TALK publica en 174px. Si alguno de los dos se mueve,
     volver a medir. */
  const enSesion = useEnSesion();

  useEffect(() => {
    if (!texto) return;
    const h = setTimeout(cerrar, 8000);
    return () => clearTimeout(h);
  }, [texto, cerrar]);

  return (
    <AnimatePresence>
      {texto && (
        <motion.div
          layout
          initial={{ opacity: 0, y: enSesion ? 16 : -16, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: enSesion ? 10 : -10, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          /* z-990: por encima de CUALQUIER overlay de la app, igual que el
             viejo — el tip llega justo cuando se abre una sesión. */
          className={cn(
            /* w-max: al ser `fixed` con `left:50%` y sin `right`, el ancho de
               ajuste se calcula contra el hueco que queda de la mitad de la
               pantalla al borde derecho — la mitad del viewport. Una píldora de
               seis palabras salía partida en TRES líneas (se ve en las capturas
               de la auditoría). Con max-content mide lo que ocupa su texto y el
               max-w sigue poniéndole techo. */
            'fixed left-1/2 z-[990] flex w-max max-w-[min(92vw,420px)] items-center gap-2.5 rounded-full py-[11px] pr-3.5 pl-4 text-[0.85rem] font-semibold',
            /* Los 120 px son el alto del dock de voz clásico (mic héroe +
               OndaDictado + barra de teclado), que es lo que sigue montando
               OFICINA. CHARLA rediseñada tiene una ConversationBar de la mitad
               de alto, y con el offset viejo el tip aterrizaba flotando DENTRO
               de la Card del chat, sin anclaje a nada (auditoría r1). En vez de
               recalibrar a ojo, quien monta una barra distinta publica su
               medida real en --rd-tip-abajo (ver charla-session.tsx) y aquí se
               usa si está; si no, manda el offset de siempre. */
            /* Fuera de sesión valía lo mismo por arriba: el `80px` era el alto
               del Header de MARCA que la regla 3 eliminó, así que sin header la
               píldora aterrizaba sobre el ← redondo (medido 74..110 px), sobre
               el rótulo «TALK · COACH EN VIVO» y a medias sobre la fila de
               tabs. Misma solución que abajo: talk/index.tsx publica en
               --rd-tip-arriba el borde inferior REAL de su barra de sección (+
               10 px de respiro) y aquí se usa si está; el calc de siempre queda
               solo como red de seguridad si el tip apareciera sin cabecera
               medida. */
            enSesion
              ? 'bottom-[var(--rd-tip-abajo,calc(120px+env(safe-area-inset-bottom)))]'
              : 'top-[var(--rd-tip-arriba,calc(80px+env(safe-area-inset-top)))]',
          )}
          style={{
            background: 'var(--card-lavender)',
            color: 'var(--card-ink)',
            boxShadow: '0 12px 32px oklch(0% 0 0 / 0.45)',
          }}
        >
          <span>{texto}</span>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar el tip"
            className="cursor-pointer border-0 bg-transparent p-1 text-[0.95rem] leading-none"
            style={{ color: 'var(--card-ink-soft)' }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
