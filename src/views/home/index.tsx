import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { AuroraPillButton } from '@/components/rodeo/aurora-pill-button';
import { CarruselFeatures } from '@/components/rodeo/carrusel-features';
import { MenuFlotante } from '@/components/rodeo/menu-flotante';
import { BubbleBackground } from '@/components/ui/components-backgrounds-bubble';
import { SIGUIENTE_TEMA, temaVisual } from '@/lib/theme';
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

export default function HomeView({ onPersonalizar, menuOculto = false }: { onPersonalizar: () => void; menuOculto?: boolean }) {
  const nombre = useApp((s) => s.nombre);
  const setView = useApp((s) => s.setView);
  const tema = useApp((s) => s.tema);
  const cambiarTema = useApp((s) => s.cambiarTema);
  const [carruselAbierto, setCarruselAbierto] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  /* La burbuja que sigue al puntero solo tiene sentido donde hay puntero: en
     móvil es un listener de mousemove que nunca dispara y una capa más que
     componer. Se decide UNA vez al montar (no en cada render). */
  const [interactivo] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px) and (pointer: fine)').matches,
  );

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
    /* `aurora-shell` (aurora.css) pone el fondo: en OSCURO es el mismo #14161a
       literal de siempre; en CLARO, el papel de la app (var(--bg-void)). El
       inline fijo se fue porque era justo lo que hacía invisible el barrido del
       AnimatedThemeToggler: el círculo del View Transition barría un lienzo
       idéntico al de antes y solo se veía cambiar el menú. */
    <div className="aurora-shell flex min-h-dvh flex-col px-5 pt-[max(14px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))]">
      {/* TEMA GRADIENTE: el BubbleBackground como fondo a pantalla completa,
          detrás de todo el Home. Se monta SOLO con este tema — es un árbol de
          motion con seis capas animadas en loop infinito y un filtro goo, y no
          tiene por qué estar corriendo en claro/oscuro. Tampoco vive en las
          demás vistas: el gradiente es la puerta, y adentro mandan los tokens
          oscuros (que son los mismos que los de 'oscuro', ver lib/theme.ts). */}
      {tema === 'gradiente' && (
        <div className="aurora-fondo-gradiente" aria-hidden="true">
          <BubbleBackground interactive={interactivo} className="size-full">
            <div className="aurora-fondo-gradiente__velo" />
          </BubbleBackground>
        </div>
      )}

      {/* Con la vitrina abierta, todo lo que queda DEBAJO de la capa opaca sale
          del orden de tabulación: el toggler de tema se ve tapado pero seguiría
          siendo enfocable (un usuario de teclado aterrizaba en un botón que no
          puede ver). `inert` lo apaga y lo esconde del árbol de accesibilidad
          sin mover un píxel; la píldora "Conversación libre" ya salía por el
          display:none de .aurora-home--con-carrusel, y el chevron ⌄ se queda
          fuera porque es el mando de cerrar.

          El MENÚ es el caso aparte: `inert` NO lo esconde, porque su raíz es
          `fixed` con z-index propio y se pintaba ENCIMA de la capa opaca del
          carrusel (z-index:40) mientras el toggler de su misma fila sí quedaba
          tapado — media fila visible y media no, y encima la píldora amarilla
          seguía leyéndose "Menu ≡" sin responder al toque (inert la saca del
          hit-test). Se aparta con la MISMA pieza que ya usa el personalizador:
          `oculto`, que lo desvanece, lo baja de z-index y le quita el puntero,
          dejando su caja de 150×48 en flujo para que la fila no se recoloque. */}
      {/* Fila superior: hamburguesa a la izquierda y el toggler de tema a la
          DERECHA (posición pedida por Gus). Mismo AnimatedThemeToggler verbatim
          y mismo cableado controlado del Header: RODEO es dueño de la
          persistencia (data-theme + rodeo_tema). El Home YA NO es siempre
          oscuro: sigue el tema como el resto de la app (en oscuro, idéntico al
          diseño aprobado; en claro, papel y tinta oscura) para que el barrido
          circular del toggler tenga contraste que barrer.

          Su borde/ícono se declaran con el par `x dark:x`: en OSCURO ganan
          border-white/15 y text-white/85 —los valores de siempre, ni un píxel
          distinto—, y en CLARO caen a negro translúcido para que el botón no
          desaparezca sobre el papel. */}
      <div className="flex shrink-0 items-center justify-between" inert={carruselAbierto}>
        <MenuFlotante onPersonalizar={onPersonalizar} oculto={menuOculto || carruselAbierto} />
        {/* CICLO DE TRES. El AnimatedThemeToggler es verbatim y binario: solo
            sabe decir "ahora toca light" o "ahora toca dark". Se le IGNORA el
            valor que reporta y el siguiente tema lo decide RODEO
            (SIGUIENTE_TEMA: día → noche → gradiente → día). Al toggler se le
            pasa el tema VISUAL (gradiente se dibuja como noche, luna) para que
            el icono no mienta. La animación de barrido la dispara él solo en
            cada toque, así que sigue corriendo también en los saltos
            oscuro→gradiente y gradiente→claro. */}
        <AnimatedThemeToggler
          theme={temaVisual(tema)}
          duration={700}
          onThemeChange={() => cambiarTema(SIGUIENTE_TEMA[tema])}
          aria-label="Cambiar de tema: día, noche o gradiente"
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border border-black/15 bg-transparent text-black/70 dark:border-white/15 dark:text-white/85 [&_svg]:size-5"
        />
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
            /* aria-controls SOLO cuando la capa existe: cerrada no está montada
               (AnimatePresence la desmonta) y apuntar a un id ausente es una
               referencia colgante en el árbol de accesibilidad. */
            aria-controls={carruselAbierto ? 'aurora-carrusel' : undefined}
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
