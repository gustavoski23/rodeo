import { useState } from 'react';

import { Header } from '@/components/rodeo/header';
import { TabBar } from '@/components/rodeo/tab-bar';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { TextAnimate } from '@/components/magicui/text-animate';
import { useApp } from '@/stores/app';

/* Shell F0: header + tab bar + una vista de muestra que demuestra que la
   fundación funciona (shadcn Button, RainbowButton y TextAnimate salen con la
   piel de RODEO sin tocar su código). Las vistas reales llegan en F1-F5. */
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const view = useApp((s) => s.view);
  const nombre = useApp((s) => s.nombre);

  return (
    <>
      <Header menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((v) => !v)} />
      <div className="mx-5 h-px shrink-0 bg-gradient-to-r from-transparent via-[var(--borde-medio)] to-transparent" />

      <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pt-6 pb-32">
        <section className="flex flex-col gap-2">
          <span className="font-mono text-[0.62rem] tracking-[0.14em] text-brand uppercase">
            fundación nueva · fase 0
          </span>
          <h2 className="font-display text-4xl leading-[0.95] font-black tracking-tight">
            <TextAnimate animation="blurInUp" by="character" once as="span">
              {nombre ? `¿Qué hay, ${nombre}?` : '¿Qué hay?'}
            </TextAnimate>
          </h2>
          <p className="text-sm text-muted-foreground">
            Vista activa: <span className="font-mono text-foreground">{view}</span>. Las pantallas reales
            (TALK, STORY, SLANG, OFICINA) se portan una a una sobre esta base.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <span className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
            componentes instalados verbatim, con la piel de RODEO
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Botón primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Peligro</Button>
          </div>
          <div className="pt-2">
            <RainbowButton size="lg" className="h-13 rounded-full px-9 font-display text-base font-bold tracking-wide">
              LISTO
            </RainbowButton>
          </div>
        </section>
      </main>

      <TabBar />
    </>
  );
}
