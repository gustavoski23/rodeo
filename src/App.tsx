import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';

import { FilaSuperior } from '@/components/rodeo/fila-superior';
import { FondoTema } from '@/components/rodeo/fondo-tema';
import { Toaster } from '@/components/rodeo/toaster';
import { MODO_LIGERO } from '@/lib/device';
import { cn } from '@/lib/utils';
import { useEnLeccion } from '@/stores/a1-leccion';
import { useApp } from '@/stores/app';
import { useAuth } from '@/stores/auth';
import { useOnboarding } from '@/stores/onboarding';
import { useEnCharla, useEnSesion } from '@/stores/talk';
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
  // Con sesión viva la tab bar se va y el main recupera su hueco inferior:
  // es el body.rd-sesion del viejo (L1459-1462), derivado del estado.
  const enSesion = useEnSesion();
  /* La SESIÓN DE CHARLA ya no es una excepción de cabecera: la fila superior
     (Menu + toggler) está en TODAS las pantallas, también dentro de la sesión
     — regla 3 del contrato («el boton de cambiar los temas … debe verse en
     todas y cada una de las pantallas»). Lo único que la sesión sigue pidiendo
     es aire: su Card es alta y a 390px cada píxel cuenta, así que la fila
     cierra con un pb corto. El hook va SUELTO, nunca dentro de un `&&`:
     cortocircuitarlo lo saltaría en los renders de otras vistas y rompería el
     orden de hooks. */
  const enCharla = useEnCharla();
  const charlaEnSesion = view === 'talk' && enCharla;

  /* A1 DENTRO DE LA LECCIÓN — el mismo trato que pidió CHARLA, por el mismo
     motivo (stores/a1-leccion.ts). En la portada, la sesión, la misión y la
     charla de parada, la cabecera propia del loop (←, los puntos, el bombillo,
     Alfred) YA es el header: la fila de arriba era una segunda cabecera encima
     de la primera. En el MAPA la señal es false y la fila sigue ahí, que es
     desde donde se navega el módulo.
     El hook va SUELTO, nunca dentro de un `&&`: cortocircuitarlo lo saltaría en
     los renders de las otras vistas y rompería el orden de hooks. */
  const enLeccionA1 = useEnLeccion();
  const a1EnLeccion = view === 'a1' && enLeccionA1;

  /* El gate de login es LO PRIMERO que se ve (pedido de Gus): antes que el
     Home aurora. `listo` evita el flash — hasta resolver getSession no se
     decide nada y la pantalla queda en el negro del Home. Con sesión o con
     Skip previo, el gate no existe. */
  const authListo = useAuth((s) => s.listo);
  const gateNecesario = useAuth((s) => s.gateNecesario);
  const onboardingNecesario = useOnboarding((s) => s.necesario);

  /* ENTRAR = SIEMPRE GRADIENTE (pedido de Gus): al pasar el gate —loguearse o
     pulsar Skip— el shell se abre en gradiente, de Home en adelante, sea cual
     sea el tema que quedara guardado. El gate tiene su propio tema claro
     scopeado, así que solo forzamos cuando ya NO se necesita el gate. Se hace
     UNA vez por entrada (el ref evita repetir en cada render): si el usuario
     cambia el tema dentro de la sesión, su elección vive hasta que recargue o
     vuelva a pasar por el gate, donde gradiente vuelve a mandar. Va ANTES de
     los early-returns para no romper el orden de hooks. */
  const cambiarTema = useApp((s) => s.cambiarTema);
  const entrada = useRef(false);
  useEffect(() => {
    if (!authListo || gateNecesario) {
      entrada.current = false; // salió/volvió al gate: rearmar para la próxima entrada
      return;
    }
    if (entrada.current) return;
    entrada.current = true;
    cambiarTema('gradiente');
  }, [authListo, gateNecesario, cambiarTema]);

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
          {/* La MISMA fila del Home, sin marca ni divisoria: Menu ≡ a la
              izquierda y el toggler de tema a la derecha. Ella pone el hueco
              del notch (el mismo max(14px, safe-area) del Home), así que el
              main ya no necesita pt propio. */}
          <FilaSuperior
            onPersonalizar={() => setCustomizerOpen(true)}
            menuOculto={customizerOpen || suscripcionAbierta}
            className={cn(
              'px-5 pt-[max(14px,env(safe-area-inset-top))]',
              // En sesión la Card es alta y a 390px pide todo el alto que
              // pueda: la fila cierra corta. Fuera de sesión, el pb-3 de siempre.
              charlaEnSesion ? 'pb-1.5' : 'pb-3',
              // En el LIBRO móvil la fila entera se esconde (pedido de Gus): la
              // hoja se mide contra el alto disponible y el Menu + toggler eran
              // una franja muerta que le recortaba página al libro. El corte a
              // 739px espeja el UMBRAL_MOVIL=700 de la vista (700 de caja + 40
              // del px-5 del main). En PC la fila se queda: ahí sobra alto y el
              // toggler es de todas las pantallas.
              view === 'libro' && 'max-[739px]:hidden',
              /* Y la lección del A1 entra en la MISMA excepción que el libro:
                 en el teléfono la fila entera se va. El corte es `max-md`
                 (≤767px) porque es literalmente la cláusula de ancho de
                 MODO_LIGERO (lib/device.ts) — la definición que ya tiene la app
                 de "esto es un teléfono"—, y no un número nuevo.
                 En PC se queda, igual que en el libro: allá sobra alto y el
                 toggler es de todas las pantallas (regla 3 del contrato). */
              a1EnLeccion && 'max-md:hidden',
            )}
          />

          <main
            className={cn(
              'flex min-h-0 flex-1 flex-col px-5',
              /* Cuando la fila superior se esconde, alguien tiene que poner el
                 hueco del notch: era ELLA quien lo ponía. Se copia su misma
                 expresión (max(14px, safe-area-top)) para que en el iPhone la
                 cabecera del loop quede exactamente donde estaba el Menu, ni un
                 píxel debajo de la muesca. Solo en el rango donde la fila
                 desaparece; en PC la fila sigue montada y ya lo hace ella. */
              a1EnLeccion && 'max-md:pt-[max(14px,env(safe-area-inset-top))]',
              // El pb reserva 84px para la tab bar… que hoy está OCULTA (ver
              // abajo). En sesión ya se recortaba a 12px. SLANG (Pélala) también
              // lo recorta: su columna (sticker + significado + chat de práctica)
              // es alta y esos 84px muertos empujaban el input fuera del pliegue
              // en PC al 100%. Con la tab bar sin montar, reclamarlos es honesto;
              // max(…, safe-area) respeta el notch/inferior del móvil.
              // LIBRO entra en la misma excepción que SLANG: la hoja se mide
              // contra el alto disponible, así que 84px muertos ahí abajo le
              // recortan la página al libro entero, no solo un margen.
              // Y la LECCIÓN del A1 se suma a la lista: medido a 390×844, la
              // portada pagaba 84px de franja muerta bajo el "Dale, arranquemos"
              // por una barra que nadie monta, mientras arriba la tarjeta de la
              // unidad se recortaba por falta de alto. En PC va igual: la tab bar
              // no existe en ningún ancho.
              enSesion || view === 'slang' || view === 'libro' || a1EnLeccion
                ? 'pb-[max(14px,env(safe-area-inset-bottom))]'
                : 'pb-[calc(84px+env(safe-area-inset-bottom))]',
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
              ) : view === 'libro' ? (
                <LibroView />
              ) : (
                <StoryView />
              )}
            </Suspense>
          </main>

          {/* Tab bar oculta por ahora: la app arranca minimal desde el Home
              aurora y las demás secciones (SLANG, SUBE, DNA, OFICINA) se van
              agregando con diseños propios. El código sigue en el repo. */}
        </>
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
