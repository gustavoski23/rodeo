/* crypto-pane — el pago en USDC del diálogo "Confirm and pay", conectado al
   receptor de cobros de Pangea Wallet (api/cripto.js → pangea /api/payments).

   Cómo funciona de verdad:
     1. Al elegir red se pide una INTENCIÓN al receptor: devuelve la dirección
        de cobro, una referencia/memo única y un enlace que la wallet entiende.
     2. El usuario paga (tocando el enlace, escaneando el QR, o a mano).
     3. Esto pregunta el estado cada pocos segundos. Cuando la CADENA confirma
        el pago, avanza solo — nadie tiene que apretar "ya pagué".

   La atribución usa la referencia/memo cuando la wallet la soporta. Para las
   wallets que solo aceptan una dirección, Pangea busca el monto exacto marcado
   y posterior a la intención.

   Si el receptor no está disponible, el cobro queda bloqueado con un error
   humano: nunca se concede Premium por una caída del servidor de pagos. */

import { AlertTriangle, Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

import { Button } from '@/components/ui/button';
import {
  formatUsdcBaseUnits,
  isPaymentAddressForChain,
  isPaymentUriForChain,
  paymentQrPayload,
} from '@/lib/crypto-payment';
import type { CryptoReceipt } from '@/lib/crypto-payment.types';

export type PlanId = 'rodeo-monthly' | 'rodeo-yearly' | 'rodeo-test';
type Red = 'solana' | 'stellar';

/**
 * MODO PRUEBA DE COBRO: con `?pagoprueba=1` en la URL, el cobro en cripto usa
 * el plan de 0,10 USDC en vez del precio real. Sirve para validar el camino
 * completo —escanear el QR con el teléfono y ver que la cadena lo confirma—
 * sin mover 32 dólares. El monto lo sigue fijando el servidor: esto solo
 * elige OTRO plan de su catálogo, no un monto arbitrario.
 */
function esModoPrueba(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('pagoprueba') === '1';
}

const REDES: { id: Red; nombre: string; ticker: string; claseIcono: string }[] = [
  {
    id: 'solana',
    nombre: 'Solana',
    ticker: 'SOL',
    claseIcono: 'bg-gradient-to-br from-[#9945FF] to-[#14F195]',
  },
  { id: 'stellar', nombre: 'Stellar', ticker: 'XLM', claseIcono: 'bg-black' },
];

/** Cada cuánto se le pregunta a la cadena. */
const POLL_MS = 4_000;

interface Intencion {
  intent: string;
  chain: Red;
  payTo: string;
  reference: string;
  payUri: string;
  amountBaseUnits: string;
  expiresAtMs: number;
}

function CajaCopiable({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{etiqueta}</p>
      <div className="flex items-stretch gap-2">
        <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs text-foreground">
          {valor}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Copiar ${etiqueta}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(valor);
            } catch {
              /* clipboard bloqueado: el valor sigue visible para copiar a mano */
            }
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          }}
        >
          {copiado ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
        </Button>
      </div>
    </div>
  );
}

