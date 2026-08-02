import { create } from 'zustand';

import { store } from '@/lib/storage';

/* Suscripción — DEMO VISUAL (pedido de Gus, 2026-08-02): el flujo completo de
   pagar se recorre con datos de mentira — cualquier cosa que escribas avanza,
   nadie cobra nada. Cuando el apartado visual esté aprobado se enchufa el
   backend real (tarjetas + USDC Solana/Stellar); este store ya deja el punto
   de corte listo: `pagar()` es el único sitio que "cobra".

   El overlay vive ENCIMA de la vista activa (no es una vista del union View):
   se abre desde el menú en cualquier pantalla y el fondo se desenfoca, igual
   que el personalizador. Pasos del recorrido:

     oferta → checkout → resumen → ticket → tarjetas
     (squishy)  (dialog)   (order)   (confeti)  (Visa/Mastercard)

   Solo persiste `suscrito` (clave rodeo_sub_demo, patrón manual del repo, ver
   stores/app.ts:5-7): con la demo "pagada", reabrir Suscripción cae directo en
   las tarjetas conectadas. "Reiniciar demo" borra la marca para volver a
   recorrer el flujo desde la oferta. */

const CLAVE_DEMO = 'rodeo_sub_demo';

export type PasoSuscripcion = 'oferta' | 'checkout' | 'resumen' | 'ticket' | 'tarjetas';

type SuscripcionState = {
  abierto: boolean;
  paso: PasoSuscripcion;
  /** La demo ya "pagó" en este aparato (persistido). */
  suscrito: boolean;
  abrir: () => void;
  cerrar: () => void;
  irA: (paso: PasoSuscripcion) => void;
  /** El "cobro" de la demo: marca suscrito y suelta el ticket con confeti.
      Cuando llegue el backend real, este es el único punto a reemplazar. */
  pagar: () => void;
  resetDemo: () => void;
};

export const useSuscripcion = create<SuscripcionState>((set, get) => ({
  abierto: false,
  paso: 'oferta',
  suscrito: store.get<boolean>(CLAVE_DEMO, false),
  // Con la demo pagada no se re-vende: se cae directo a las tarjetas.
  abrir: () => set({ abierto: true, paso: get().suscrito ? 'tarjetas' : 'oferta' }),
  cerrar: () => set({ abierto: false }),
  irA: (paso) => set({ paso }),
  pagar: () => {
    store.set(CLAVE_DEMO, true);
    set({ suscrito: true, paso: 'ticket' });
  },
  resetDemo: () => {
    store.set(CLAVE_DEMO, false);
    set({ suscrito: false, paso: 'oferta' });
  },
}));
