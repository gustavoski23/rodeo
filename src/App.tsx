import { Suspense, lazy, useState } from 'react';
import { MotionConfig } from 'motion/react';

import { FondoTema } from '@/components/rodeo/fondo-tema';
import { NavMovil } from '@/components/rodeo/nav-movil';
import { Toaster } from '@/components/rodeo/toaster';
import { ES_TELEFONO, MODO_LIGERO } from '@/lib/device';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useAuth } from '@/stores/auth';
import { useOnboarding } from '@/stores/onboarding';
import HomeView from '@/views/home';
import GateView from '@/views/gate';
// SLANG ahora ES la experiencia de sticker peel (Pélala) — decisión de Gus: la
// carta SLANG del carrusel abre directo el sticker que se pela para aprender.
// El SlangView clásico (CALLE/TRABAJO/JERGA) sigue en el repo (src/views/slang),
// sin rutear, por si vuelve como sub-modo.
import { useSuscripcion } from '@/stores/suscripcion';

const TalkView = lazy(() => import('@/views/talk'));
const PelalaView = lazy(() => import('@/views/pelala'));
const StoryView = lazy(() => import('@/views/story'));
const LadderView = lazy(() => import('@/views/ladder'));
const DnaView = lazy(() => import('@/views/dna'));
/* LIBRO va lazy como el resto y encima le conviene más que a nadie: se trae
   Mantine + el curl WebGL + su CSS, y nada de eso tiene por qué pesar en el
   arranque de quien nunca abre el libro. */
const LibroView = lazy(() => import('@/views/libro'));
const OficinaView = lazy(() => import('@/views/a1/oficina'));
/* PODCAST: el menú de episodios. Lazy como el resto — su manifest y sus
   audios viven en public/podcasts/ y solo se piden al entrar. */
const PodcastView = lazy(() => import('@/views/podcast'));
const PerfilView = lazy(() => import('@/views/perfil'));
/* PROFES: la cara institucional — profesores que enseñan y cobran por la app
   con los rieles de Pangea. Lazy como el resto: es una vista de lectura que
   la mayoría de estudiantes nunca abre. */
const ProfesView = lazy(() => import('@/views/profes'));
const OnboardingView = lazy(() => import('@/views/onboarding'));
const AuroraCustomizer = lazy(() =>
  import('@/components/rodeo/aurora-customizer').then((m) => ({ default: m.AuroraCustomizer })),
);
const SuscripcionOverlay = lazy(() =>
  import('@/components/rodeo/suscripcion-overlay').then((m) => ({ default: m.SuscripcionOverlay })),
);

/* Shell: fila superior + vista activa + tab bar. El switch de vistas es el switchView
   del viejo (public/legacy.html:3641) sin el DOM: cada vista se monta y se
   desmonta, que es lo que hace que TALK sortee un rompehielos fresco al volver
   de una sesión sin que nadie tenga que acordarse de refrescarlo.

   Ya no queda ninguna vista "pendiente": TALK, SLANG, STORY, SUBE, DNA y
   OFICINA tienen pantalla propia, así que el switch es exhaustivo y la rama
   final es STORY (el viejo VistaPendiente y su tabla PENDIENTES se fueron con
   ella — era un titular gigante sin ← del que solo se salía por el menú). */

