import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { AuroraCustomizer } from '@/components/rodeo/aurora-customizer';
import { FilaSuperior } from '@/components/rodeo/fila-superior';
import { FondoTema } from '@/components/rodeo/fondo-tema';
import { Toaster } from '@/components/rodeo/toaster';
import { Card } from '@/components/ui/card';
import { JOB_PACKS, JobPicker } from '@/content/a1/jobs';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useA1 } from '@/stores/a1';
import { useAuth } from '@/stores/auth';
import { useEnCharla, useEnSesion } from '@/stores/talk';
import HomeView from '@/views/home';
import TalkView from '@/views/talk';
import SlangView from '@/views/slang';
import StoryView from '@/views/story';
import LadderView from '@/views/ladder';
import DnaView from '@/views/dna';
import A1View from '@/views/a1';
import { PasoVoz } from '@/views/a1-voice/paso-voz';
import GateView from '@/views/gate';

/* Shell: fila superior + vista activa + tab bar. El switch de vistas es el switchView
   del viejo (public/legacy.html:3641) sin el DOM: cada vista se monta y se
   desmonta, que es lo que hace que TALK sortee un rompehielos fresco al volver
   de una sesión sin que nadie tenga que acordarse de refrescarlo.

   Ya no queda ninguna vista "pendiente": TALK, SLANG, STORY, SUBE, DNA y
   OFICINA tienen pantalla propia, así que el switch es exhaustivo y la rama
   final es STORY (el viejo VistaPendiente y su tabla PENDIENTES se fueron con
   ella — era un titular gigante sin ← del que solo se salía por el menú). */

/* La misma COLUMNA de 640 px que usan las vistas (slang, charla, story): el
   shell la redeclara para el wrapper de OFICINA, que también es pantalla.
   Convención del repo — se copia, no se extrae a una lib compartida. */
const COLUMNA = 'mx-auto w-full max-w-[640px]';

/* OFICINA cableada: al entrar por primera vez (ya con el onboarding de Alfred
   visto) toca elegir trabajo; con trabajo elegido, el curso completo con packs
   y el paso de producción hablada (A1.3) enchufado al loop. */
/* Pista de que HAY MÁS ABAJO. Con SIN_BARRA el scroller no pinta barra, así que
   un contenido cortado por el borde de la Card se lee como contenido que
   termina ahí. Devuelve true solo mientras quede recorrido por debajo: el velo
   aparece cuando desborda y se apaga al llegar al fondo. */
function useDesborde() {
  const ref = useRef<HTMLDivElement>(null);
  const [hayMas, setHayMas] = useState(false);

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setHayMas(el.scrollHeight - el.clientHeight - el.scrollTop > 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    medir();
    // El contenido entra animado (stagger de las pegatinas), así que el alto
    // final llega después del primer frame: lo vigila un ResizeObserver.
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [medir]);

  return { ref, hayMas, medir };
}

