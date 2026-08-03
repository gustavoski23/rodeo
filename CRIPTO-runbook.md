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

Lo importante: **saber que un pago concreto es de una compra concreta**. Hay
dos maneras y las dos se detectan solas:

1. **Escaneando el QR**: lleva la URI completa de pago (Solana Pay en Solana,
   SEP-0007 en Stellar) con destino, monto y referencia/memo dentro, así que
   una wallet compatible autocompleta todo. **Cada red pide su propia wallet**:
   el QR de Solana necesita una wallet de Solana (Phantom, Solflare…) y el de
   Stellar una wallet de Stellar (Decaf, Lobstr…). Una wallet de Stellar NO
   puede pagar en Solana ni al revés.
2. **Copiando la dirección** (wallet, exchange, lo que sea): ahí no viaja
   ninguna referencia, así que el identificador es el **monto exacto**, al que
   se le suman micro-unidades únicas por cobro. Tiene que llegar clavado.

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

**Normalmente no hay que hacer nada**: RODEO ya apunta por defecto a
`https://pangea-wallet.vercel.app`. Solo si quieres probar contra otro
despliegue (una vista previa, por ejemplo), pon en **Vercel → proyecto rodeo →
Environment Variables**:

| Variable | Valor |
|---|---|
| `PANGEA_PAYMENTS_URL` | La URL del receptor, p. ej. `https://pangea-wallet-xxxx.vercel.app` |

## Paso 3 — La primera prueba real, por 10 centavos

Hay un plan de prueba (`rodeo-test`, **0,10 USDC**) que recorre exactamente el
mismo camino que un cobro de verdad. Se activa añadiendo `?pagoprueba=1` a la
URL de RODEO:

```
https://TU-RODEO.vercel.app/?pagoprueba=1
```

1. Abre esa URL **en el computador** (para poder escanear el QR con el celular).
2. Menú → **Suscripcion** → *Get it now* → pestaña **Crypto** → **Solana**.
3. Debe decir "Envía **0.1 USDC**" y mostrar el aviso de modo prueba.
4. Paga desde una cuenta Solana **distinta** de la dirección receptora: escanea
   el QR con esa otra cuenta, o copia la dirección y el **monto exacto** y
   mándalo desde un exchange u otra wallet.
5. En unos segundos la pantalla pasa **sola** al ticket.

No envíes desde la misma dirección que aparece como destino. Una transferencia
de la cuenta hacia sí misma no aumenta el saldo recibido y, correctamente, no
se confirma como cobro. El dinero termina en tu wallet receptora; además se
paga la comisión de red de la cuenta emisora.

`rodeo-test` se acepta únicamente en despliegues Vercel Preview (o con
`CRYPTO_PAYMENT_TEST_MODE=1` en una prueba local explícita). Producción lo
rechaza aunque alguien invoque el endpoint directamente.

**Si no avanza**, mira los logs de la función en Vercel (proyecto rodeo →
Logs → `/api/cripto`) y del receptor. Los sospechosos habituales: falta alguna
variable en la wallet, la dirección de cobro no es la que recibió, o el pago
no llegó en USDC por la red elegida y con el monto exacto indicado.

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
- **El monto que se pide NO es redondo, y es a propósito.** A cada cobro se le
  suman unas micro-unidades únicas (menos de un centavo): 32 USDC se piden como
  32,004211. Ese monto irrepetible es lo que permite reconocer un pago hecho
  *copiando la dirección*, sin referencia ni memo — el caso de quien paga desde
  un exchange. Si el monto llega distinto (una comisión descontada, por
  ejemplo), no se detecta solo. El QR lo lleva dentro, así que por ahí es
  invisible.
- **Dos cobros vivos del mismo plan pueden sacar la misma marca** (1 entre
  9999). Si pasa, un solo pago satisface a los dos. La defensa es la de
  siempre: consumir `payment.txId` una única vez.
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
