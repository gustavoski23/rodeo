import { useState } from 'react';

import { BubbleBackground } from '@/components/ui/components-backgrounds-bubble';
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

   Se monta SOLO con el tema gradiente: es un árbol de motion con seis capas
   animadas en loop infinito y un filtro goo, y no tiene por qué estar
   corriendo en claro/oscuro (donde el fondo es el plano del body).

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
