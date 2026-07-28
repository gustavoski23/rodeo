import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { MenuToggle } from '@/components/rodeo/menu-toggle';
import { aplicarTema } from '@/lib/theme';
import { store } from '@/lib/storage';
import { useApp } from '@/stores/app';

/* Header global: menú (☰↔✕) · marca · toggler de tema.
   La mascota line-art y el logo vienen del diseño actual de la app. */
export function Header({ menuOpen, onMenuToggle }: { menuOpen: boolean; onMenuToggle: () => void }) {
  const tema = useApp((s) => s.tema);
  const setTema = useApp((s) => s.setTema);

  return (
    <header className="flex shrink-0 items-center justify-between px-5 pt-5 pb-3">
      <div className="flex items-center gap-2.5">
        <MenuToggle open={menuOpen} onToggle={onMenuToggle} />
        <span aria-hidden="true" className="inline-flex">
          {/* mascot-mark RODEO: carita line-art lima (círculo + ojos + sonrisa wonky) */}
          <svg
            width="30"
            height="30"
            viewBox="0 0 32 32"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="16" cy="16" r="13"></circle>
            <path d="M11 13.5h.01M21 13.5h.01"></path>
            <path d="M10.5 19c1.6 2.4 3.4 3.4 5.5 3.4s3.9-1 5.5-3.4"></path>
          </svg>
        </span>
        <div className="flex items-baseline gap-2.5">
          {/* El logo vuelve al Home aurora: es la única ruta de regreso a la
              puerta (la tab bar no lleva pestaña de inicio a propósito). */}
          <button
            type="button"
            onClick={() => useApp.getState().setView('home')}
            aria-label="Volver al inicio"
            className="cursor-pointer border-0 bg-transparent p-0"
          >
            <h1 className="font-display text-[1.7rem] leading-[0.82] font-black tracking-tight">
              RODEO<span className="text-brand">.</span>
            </h1>
          </button>
          <span className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
            tu inglés 24/7
          </span>
        </div>
      </div>

      {/* AnimatedThemeToggler (Magic UI, verbatim) en modo controlado: RODEO es
          dueño de la persistencia — data-theme en <html>, clave rodeo_tema y
          meta theme-color, igual que la app original. */}
      <AnimatedThemeToggler
        theme={tema === 'claro' ? 'light' : 'dark'}
        duration={700}
        onThemeChange={(t) => {
          const nuevo = t === 'light' ? 'claro' : 'oscuro';
          aplicarTema(nuevo);
          store.set('rodeo_tema', nuevo);
          setTema(nuevo);
        }}
        aria-label="Cambiar entre tema claro y oscuro"
        className="border-border bg-transparent text-foreground inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border [&_svg]:size-5"
      />
    </header>
  );
}
