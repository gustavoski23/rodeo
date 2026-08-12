import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CheckoutForm from '@/components/ui/checkout-form';
import { ConnectedCards } from '@/components/ui/connected-cards';
import { PaymentDialog } from '@/components/ui/payment-dialog';
import { SquishyPricingCard } from '@/components/ui/squishy-card-component';
import { AnimatedTicket } from '@/components/ui/ticket-confirmation-card';
import { SuscripcionInfo } from '@/components/rodeo/suscripcion-info';
import { formatUsdcBaseUnits } from '@/lib/crypto-payment';
import { useAuth } from '@/stores/auth';
import { useSuscripcion } from '@/stores/suscripcion';

import './suscripcion.css';

/* SUSCRIPCIÓN — overlay global del flujo de pago (DEMO VISUAL).

   Aparece ENCIMA de la pantalla en la que esté el usuario y el fondo se
   desenfoca (pedido de Gus) — mismo esquema velo+capa del personalizador,
   pero en z-[160/170]: por encima de las hojas z-[150] de talk/ladder, para
   que el menú pueda abrir Suscripción también en plena sesión. El diálogo de
   pago (Radix, portal propio) va aún más arriba, z-[200/201].

   El recorrido lo dicta el store (stores/suscripcion.ts):
     oferta   → la squishy card ($32/Month) con GET IT NOW
     checkout → "Confirm and pay" (diálogo blanco de origin-ui)
     resumen  → Order Summary con Place Order
     ticket   → ticket de pago con confeti y check VERDE
     tarjetas → la Visa/Mastercard conectadas (Ark UI)

   Card conserva la demostración visual. Crypto solo avanza después de que el
   receptor confirma el pago on-chain y entrega el comprobante real. */

// Datos del ticket de la DEMO — los del prompt aprobado, tal cual la captura.
const TICKET_DEMO = {
  ticketId: '0120034399434',
  amount: 305.5,
  date: new Date('2025-06-19T10:15:00'),
  cardHolder: 'Liana80 Tudakova',
  last4Digits: '8237',
};

