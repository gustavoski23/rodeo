import { useState } from 'react';

import { BubbleBackground } from '@/components/ui/components-backgrounds-bubble';
import { GradientBackground } from '@/components/ui/sign-up';
import { MODO_LIGERO } from '@/lib/device';
import { useApp } from '@/stores/app';

// El CSS de la capa (.aurora-fondo-gradiente y su __velo) vive en aurora.css.
// Se importa AQUÍ porque esta pieza la monta App, que no arrastra esa hoja.
import './aurora.css';

/* FONDO DEL TEMA — una sola capa para TODA la app.

   Regla 4 del contrato: «QUIERO QUE EL FONDO SE VEA COMO EL DEL HOME, TODOS
   LOS FONDOS DEBEN VERSE ASI». El bloque era local del Home (era la puerta y
   adentro mandaban los tokens oscuros); ahora se monta UNA vez en App, detrás
   del switch de vistas, así que las burbujas quedan detrás de SLANG, STORY,
   SUBE, DNA, OFICINA y también de la sesión de charla.

   Se monta SOLO con los temas que piden fondo: es un árbol animado en loop y
   no tiene por qué estar corriendo en claro/oscuro (donde el fondo es el plano
   del body). Hay dos:

     · gradiente → BubbleBackground (seis capas motion + filtro goo) sobre el
       shell oscuro. En MODO_LIGERO cae a una versión estática de puro CSS.
     · amanecer  → el MISMO GradientBackground del gate (components/ui/sign-up),
       o sea las manchas borrosas de "Get started" sobre papel crema. Gus pidió
       poder elegir ese fondo como tema (2026-08-17). No necesita rama de
       MODO_LIGERO: el componente ya apaga sus dos animaciones float por media
       query en ≤767px, pointer:coarse y prefers-reduced-motion — o sea que en
       teléfono es un SVG quieto, que es exactamente lo que se ve en el gate.

   La capa es `position:fixed; inset:0; z-index:-1`, o sea: por encima del
   lienzo del body y por debajo de todo el contenido en flujo, sin tener que
   tocar el z-index de una sola pieza de las vistas. */
export function FondoTema() {
  const tema = useApp((s) => s.tema);
  /* La burbuja que sigue al puntero solo tiene sentido donde hay puntero: en
     móvil es un listener de mousemove que nunca dispara y una capa más que
     componer. Se decide UNA vez al montar (no en cada render). */
  const [interactivo] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px) and (pointer: fine)').matches,
  );

  /* AMANECER: el gradiente del gate. Las --color-* que consume el SVG las
     declara `.aurora-fondo-amanecer` (aurora.css) y viven SOLO ahí dentro: son
     los mismos nombres que el puente Tailwind de tokens.css (--color-primary,
     --color-chart-3…), así que declararlas en :root repintaría media app. */
  if (tema === 'amanecer') {
    return (
      <div className="aurora-fondo-amanecer" aria-hidden="true">
        <GradientBackground />
      </div>
    );
  }

  if (tema !== 'gradiente') return null;

  if (MODO_LIGERO) {
    return (
      <div className="aurora-fondo-gradiente aurora-fondo-gradiente--estatico" aria-hidden="true">
        <div className="aurora-fondo-gradiente__velo" />
      </div>
    );
  }

  return (
    <div className="aurora-fondo-gradiente" aria-hidden="true">
      <BubbleBackground interactive={interactivo} className="size-full">
        <div className="aurora-fondo-gradiente__velo" />
      </BubbleBackground>
    </div>
  );
}
