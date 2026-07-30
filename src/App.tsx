import { useState } from 'react';
import { MotionConfig } from 'motion/react';

import { AuroraCustomizer } from '@/components/rodeo/aurora-customizer';
import { Header } from '@/components/rodeo/header';
import { MenuSheet } from '@/components/rodeo/menu-sheet';
import { Toaster } from '@/components/rodeo/toaster';
import { JOB_PACKS, JobPicker } from '@/content/a1/jobs';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useA1 } from '@/stores/a1';
import { useAuth } from '@/stores/auth';
import { useEnCharla, useEnSesion } from '@/stores/talk';
import HomeView from '@/views/home';
import TalkView from '@/views/talk';
import SlangView from '@/views/slang';
import LadderView from '@/views/ladder';
import DnaView from '@/views/dna';
import A1View from '@/views/a1';
import { PasoVoz } from '@/views/a1-voice/paso-voz';
import GateView from '@/views/gate';

/* Shell: header + vista activa + tab bar. El switch de vistas es el switchView
   del viejo (public/legacy.html:3641) sin el DOM: cada vista se monta y se
   desmonta, que es lo que hace que TALK sortee un rompehielos fresco al volver
   de una sesión sin que nadie tenga que acordarse de refrescarlo.

   TALK, SLANG, SUBE y DNA están portadas (DNA y SUBE se abren desde el menú,
   como en el viejo vivían tras el perfil); STORY y OFICINA llegan después. */

const PENDIENTES: Record<string, { titulo: string; sub: string }> = {
  story: { titulo: 'STORY', sub: 'El thriller por capítulos y la lectura diaria llegan en la próxima entrega.' },
};

function VistaPendiente({ view }: { view: string }) {
  const d = PENDIENTES[view] ?? { titulo: view.toUpperCase(), sub: 'En camino.' };
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
      <p className="font-display text-[clamp(2rem,8.5vw,2.8rem)] leading-[0.92] font-extrabold tracking-[-0.035em]">
        {d.titulo}
        <span style={{ color: 'var(--accent)' }}>.</span>
      </p>
      <p className="max-w-[330px] text-[0.92rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
        {d.sub}
      </p>
    </div>
  );
}

/* OFICINA cableada: al entrar por primera vez (ya con el onboarding de Alfred
   visto) toca elegir trabajo; con trabajo elegido, el curso completo con packs
   y el paso de producción hablada (A1.3) enchufado al loop. */
function OficinaView() {
  const onboarded = useA1((s) => s.onboarded);
  const job = useA1((s) => s.job);
  const setJob = useA1((s) => s.setJob);
  // "Después elijo" vale por esta visita: el picker vuelve la próxima vez,
  // porque elegir trabajo es lo que desbloquea las unidades del rol.
  const [pospuesto, setPospuesto] = useState(false);

  if (onboarded && !job && !pospuesto) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <div>
          <p className="font-display text-[clamp(1.7rem,7vw,2.2rem)] leading-[0.95] font-extrabold tracking-[-0.03em]">
            ¿En qué trabajás<span style={{ color: 'var(--accent)' }}>?</span>
          </p>
          <p className="mt-1.5 text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
            El tronco del curso es para todos; tu trabajo le suma sus propias escenas.
          </p>
        </div>
        <JobPicker packs={JOB_PACKS} seleccionado={null} onPick={setJob} />
        <button
          type="button"
          onClick={() => setPospuesto(true)}
          className="mx-auto mt-1 cursor-pointer text-[0.85rem] underline-offset-4 hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Después elijo
        </button>
      </div>
    );
  }

  return <A1View packsExtra={JOB_PACKS} PasoVoz={PasoVoz} />;
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const view = useApp((s) => s.view);
  // Con sesión viva la tab bar se va y el main recupera su hueco inferior:
  // es el body.rd-sesion del viejo (L1459-1462), derivado del estado.
  const enSesion = useEnSesion();
  /* La SESIÓN DE CHARLA va a pantalla completa, como el Home: sin Header de
     marca ni divisoria. Su barra de sesión (← · título · Terminar) ya es el
     header de esa pantalla, y el wordmark RODEO + hamburguesa encima sobraban.
     Solo la charla: ESCENAS (roleplayActivo) y las demás vistas siguen igual.
     Al cerrar la sesión el flag se apaga y el Header vuelve solo.
     El hook va SUELTO, nunca dentro del `&&`: cortocircuitarlo lo saltaría en
     los renders de otras vistas y rompería el orden de hooks. */
  const enCharla = useEnCharla();
  const charlaPantallaCompleta = view === 'talk' && enCharla;

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
      {view === 'home' ? (
        /* El Home aurora va a pantalla completa: sin header de marca, sin
           tab bar, sin divisoria — solo su hamburguesa. Es la puerta. */
        <HomeView menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((v) => !v)} />
      ) : (
        <>
          {!charlaPantallaCompleta && (
            <>
              <Header menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((v) => !v)} />
              <div className="mx-5 h-px shrink-0 bg-gradient-to-r from-transparent via-[var(--borde-medio)] to-transparent" />
            </>
          )}

          <main
            className={cn(
              'flex min-h-0 flex-1 flex-col px-5',
              /* Sin Header, el techo del main es el techo de la ventana: hace
                 falta el hueco del notch que antes ponía el header (mismo
                 max(14px, safe-area) del Home). Con Header, el pt-5 de
                 siempre. El pb no se toca: en sesión ya era el corto. */
              charlaPantallaCompleta ? 'pt-[max(14px,env(safe-area-inset-top))]' : 'pt-5',
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
              <VistaPendiente view={view} />
            )}
          </main>

          {/* Tab bar oculta por ahora: la app arranca minimal desde el Home
              aurora y las demás secciones (SLANG, SUBE, DNA, OFICINA) se van
              agregando con diseños propios. El código sigue en el repo. */}
        </>
      )}

      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} onPersonalizar={() => setCustomizerOpen(true)} />
      <AuroraCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
      <Toaster />
    </MotionConfig>
  );
}
