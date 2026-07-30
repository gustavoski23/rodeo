import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { AuroraPillButton } from '@/components/rodeo/aurora-pill-button';
import { CarruselFeatures } from '@/components/rodeo/carrusel-features';
import { MenuToggle } from '@/components/rodeo/menu-toggle';
import { useApp } from '@/stores/app';
import { lanzarLibreAurora } from '@/views/talk/use-coach-turn';

/* HOME — markup y comportamiento 1:1 de la referencia aprobada
   (codex/home-aurora-production-review, index.html:1972-2007 y 3955-4001).
   Pantalla mínima: hamburguesa, "Hola, Gustavo", "¿Qué quieres practicar
   hoy?", el AuroraPillButton "Conversación libre" y la flecha que ahora revela
   el CARRUSEL DE FEATURES (abanico de cartas).

   "Conversación libre" NO navega al toque: la píldora se hunde 950ms y luego
   entra al flujo de dibujo libre con la cápsula "Pensando" (ver
   lanzarLibreAurora). Volver de la conversación regresa aquí (App).

   Lo que cambió respecto al original: el chevron ⌄ ya no abre la píldora
   "Modo historia" (STORY ahora es una carta del carrusel, así que esa píldora
   se retiró) sino la vitrina de features. El Home CERRADO es idéntico: mismo
   saludo, misma pregunta, misma píldora, mismos tiempos. */

export default function HomeView({ menuOpen, onMenuToggle }: { menuOpen: boolean; onMenuToggle: () => void }) {
  const nombre = useApp((s) => s.nombre);
  const setView = useApp((s) => s.setView);
  const [carruselAbierto, setCarruselAbierto] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  // Escape cierra el carrusel y devuelve el foco a la flecha (misma regla que
  // tenía la ruta secundaria en el original: index.html:3993-3998).
  useEffect(() => {
    if (!carruselAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setCarruselAbierto(false);
      moreRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [carruselAbierto]);

  function lanzar(viaTeclado: boolean) {
    if (lanzarLibreAurora({ focoVolver: viaTeclado })) setView('talk');
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[max(14px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))]" style={{ background: '#14161a' }}>
      {/* Con la vitrina abierta, todo lo que queda DEBAJO de la capa opaca sale
          del orden de tabulación: la hamburguesa se veía tapada pero seguía
          siendo enfocable (un usuario de teclado aterrizaba en un botón que no
          puede ver). `inert` la apaga y la esconde del árbol de accesibilidad
          sin mover un píxel; la píldora ya salía por el display:none de
          .aurora-home--con-carrusel, y el chevron ⌄ se queda fuera porque es
          el mando de cerrar. */}
      <div className="shrink-0" inert={carruselAbierto}>
        <MenuToggle open={menuOpen} onToggle={onMenuToggle} />
      </div>

      {/* --con-carrusel solo existe con la vitrina abierta: manda el chevron al
          pie (como mando de cerrar) y esconde la píldora, que queda debajo de
          la capa opaca. Cerrado, la clase no está y el Home es el de siempre. */}
      <div
        className={`aurora-home${carruselAbierto ? ' aurora-home--con-carrusel' : ''}`}
        aria-labelledby="aurora-home-question"
      >
        <div className="aurora-home__copy" inert={carruselAbierto}>
          <p className="aurora-home__greeting">{nombre ? `Hola, ${nombre}` : 'Hola'}</p>
          <h2 className="aurora-home__question" id="aurora-home-question">
            ¿Qué quieres practicar hoy?
          </h2>
        </div>

        <div className="aurora-home__actions">
          <AuroraPillButton onLaunch={lanzar}>Conversación libre</AuroraPillButton>

          <button
            ref={moreRef}
            className="aurora-more"
            type="button"
            aria-label={carruselAbierto ? 'Ocultar las features' : 'Ver las features'}
            aria-expanded={carruselAbierto}
            aria-controls="aurora-carrusel"
            onClick={() => setCarruselAbierto((v) => !v)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m7 10 5 5 5-5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Capa del carrusel: entra con un fundido corto y un empuje suave desde
          abajo, sobre el negro del Home. */}
      <AnimatePresence>
        {carruselAbierto && (
          <motion.div
            id="aurora-carrusel"
            className="aurora-carrusel"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <CarruselFeatures />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
