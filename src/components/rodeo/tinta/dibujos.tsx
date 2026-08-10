/* LOS QUE LUCIDE NO DA — dibujados a mano.

   POR QUÉ ESTE ARCHIVO EXISTE Y NO VIVEN EN conceptos.ts
   Porque conceptos.ts es un .ts y el escape `propio` está tipado como
   ReactNode: ahí no se puede escribir <path/>. Es lo primero que se rompe al
   ejercitar el escape —estaba implementado y nunca usado hasta esta tanda—.
   Sacarlos a un .tsx cuesta un import; renombrar conceptos.ts a .tsx también
   servía, pero mueve el archivo que más se edita del sistema.

   LAS REGLAS DEL ESCAPE, que no son decorativas (icono-tinta.tsx los mete en un
   <g className="tinta-trazo" strokeWidth={grosor(px)}>):
     · Paths CRUDOS en la grilla 0..24 de lucide, sin <svg> alrededor.
     · SIN stroke-width propio. El grosor lo pone grosor(px) y va al revés del
       instinto: 1,95 a 18 px y 1,0 a 96. Si un path trae el suyo, el icono deja
       de engordar al achicarse y se lo come el antialias en el mapa.
     · SIN aguada adentro. La del sistema DESBORDA el dibujo (viewBox -4..28) y
       por eso sobrevive al achique; una segunda aguada dentro del contorno es
       exactamente lo que el careo midió que NO se ve a 18 px.
     · SILUETA, no ilustración: a 18 px un detalle interior de menos de ~2
       unidades desaparece.

   HASTA DÓNDE LLEGAN, mirado en captura:
     · ESE lee a 18 y a 26.
     · LENGUA y DIENTE leen a 26 px —el disco del mapa, que es donde viven las
       tres— y quedan AL LÍMITE a 18 px (la fila de la portada). Están por
       debajo de los de lucide, y es lo esperable: el careo ya había medido que
       a 18 px el dibujo propio pierde. Para subirlos hay que engordar la
       silueta, nunca agregarle detalle. */

/* TH — "saca la lengua" (t0-s4-th). Tres vueltas, dos descartadas mirando:
     v1 · lente cerrada + lengua angosta colgando → salió HONGO: la lente se
          lee ojo y la lengua fina se lee tallo.
     v2 · la misma lente con pico de cupido → el pico mide 1,4 unidades y a
          18 px lo borra el antialias; seguía leyéndose ojo.
     v3 · el labio de arriba es una RECTA. Un óvalo no puede tener un lado
          recto y un ojo tampoco: despega el dibujo de un ojo por menos de lo
          que cuesta cualquier detalle. Los cachetes cuelgan de esa recta y la
          lengua es ANCHA (6,8 de las 24) y CORTA — ancha+corta se lee lengua,
          angosta+larga se lee tallo, con la misma área de tinta. */
export const LENGUA = (
  <>
    <path d="M3.2 8.4H20.8" />
    <path d="M3.2 8.4C3.2 12.2 5.6 14.6 8.6 15.1" />
    <path d="M20.8 8.4C20.8 12.2 18.4 14.6 15.4 15.1" />
    <path d="M8.6 12.6C8.6 18.4 9.9 21 12 21C14.1 21 15.4 18.4 15.4 12.6Z" />
  </>
);

/* La V que no es B (t0-s5-v). v1 leía ARCO porque la horquilla entre las dos
   raíces se cerraba en el antialias. v2 (esta) ensancha la corona a 14,8 de
   las 24 y abre la horquilla a 6: corona ancha con patas separadas dice muela,
   corona angosta con patas juntas dice campana. */
export const DIENTE = (
  <path d="M4.6 9.9C4.6 5.6 8 4 12 4C16 4 19.4 5.6 19.4 9.9C19.4 12.4 18.1 13.9 17.2 17.1C16.5 19.6 14.8 20.2 14.4 17.6C14.1 15.7 12.9 14.3 12 14.3C11.1 14.3 9.9 15.7 9.6 17.6C9.2 20.2 7.5 19.6 6.8 17.1C5.9 13.9 4.6 12.4 4.6 9.9Z" />
);

/* La -S final que sí se oye (t0-s6-s-final).
   Es la culebra del contenido Y es la letra a la vez: el cuerpo hace la S de
   una sola pasada. Se dibuja así y no como culebra realista porque a 18 px una
   culebra pide escamas y cabeza, o sea más detalle del que entra. Con el ojo y
   la lengua bífida se lee culebra; sin ellos se lee garabato. La lengua sale
   2,6 unidades: a 1,5 desaparecía.
   El ojo es un path de largo casi cero — con stroke-linecap round eso pinta un
   punto del diámetro del trazo, que es la única forma de tener un punto que
   escale con grosor(px) en vez de quedarse fijo. */
export const ESE = (
  <>
    <path d="M16.4 4.9C11.2 3.1 7.6 5.6 8.8 8.8C10 12 15.6 12.2 16.6 15.4C17.6 18.6 13.6 21 8 19.4" />
    <path d="M16.4 4.9C17.6 4.2 19.2 4.5 19.9 5.6" />
    <path d="M19.9 5.6L22.4 4.6M19.9 5.6L22.2 7" />
    <path d="M16.9 6.6L16.95 6.6" />
  </>
);
