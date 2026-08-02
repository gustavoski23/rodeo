# CRIPTO — cómo encender el cobro de suscripciones en USDC

RODEO ya sabe cobrar en cripto. El dinero llega a **tu wallet** (Pangea
Wallet), no a un procesador ajeno, y la suscripción se activa sola cuando la
red confirma el pago.

> **Estado (2 ago 2026):** el código está listo en las dos partes, pero
> **APAGADO**. Sin configurar, la pestaña "Crypto" del checkout se muestra en
> modo demostración y no cobra nada. Encenderlo es pegar cuatro variables.

---

## Cómo funciona (para que no sea una caja negra)

```
  RODEO (navegador)          RODEO (servidor)         Pangea Wallet
  ─────────────────          ────────────────         ─────────────
  eliges Crypto      ──────► /api/cripto      ──────► /api/payments/intent
                                                       ↓ crea una referencia
                                                         única y la firma
  ves QR + dirección ◄─────────────────────────────────┘
       ↓
  pagas con tu wallet ─────────────► la cadena (Solana / Stellar)
                                                       ↑ relee la cadena
  se activa solo     ◄────── /api/cripto      ──────► /api/payments/status
```

Lo importante: **la referencia (o el memo)**. Es lo que permite decir "este
pago es de esta compra". El QR y el botón "Abrir en mi wallet" la llevan
dentro, por eso son el camino recomendado. Un envío suelto sin referencia
llega igual, pero hay que resolverlo a mano.

---

## Paso 1 — Desplegar el receptor (Pangea Wallet)

El receptor vive en tu repo `gustavoski23/pangea-wallet`, rama
`feat/receptor-pagos-suscripcion`. Mergeála y despliega.

En **Vercel → proyecto pangea-wallet → Settings → Environment Variables**:

| Variable | Qué es |
|---|---|
| `PANGEA_PAYMENTS_SECRET` | Clave para firmar los cobros. Genérala con `openssl rand -base64 48`. **No** es una llave de wallet: no mueve fondos. |
| `PANGEA_PAYMENTS_SOLANA_ADDRESS` | Tu dirección de Solana donde recibes el USDC. |
| `PANGEA_PAYMENTS_STELLAR_ADDRESS` | Tu dirección de Stellar (empieza por `G…`). Opcional: si la dejas vacía, Stellar no se ofrece. |

> Son direcciones **públicas de recibir**. Nunca pongas ahí una frase semilla
> ni una llave privada.

El formato se valida al emitir cada cobro: si pegas una dirección con un
carácter de menos, esa red se apaga en vez de cobrar hacia la nada.

**Redes de prueba vs dinero real:** Pangea cobra en la red en la que esté
configurada (`NEXT_PUBLIC_PANGEA_NETWORK`). En modo de prueba usa devnet de
Solana y testnet de Stellar; para Stellar de prueba hace falta además
`PANGEA_STELLAR_TESTNET_USDC_ISSUER` (no existe un USDC de prueba canónico y
está prohibido inventar uno).

## Paso 2 — Apuntar RODEO al receptor

En **Vercel → proyecto rodeo → Environment Variables**:

| Variable | Valor |
|---|---|
| `PANGEA_PAYMENTS_URL` | La URL de tu Pangea Wallet, p. ej. `https://pangea-wallet.vercel.app` |

Redeploy y listo: la pestaña "Crypto" deja el modo demostración y empieza a
cobrar de verdad.

## Paso 3 — Probar sin arriesgar plata

1. Deja Pangea en modo de prueba y pon direcciones tuyas de devnet.
2. Consigue USDC de devnet en el faucet de Circle.
3. En RODEO: menú → **Suscripcion** → *Get it now* → pestaña **Crypto**.
4. Escanea el QR con una wallet en devnet y paga.
5. La pantalla debe pasar sola al ticket en unos segundos.

---

## Precios

Viven en el **servidor** (`lib/payments/plans.ts` de pangea-wallet), no en el
navegador — si viajaran en la petición, cualquiera pediría un cobro de 0,01
USDC y lo pagaría. Hoy:

| Plan | Monto |
|---|---|
| `rodeo-monthly` | 32 USDC |
| `rodeo-yearly` | 320 USDC |

Para cambiarlos se cambia ese archivo y se despliega.

---

## Lo que TIENES que saber antes de cobrar en serio

- **Acredita cada pago UNA sola vez.** El receptor no tiene base de datos: si
  preguntas dos veces por el mismo cobro, responde "pagado" las dos veces. La
  clave para no regalar dos suscripciones es `payment.txId` — guárdala y
  recházala si ya la procesaste. (Hoy RODEO solo activa Premium en el
  navegador del comprador, así que no hay doble cobro posible; en cuanto
  actives Premium desde el servidor, implementa esa deduplicación.)
- **Un pago sin referencia/memo no se detecta solo.** Llega el dinero, pero
  hay que casarlo a mano. Por eso la UI empuja el QR y grita lo del memo.
- **Si la red no responde**, el estado devuelve "no pude comprobarlo", nunca
  "no pagó": la app reintenta sola en vez de negarle el acceso a alguien que sí
  pagó.
- **El cobro caduca en 1 hora**, pero el QR no: si alguien paga muy tarde, el
  dinero llega sin cobro vivo que lo acredite. Se resuelve a mano.
- **Volumen alto**: la búsqueda mira una ventana de movimientos recientes de tu
  cuenta. Con muchísimos pagos por minuto haría falta paginación o webhooks
  (documentado en el ADR-0009 de pangea-wallet).

---

## Apagarlo

Borra `PANGEA_PAYMENTS_URL` en RODEO y redeploy. La pestaña vuelve al modo
demostración al instante; nada más se rompe.