export default function App() {
  /* El menú ☰ ya no es un estado del shell: la píldora liquid-morph
     (MenuFlotante) se abre y se cierra sola, así que `menuOpen`/`onMenuToggle`
     desaparecieron de App, Home y Header. Lo único que sigue viviendo aquí es
     el personalizador, porque su hoja la monta App y el menú solo la pide.
     MenuSheet y MenuToggle siguen en el repo, sin montarse. */
  const [customizerOpen, setCustomizerOpen] = useState(false);
  /* El overlay de Suscripción es hermano del personalizador: capa global
     encima de la vista activa. Mientras esté abierto, el menú ☰ se aparta
     igual que con la hoja del personalizador. */
  const suscripcionAbierta = useSuscripcion((s) => s.abierto);
  const view = useApp((s) => s.view);

  /* PANTALLA COMPLETA DENTRO DE CADA FEATURE (pedido de Gus, 2026-08-17).
     Fuera del Home, el teléfono entrega TODO su alto a la feature: se esconden
     el toggler de tema (la fila superior) y la navbar de píldoras. Los dos
     vuelven en el Home, y de cada feature se sale por su ← (verificado: talk,
     slang, a1, story, ladder, dna, libro, podcast, perfil y profes tienen el
     suyo, todos con setView('home')).

     Esto RELEVA a la regla 3 del contrato («el botón de tema debe verse en
     todas las pantallas»): a 390×844 esa fila costaba ~62px arriba y la navbar
     ~84px abajo — 146px de cromo permanente sobre una app que se usa a una
     mano. Es el mismo criterio que ya se aplicaba al LIBRO y a la lección del
     A1; ahora es la regla, no la excepción.

     SOLO EN TELÉFONO (ES_TELEFONO): en PC la fila se queda en todas las
     pantallas, porque allá sobra alto y encima es donde vive el Menu ≡ — que en
     teléfono ya se había mudado a la pestaña Profile de la navbar. */
  const inmersiva = view !== 'home';

  /* El gate de login es LO PRIMERO que se ve (pedido de Gus): antes que el
     Home aurora. `listo` evita el flash — hasta resolver getSession no se
     decide nada y la pantalla queda en el negro del Home. Con sesión o con
     Skip previo, el gate no existe. */
  const authListo = useAuth((s) => s.listo);
  const gateNecesario = useAuth((s) => s.gateNecesario);
  const onboardingNecesario = useOnboarding((s) => s.necesario);

  /* MANDA LA ELECCIÓN DEL USUARIO (decisión de Gus, 2026-08-17). Aquí vivía un
     efecto que forzaba `cambiarTema('gradiente')` en CADA entrada al pasar el
     gate, pisando —y reescribiendo en disco— el tema que hubiera guardado. Con
     cuatro temas en el ciclo eso volvía la elección papel mojado: elegir
     Amanecer y recargar devolvía Gradiente para siempre.
     No hace falta nada en su lugar: `hidratarTema()` (lib/theme.ts) ya aplica
     el tema guardado al crear el store y cae en 'gradiente' cuando NO hay
     elección previa, que es exactamente el "todo el mundo abre en gradiente"
     original — solo que ahora para quien nunca eligió, no para quien sí. */

  {/* El placeholder pre-auth también va con el lienzo del tema: era el último
      #14161a suelto (regla 4 del contrato — todos los fondos iguales). */}
  if (!authListo) return <div className="min-h-dvh" style={{ background: 'var(--bg-void)' }} />;
  if (gateNecesario) {
    return (
      <MotionConfig reducedMotion={MODO_LIGERO ? 'always' : 'user'}>
        <GateView />
        <Toaster />
      </MotionConfig>
    );
  }
  if (onboardingNecesario) {
    return (
      <MotionConfig reducedMotion={MODO_LIGERO ? 'always' : 'user'}>
        <Suspense fallback={<div className="min-h-dvh" style={{ background: 'oklch(97.5% 0.012 85)' }} />}>
          <OnboardingView />
        </Suspense>
        <Toaster />
      </MotionConfig>
    );
  }

  return (
    /* reducedMotion="user" apaga los springs de motion (morphs, píldoras, pulso
       del mic) para quien pidió menos movimiento en el sistema. Va en la raíz
       para no repetir la comprobación en cada componente — el CSS portado del
       viejo ya trae sus propias @media (prefers-reduced-motion). */
    <MotionConfig reducedMotion={MODO_LIGERO ? 'always' : 'user'}>
      {/* FONDO DEL TEMA, una sola vez y por DETRÁS del switch: con el tema
          gradiente las burbujas quedan detrás de TODAS las vistas, no solo del
          Home (regla 4). Va aquí y no en el gate a propósito — el login tiene
          su propio lienzo. */}
      <FondoTema />

      {view === 'home' ? (
        /* El Home aurora va a pantalla completa: sin header de marca, sin
           tab bar, sin divisoria — solo su hamburguesa. Es la puerta. */
        <HomeView onPersonalizar={() => setCustomizerOpen(true)} menuOculto={customizerOpen || suscripcionAbierta} />
      ) : (
        <>
          {/* SIN FILA SUPERIOR (Menu + toggler de tema) DENTRO DE LAS FEATURES,
              ni en teléfono NI en PC (pedido de Gus, 2026-08-17: «quita el menú
              y el ícono de cambiar de tema para subirlo hasta allí, así como
              hicimos con el teléfono»). Fuera del Home el alto entero es de la
              feature y se sale por su ←; el Menu y el tema viven en el Home.
              Hasta hoy la fila se quedaba en PC (allá sobra alto), pero medido a
              1440×820 y 1512×900 esa franja de 74px empujaba el input del chat
              de SLANG FUERA del pliegue — el desktop pedía el mismo aire que ya
              tenía el teléfono. El `pt` que la fila ponía lo pone ahora el main,
              en todos los anchos. */}
          <main
            className={cn(
              'flex min-h-0 flex-1 flex-col px-5',
              /* El hueco del notch/arriba: la fila superior lo ponía; ahora que
                 no está en ningún ancho, lo pone el main. En el iPhone respeta
                 la muesca (safe-area-top); en PC son 14px planos. */
              'pt-[max(14px,env(safe-area-inset-top))]',
              /* Y el pie va al mínimo SIEMPRE. Ese pb reservaba 84px para una
                 barra inferior que, fuera del Home, ya no se monta en ningún
                 ancho: en teléfono porque la feature se lleva la pantalla
                 entera, y en PC porque la navbar nunca existió allá. SLANG,
                 LIBRO, la lección del A1 y la sesión ya lo reclamaban una por
                 una; ahora es la regla. max(…, safe-area) respeta el borde
                 inferior del móvil. */
              'pb-[max(14px,env(safe-area-inset-bottom))]',
            )}
          >
            <Suspense
              fallback={
                <div className="flex min-h-40 flex-1 items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Abriendo…
                </div>
              }
            >
              {view === 'talk' ? (
                <TalkView />
              ) : view === 'slang' ? (
                <PelalaView />
              ) : view === 'ladder' ? (
                <LadderView />
              ) : view === 'dna' ? (
                <DnaView />
              ) : view === 'a1' ? (
                <OficinaView />
              ) : view === 'podcast' ? (
                <PodcastView />
              ) : view === 'perfil' ? (
                <PerfilView />
              ) : view === 'profes' ? (
                <ProfesView />
              ) : view === 'libro' ? (
                <LibroView />
              ) : (
                <StoryView />
              )}
            </Suspense>
          </main>

          {/* La tab bar VIEJA sigue sin montarse (su código queda en el repo).
              En teléfonos su lugar lo ocupa ahora la NavMovil de píldoras de
              vidrio, montada más abajo a nivel del shell — fuera de este
              fragmento porque también existe sobre el Home. El pb de 84px del
              main es la franja que ella flota. */}
        </>
      )}

      {/* NAVBAR DE TELÉFONO — cuatro píldoras de vidrio (el glass del gate)
          con el indicador gris que se desliza (nav-movil.tsx). Solo existe en
          teléfonos (ES_TELEFONO, decidido al arranque como MODO_LIGERO) y SOLO
          EN EL HOME: dentro de una feature el alto es de la feature, y de cada
          una se sale por su ← (mismo pedido que esconde el toggler de tema).
          Antes se caía sola en las cuatro pantallas que reclamaban el borde
          inferior (sesión, SLANG, LIBRO, lección del A1); la lista se acabó
          volviendo "todo menos el Home", así que eso es lo que dice ahora.
          Con el personalizador o Suscripción abiertos se APARTA sin desmontar
          (patrón `oculto` de MenuFlotante): desmontarla haría saltar el
          indicador al volver, sin morph. */}
      {ES_TELEFONO && !inmersiva && (
        <NavMovil
          onPersonalizar={() => setCustomizerOpen(true)}
          oculta={customizerOpen || suscripcionAbierta}
        />
      )}

      {customizerOpen && (
        <Suspense fallback={null}>
          <AuroraCustomizer open onClose={() => setCustomizerOpen(false)} />
        </Suspense>
      )}
      {/* Suscripción: overlay global con fondo desenfocado, encima de la vista
          que esté activa. Lee su propio store — el menú lo abre desde donde sea. */}
      {suscripcionAbierta && (
        <Suspense fallback={null}>
          <SuscripcionOverlay />
        </Suspense>
      )}
      <Toaster />
    </MotionConfig>
  );
}
