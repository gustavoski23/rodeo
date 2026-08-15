/* suscripcion-info — la pantalla "Tu suscripción" cuando el pago fue en cripto.
   Reemplaza la tarjetita de una línea por un panel de facturación: plan +
   estado arriba, método de pago con el logo de la red, y un "recibo" con el
   monto, la fecha y un enlace para VERLO en el explorador de la cadena.

   Ojo con el vocabulario: el cobro en cripto es un pago ÚNICO on-chain, no una
   tarjeta que se renueva sola. Por eso se habla de "vence el…", nunca de "se
   renueva". */

import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { ChainBadge } from '@/components/ui/chain-logo';
import {
  explorerTxUrl,
  formatUsdcBaseUnits,
  planLabel,
  planPeriodDays,
} from '@/lib/crypto-payment';
import type { CryptoReceipt } from '@/lib/crypto-payment.types';

const fmtFecha = (d: Date) =>
  new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);

export function SuscripcionInfo({ recibo }: { recibo: CryptoReceipt }) {
  const pagado = new Date(recibo.paidAtMs ?? Date.now());
  const dias = planPeriodDays(recibo.plan);
  // paidAtMs viene en ms; un plan con período fija su vencimiento sumando días.
  const vence = dias === null ? null : new Date(pagado.getTime() + dias * 86_400_000);
  const redNombre = recibo.chain === 'solana' ? 'Solana' : 'Stellar';
  const explorador = explorerTxUrl(recibo.chain, recibo.txId);
  const monto = `${formatUsdcBaseUnits(recibo.amountBaseUnits)} USDC`;

  return (
    <div>
      {/* Plan + estado, como el bloque "Max plan / auto renew" de la captura. */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {planLabel(recibo.plan)}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {vence ? `Activa · vence el ${fmtFecha(vence)}` : 'Activa · pago único de prueba'}
          </p>
        </div>
        <Badge className="shrink-0">Premium activo</Badge>
      </div>

      {/* Método de pago. */}
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Método de pago
      </p>
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
        <ChainBadge chain={recibo.chain} className="size-9" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">USDC · {redNombre}</p>
          <p className="text-xs text-muted-foreground">Pago confirmado on-chain</p>
        </div>
      </div>

      {/* Recibo, como la tabla "Invoices": fecha, monto, estado y "Ver". */}
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recibo</p>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{monto}</p>
          <p className="text-xs text-muted-foreground">{fmtFecha(pagado)} · Pagado</p>
        </div>
        {explorador !== null && (
          <a
            href={explorador}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground underline underline-offset-4 hover:no-underline"
          >
            Ver <ExternalLink size={13} strokeWidth={2} />
          </a>
        )}
      </div>
      {/* El hash completo queda a la vista: es el comprobante verificable. */}
      <code className="mt-2 block break-all text-[11px] text-muted-foreground">{recibo.txId}</code>
    </div>
  );
}
