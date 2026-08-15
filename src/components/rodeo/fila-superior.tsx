import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { MenuFlotante } from '@/components/rodeo/menu-flotante';
import { SIGUIENTE_TEMA, temaVisual } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';

/* FILA SUPERIOR — la única cabecera de Hablarte.

   Regla 3 del contrato visual: no hay header de marca en NINGUNA pantalla
   (fuera wordmark, mascota, "tu inglés 24/7" y la divisoria). En su sitio va
   esta fila, que es literalmente la del Home aurora: píldora "Menu ≡" a la
   izquierda y el botón de tema a la DERECHA. Se extrae aquí para que el Home y
   el resto de las vistas monten EXACTAMENTE la misma pieza en vez de dos
   copias que se van separando con cada retoque.

   Cableado verbatim del Home (views/home/index.tsx:108-125):
     · MenuFlotante controlado por `oculto` (lo desvanece y le quita el
       puntero sin sacar su caja de 150×48 del flujo, para que la fila no se
       recoloque).
     · AnimatedThemeToggler (Magic UI, verbatim) en modo CONTROLADO: es binario
       —solo sabe decir light/dark— así que se le ignora lo que reporta y el
       siguiente tema lo decide Hablarte (SIGUIENTE_TEMA: día → noche →
       gradiente → día). Se le pasa el tema VISUAL para que el icono no mienta
       (gradiente se dibuja como noche, porque sus tokens son los oscuros).
     · REGLA OBLIGATORIA (pedido de Gus): el botón de tema tiene que VERSE en
       TODAS las pantallas y en los TRES temas. El look "transparente + icono
       negro al 70%" era casi INVISIBLE sobre el papel del tema claro (parecía
       faltar). Por eso ahora lleva SUPERFICIE + BORDE + ICONO por tokens del
       tema —los MISMOS que el botón ← canónico (--bg-surface / --borde-sutil /
       --text-primary)—, que garantizan contraste en claro, oscuro y gradiente.
       Al ir por tokens se adapta solo: no vuelve a "desaparecer" en ningún tema.

   ESTA fila es la ÚNICA cabecera y DEBE montarse en toda pantalla: el Home la
   pone dentro de su aurora-shell y App la renderiza para TODAS las vistas que no
   son Home (App.tsx). No añadir vistas que la salten.

   El PADDING lo pone el consumidor: el Home la mete dentro de su
   `aurora-shell` (que ya trae px-5 y el hueco del notch) y App le da el suyo.
   Así la pieza no pelea con el layout de nadie. */
export function FilaSuperior({
  onPersonalizar,
  menuOculto = false,
  inerte = false,
  className,
}: {
  onPersonalizar: () => void;
  menuOculto?: boolean;
  /* `inert` apaga la fila entera cuando algo la tapa (la vitrina de features
     del Home): la saca del orden de tabulación y del árbol de accesibilidad
     sin mover un píxel. El MENÚ es el caso aparte —su raíz es `fixed` y se
     pintaría por encima de la capa opaca—, y por eso se aparta además con
     `oculto`. */
  inerte?: boolean;
  className?: string;
}) {
  const tema = useApp((s) => s.tema);
  const cambiarTema = useApp((s) => s.cambiarTema);

  return (
    <div className={cn('flex shrink-0 items-center justify-between', className)} inert={inerte}>
      <MenuFlotante onPersonalizar={onPersonalizar} oculto={menuOculto || inerte} />
      <AnimatedThemeToggler
        theme={temaVisual(tema)}
        duration={700}
        onThemeChange={() => cambiarTema(SIGUIENTE_TEMA[tema])}
        aria-label="Cambiar de tema: día, noche o gradiente"
        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--borde-sutil)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm [&_svg]:size-5"
      />
    </div>
  );
}
