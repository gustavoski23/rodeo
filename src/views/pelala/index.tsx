/* Entrada del sticker peel dentro de SLANG.
   Decisión de Gus: la tarjeta (revelar contexto + guardar + pelar para avanzar)
   ES la experiencia y reemplaza a El Muro como modo separado. Se abre directo.

   muro.tsx y picker.tsx quedan en disco sin rutear (por si "el después" los
   rescata); no se importan aquí. El wiring dentro de SLANG (deferido) montará
   este componente y conectará el "← Volver". */

import { CargandoSlang, usePrecargaStickers } from './precarga';
import { Pelala } from './reto';

export default function PelalaView() {
  /* Al entrar a SLANG se bajan TODOS los stickers detrás del lápiz (como los
     libros); recién con todo abajo aparece Pélala, para que deslizar entre
     stickers y cambiar de categoría se sienta instantáneo. */
  const { listo, hechas, total } = usePrecargaStickers();
  if (!listo) return <CargandoSlang hechas={hechas} total={total} />;
  return <Pelala />;
}