export function SuscripcionOverlay() {
  const abierto = useSuscripcion((s) => s.abierto);
  const paso = useSuscripcion((s) => s.paso);
  const cerrar = useSuscripcion((s) => s.cerrar);
  const irA = useSuscripcion((s) => s.irA);
  const pagar = useSuscripcion((s) => s.pagar);
  const recibo = useSuscripcion((s) => s.recibo);
  const resetDemo = useSuscripcion((s) => s.resetDemo);
  const hidratarPremium = useSuscripcion((s) => s.hidratarPremium);
  const usuario = useAuth((s) => s.usuario);

  /* El Premium vive en el servidor atado a la cuenta; el localStorage es su
     espejo. Al arrancar con sesión y cada vez que el usuario entra/sale,
     preguntamos qué Premium tiene esta cuenta — así lo comprado en un aparato
     aparece al entrar en otro. (El overlay está montado siempre, así que este
     efecto corre al cargar la app.) */
  useEffect(() => {
    void hidratarPremium();
  }, [usuario, hidratarPremium]);

  const ticket = recibo
    ? {
        ticketId: recibo.txId.length > 16 ? `${recibo.txId.slice(0, 16)}…` : recibo.txId,
        amount: 0,
        amountLabel: `${formatUsdcBaseUnits(recibo.amountBaseUnits)} USDC`,
        date: new Date(recibo.paidAtMs ?? Date.now()),
        cardHolder: '',
        last4Digits: '',
        chain: recibo.chain,
        paymentLabel: `USDC · ${recibo.chain === 'solana' ? 'Solana' : 'Stellar'}`,
        paymentDetail: 'Pago confirmado on-chain',
        confirmationText: 'Tu suscripción quedó activa',
      }
    : TICKET_DEMO;

  const capaRef = useRef<HTMLDivElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);
  /* El click-fuera se ARMA en el pointerdown: un drag que empieza dentro del
     panel (seleccionar texto de un input) y suelta sobre el fondo dispara el
     click en el ancestro común — sin esta marca, cerraría el overlay y se
     perdería el progreso. Mismo criterio que usa Radix para su dismiss. */
  const bajadaFuera = useRef(false);

  /* Teclado y foco — el mismo contrato que la hoja de talk (views/talk/sheet):
     guarda y restaura el foco, Escape cierra, Tab circula dentro de la capa.
     Con el paso 'checkout' NO intervenimos: el diálogo Radix vive en su portal
     con trampa de foco y Escape propios (además marca defaultPrevented al
     descartar — la guarda evita que ese MISMO Escape, con el paso ya devuelto
     a 'oferta' en el mismo dispatch, cierre también el overlay entero). */
  useEffect(() => {
    if (!abierto) return;
    focoPrevio.current = document.activeElement as HTMLElement | null;
    capaRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || useSuscripcion.getState().paso === 'checkout') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        cerrar();
        return;
      }
      if (e.key !== 'Tab') return;
      // Trampa de foco simple: recalculada en cada Tab, los pasos cambian botones.
      const focusables = capaRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (document.activeElement === ultimo || !capaRef.current?.contains(document.activeElement))) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const prev = focoPrevio.current;
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [abierto, cerrar]);

  return (
    <>
      <AnimatePresence>
        {abierto && (
          <>
            {/* EL VELO: la pantalla del usuario sigue debajo, borrosa. */}
            <motion.div
              key="sub-velo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-md"
              aria-hidden="true"
            />
            <motion.div
              key="sub-capa"
              ref={capaRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Suscripción"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="fixed inset-0 z-[170] overflow-y-auto outline-none"
            >
              {/* Cerrar: la X fija y también el click fuera del panel. Fondo
                  NEGRO translúcido: sobre el velo oscuro Y sobre los paneles
                  blancos (al scrollear, el panel del ticket pasa por debajo). */}
              <button
                type="button"
                onClick={cerrar}
                aria-label="Cerrar suscripción"
                className="fixed right-4 top-[max(16px,env(safe-area-inset-top))] z-20 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55"
              >
                <X size={18} strokeWidth={2} />
              </button>

              <div
                className="flex min-h-full flex-col items-center justify-center p-6 pb-[max(24px,env(safe-area-inset-bottom))]"
                onPointerDown={(e) => {
                  bajadaFuera.current = e.target === e.currentTarget;
                }}
                onClick={(e) => {
                  if (bajadaFuera.current && e.target === e.currentTarget) cerrar();
                }}
              >
                {paso === 'oferta' || paso === 'checkout' ? (
                  /* La squishy card queda de fondo mientras el diálogo de pago
                     está abierto — igual que un checkout real sobre su landing. */
                  <div onClick={(e) => e.stopPropagation()}>
                    <SquishyPricingCard onGetIt={() => irA('checkout')} />
                  </div>
                ) : paso === 'resumen' ? (
                  /* bg-muted (gris) y no blanco: en la captura la card y la
                     barra del total son bloques blancos sobre página gris. */
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="sub-claro w-full max-w-md rounded-3xl bg-muted py-2 shadow-2xl"
                  >
                    <CheckoutForm onPlaceOrder={() => pagar()} />
                  </div>
                ) : paso === 'ticket' ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="sub-claro flex w-full max-w-md flex-col items-center rounded-3xl bg-background p-8 shadow-2xl"
                  >
                    <AnimatedTicket {...ticket} />
                    {recibo ? (
                      <Button className="z-10 mt-6 w-full max-w-sm" onClick={cerrar}>
                        Cerrar
                      </Button>
                    ) : (
                      <Button className="z-10 mt-6 w-full max-w-sm" onClick={() => irA('tarjetas')}>
                        Ver mi tarjeta conectada
                      </Button>
                    )}
                  </div>
                ) : (
                  /* tarjetas — lo que ve un suscriptor al volver a entrar */
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="sub-claro w-full max-w-md rounded-3xl bg-background p-6 shadow-2xl"
                  >
                    {recibo ? (
                      <SuscripcionInfo recibo={recibo} />
                    ) : (
                      <>
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <h2 className="text-lg font-semibold tracking-tight text-foreground">
                            Tu tarjeta conectada
                          </h2>
                          <Badge>Premium activo</Badge>
                        </div>
                        <p className="mb-4 text-sm text-muted-foreground">
                          Con esta tarjeta pagaste tu suscripción — es la que está conectada a Hablarte.
                        </p>
                        <ConnectedCards />
                      </>
                    )}
                    <div className="mt-5 flex items-center justify-between gap-3">
                      {/* Volver a recorrer el flujo sin tocar localStorage a
                          mano: la demo se "des-paga" y la oferta vuelve. */}
                      <button
                        type="button"
                        onClick={resetDemo}
                        className="cursor-pointer text-xs text-muted-foreground underline underline-offset-4 hover:no-underline"
                      >
                        {recibo ? 'Reiniciar prueba' : 'Reiniciar demo'}
                      </button>
                      <Button variant="secondary" onClick={cerrar}>
                        Cerrar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* El diálogo Radix vive en su portal (encima de todo). Cerrarlo con la
          X o Escape devuelve a la oferta; Subscribe avanza al Order Summary. */}
      <PaymentDialog
        open={abierto && paso === 'checkout'}
        onOpenChange={(open) => {
          if (!open) irA('oferta');
        }}
        onSubscribe={() => irA('resumen')}
        // Cripto no pasa por el resumen de tarjeta: solo avanza con el recibo
        // que Pangea devuelve después de confirmar la transacción on-chain.
        onPagarCripto={(receipt) => pagar(receipt)}
      />
    </>
  );
}
