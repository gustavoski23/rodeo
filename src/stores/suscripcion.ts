import { create } from 'zustand';

import type { CryptoReceipt } from '@/lib/crypto-payment.types';
import { store } from '@/lib/storage';
import { tokenActual } from '@/stores/auth';

/* Suscripción: la pestaña Card conserva el recorrido visual de demostración.
   La pestaña Crypto solo llama `pagar(recibo)` después de que Pangea confirma
   el pago on-chain y entrega su txId real.

   El overlay vive ENCIMA de la vista activa (no es una vista del union View):
   se abre desde el menú en cualquier pantalla y el fondo se desenfoca, igual
   que el personalizador. Pasos del recorrido:

     oferta → checkout → resumen → ticket → tarjetas
     (squishy)  (dialog)   (order)   (confeti)  (Visa/Mastercard)

   Se persisten la marca local y, si fue cripto, únicamente datos públicos del
   comprobante. Nunca se guarda el token firmado de la intención. */

const CLAVE_DEMO = 'rodeo_sub_demo';
const CLAVE_RECIBO = 'rodeo_sub_receipt';

export type PasoSuscripcion = 'oferta' | 'checkout' | 'resumen' | 'ticket' | 'tarjetas';

type SuscripcionState = {
  abierto: boolean;
  paso: PasoSuscripcion;
  /** Premium marcado en este aparato; cripto incluye recibo confirmado. */
  suscrito: boolean;
  recibo: CryptoReceipt | null;
  abrir: () => void;
  cerrar: () => void;
  irA: (paso: PasoSuscripcion) => void;
  pagar: (recibo?: CryptoReceipt) => void;
  resetDemo: () => void;
  /** Trae del servidor el Premium de la cuenta logueada (sigue al usuario). */
  hidratarPremium: () => Promise<void>;
};

export const useSuscripcion = create<SuscripcionState>((set, get) => ({
  abierto: false,
  paso: 'oferta',
  suscrito: store.get<boolean>(CLAVE_DEMO, false),
  recibo: store.get<CryptoReceipt | null>(CLAVE_RECIBO, null),
  // Con Premium marcado no se re-vende: se muestra el medio o recibo guardado.
  abrir: () => set({ abierto: true, paso: get().suscrito ? 'tarjetas' : 'oferta' }),
  cerrar: () => set({ abierto: false }),
  irA: (paso) => set({ paso }),
  pagar: (recibo) => {
    store.set(CLAVE_DEMO, true);
    store.set(CLAVE_RECIBO, recibo ?? null);
    set({ suscrito: true, recibo: recibo ?? null, paso: 'ticket' });
  },
  resetDemo: () => {
    store.set(CLAVE_DEMO, false);
    store.set(CLAVE_RECIBO, null);
    set({ suscrito: false, recibo: null, paso: 'oferta' });
  },

  /* La tabla del servidor es la fuente de verdad del Premium; el localStorage
     es su espejo. Al iniciar sesión (o al arrancar con sesión) preguntamos qué
     Premium tiene ESTA cuenta y lo reflejamos aquí — así el Premium comprado en
     un aparato aparece al entrar en otro. Best-effort: solo SUBE de estado
     (nunca borra por su cuenta) y si algo falla, deja el estado local intacto. */
  hidratarPremium: async () => {
    try {
      const token = await tokenActual();
      if (token === null) return;
      const res = await fetch('/api/cripto', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'mi-premium' }),
      });
      const data = (await res.json()) as { ok?: boolean; premium?: CryptoReceipt | null };
      const premium = data && data.ok === true ? data.premium : null;
      if (premium) {
        store.set(CLAVE_DEMO, true);
        store.set(CLAVE_RECIBO, premium);
        set((s) => ({
          suscrito: true,
          recibo: premium,
          // Si el overlay está abierto en la OFERTA pero la cuenta ya tiene
          // Premium (típico al entrar en un aparato nuevo), salta al resumen en
          // vez de re-venderlo. Si está en otro paso (p. ej. pagando), no lo pisa.
          paso: s.abierto && s.paso === 'oferta' ? 'tarjetas' : s.paso,
        }));
      }
    } catch {
      // Sin red o sin sesión válida: el estado local se queda como estaba.
    }
  },
}));
