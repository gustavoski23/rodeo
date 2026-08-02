/* payment-dialog — el "Confirm and pay" de origin-ui pegado del prompt de Gus
   (flujo Suscripción), verbatim salvo adaptaciones declaradas:
   · sin "use client" (no es Next).
   · CONTROLADO: el original traía su propio <DialogTrigger> ("Checkout");
     aquí lo abre el "Get it now" de la squishy card, así que recibe
     open/onOpenChange y el botón Subscribe dispara onSubscribe. DEMO VISUAL:
     Subscribe avanza con lo que sea que haya escrito (o nada) — no valida ni
     cobra; el backend real llega después.
   · `sub-claro` en el DialogContent: el diálogo se pinta BLANCO como la
     captura aunque la app esté en tema oscuro (scope de tokens en
     components/rodeo/suscripcion.css). Va en el content porque Radix lo
     monta en un portal fuera del árbol del overlay.
   · Los @types de react-payment-inputs no declaran el default export del
     build ES de /images: se entra por namespace y se castea UNA vez aquí.
   · PESTAÑA "Crypto" (pedido de Gus, 2026-08-02): junto a Card, un método de
     pago en Solana o Stellar — selector de red + dirección de recibo con
     copiar. Las direcciones de abajo son PLACEHOLDER de demo (ver el
     comentario de RECEPTOR_*): cuando haya backend real, se reemplazan por
     las direcciones de cobro reales y "I've sent it" pasa a verificar el
     pago on-chain en vez de marcar suscrito al toque. */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, Copy, CreditCard, Store } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { usePaymentInputs } from "react-payment-inputs";
import * as cardImagesModule from "react-payment-inputs/images";
import type { CardImages } from "react-payment-inputs/images";

const images = (cardImagesModule as unknown as { default: CardImages }).default;

/* Direcciones de RECEPTOR — placeholders de demo, NO son direcciones reales.
   pangea-wallet (gustavoski23/pangea-wallet) es hoy una wallet no-custodial
   de SOLANA DEVNET sin API de cobros para terceros y SIN soporte de Stellar
   — no hay todavía de dónde sacar una dirección real de cualquiera de las
   dos redes. Pégalas aquí cuando exista un receptor real. */
const RECEPTOR_SOLANA = 'DEM0SoLPLACEHoLDERxxxxxxxxxxxxxxxxxxxxxxxx';
const RECEPTOR_STELLAR = 'GDEM0STELLARPLACEH0LDERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

type Red = 'solana' | 'stellar';
const REDES: { id: Red; nombre: string; ticker: string; addr: string; claseIcono: string }[] = [
  { id: 'solana', nombre: 'Solana', ticker: 'SOL', addr: RECEPTOR_SOLANA, claseIcono: 'bg-gradient-to-br from-[#9945FF] to-[#14F195]' },
  { id: 'stellar', nombre: 'Stellar', ticker: 'XLM', addr: RECEPTOR_STELLAR, claseIcono: 'bg-[#000000]' },
];

