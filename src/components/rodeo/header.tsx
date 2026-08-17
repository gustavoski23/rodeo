import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { MarcaHablarte } from '@/components/rodeo/marca';
import { MenuFlotante } from '@/components/rodeo/menu-flotante';
import { SIGUIENTE_TEMA, temaVisual } from '@/lib/theme';
import { useApp } from '@/stores/app';

/* ⚠ ESTE COMPONENTE NO SE MONTA EN NINGÚN SITIO. Nada lo importa.

   La regla 3 del contrato visual quitó el header de marca de todas las
   pantallas: la única cabecera es FilaSuperior (menú + tema, sin wordmark), y
   este archivo quedó como resto de la etapa anterior. Se mantiene al día con la
   marca —HABLARTE, no RODEO— para que revivirlo no signifique reencontrarse con
   un logotipo muerto, pero cambiar algo aquí NO cambia nada en pantalla. El
   lockup que sí se ve vive en el gate (views/gate/index.tsx). */

/* Header global: menú líquido · marca · toggler de tema.

   El MenuToggle redondo (☰↔✕) dejó su sitio a la píldora "Menu ≡" del
   liquid-morph (MenuFlotante). La píldora mide 150px contra los 40 del botón
   viejo: para que la fila siga entrando en 390px, la coletilla "tu inglés
   24/7" se guarda hasta `sm`.

   El wordmark va MÁS CHICO que el RODEO al que reemplazó (1.24rem contra 1.7) y
   con menos tracking del que la marca luce en grande: HABLARTE son 8 letras
   contra 5, en una serif de caja ancha, y al tamaño viejo la fila se
   desbordaba en 390px. */
export function Header({ onPersonalizar, menuOculto = false }: { onPersonalizar: () => void; menuOculto?: boolean }) {
  const tema = useApp((s) => s.tema);
  const cambiarTema = useApp((s) => s.cambiarTema);

  return (
    <header className="flex shrink-0 items-center justify-between px-5 pt-5 pb-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <MenuFlotante onPersonalizar={onPersonalizar} oculto={menuOculto} />
        <div className="flex min-w-0 items-center gap-2.5">
          {/* El logo vuelve al Home aurora: es la única ruta de regreso a la
              puerta (la tab bar no lleva pestaña de inicio a propósito).
              Isotipo y wordmark van DENTRO del botón: el lockup entero es el
              mando, no solo la palabra. */}
          <button
            type="button"
            onClick={() => useApp.getState().setView('home')}
            aria-label="Volver al inicio"
            className="flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0"
          >
            <MarcaHablarte />
            <h1 className="font-wordmark text-[1.24rem] leading-none font-light tracking-[0.15em]">
              HABLARTE
            </h1>
          </button>
          <span className="hidden font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase sm:inline">
            tu inglés 24/7
          </span>
        </div>
      </div>

      {/* AnimatedThemeToggler (Magic UI, verbatim) en modo controlado: Hablarte es
          dueño de la persistencia — data-theme en <html>, clave rodeo_tema y
          meta theme-color, igual que la app original. */}
      {/* Mismo ciclo de TRES que el Home (día → noche → gradiente → día): el
          toggler es binario y verbatim, así que se le ignora lo que reporta y
          el siguiente tema lo decide SIGUIENTE_TEMA. */}
      <AnimatedThemeToggler
        theme={temaVisual(tema)}
        duration={700}
        onThemeChange={() => cambiarTema(SIGUIENTE_TEMA[tema])}
        aria-label="Cambiar de tema: día, noche, gradiente o amanecer"
        className="border-border bg-transparent text-foreground inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border [&_svg]:size-5"
      />
    </header>
  );
}
