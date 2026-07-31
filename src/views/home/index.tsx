import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { AuroraPillButton } from '@/components/rodeo/aurora-pill-button';
import { CarruselFeatures } from '@/components/rodeo/carrusel-features';
import { FilaSuperior } from '@/components/rodeo/fila-superior';
import { cn } from '@/lib/utils';
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
  /* ← AL ORIGEN (regla 5). El Home nace con la vitrina ABIERTA si quien nos
     trajo de vuelta fue el ← de una vista a la que se entró por una carta:
     esa carta dejó levantado `carruselAlVolver` (stores/app.ts). Se lee UNA
     vez, en el inicializador del useState — no como suscripción — para que
     bajar la marca justo después no vuelva a cerrar la vitrina. */
  const [carruselAbierto, setCarruselAbierto] = useState(() => useApp.getState().carruselAlVolver);
  const moreRef = useRef<HTMLButtonElement>(null);

  /* Y se consume: la marca vale por UN regreso. Si sobreviviera, el siguiente
     Home (p. ej. tras "Inicio" del menú) también abriría la vitrina. Bajarla es
     idempotente, así que el doble montaje de StrictMode no cambia nada. */
  useEffect(() => {
    useApp.getState().setCarruselAlVolver(false);
  }, []);

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
       inline FIJO de #14161a se fue porque era justo lo que hacía invisible el
       barrido del AnimatedThemeToggler: el círculo del View Transition barría un
       lienzo idéntico al de antes y solo se veía cambiar el menú. El único
       inline que queda es el `transparent` del gradiente, y ese no compite con
       el barrido: en gradiente el lienzo es el <FondoTema/> global. */
    <div
      className="aurora-shell flex min-h-dvh flex-col px-5 pt-[max(14px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))]"
      style={tema === 'gradiente' ? { background: 'transparent' } : undefined}
    >
      {/* FILA SUPERIOR — Menu ≡ a la izquierda y el botón de tema a la derecha
          (regla 3). Ya no se escribe aquí: es la pieza compartida
          `FilaSuperior`, la MISMA que monta App en el resto de las pantallas,
          con el cableado verbatim que vivía en este fichero. `inerte` la apaga
          con la vitrina abierta —la saca del orden de tabulación sin mover un
          píxel— y de paso aparta el menú, que al ser `fixed` se pintaría por
          encima de la capa opaca del carrusel.

          El FONDO DEL TEMA tampoco vive ya aquí: el <FondoTema/> de App monta
          las burbujas una sola vez, por detrás de TODAS las vistas (regla 4).
          Lo que sí hace falta es dejarlas VER: `.aurora-shell` pinta el #14161a
          del Home y, con [data-fondo='gradiente'], además crea contexto de
          apilado (aurora.css:941), así que su fondo opaco tapaba la capa de
          burbujas (z-index:-1, en el contexto de #root). En gradiente el shell
          se declara transparente y el lienzo lo pone el fondo global; en
          claro/oscuro no se toca ni un píxel. Va inline y no por clase porque
          aurora.css no es de este dueño (ver informe). */}
      <FilaSuperior
        onPersonalizar={onPersonalizar}
        menuOculto={menuOculto}
        inerte={carruselAbierto}
        /* Con la vitrina abierta la fila se APAGA además de quedar inerte. En
           claro/oscuro da igual (la capa la tapa), pero en GRADIENTE la capa es
           transparente para dejar ver las burbujas (regla 4) y el botón de tema
           asomaba por encima del abanico: un mando visible que ya no responde
           (inert), justo lo peor de los dos mundos. Se apaga con opacidad —no
           con display— para no recolocar nada y para que vuelva con el mismo
           fundido con el que se va. */
        className={cn('pb-3 transition-opacity duration-200', carruselAbierto && 'opacity-0')}
      />

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
            {/* ← DEL CARRUSEL (regla 2): «donde te hice un circulito rojo arriba
                a la izquierda, allí es donde debe haber una flechita ← para
                regresar». Cierra exactamente lo mismo que el chevron del pie
                —que NO se toca y sigue con su función— y devuelve el foco a él,
                igual que hace Escape: el mando de "abrir" recupera el foco tras
                cerrar, así el teclado no se queda huérfano en un botón que
                acaba de desmontarse.
                Colores POR TEMA (par `x dark:x`, que en este repo es
                `:root:not([data-theme='light'])`, tokens.css:17). Hasta la
                ronda 3 eran blancos fijos porque la capa se pintaba #14161a en
                los TRES temas; ahora la capa lleva el lienzo del tema
                (var(--bg-void), y transparente en gradiente para dejar pasar
                las burbujas — regla 4), así que sobre el papel CLARO un ←
                blanco desaparecía. Mismo criterio que ya siguen las flechas
                ‹ › y los puntos del abanico, que se tiñen con --cf-mando. */}
            <button
              type="button"
              onClick={() => {
                setCarruselAbierto(false);
                moreRef.current?.focus();
              }}
              aria-label="Cerrar las features"
              className="absolute top-[max(14px,env(safe-area-inset-top))] left-5 z-50 inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-black/5 text-black/70 transition-colors hover:border-black/30 hover:bg-black/10 dark:border-white/15 dark:bg-white/5 dark:text-white/85 dark:hover:border-white/30 dark:hover:bg-white/10"
            >
              <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
            </button>

            <CarruselFeatures />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
