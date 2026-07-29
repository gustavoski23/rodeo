import { useState } from 'react';
import { MotionConfig } from 'motion/react';

import { AuroraCustomizer } from '@/components/rodeo/aurora-customizer';
import { Header } from '@/components/rodeo/header';
import { MenuSheet } from '@/components/rodeo/menu-sheet';
import { Toaster } from '@/components/rodeo/toaster';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useEnSesion } from '@/stores/talk';
import HomeView from '@/views/home';
import TalkView from '@/views/talk';
import SlangView from '@/views/slang';
import LadderView from '@/views/ladder';
import DnaView from '@/views/dna';

/* Shell: header + vista activa + tab bar. El switch de vistas es el switchView
   del viejo (public/legacy.html:3641) sin el DOM: cada vista se monta y se
   desmonta, que es lo que hace que TALK sortee un rompehielos fresco al volver
   de una sesión sin que nadie tenga que acordarse de refrescarlo.

   TALK, SLANG, SUBE y DNA están portadas (DNA y SUBE se abren desde el menú,
   como en el viejo vivían tras el perfil); STORY y OFICINA llegan después. */

const PENDIENTES: Record<string, { titulo: string; sub: string }> = {
  story: { titulo: 'STORY', sub: 'El thriller por capítulos y la lectura diaria llegan en la próxima entrega.' },
  a1: { titulo: 'OFICINA', sub: 'El flujo de principiante con Alfred llega en la próxima entrega.' },
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

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const view = useApp((s) => s.view);
  // Con sesión viva la tab bar se va y el main recupera su hueco inferior:
  // es el body.rd-sesion del viejo (L1459-1462), derivado del estado.
  const enSesion = useEnSesion();

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
          <Header menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((v) => !v)} />
          <div className="mx-5 h-px shrink-0 bg-gradient-to-r from-transparent via-[var(--borde-medio)] to-transparent" />

          <main
            className={cn(
              'flex min-h-0 flex-1 flex-col px-5 pt-5',
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
