/* ticket-confirmation-card — pegado del prompt de Gus (flujo Suscripción),
   VERBATIM con EL ÚNICO CAMBIO que pidió: el check de "pagó" va en VERDE de
   aceptado (text-green-600 + halo bg-green-500/10) en vez del text-primary
   del original. Nada más se tocó. */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChainBadge } from "@/components/ui/chain-logo";
import type { PaymentChain } from "@/lib/crypto-payment.types";

// --- SVG Icons ---

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const MastercardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="36"
        height="24"
    >
        <circle cx="8" cy="12" r="7" fill="#EA001B"></circle>
        <circle cx="16" cy="12" r="7" fill="#F79E1B" fillOpacity="0.8"></circle>
    </svg>
);


// --- Helper Components ---

const DashedLine = () => (
  <div
    className="w-full border-t-2 border-dashed border-border"
    aria-hidden="true"
  />
);

const ConfettiExplosion = () => {
  const confettiCount = 100;
  const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#f97316"];

  return (
    <>
      <style>
        {`
          @keyframes fall {
            0% {
                transform: translateY(-10vh) rotate(0deg);
                opacity: 1;
            }
            100% {
              transform: translateY(110vh) rotate(720deg);
              opacity: 0;
            }
          }
        `}
      </style>
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        {Array.from({ length: confettiCount }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-4"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${-20 + Math.random() * 10}%`,
              backgroundColor: colors[i % colors.length],
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `fall ${2.5 + Math.random() * 2.5}s ${Math.random() * 2}s linear forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
};


// --- Main Ticket Component ---

export interface TicketProps extends React.HTMLAttributes<HTMLDivElement> {
  ticketId: string;
  amount: number;
  date: Date;
  cardHolder: string;
  last4Digits: string;
  amountLabel?: string;
  paymentLabel?: string;
  paymentDetail?: string;
  confirmationText?: string;
  /** Si el pago fue en cripto, la red — para mostrar su logo en el chip. */
  chain?: PaymentChain;
  icon?: React.ReactNode;
}

const AnimatedTicket = React.forwardRef<HTMLDivElement, TicketProps>(
  (
    {
      className,
      ticketId,
      amount,
      date,
      cardHolder,
      last4Digits,
      amountLabel,
      paymentLabel,
      paymentDetail,
      confirmationText,
      chain,
      ...props
    },
    ref
  ) => {
    const [showConfetti, setShowConfetti] = React.useState(false);

    React.useEffect(() => {
      const mountTimer = setTimeout(() => setShowConfetti(true), 100);
      const unmountTimer = setTimeout(() => setShowConfetti(false), 6000);
      return () => {
        clearTimeout(mountTimer);
        clearTimeout(unmountTimer);
      };
    }, []);

    const formattedAmount = amountLabel ?? new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date).replace(',', ' •');

    return (
      <>
        {showConfetti && <ConfettiExplosion />}
        <div
          ref={ref}
          className={cn(
            "relative w-full max-w-sm bg-card text-card-foreground rounded-2xl shadow-lg font-sans z-10",
            "animate-in fade-in-0 zoom-in-95 duration-500",
            className
          )}
          {...props}
        >
          {/* Ticket cut-out effect */}
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background" />
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background" />

          <div className="p-8 flex flex-col items-center text-center">
              <div className="p-3 bg-green-500/10 rounded-full animate-in zoom-in-50 delay-300 duration-500">
                  <CheckCircleIcon className="w-10 h-10 text-green-600 animate-in zoom-in-75 delay-500 duration-500" />
              </div>
              <h1 className="text-2xl font-semibold mt-4">Thank you!</h1>
              <p className="text-muted-foreground mt-1">
                {confirmationText ?? 'Your ticket has been issued successfully'}
              </p>
          </div>

          <div className="px-8 pb-8 space-y-6">
              <DashedLine />

              <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                      <p className="text-xs text-muted-foreground uppercase">Ticket ID</p>
                      <p className="font-mono font-medium">{ticketId}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase">Amount</p>
                      <p className="font-semibold text-lg">{formattedAmount}</p>
                  </div>
              </div>

              <div>
                  <p className="text-xs text-muted-foreground uppercase">Date & Time</p>
                  <p className="font-medium">{formattedDate}</p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg flex items-center space-x-4">
                  {chain ? (
                    <ChainBadge chain={chain} className="size-10" />
                  ) : paymentLabel ? (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      USDC
                    </div>
                  ) : (
                    <MastercardIcon />
                  )}
                  <div className="min-w-0">
                      <p className="font-semibold">{paymentLabel ?? cardHolder}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {paymentDetail ?? `•••• ${last4Digits}`}
                      </p>
                  </div>
              </div>
          </div>
        </div>
      </>
    );
  }
);

AnimatedTicket.displayName = "AnimatedTicket";

export { AnimatedTicket };
