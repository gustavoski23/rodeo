# CRIPTO — cómo encender el cobro de suscripciones en USDC

Hablarte ya sabe cobrar en cripto. El dinero llega a **tu wallet** (Pangea
Wallet), no a un procesador ajeno, y la suscripción se activa sola cuando la
red confirma el pago.

> **Estado (2 ago 2026):** el código está listo en las dos partes, pero
> **APAGADO**. Sin configurar, la pestaña "Crypto" del checkout se muestra en
> modo demostración y no cobra nada. Encenderlo es pegar cuatro variables.

---

## Cómo funciona (para que no sea una caja negra)

```
  Hablarte (navegador)          Hablarte (servidor)         Pangea Wallet
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

1. **Escaneando el QR**: lleva la **dirección pelada** (sin esquema ni monto).
   Es el formato de máxima compatibilidad — el único que escanean los lectores
   estrictos como Decaf, que dan "QR inválido" ante una URI `solana:` o
   `web+stellar:` con parámetros (la propia wallet de Pangea llegó a lo mismo
   en `lib/qr/uri.ts`). La wallet abre "enviar a esta dirección"; se elige USDC
   y se escribe el **monto exacto** que muestra la pantalla.

   > ⚠️ **La red se elige en la wallet, no en el QR.** Una dirección pelada no
   > dice de qué cadena es, y las wallets multi-cadena (Decaf hace Solana *y*
   > Stellar) escanean dentro de la red que ya tengas abierta: un QR de Solana
   > leído desde el envío de Stellar abre un envío por Stellar. No tiene arreglo
   > en el contenido del QR — marcar la red obliga a un esquema, y el esquema es
   > justo lo que esos lectores rechazan. Por eso la pantalla dice qué red
   > elegir **antes** de escanear y enseña la dirección abreviada (`3axp…3tSo`)
   > para comprobar que la wallet abrió la correcta. Si no coincide, cambia de
   > red en la wallet y vuelve a escanear.
2. **Copiando la dirección** (wallet, exchange, lo que sea): idéntico al QR,
   pero tecleando la dirección.

En los dos caminos el identificador es el **monto exacto**, al que se le suman
micro-unidades únicas por cobro (por eso no es redondo). Tiene que llegar
clavado. El botón "Abrir en una wallet compatible" sí lleva la URI completa
con monto y referencia/memo, para las wallets que la entienden.

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

## Paso 2 — Apuntar Hablarte al receptor

**Normalmente no hay que hacer nada**: Hablarte ya apunta por defecto a
`https://pangea-wallet.vercel.app`. Solo si quieres probar contra otro
despliegue (una vista previa, por ejemplo), pon en **Vercel → proyecto rodeo →
Environment Variables**:

| Variable | Valor |
|---|---|
| `PANGEA_PAYMENTS_URL` | La URL del receptor, p. ej. `https://pangea-wallet-xxxx.vercel.app` |

## Paso 3 — La primera prueba real, por 10 centavos

Hay un plan de prueba (`rodeo-test`, **0,10 USDC**) que recorre exactamente el
mismo camino que un cobro de verdad. Se activa añadiendo `?pagoprueba=1` a la
URL de Hablarte:

```
https://TU-APP.vercel.app/?pagoprueba=1
```

1. Abre esa URL **en el computador** (para poder escanear el QR con el celular).
2. Menú → **Suscripcion** → *Get it now* → pestaña **Crypto** → **Solana**.
3. Debe decir "Envía **0.1 USDC**" y mostrar el aviso de modo prueba.
4. En la wallet del celular, **entra primero al envío de USDC por esa misma
   red** y ahí abre el escáner. Comprueba que la dirección que te muestra
   coincide con el recorte que aparece bajo el QR.
5. Paga desde una cuenta Solana **distinta** de la dirección receptora: escanea
   el QR con esa otra cuenta, o copia la dirección y el **monto exacto** y
   mándalo desde un exchange u otra wallet.
6. En unos segundos la pantalla pasa **sola** al ticket.

Desde el **celular** hay un camino más corto: abre ahí la URL de Hablarte y toca
"Abrir en una wallet compatible". Ese enlace sí lleva red, monto y
referencia/memo dentro, así que la wallet lo rellena todo sola — el QR existe
para el caso "pantalla grande + celular aparte".

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

### Pagué y no lo detecta — qué mirar, en orden

