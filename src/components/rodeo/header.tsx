import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { MenuFlotante } from '@/components/rodeo/menu-flotante';
import { SIGUIENTE_TEMA, temaVisual } from '@/lib/theme';
import { useApp } from '@/stores/app';

/* Header global: menú líquido · marca · toggler de tema.
   La mascota line-art y el logo vienen del diseño actual de la app.

   El MenuToggle redondo (☰↔✕) dejó su sitio a la píldora "Menu ≡" del
   liquid-morph (MenuFlotante). La píldora mide 150px contra los 40 del botón
   viejo: para que la fila siga entrando en 390px, la coletilla "tu inglés
   24/7" y la mascota se guardan hasta `sm`. El wordmark RODEO no se toca. */
export function Header({ onPersonalizar, menuOculto = false }: { onPersonalizar: () => void; menuOculto?: boolean }) {
  const tema = useApp((s) => s.tema);
  const cambiarTema = useApp((s) => s.cambiarTema);

  return (
    <header className="flex shrink-0 items-center justify-between px-5 pt-5 pb-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <MenuFlotante onPersonalizar={onPersonalizar} oculto={menuOculto} />
        <span aria-hidden="true" className="hidden sm:inline-flex">
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
          <span className="hidden font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase sm:inline">
            tu inglés 24/7
          </span>
        </div>
      </div>

      {/* AnimatedThemeToggler (Magic UI, verbatim) en modo controlado: RODEO es
          dueño de la persistencia — data-theme en <html>, clave rodeo_tema y
          meta theme-color, igual que la app original. */}
      {/* Mismo ciclo de TRES que el Home (día → noche → gradiente → día): el
          toggler es binario y verbatim, así que se le ignora lo que reporta y
          el siguiente tema lo decide SIGUIENTE_TEMA. */}
      <AnimatedThemeToggler
        theme={temaVisual(tema)}
        duration={700}
        onThemeChange={() => cambiarTema(SIGUIENTE_TEMA[tema])}
        aria-label="Cambiar de tema: día, noche o gradiente"
        className="border-border bg-transparent text-foreground inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border [&_svg]:size-5"
      />
    </header>
  );
}
