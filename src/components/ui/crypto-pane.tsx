/* crypto-pane — el pago en USDC del diálogo "Confirm and pay", conectado al
   receptor de cobros de Pangea Wallet (api/cripto.js → pangea /api/payments).

   Cómo funciona de verdad:
     1. Al elegir red se pide una INTENCIÓN al receptor: devuelve la dirección
        de cobro, una referencia/memo única y un enlace que la wallet entiende.
     2. El usuario paga (tocando el enlace, escaneando el QR, o a mano).
     3. Esto pregunta el estado cada pocos segundos. Cuando la CADENA confirma
        el pago, avanza solo — nadie tiene que apretar "ya pagué".

   La referencia/memo es lo que hace el cobro atribuible: sin ella el dinero
   llega pero nadie sabe de quién es. Por eso el enlace la lleva dentro y el
   modo manual la muestra con su advertencia.

   Si el receptor todavía no está configurado (falta la URL o las direcciones
   de cobro), esto NO se rompe: cae a la vista de DEMO de siempre, con su
   botón para recorrer el flujo visual. */

import { AlertTriangle, Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

import { Button } from '@/components/ui/button';

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

/** Unidades base de USDC (6 decimales) → decimal legible, sin floats. */
function formatUsdc(baseUnits: string): string {
  const s = baseUnits.padStart(7, '0');
  const entero = s.slice(0, -6);
  const frac = s.slice(-6).replace(/0+$/, '');
  return frac === '' ? entero : `${entero}.${frac}`;
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

export function CryptoPane({ plan, onPaid }: { plan: PlanId; onPaid: () => void }) {
  // El modo prueba se decide UNA vez al montar: la URL no cambia sola.
  const [prueba] = useState(esModoPrueba);
  const planEfectivo: PlanId = prueba ? 'rodeo-test' : plan;
  const [red, setRed] = useState<Red>('solana');
  const [intencion, setIntencion] = useState<Intencion | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* El receptor respondió "sin configurar": se cae a la demo visual de
     siempre en vez de dejar la pestaña muerta. */
  const [demo, setDemo] = useState(false);
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

      /* Sin endpoint (404) o con respuesta que no es JSON: en `vite dev` las
         funciones de /api no existen y el SPA devuelve index.html. Eso NO es
         un fallo del usuario — es que el cobro no está montado aquí. */
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        if (peticionRef.current === miPeticion) setDemo(true);
        return;
      }
      if (peticionRef.current !== miPeticion) return; // llegó tarde: se ignora

      const d = data as { ok?: boolean; motivo?: string; error?: string } & Partial<Intencion>;
      if (res.status === 404 || res.status === 503 || d.motivo === 'sin_configurar') {
        setDemo(true);
        return;
      }
      if (!res.ok || d.ok !== true || typeof d.intent !== 'string') {
        setError(d.error ?? 'No pude preparar el pago. Intenta de nuevo.');
        return;
      }
      setIntencion({
        intent: d.intent,
        chain,
        payTo: d.payTo ?? '',
        reference: d.reference ?? '',
        payUri: d.payUri ?? '',
        amountBaseUnits: d.amountBaseUnits ?? '0',
        expiresAtMs: d.expiresAtMs ?? 0,
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
    if (demo) return;
    void pedirIntencion(red);
  }, [red, demo, pedirIntencion]);

  // QR del enlace de pago: es el camino real cuando el usuario está en el
  // computador y paga con el celular.
  useEffect(() => {
    if (intencion === null || intencion.payUri === '') {
      setQr(null);
      return;
    }
    let vivo = true;
    // margin: 4 = la ZONA DE SILENCIO que exige la norma del QR. Estaba en 1,
    // y un enlace de pago ronda los 190 caracteres → código de 57x57 módulos:
    // denso y sin borde suficiente, los lectores de celular fallaban al
    // escanearlo desde la pantalla del computador ("QR no reconocido").
    // width: 640 para que al mostrarlo a ~240 px cada módulo tenga píxeles de
    // sobra incluso con brillo y ángulo.
    void QRCode.toDataURL(intencion.payUri, {
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

  /** Pregunta a la cadena. Devuelve true si ya está pagado. */
  const consultar = useCallback(async (token: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/cripto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'status', intent: token }),
      });
      const data = (await res.json()) as { ok?: boolean; paid?: boolean; error?: string; transitorio?: boolean };
      if (res.ok && data.ok === true && data.paid === true) return true;
      // Un error transitorio (red caída) NO significa "no pagó": se calla y
      // se reintenta en el siguiente ciclo.
      if (!res.ok && data.transitorio !== true) {
        setError(data.error ?? null);
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Sondeo mientras la intención esté viva.
  useEffect(() => {
    if (intencion === null) return;
    let vivo = true;

    const tick = async () => {
      if (!vivo) return;
      const pagado = await consultar(intencion.intent);
      if (vivo && pagado) onPaid();
    };

    const id = setInterval(() => void tick(), POLL_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [intencion, consultar, onPaid]);

  // ── Modo DEMO: el receptor no está configurado todavía ────────────────────
  if (demo) {
    return (
      <div className="space-y-3">
        <RedesSelector red={red} onRed={setRed} />
        <div className="space-y-2 rounded-lg border border-input bg-muted/40 p-3">
          <p className="text-sm text-foreground">
            El cobro en cripto todavía no está encendido en este entorno.
          </p>
          <p className="text-xs text-muted-foreground">
            Modo demostración: puedes recorrer el flujo, pero no se cobra nada.
          </p>
        </div>
        <Button type="button" className="w-full" onClick={onPaid}>
          Continuar (demo)
        </Button>
      </div>
    );
  }

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
              <span className="font-semibold">{formatUsdc(intencion.amountBaseUnits)} USDC</span> por{' '}
              <span className="font-medium">
                {REDES.find((r) => r.id === intencion.chain)?.nombre}
              </span>
            </p>
            {prueba && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Modo prueba de cobro — monto reducido a propósito.
              </p>
            )}

            {qr !== null && (
              <div className="mt-3 flex flex-col items-center gap-1.5">
                {/* El QR lleva dentro dirección, monto y referencia. */}
                {/* w-60 (240 px) con max-w-full: lo más grande que cabe en el
                    diálogo sin desbordar. El fondo blanco y el padding suman
                    borde limpio alrededor — un QR sobre fondo de color o
                    pegado al marco no se deja escanear. */}
                <img
                  src={qr}
                  alt="Código QR para pagar"
                  className="w-60 max-w-full rounded-lg bg-white p-2"
                />
                <p className="text-xs text-muted-foreground">
                  Escanéalo con la wallet de tu celular
                </p>
              </div>
            )}

            {intencion.payUri !== '' && (
              <Button type="button" variant="outline" className="mt-3 w-full" asChild>
                <a href={intencion.payUri}>
                  <ExternalLink size={16} strokeWidth={2} />
                  Abrir en mi wallet
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
              valor={formatUsdc(intencion.amountBaseUnits)}
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
              const pagado = await consultar(intencion.intent);
              setVerificando(false);
              if (pagado) onPaid();
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