export function CryptoPane({ plan, onPaid }: { plan: PlanId; onPaid: (receipt: CryptoReceipt) => void }) {
  // El modo prueba se decide UNA vez al montar: la URL no cambia sola.
  const [prueba] = useState(esModoPrueba);
  const planEfectivo: PlanId = prueba ? 'rodeo-test' : plan;
  const [red, setRed] = useState<Red>('solana');
  const [intencion, setIntencion] = useState<Intencion | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  // Evita que una respuesta lenta de una red pise a la de otra.
  const peticionRef = useRef(0);

  const pedirIntencion = useCallback(async (chain: Red) => {
    const miPeticion = peticionRef.current + 1;
    peticionRef.current = miPeticion;
    setCargando(true);
    setError(null);
    setIntencion(null);
    setQr(null);

    try {
      const res = await fetch('/api/cripto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'intent', chain, plan: planEfectivo }),
      });

      /* Sin endpoint (404) o con respuesta que no es JSON: el cobro no está
         disponible en este entorno. Se bloquea; nunca se simula como pagado. */
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        if (peticionRef.current === miPeticion) {
          setError('El servidor de pagos no respondió correctamente. Intenta de nuevo.');
        }
        return;
      }
      if (peticionRef.current !== miPeticion) return; // llegó tarde: se ignora

      const d = data as { ok?: boolean; motivo?: string; error?: string } & Partial<Intencion>;
      if (res.status === 404 || res.status === 503 || d.motivo === 'sin_configurar') {
        setError(d.error ?? 'El pago en cripto no está disponible en este momento.');
        return;
      }
      if (
        !res.ok ||
        d.ok !== true ||
        typeof d.intent !== 'string' ||
        typeof d.payTo !== 'string' ||
        !isPaymentAddressForChain(chain, d.payTo) ||
        typeof d.payUri !== 'string' ||
        !isPaymentUriForChain(chain, d.payUri) ||
        typeof d.amountBaseUnits !== 'string' ||
        !/^\d+$/.test(d.amountBaseUnits) ||
        typeof d.expiresAtMs !== 'number'
      ) {
        setError(d.error ?? 'No pude preparar el pago. Intenta de nuevo.');
        return;
      }
      setIntencion({
        intent: d.intent,
        chain,
        payTo: d.payTo,
        reference: d.reference ?? '',
        payUri: d.payUri,
        amountBaseUnits: d.amountBaseUnits,
        expiresAtMs: d.expiresAtMs,
      });
    } catch {
      if (peticionRef.current !== miPeticion) return;
      setError('No pude conectar con el servidor de pagos. Revisa tu internet.');
    } finally {
      if (peticionRef.current === miPeticion) setCargando(false);
    }
  }, [planEfectivo]);

  // Una intención nueva por red elegida (y por plan).
  useEffect(() => {
    void pedirIntencion(red);
  }, [red, pedirIntencion]);

  // Solana usa la dirección base58 pelada en el QR: los lectores estrictos
  // (incluido Decaf en la prueba real) reconocen ese formato incluso cuando
  // rechazan la URI densa de Solana Pay. La atribución automática se conserva
  // por el monto exacto marcado. Stellar mantiene su URI con memo.
  useEffect(() => {
    if (intencion === null) {
      setQr(null);
      return;
    }
    const payload = paymentQrPayload(intencion);
    if (payload === '') {
      setQr(null);
      return;
    }
    let vivo = true;
    void QRCode.toDataURL(payload, {
      margin: 4,
      width: 640,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (vivo) setQr(url);
      })
      .catch(() => {
        if (vivo) setQr(null); // sin QR se sigue pudiendo pagar a mano
      });
    return () => {
      vivo = false;
    };
  }, [intencion]);

  /** Pregunta a la cadena y conserva el comprobante real si ya está pagado. */
  const consultar = useCallback(async (token: string): Promise<CryptoReceipt | null> => {
    try {
      const res = await fetch('/api/cripto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'status', intent: token }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        paid?: boolean;
        chain?: unknown;
        plan?: unknown;
        payment?: {
          txId?: unknown;
          amountBaseUnits?: unknown;
          paidAtMs?: unknown;
        };
        error?: string;
        transitorio?: boolean;
      };
      if (res.ok && data.ok === true && data.paid === true) {
        const payment = data.payment;
        if (
          (data.chain === 'solana' || data.chain === 'stellar') &&
          typeof data.plan === 'string' &&
          payment !== undefined &&
          typeof payment.txId === 'string' &&
          payment.txId !== '' &&
          typeof payment.amountBaseUnits === 'string' &&
          /^\d+$/.test(payment.amountBaseUnits) &&
          (payment.paidAtMs === null || typeof payment.paidAtMs === 'number')
        ) {
          return {
            chain: data.chain,
            plan: data.plan,
            txId: payment.txId,
            amountBaseUnits: payment.amountBaseUnits,
            paidAtMs: payment.paidAtMs,
          };
        }
        setError('La red confirmó el pago, pero el comprobante llegó incompleto. Intenta revisar de nuevo.');
        return null;
      }
      // Un error transitorio (red caída) NO significa "no pagó": se calla y
      // se reintenta en el siguiente ciclo.
      if (!res.ok && data.transitorio !== true) {
        setError(data.error ?? null);
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Sondeo mientras la intención esté viva.
  useEffect(() => {
    if (intencion === null) return;
    let vivo = true;

    const tick = async () => {
      if (!vivo) return;
      const receipt = await consultar(intencion.intent);
      if (vivo && receipt !== null) onPaid(receipt);
    };

    const id = setInterval(() => void tick(), POLL_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [intencion, consultar, onPaid]);

  return (
    <div className="space-y-3">
      <RedesSelector red={red} onRed={setRed} />

      {cargando && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-input p-6 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" size={16} />
          Preparando el cobro…
        </div>
      )}

      {!cargando && error !== null && intencion === null && (
        <div className="space-y-2 rounded-lg border border-input bg-muted/40 p-3">
          <p className="text-sm text-foreground">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void pedirIntencion(red)}>
            Reintentar
          </Button>
        </div>
      )}

      {!cargando && intencion !== null && (
        <div className="space-y-3">
          <div className="rounded-lg border border-input bg-muted/40 p-3">
            <p className="text-sm text-foreground">
              Envía exactamente{' '}
              <span className="font-semibold">{formatUsdcBaseUnits(intencion.amountBaseUnits)} USDC</span> por{' '}
              <span className="font-medium">
                {REDES.find((r) => r.id === intencion.chain)?.nombre}
              </span>
            </p>
            {prueba && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Modo prueba de cobro — monto reducido a propósito.
              </p>
            )}
            {intencion.chain === 'solana' && (
              <div className="mt-2 flex gap-2 rounded-lg bg-amber-50 p-2.5 text-amber-900">
                <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed">
                  Paga desde una cuenta distinta de la dirección receptora. Un envío de esta
                  wallet hacia sí misma no aumenta el saldo y no puede confirmarse como cobro.
                </p>
              </div>
            )}

            {qr !== null && (
              <div className="mt-3 flex flex-col items-center gap-1.5">
                {/* Solana: dirección pelada compatible con Decaf. Stellar:
                    URI completa para conservar el memo. */}
                <img
                  src={qr}
                  alt="Código QR para pagar"
                  className="w-60 max-w-full rounded-lg bg-white p-2"
                />
                {intencion.chain === 'solana' ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Escanéalo desde otra cuenta en Decaf, elige USDC y escribe el monto exacto.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Escanéalo con la wallet de tu celular</p>
                )}
              </div>
            )}

            {intencion.payUri !== '' && (
              <Button type="button" variant="outline" className="mt-3 w-full" asChild>
                <a href={intencion.payUri}>
                  <ExternalLink size={16} strokeWidth={2} />
                  Abrir en una wallet compatible
                </a>
              </Button>
            )}
          </div>

          {/* Segundo camino, A LA VISTA (no escondido): copiar los datos para
              pagar desde una wallet, un exchange o donde sea. Se detecta solo
              igual que el QR, porque el monto pedido es único de este cobro. */}
          <div className="space-y-3 rounded-lg border border-input p-3">
            <div>
              <p className="text-sm font-medium text-foreground">O copia los datos</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Para pagar desde tu wallet, un exchange o cualquier app. Se activa solo
                igual.
              </p>
            </div>

            <CajaCopiable valor={intencion.payTo} etiqueta="Dirección" />
            <CajaCopiable
              valor={formatUsdcBaseUnits(intencion.amountBaseUnits)}
              etiqueta="Monto exacto (USDC)"
            />
            {intencion.chain === 'stellar' && (
              <CajaCopiable valor={intencion.reference} etiqueta="Memo (recomendado)" />
            )}

            <div className="flex gap-2 rounded-lg bg-amber-50 p-2.5 text-amber-900">
              <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                Envía el <span className="font-semibold">monto exacto</span>, hasta el último
                decimal: esos centésimos de centavo son lo que nos permite reconocer que el
                pago es tuyo. Si lo mandas desde un exchange, revisa que la comisión no se
                descuente del monto — lo que tiene que llegar exacto es lo que recibimos.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="animate-spin" size={13} />
            Esperando el pago… se activa solo cuando la red lo confirme.
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={verificando}
            onClick={async () => {
              setVerificando(true);
              const receipt = await consultar(intencion.intent);
              setVerificando(false);
              if (receipt !== null) onPaid(receipt);
              else setError('Todavía no veo el pago en la red. Si acabas de enviarlo, dale unos segundos.');
            }}
          >
            {verificando ? 'Revisando…' : 'Ya lo envié — revisar ahora'}
          </Button>

          {error !== null && <p className="text-center text-xs text-muted-foreground">{error}</p>}
        </div>
      )}
    </div>
  );
}

function RedesSelector({ red, onRed }: { red: Red; onRed: (r: Red) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {REDES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onRed(r.id)}
          aria-pressed={red === r.id}
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left shadow-sm transition-colors ${
            red === r.id ? 'border-ring bg-accent' : 'border-input hover:bg-accent/50'
          }`}
        >
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${r.claseIcono}`}
            aria-hidden="true"
          >
            {r.ticker}
          </span>
          <span className="text-sm font-medium text-foreground">{r.nombre}</span>
        </button>
      ))}
    </div>
  );
}