function OficinaView() {
  const onboarded = useA1((s) => s.onboarded);
  const job = useA1((s) => s.job);
  const setJob = useA1((s) => s.setJob);
  const setView = useApp((s) => s.setView);
  // "Después elijo" vale por esta visita: el picker vuelve la próxima vez,
  // porque elegir trabajo es lo que desbloquea las unidades del rol.
  const [pospuesto, setPospuesto] = useState(false);
  const scroller = useDesborde();

  if (onboarded && !job && !pospuesto) {
    /* Paso de elección con el patrón canónico: barra ← + título mono, y las
       cuatro pegatinas dentro de la Card. Antes era un héroe clamp("¿En qué
       trabajás?") suelto a todo el ancho y sin salida: la única forma de dejar
       OFICINA sin elegir pack era "Después elijo" o el menú. La funcionalidad
       es la de antes — onPick sigue siendo setJob, "Después elijo" sigue
       posponiendo por esta visita. */
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setView('home')}
            aria-label="Volver al inicio"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
            style={{
              borderColor: 'var(--borde-sutil)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowLeft size={17} strokeWidth={2} />
          </motion.button>
          <span
            className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            Oficina · elegí tu trabajo
          </span>
        </div>

        <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
          <div
            ref={scroller.ref}
            onScroll={scroller.medir}
            className={cn(
              'flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-3 py-4 sm:gap-4 sm:px-4',
              '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            )}
          >
            <p className="text-[0.88rem] leading-[1.45] sm:text-[0.9rem] sm:leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
              El tronco del curso es para todos; tu trabajo le suma sus propias escenas.
            </p>
            <JobPicker packs={JOB_PACKS} seleccionado={null} onPick={setJob} />
            <button
              type="button"
              onClick={() => setPospuesto(true)}
              className="mx-auto mt-auto cursor-pointer pt-1 text-[0.85rem] underline-offset-4 hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Después elijo
            </button>
          </div>

          {/* El velo de "sigue abajo": desvanece el último renglón contra el
              borde de la Card para que se lea como contenido cortado, no como
              contenido terminado. Solo mientras quede recorrido. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-[22px]"
            style={{ background: 'linear-gradient(to top, var(--bg-surface), transparent)' }}
            initial={false}
            animate={{ opacity: scroller.hayMas ? 1 : 0 }}
            transition={{ duration: 0.18 }}
          />
        </Card>
      </div>
    );
  }

  return <A1View packsExtra={JOB_PACKS} PasoVoz={PasoVoz} />;
}

export default function App() {
  /* El menú ☰ ya no es un estado del shell: la píldora liquid-morph
     (MenuFlotante) se abre y se cierra sola, así que `menuOpen`/`onMenuToggle`
     desaparecieron de App, Home y Header. Lo único que sigue viviendo aquí es
     el personalizador, porque su hoja la monta App y el menú solo la pide.
     MenuSheet y MenuToggle siguen en el repo, sin montarse. */
  const [customizerOpen, setCustomizerOpen] = useState(false);
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

  /* El gate de login es LO PRIMERO que se ve (pedido de Gus): antes que el
     Home aurora. `listo` evita el flash — hasta resolver getSession no se
     decide nada y la pantalla queda en el negro del Home. Con sesión o con
     Skip previo, el gate no existe. */
  const authListo = useAuth((s) => s.listo);
  const gateNecesario = useAuth((s) => s.gateNecesario);
  if (!authListo) return <div className="min-h-dvh" style={{ background: '#14161a' }} />;
  if (gateNecesario) {
    return (
      <MotionConfig reducedMotion="user">
        <GateView />
        <Toaster />
      </MotionConfig>
    );
  }

  return (
    /* reducedMotion="user" apaga los springs de motion (morphs, píldoras, pulso
       del mic) para quien pidió menos movimiento en el sistema. Va en la raíz
       para no repetir la comprobación en cada componente — el CSS portado del
       viejo ya trae sus propias @media (prefers-reduced-motion). */
    <MotionConfig reducedMotion="user">
      {/* FONDO DEL TEMA, una sola vez y por DETRÁS del switch: con el tema
          gradiente las burbujas quedan detrás de TODAS las vistas, no solo del
          Home (regla 4). Va aquí y no en el gate a propósito — el login tiene
          su propio lienzo. */}
      <FondoTema />

      {view === 'home' ? (
        /* El Home aurora va a pantalla completa: sin header de marca, sin
           tab bar, sin divisoria — solo su hamburguesa. Es la puerta. */
        <HomeView onPersonalizar={() => setCustomizerOpen(true)} menuOculto={customizerOpen} />
      ) : (
        <>
          {/* La MISMA fila del Home, sin marca ni divisoria: Menu ≡ a la
              izquierda y el toggler de tema a la derecha. Ella pone el hueco
              del notch (el mismo max(14px, safe-area) del Home), así que el
              main ya no necesita pt propio. */}
          <FilaSuperior
            onPersonalizar={() => setCustomizerOpen(true)}
            menuOculto={customizerOpen}
            className={cn(
              'px-5 pt-[max(14px,env(safe-area-inset-top))]',
              // En sesión la Card es alta y a 390px pide todo el alto que
              // pueda: la fila cierra corta. Fuera de sesión, el pb-3 de siempre.
              charlaEnSesion ? 'pb-1.5' : 'pb-3',
            )}
          />

          <main
            className={cn(
              'flex min-h-0 flex-1 flex-col px-5',
              // El pb no se toca: en sesión ya era el corto.
              enSesion ? 'pb-[max(12px,env(safe-area-inset-bottom))]' : 'pb-[calc(84px+env(safe-area-inset-bottom))]',
            )}
          >
            {view === 'talk' ? (
              <TalkView />
            ) : view === 'slang' ? (
              <SlangView />
            ) : view === 'ladder' ? (
              <LadderView />
            ) : view === 'dna' ? (
              <DnaView />
            ) : view === 'a1' ? (
              <OficinaView />
            ) : (
              <StoryView />
            )}
          </main>

          {/* Tab bar oculta por ahora: la app arranca minimal desde el Home
              aurora y las demás secciones (SLANG, SUBE, DNA, OFICINA) se van
              agregando con diseños propios. El código sigue en el repo. */}
        </>
      )}

      <AuroraCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
      <Toaster />
    </MotionConfig>
  );
}
