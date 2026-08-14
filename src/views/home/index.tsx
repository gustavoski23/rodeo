import { Suspense, lazy, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { AuroraPillButton } from '@/components/rodeo/aurora-pill-button';
import { FilaSuperior } from '@/components/rodeo/fila-superior';
import { TryMeButton, type TryMeTheme } from '@/components/ui/try-me-button';
import { ES_TELEFONO } from '@/lib/device';
import { cn } from '@/lib/utils';
import type { Tema } from '@/lib/theme';
import { programarPrecargaConversacion, programarPrecargaHome } from '@/lib/preload';
import { useApp } from '@/stores/app';
const CarruselFeatures = lazy(() => import('@/components/rodeo/carrusel-features'));

/* El TryMeButton trae sus propios tres temas (dark/light/alternate). Se mapea al
   tema de RODEO: papel → light; oscuro y gradiente → dark (el botón es un pomo
   oscuro que asienta sobre ambos fondos). El único acento que le queda es el aro
   de foco, en var(--accent), así que ya va con la marca sin ramas aquí. */
function temaTryMe(tema: Tema): TryMeTheme {
  return tema === 'claro' ? 'light' : 'dark';
}

/* HOME — markup y comportamiento 1:1 de la referencia aprobada
   (codex/home-aurora-production-review, index.html:1972-2007 y 3955-4001).
   Pantalla mínima: hamburguesa, "Hola, Gustavo", "¿Qué quieres practicar
   hoy?", el AuroraPillButton "Conversación libre" y la flecha que ahora revela
   el CARRUSEL DE FEATURES (abanico de cartas).

   "Conversación libre" responde al toque: conserva 120 ms de feedback visual
   sin bloquear la entrada ni fingir que el opener local requiere IA.

   Lo que cambió respecto al original: el chevron ⌄ ya no abre la píldora
   "Modo historia" (STORY ahora es una carta del carrusel, así que esa píldora
   se retiró) sino la vitrina de features. El Home CERRADO es idéntico: mismo
   saludo, misma pregunta y misma píldora. */

export default function HomeView({ onPersonalizar, menuOculto = false }: { onPersonalizar: () => void; menuOculto?: boolean }) {
  const nombre = useApp((s) => s.nombre);
  const setView = useApp((s) => s.setView);
  const tema = useApp((s) => s.tema);
  /* ← AL ORIGEN (regla 5). La vitrina vive ahora en el store (era un useState
     de aquí) para que la navbar de teléfonos la abra desde cualquier vista
     (Explore) y pinte su ítem activo. La semántica de siempre no cambió de
     dueño, solo de sitio: es `setView` (stores/app.ts) quien consume la marca
     `carruselAlVolver` al entrar al Home — la vitrina ya nace abierta en el
     primer render — y quien la cierra al salir, como cuando el desmontaje del
     Home mataba el useState. Aquí solo queda leerla y accionarla. */
  const carruselAbierto = useApp((s) => s.carruselAbierto);
  const setCarruselAbierto = useApp((s) => s.setCarruselAbierto);
  const moreRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const cancelarConversacion = programarPrecargaConversacion();
    const cancelarHome = programarPrecargaHome();
    return () => {
      cancelarConversacion();
      cancelarHome();
    };
  }, []);

  // Escape cierra el carrusel y devuelve el foco a la flecha (misma regla que
  // tenía la ruta secundaria en el original: index.html:3993-3998).
  useEffect(() => {
    if (!carruselAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setCarruselAbierto(false);
      // El TryMe queda display:none con la vitrina abierta (regla
      // `:not(.aurora-more)` de aurora.css); se le devuelve el foco en el frame
      // siguiente, ya montado y visible, para no perderlo en el <body>.
      requestAnimationFrame(() => moreRef.current?.focus());
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [carruselAbierto]);

  async function lanzar(viaTeclado: boolean) {
    const { lanzarLibreAurora } = await import('@/views/talk/use-coach-turn');
    if (await lanzarLibreAurora({ focoVolver: viaTeclado })) setView('talk');
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
      className={cn(
        'aurora-shell flex min-h-dvh flex-col px-5 pt-[max(14px,env(safe-area-inset-top))]',
        // En teléfonos la navbar inferior (NavMovil) flota sobre el pie: sin
        // este colchón la píldora "Conversación libre" quedaba tapada. 96px =
        // 12 de margen + 76 de barra (--nav-movil-alto) + 8 de aire.
        ES_TELEFONO
          ? 'pb-[calc(96px+env(safe-area-inset-bottom))]'
          : 'pb-[max(18px,env(safe-area-inset-bottom))]',
      )}
      style={tema === 'gradiente' ? { background: 'transparent' } : undefined}
    >
      {/* FILA SUPERIOR — Menu ≡ a la izquierda y el botón de tema a la derecha
          (regla 3). Ya no se escribe aquí: es la pieza compartida
          `FilaSuperior`, la MISMA que monta App en el resto de las pantallas,
          con el cableado verbatim que vivía en este fichero. Con la vitrina
          abierta solo se aparta el menú (`menuOculto`), que al ser `fixed` se
          pintaría por encima de la capa del carrusel; el botón de tema sigue
          ahí, visible y operativo.

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
        /* Con la vitrina abierta se aparta SOLO la pastilla Menu: el hueco
           arriba-izquierda es del ← del carrusel (regla 2) y su raíz `fixed`
           se pintaría encima de la capa. El BOTÓN DE TEMA se queda —visible y
           funcional— porque la regla 3/4 lo exige «en todas y cada una de las
           pantallas», y el carrusel abierto es una de las 12.
           En r4 la fila entera iba `inert` + `opacity-0`: apagaba también el
           toggler y lo dejaba en opacidad efectiva 0. Ahora la fila NO es
           inerte (el toggler tabula y responde) y se eleva por encima de la
           capa del carrusel (.aurora-carrusel es fixed z-40): `relative z-50`
           sobre la caja en flujo, sin mover un píxel del layout.
           La fila ocupa TODO el ancho, así que elevarla entera dejaba su caja
           vacía tragándose los clics de la banda superior de la capa —el ← del
           carrusel, que vive justo debajo, quedaba inalcanzable (verificado:
           Playwright reportaba «div.flex shrink-0 … intercepts pointer
           events»)—. Por eso el contenedor no recibe puntero y solo el BOTÓN
           hijo (el toggler) lo recupera. */
        menuOculto={menuOculto || carruselAbierto}
        className={cn('pb-3', carruselAbierto && 'relative z-50 pointer-events-none [&>button]:pointer-events-auto')}
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

          {/* El mando que ABRE la vitrina es ahora el botón TRY ME giratorio
              (pedido de Gus): mismo toggle, misma ref, mismos aria-* y misma
              acción que el chevron ⌄ que reemplaza; el chevron del CENTRO del
              componente hace de "hay más abajo". NO lleva la clase .aurora-more a
              propósito: con la vitrina abierta la regla `:not(.aurora-more)`
              (aurora.css) lo oculta —queda tapado por la capa del carrusel— y se
              cierra con el ← / Escape (regla 2). El tema del pomo sigue al de
              RODEO y el anillo va en Alan Sans, la letra del Home.

              En TELÉFONOS no se monta: la vitrina se abre por el ítem Explore
              de la navbar inferior. `moreRef` queda en null y los `?.focus()`
              de Escape/← se vuelven no-ops inofensivos. */}
          {!ES_TELEFONO && (
            <TryMeButton
              ref={moreRef}
              theme={temaTryMe(tema)}
              size="clamp(128px, 34vw, 152px)"
              label="TRY ME"
              ariaLabel={carruselAbierto ? 'Ocultar las features' : 'Ver las features'}
              aria-expanded={carruselAbierto}
              /* aria-controls SOLO cuando la capa existe: cerrada no está montada
                 (AnimatePresence la desmonta) y apuntar a un id ausente es una
                 referencia colgante en el árbol de accesibilidad. */
              aria-controls={carruselAbierto ? 'aurora-carrusel' : undefined}
              onClick={() => setCarruselAbierto(!carruselAbierto)}
              /* Un centímetro más abajo (pedido de Gus, r3). ≈38px al DPR de
                 referencia; se suma al `gap: 16px` de .aurora-home__actions. Va
                 inline y no como clase Tailwind porque aurora.css maneja este
                 contenedor y prefiero no rozar sus reglas. */
              style={{ marginTop: '38px' }}
            />
          )}
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
                requestAnimationFrame(() => moreRef.current?.focus());
              }}
              aria-label="Cerrar las features"
              className="absolute top-[max(14px,env(safe-area-inset-top))] left-5 z-50 inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-black/5 text-black/70 transition-colors hover:border-black/30 hover:bg-black/10 dark:border-white/15 dark:bg-white/5 dark:text-white/85 dark:hover:border-white/30 dark:hover:bg-white/10"
            >
              <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
            </button>

            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Abriendo…
                </div>
              }
            >
              <CarruselFeatures />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
