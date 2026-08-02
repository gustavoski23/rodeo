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
     build ES de /images: se entra por namespace y se castea UNA vez aquí. */

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
import { CreditCard, Store } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { usePaymentInputs } from "react-payment-inputs";
import * as cardImagesModule from "react-payment-inputs/images";
import type { CardImages } from "react-payment-inputs/images";

const images = (cardImagesModule as unknown as { default: CardImages }).default;

function PaymentDialog({
  open,
  onOpenChange,
  onSubscribe,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: () => void;
}) {
  const id = useId();
  const { meta, getCardNumberProps, getExpiryDateProps, getCVCProps, getCardImageProps } =
    usePaymentInputs();
  const couponInputRef = useRef<HTMLInputElement>(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  useEffect(() => {
    if (showCouponInput && couponInputRef.current) {
      couponInputRef.current.focus();
    }
  }, [showCouponInput]);

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

        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-4">
            <RadioGroup className="grid-cols-2" defaultValue="yearly">
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
            <div className="space-y-2">
              <Label htmlFor={`name-${id}`}>Name on card</Label>
              <Input id={`name-${id}`} type="text" required />
            </div>
            <div className="space-y-2">
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
            </div>
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
          </div>
          <Button type="button" className="w-full" onClick={onSubscribe}>
            Subscribe
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