El botón "revisar ahora" ya distingue **"la cadena aún no lo ve"** de **"no
pude mirar la cadena"** (si el receptor falla, sale su motivo, no un "no veo el
pago" genérico). Si dice que no lo ve, abre la transacción en el explorador
([stellar.expert](https://stellar.expert) / [solscan](https://solscan.io)) y
comprueba, en este orden:

1. **El monto, hasta el último decimal.** Es el identificador del cobro. Muchas
   wallets de consumo muestran USDC como dólares y **redondean a dos
   decimales**: mandan `0,11` donde pedíamos `0,108272` y ya no casa. Un pago
   *de menos* tampoco vale aunque lleve el memo correcto.
2. **La cuenta que recibió** es la misma que muestra la pantalla.
3. **El activo**: en Stellar tiene que ser el USDC de Circle
   (`GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`); en Solana, el
   mint real de USDC. Un USDC de otro emisor no se contabiliza.
4. **Que sea un pago de verdad y no un saldo reclamable.** Si la cuenta de
   cobro no tiene *trustline* de USDC, algunas wallets mandan un
   `create_claimable_balance` en vez de un `payment`: la transacción sale
   "exitosa", pero el dinero **no entra en la cuenta** hasta que se reclama, y
   el receptor —que lee los pagos de la cuenta— no puede verlo. Arreglo: abre
   la trustline de USDC en la cuenta de cobro y reclama el saldo pendiente.
5. **Que el cobro sea el de esa pantalla.** Cada cobro tiene su propio monto
   marcado; si recargaste o cambiaste de red antes de pagar, el monto que
   estabas mirando ya era de otro cobro.

El memo (Stellar) es un segundo camino de atribución, no un sustituto del
monto: casa el pago aunque el monto venga *de más*, pero nunca si viene de
menos.

---

## Premium atado a la cuenta (Google / correo)

Por defecto el Premium comprado vive **solo en el navegador** (localStorage). Si
además quieres que quede **atado al correo del usuario** —que compre en el
teléfono y lo tenga en la compu, o que reinstale y siga siendo Premium— Hablarte ya
trae la plomería. Es **aditivo**: sin nada de esto configurado, el cobro
funciona exactamente igual, solo que no se ata a ninguna cuenta.

**Cómo funciona.** El receptor (Pangea) es sin cuentas a propósito: sabe que
*alguien* pagó, no *quién*. Así que la identidad la pone Hablarte. Cuando hay
sesión, el navegador manda su token de Supabase a `/api/cripto`; el servidor lo
verifica y, en cuanto la cadena confirma el pago, escribe la fila en
`public.suscripciones_premium` atada al `user_id`, deduplicando por `tx_id` (un
pago acredita **una** vez). Al entrar en otro aparato con el mismo correo, la
app pregunta `mi-premium` y refleja la suscripción. La tabla es la **fuente de
verdad**; el localStorage es su espejo. Escribe **solo el servidor** (service
key, tras re-confirmar el pago); un cliente con la key pública jamás se acredita
Premium solo (RLS: cada quien solo LEE su propia fila).

**Para encenderlo:**

1. **Migración.** Aplica `supabase/migrations/20260803000000_suscripciones_premium.sql`
   (se aplica sola al mergear a main con la integración de GitHub, o pégala en el
   SQL Editor del dashboard).
2. **Service key.** `SUPABASE_SERVICE_KEY` en Vercel (la misma que usa el panel
   `/uso`; si ya la tienes, no hay nada nuevo). Sin ella, la acreditación es un
   **no-op silencioso**: el cobro sigue, pero no se ata a la cuenta.
3. **Login.** Para atar a Google hace falta el **Paso 4 de `SUPABASE-runbook.md`**
   (encender Google OAuth). El **enlace mágico por correo** funciona con solo el
   Paso 3 y ya sirve para atar la cuenta — el botón de Google aparece solo
   cuando termines el Paso 4.

> Nota: `SUPABASE_ANON_KEY` es opcional (tiene default con la key pública del
> proyecto); solo se usa para validar el token del usuario contra Supabase Auth.
> **Falta correo de confirmación:** no hay proveedor de correo todavía; cuando
> quieras, se suma un endpoint que mande el recibo al acreditar el pago.

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
  recházala si ya la procesaste. (Hoy Hablarte solo activa Premium en el
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

Borra `PANGEA_PAYMENTS_URL` en Hablarte y redeploy. La pestaña vuelve al modo
demostración al instante; nada más se rompe.