// Caja de dirección con botón de copiar — una por red, en la pestaña Crypto.
function CajaDireccion({ addr }: { addr: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs text-foreground shadow-sm shadow-black/5">
        {addr}
      </code>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Copy address"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(addr);
          } catch {
            /* clipboard bloqueado (permiso/HTTP): no rompe el flujo demo */
          }
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        }}
      >
        {copiado ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
      </Button>
    </div>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  onSubscribe,
  onPagarCripto,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: () => void;
  /** Confirmación de pago cripto ("I've sent it") — DEMO: avanza directo,
      sin verificar nada on-chain todavía. */
  onPagarCripto: () => void;
}) {
  const id = useId();
  const { meta, getCardNumberProps, getExpiryDateProps, getCVCProps, getCardImageProps } =
    usePaymentInputs();
  const couponInputRef = useRef<HTMLInputElement>(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [metodo, setMetodo] = useState<'card' | 'crypto'>('card');
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [red, setRed] = useState<Red>('solana');

  useEffect(() => {
    if (showCouponInput && couponInputRef.current) {
      couponInputRef.current.focus();
    }
  }, [showCouponInput]);

  // Cada apertura arranca en Card — mismo default que el diseño original.
  useEffect(() => {
    if (open) setMetodo('card');
  }, [open]);

  const monto = plan === 'monthly' ? '32.00' : '320.00';
  const redActiva = REDES.find((r) => r.id === red) ?? REDES[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sub-claro">
        <div className="mb-2 flex flex-col gap-2">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border"
            aria-hidden="true"
          >
            <Store className="opacity-80" size={16} strokeWidth={2} />
          </div>
          <DialogHeader>
            <DialogTitle className="text-left">Confirm and pay</DialogTitle>
            <DialogDescription className="text-left">
              Pay securely and cancel any time.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* min-w-0: DialogContent es `grid` sin grid-template-columns —  su
            única columna se auto-dimensiona al max-content de este hijo. Sin
            este freno, la dirección cripto (whitespace-nowrap) "empuja" la
            columna más allá del ancho fijo del diálogo aunque el <code> la
            trunque bien por dentro (mismo bug que un flex-item sin min-w-0). */}
        <form className="min-w-0 space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-4">
            <RadioGroup
              className="grid-cols-2"
              value={plan}
              onValueChange={(v) => setPlan(v as 'monthly' | 'yearly')}
            >
              <label className="relative flex cursor-pointer flex-col gap-1 rounded-lg border border-input px-4 py-3 shadow-sm shadow-black/5 outline-offset-2 transition-colors has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring/70">
                <RadioGroupItem
                  id="radio-monthly"
                  value="monthly"
                  className="sr-only after:absolute after:inset-0"
                />
                <p className="text-sm font-medium text-foreground">Monthly</p>
                <p className="text-sm text-muted-foreground">$32/month</p>
              </label>
              <label className="relative flex cursor-pointer flex-col gap-1 rounded-lg border border-input px-4 py-3 shadow-sm shadow-black/5 outline-offset-2 transition-colors has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring/70">
                <RadioGroupItem
                  id="radio-yearly"
                  value="yearly"
                  className="sr-only after:absolute after:inset-0"
                />
                <div className="inline-flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">Yearly</p>
                  <Badge>Popular</Badge>
                </div>
                <p className="text-sm text-muted-foreground">$320/month</p>
              </label>
            </RadioGroup>

            {/* Método de pago: Card / Crypto — un segmented control simple. */}
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMetodo('card')}
                aria-pressed={metodo === 'card'}
                className={`cursor-pointer rounded-md py-1.5 text-sm font-medium transition-colors ${
                  metodo === 'card' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Card
              </button>
              <button
                type="button"
                onClick={() => setMetodo('crypto')}
                aria-pressed={metodo === 'crypto'}
                className={`cursor-pointer rounded-md py-1.5 text-sm font-medium transition-colors ${
                  metodo === 'crypto' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Crypto
              </button>
            </div>

            {metodo === 'card' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`name-${id}`}>Name on card</Label>
                  <Input id={`name-${id}`} type="text" required />
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-foreground">Card Details</legend>
                  <div className="rounded-lg shadow-sm shadow-black/5">
                    <div className="relative focus-within:z-10">
                      <Input
                        className="peer rounded-b-none pe-9 shadow-none [direction:inherit]"
                        {...getCardNumberProps()}
                      />
                      <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-muted-foreground/80 peer-disabled:opacity-50">
                        {meta.cardType ? (
                          <svg
                            className="overflow-hidden rounded-sm"
                            {...getCardImageProps({ images: images as unknown as CardImages })}
                            width={20}
                          />
                        ) : (
                          <CreditCard size={16} strokeWidth={2} aria-hidden="true" />
                        )}
                      </div>
                    </div>
                    <div className="-mt-px flex">
                      <div className="min-w-0 flex-1 focus-within:z-10">
                        <Input
                          className="rounded-e-none rounded-t-none shadow-none [direction:inherit]"
                          {...getExpiryDateProps()}
                        />
                      </div>
                      <div className="-ms-px min-w-0 flex-1 focus-within:z-10">
                        <Input
                          className="rounded-s-none rounded-t-none shadow-none [direction:inherit]"
                          {...getCVCProps()}
                        />
                      </div>
                    </div>
                  </div>
                </fieldset>
                {!showCouponInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCouponInput(true)}
                    className="text-sm underline hover:no-underline"
                  >
                    + Add coupon
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor={`coupon-${id}`}>Coupon code</Label>
                    <Input
                      id={`coupon-${id}`}
                      ref={couponInputRef}
                      placeholder="Enter your code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <RadioGroup
                  className="grid-cols-2"
                  value={red}
                  onValueChange={(v) => setRed(v as Red)}
                >
                  {REDES.map((r) => (
                    <label
                      key={r.id}
                      className="relative flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2.5 shadow-sm shadow-black/5 outline-offset-2 transition-colors has-[[data-state=checked]]:border-ring has-[[data-state=checked]]:bg-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring/70"
                    >
                      <RadioGroupItem
                        id={`radio-red-${r.id}`}
                        value={r.id}
                        className="sr-only after:absolute after:inset-0"
                      />
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${r.claseIcono}`}
                        aria-hidden="true"
                      >
                        {r.ticker}
                      </span>
                      <span className="text-sm font-medium text-foreground">{r.nombre}</span>
                    </label>
                  ))}
                </RadioGroup>

                <div className="space-y-2 rounded-lg border border-input bg-muted/40 p-3">
                  <p className="text-sm text-foreground">
                    Send <span className="font-semibold">{monto} USDC</span> on{' '}
                    <span className="font-medium">{redActiva.nombre}</span> to:
                  </p>
                  <CajaDireccion addr={redActiva.addr} />
                  <p className="text-xs text-muted-foreground">
                    Demo address — no real funds are sent here yet.
                  </p>
                </div>
              </div>
            )}
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={metodo === 'card' ? onSubscribe : onPagarCripto}
          >
            {metodo === 'card' ? 'Subscribe' : "I've sent it"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Payments are non-refundable. Cancel anytime.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export { PaymentDialog };
