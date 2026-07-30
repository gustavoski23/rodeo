import { useEffect } from 'react';

import FloatingMenu from '@/components/ui/liquid-morph-floating-menu';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';

// El re-anclaje vive en aurora.css. Se importa AQUÍ y no solo desde el Home
// porque el Header también monta este menú y no arrastra esa hoja.
import './aurora.css';

/* MENÚ ☰ de RODEO — el liquid-morph FloatingMenu (verbatim, components/ui)
   re-anclado ARRIBA A LA IZQUIERDA.

   ─── Cómo se re-ancla SIN tocar el fichero verbatim ──────────────────────
   El componente trae en su raíz `fixed bottom-10 left-1/2` + `style={{x:'-50%'}}`
   (motion escribe eso como transform inline). No expone className ni props de
   posición, así que el ajuste vive fuera, en dos piezas:

     1. Este wrapper reserva EN FLUJO la caja de la píldora cerrada (150×48,
        las medidas del propio componente) con `position:relative`. Así el
        menú ocupa exactamente el hueco donde vivía el MenuToggle y el resto
        de la fila (el AnimatedThemeToggler a la derecha, el wordmark del
        Header) no se mueve ni se le encima.

     2. `.menu-flotante > div` (aurora.css) reescribe SOLO la raíz del
        verbatim: absolute + top/left 0 + bottom:auto + transform:none. Es un
        selector de hijo DIRECTO, así que no roza nada del morph: el ancho/alto
        animados, el círculo oscuro que sube (`x:-50%` propio) y la cascada de
        letras son hijos más profundos y siguen intactos. El `!important` del
        transform es inevitable — motion lo escribe inline — y su único efecto
        colateral es que la entrada del componente pierde su `y:20→0`; el fundido
        de opacidad sigue.

   Con la raíz anclada arriba-izquierda, el panel abierto (280×260) CRECE HACIA
   ABAJO desde la píldora, que es lo que se pidió: la barra "Menu ≡" viaja al
   pie del panel (es su layout: flex-col con la barra al final) y los ítems
   caen encima. A 390px de ancho: 20 + 280 = 300 < 390, no desborda.

   ─── Cerrar al navegar ───────────────────────────────────────────────────
   El verbatim no cierra al pulsar un ítem, y solo sabe cerrarse por su
   listener de click-fuera (`document` mousedown). En vez de remontarlo con un
   `key` —que lo haría SALTAR a píldora sin animación— disparamos ese mismo
   listener: un mousedown sintético en `document` cae fuera de su containerRef
   y el panel se cierra con su morph inverso completo. Es su propia puerta de
   salida, usada desde fuera. No hay ningún otro listener de mousedown en la
   app (verificado), así que no arrastra a nadie más. */

function cerrarMenu() {
  document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
}

export function MenuFlotante({
  onPersonalizar,
  oculto = false,
  className,
}: {
  /** Abre la hoja "Personalizar aurora" (el estado vive en App). */
  onPersonalizar: () => void;
  /* Con una capa a pantalla completa encima —la hoja del personalizador o la
     vitrina del carrusel— el menú se APARTA: se desvanece, baja por debajo de
     esa capa y deja de recibir puntero. El MenuToggle viejo iba en flujo dentro
     del header sin z-index y cualquier capa lo tapaba sola; esta píldora es
     `fixed` con z-index propio, así que hay que apartarla explícitamente o se
     planta encima. Y hay que apartarla ENTERA: dejarla visible pero fuera del
     hit-test (p. ej. con un `inert` en el contenedor) pinta un botón amarillo
     de 150×48 que se lee "Menu ≡" y no hace nada al tocarlo. */
  oculto?: boolean;
  className?: string;
}) {
  const setView = useApp((s) => s.setView);
  const setCarruselAlVolver = useApp((s) => s.setCarruselAlVolver);

  // Si el menú estuviera abierto al aparecer el modal, se cierra con su morph
  // inverso en vez de quedarse congelado como panel invisible detrás del velo.
  useEffect(() => {
    if (oculto) cerrarMenu();
  }, [oculto]);

  const items = [
    /* INICIO es "llévame a la portada", no "vuelve por donde viniste": baja la
       marca de `carruselAlVolver` antes de navegar para que el Home aparezca
       CERRADO aunque el usuario hubiera entrado a esta vista por una carta de
       la vitrina. El ← de la vista sigue siendo el que reabre el carrusel. */
    { label: 'Inicio', onClick: () => { cerrarMenu(); setCarruselAlVolver(false); setView('home'); } },
    /* Igual OFICINA: entrar por el menú NO es entrar por la vitrina, así que su
       ← tiene que devolver el Home cerrado. Si no se limpiara aquí, la marca
       que dejó una carta anterior sobreviviría al salto y el ← de OFICINA
       reabriría un carrusel del que el usuario ya se había ido. */
    { label: 'Oficina', onClick: () => { cerrarMenu(); setCarruselAlVolver(false); setView('a1'); } },
    { label: 'Personalizar', onClick: () => { cerrarMenu(); onPersonalizar(); } },
  ];

  return (
    <div className={cn('menu-flotante', oculto && 'menu-flotante--oculto', className)} aria-hidden={oculto || undefined}>
      <FloatingMenu items={items} />
    </div>
  );
}
