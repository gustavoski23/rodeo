import { Suspense, lazy, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useSuscripcion } from '@/stores/suscripcion';

// El re-anclaje vive en aurora.css. Se importa AQUÍ y no solo desde el Home
// porque el Header también monta este menú y no arrastra esa hoja.
import './aurora.css';

const FloatingMenu = lazy(() => import('@/components/ui/liquid-morph-floating-menu'));

function LanzadorMenu({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="menu-flotante__launcher" onClick={onClick} aria-label="Abrir menú">
      <span>Menu</span>
      <span className="menu-flotante__hamburger" aria-hidden="true">
        <i />
        <i />
      </span>
    </button>
  );
}

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
  const [cargado, setCargado] = useState(false);
  const setView = useApp((s) => s.setView);
  const setCarruselAlVolver = useApp((s) => s.setCarruselAlVolver);
  const abrirSuscripcion = useSuscripcion((s) => s.abrir);

  // Si el menú estuviera abierto al aparecer el modal, se cierra con su morph
  // inverso en vez de quedarse congelado como panel invisible detrás del velo.
  useEffect(() => {
    if (oculto) cerrarMenu();
  }, [oculto]);

  /* Orden pedido por Gus (2026-08-02): Inicio · Perfil · Personalizar ·
     Suscripción. OFICINA salió del menú — sigue viva vía la carta de la
     vitrina del Home (view 'a1'), solo perdió su atajo aquí. */
  const items = [
    /* INICIO es "llévame a la portada", no "vuelve por donde viniste": baja la
       marca de `carruselAlVolver` antes de navegar para que el Home aparezca
       CERRADO aunque el usuario hubiera entrado a esta vista por una carta de
       la vitrina. El ← de la vista sigue siendo el que reabre el carrusel. */
    { label: 'Inicio', onClick: () => { cerrarMenu(); setCarruselAlVolver(false); setView('home'); } },
    /* Igual PERFIL: entrar por el menú NO es entrar por la vitrina, así que su
       ← tiene que devolver el Home cerrado (misma limpieza que hacía OFICINA). */
    { label: 'Perfil', onClick: () => { cerrarMenu(); setCarruselAlVolver(false); setView('perfil'); } },
    { label: 'Personalizar', onClick: () => { cerrarMenu(); onPersonalizar(); } },
    /* SUSCRIPCION no navega: abre el overlay encima de la pantalla actual
       (el fondo se desenfoca), igual que hace Personalizar con su hoja. Va SIN
       tilde a propósito: el roll de letras del FloatingMenu recorta a 1em cada
       carácter y la Ó pierde el acento (y asoma el de la copia de abajo). */
    { label: 'Suscripcion', onClick: () => { cerrarMenu(); abrirSuscripcion(); } },
  ];

  return (
    <div className={cn('menu-flotante', oculto && 'menu-flotante--oculto', className)} aria-hidden={oculto || undefined}>
      {cargado ? (
        <Suspense fallback={<LanzadorMenu onClick={() => undefined} />}>
          <FloatingMenu items={items} initialOpen />
        </Suspense>
      ) : (
        <LanzadorMenu onClick={() => setCargado(true)} />
      )}
    </div>
  );
}
