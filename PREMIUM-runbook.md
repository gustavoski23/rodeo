# PREMIUM — runbook: cómo encender el cobro de RODEO

Plan: **Premium USD 6/mes**. Dos formas de pagar:
- **Tarjeta** → Lemon Squeezy (Stripe no opera en Colombia).
- **USDC por Solana** → directo a tu wallet, sin comisión, self-custody. Es
  además el gancho de marketing ("paga en cripto, fee 0").

Ambas terminan igual: el que paga recibe una **clave de licencia**, la pega en
la app (perfil o paywall → "¿Ya tienes tu clave? Actívala") y listo.

> **Estado (22 jul 2026):**
> - ✅ Infraestructura lista y desplegada — pero **APAGADA**. Hoy la app no
>   cobra nada y se ve idéntica a siempre.
> - ⏳ Falta que TÚ hagas: crear el producto en Lemon, pegar el link, y
>   encender el interruptor. Todo está en este documento.

---

## El interruptor (lo más importante)

En **`js/premium.js`**, bien arriba, hay UNA línea:

```js
const PREMIUM_ENFORCE = false;
```

- **`false` (como está ahora):** Premium no existe. Nadie ve límites, nadie ve
  paywall, la app funciona exacto como hoy. Puedes dejarlo así para siempre y no
  pasa nada.
- **`true`:** se encienden los límites gratis (abajo) y, al pasarse, aparece el
  paywall vendiendo Premium.

**No lo pongas en `true` hasta terminar el Paso 1** (o el paywall abrirá un
checkout que no existe). El resto de este documento es cómo llegar ahí.

### Qué es gratis y qué pide Premium (cuando enciendas)

| Módulo | Gratis al día | Con Premium |
|---|---|---|
| **TALK** (charlas + dibujo libre) | 5 charlas | ilimitado |
| **ROLEPLAY** (escenas) | 2 escenas | ilimitado |
| **STORY** (thriller) | 1 episodio nuevo | ilimitado |
| Episodio ilustrado canónico ("La princesa…") | **siempre gratis** (gancho) | — |
| DROP, SLANG, SUBE, DNA, sync | **siempre gratis** | — |

Los contadores se reinician solos cada día (hora de Medellín). Reanudar un
episodio del thriller ya empezado (botón CONTINUAR) **nunca** se cobra: solo
cuenta arrancar uno nuevo. Todo esto se configura en un solo sitio, la constante
`GATES` de `js/premium.js` — cambia un número y cambia el límite.

---

## Paso 1 — Lemon Squeezy (pago con tarjeta) · ~20 min

### 1a. Cuenta y tienda
1. Entra a **https://lemonsqueezy.com** → **Sign up** (con tu Gmail).
2. Te pide crear una **Store** (tienda): nombre `RODEO` (o el que quieras), país,
   moneda **USD**. Guarda.
3. Lemon te pedirá datos para **payouts** (dónde te pagan a ti). Puedes llenarlo
   después; para probar en modo test no hace falta.

### 1b. El producto de suscripción
1. Menú lateral → **Products** → **+ New Product**.
2. Rellena:
   - **Name:** `RODEO Premium`
   - **Pricing model:** **Subscription** → **Monthly** → **USD 6**.
   - Descripción corta, la que quieras.
3. Baja hasta la sección **License keys** (dentro del producto, a veces en la
   pestaña/acordeón "License keys" o "Fulfillment"):
   - Activa **"Generate license keys for each purchase"** (o
     "Enable license keys"). **Esto es obligatorio** — es lo que le da al
     comprador la clave que pega en RODEO.
   - **Activation limit:** cuántos aparatos puede usar una misma clave. Pon **3**
     o **5** (así el mismo usuario entra en su cel y su PC). Si lo dejas en 1,
     solo un aparato.
   - Expiración de la clave: déjala ligada a la suscripción (lo normal). Si la
     suscripción vive, la clave vale; si se cancela, deja de valer.
4. **Save** / **Publish** el producto.

### 1c. Copiar el link de checkout
1. En el producto → botón **Share** / **Get URL** / **Buy link** (según la
   versión, el texto cambia). Copia la URL. Se ve así:
   `https://TUTIENDA.lemonsqueezy.com/buy/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
2. Abre **`js/premium.js`** y pega esa URL en:
   ```js
   const LEMON_CHECKOUT_URL = 'https://TUTIENDA.lemonsqueezy.com/buy/....';
   ```
   Mientras esté vacía (`''`), el botón "Pagar con tarjeta" del paywall aparece
   como **"Tarjeta · pronto"** (desactivado). Apenas la pegas, se activa.

### 1d. (Opcional) Anti-clave-ajena — `LEMON_STORE_ID`
Sin esto todo funciona; es un candado extra para que nadie active RODEO con una
clave comprada en OTRO producto de Lemon.
1. Consigue el **Store ID** (un número). El camino fácil: menú **Settings →
   Stores** → tu tienda; el ID sale en la info de la tienda o en la API. Si no lo
   ves a la primera, déjalo — es opcional.
2. En **Vercel** → tu proyecto `rodeo` → **Settings → Environment Variables** →
   **Add**:
   - **Name:** `LEMON_STORE_ID`
   - **Value:** el número del store.
   - Environments: Production (y Preview si quieres).
3. **Redeploy** (Vercel lo hace solo en el próximo push, o dale "Redeploy").

> No necesitas NINGUNA otra variable de entorno. La License API de Lemon que usa
> `api/premium.js` es pública: no lleva API key. Con solo pegar el checkout link
> en el Paso 1c ya funciona la activación de claves.

---

## Paso 2 — USDC por Solana (pago en cripto) · ~5 min

La idea: el comprador te manda **6 USDC** directo a tu wallet (tú te quedas el
100%, sin comisión), te avisa, y tú le das una clave que activa en la app.

### 2a. Poner tu dirección
1. Abre **Phantom** (o tu wallet Solana) → copia tu **dirección** (la cadena
   larga tipo `7xKX...9fZ`).
2. En **`js/premium.js`** pégala en:
   ```js
   const SOLANA_ADDRESS = '7xKX...tu direccion...9fZ';
   ```
   Mientras esté vacía, el botón USDC del paywall dice **"USDC · pronto"**.
   Apenas la pegas, el paywall muestra tu dirección con botón de copiar y las
   instrucciones al comprador.

> ⚠️ Es una dirección **pública** de recibir — es seguro ponerla en el código.
> NUNCA pongas aquí tu frase semilla ni tu llave privada.

### 2b. Cómo le das la clave al que pagó en USDC
El comprador activa su clave con el MISMO campo "Actívala" del paywall, así que
la clave tiene que salir de Lemon (para que valide). La forma más simple, sin
cobrar tarjeta:

1. En Lemon → **Discounts** (o **Coupons**) → **+ New**:
   - Descuento **100% off**.
   - Aplícalo al producto **RODEO Premium**.
   - **Max redemptions:** 1 (una persona) — o un número si harás varios.
   - Guarda. Te queda un **código** (ej. `USDC-GUS-01`).
2. Cuando te llegue el USDC y el comprador te escriba, mándale:
   - el **link de checkout** (el mismo del Paso 1c), y
   - el **código de descuento**.
3. Él completa el checkout en **$0** con el código → Lemon le manda una **clave
   real** por correo → la pega en RODEO → Premium activo.

> **Nota honesta sobre suscripciones:** un checkout de $0 en un producto mensual
> le da, en la práctica, acceso sin tarjeta recurrente. Para un puñado de
> panas cripto, va bien por honor: cada mes que te paguen 6 USDC, listo. Si algún
> día escalas, crea un producto de **pago único "1 mes"** con license keys aparte
> para el flujo USDC (cada pago = una clave limpia con expiración). Para arrancar,
> el código de 100% en el mismo producto es suficiente.
>
> Alternativa avanzada: la **License API** de Lemon tiene un endpoint para crear
> claves con tu **API key** (Settings → API). Si te manejas con eso, puedes
> automatizar la emisión. No hace falta para empezar.

---

## Paso 3 — Encender y desplegar

1. En **`js/premium.js`** cambia:
   ```js
   const PREMIUM_ENFORCE = true;   // ← era false
   ```
   (Ya con `LEMON_CHECKOUT_URL` pegada del Paso 1c, y opcionalmente
   `SOLANA_ADDRESS` del Paso 2a.)
2. Sube el cambio: **commit + push** a `gustavoski23/rodeo` (Vercel despliega
   solo), o corre `vercel --prod`.
3. Entra a **https://rodeo-sigma.vercel.app** y prueba (abajo).

**Para apagarlo otra vez:** vuelve `PREMIUM_ENFORCE = false` y redeploy. Todo
regresa a gratis al instante; a nadie se le rompe nada.

---

## Probar (sin gastar plata real)

### Ver el paywall sin encender nada
Abre la app en el navegador → **DevTools → Console** → escribe:
```js
abrirPaywall()
```
Aparece la hoja de Premium tal cual la verá el usuario. Útil para revisar el
copy y los botones antes de lanzar.

### Probar el cobro de verdad (modo test de Lemon)
1. En Lemon, arriba, hay un switch **Test mode**. Actívalo.
2. Con `PREMIUM_ENFORCE = true`, en la app pásate del límite (ej. arranca 6
   charlas en TALK) → sale el paywall → **Pagar con tarjeta**.
3. En el checkout usa la tarjeta de prueba **4242 4242 4242 4242**, fecha futura,
   cualquier CVC.
4. Lemon te da una **clave de prueba** (y te la manda al correo). Cópiala →
   pégala en "Actívala" → debe salir **"¡Bienvenido a Premium!"** y desaparecer
   el paywall.
5. Cuando todo funcione, **apaga Test mode** en Lemon y ya estás cobrando de
   verdad. (Ojo: las claves de test no valen en modo live; cuando pases a live,
   las claves reales son las que sirven.)

### Confirmar que un no-pagador sí tiene sus gratis
Con Premium encendido pero sin activar clave: deberías poder hacer 5 charlas, 2
roleplays y 1 episodio del thriller al día. A la siguiente, paywall.

---

## Cómo funciona por dentro (referencia rápida)

- **`js/premium.js`** — todo el frontend: el interruptor, los límites (`GATES`),
  el paywall (con el design system de RODEO), guardar/leer el estado en
  `localStorage` (`rodeo_premium`), contadores diarios (`rodeo_premium_uso`), y
  la revalidación.
- **`api/premium.js`** — proxy serverless a la License API pública de Lemon.
  Recibe `{license_key, action}`; `activate` canjea la clave la primera vez,
  `validate` la re-chequea. Traduce los errores de Lemon a español humano.
- **Revalidación:** al abrir la app, si la clave lleva **>7 días** sin
  chequearse, pregunta a Lemon en segundo plano si la suscripción sigue viva. Si
  murió (cancelada/vencida), desactiva Premium con un aviso amable. **Sin
  internet no desactiva nada** — beneficio de la duda, sigues Premium.
- **Estado del usuario:** vive en su aparato (`localStorage`). Si entra en otro
  aparato, pega la misma clave de nuevo (por eso el *activation limit* del Paso
  1b conviene en 3–5).

---

## Problemas comunes

- **"No encontré esa clave":** clave mal pegada (va completa, con guiones), o la
  compra fue en modo test y la app está en live (o al revés).
- **"Esa clave ya se usó en demasiados aparatos":** subió el *activation limit*
  del producto en Lemon, o desactiva la clave en un aparato viejo.
- **"Esa clave no es de RODEO":** pusiste `LEMON_STORE_ID` en Vercel y la clave es
  de otra tienda/store. Revisa el número, o quita esa variable si te estorba.
- **El botón "Pagar con tarjeta" sale gris ("pronto"):** falta pegar
  `LEMON_CHECKOUT_URL` en `js/premium.js` (Paso 1c).
- **El botón USDC sale gris ("pronto"):** falta pegar `SOLANA_ADDRESS` (Paso 2a).
- **Encendí `PREMIUM_ENFORCE` pero no veo cambios:** ¿hiciste redeploy? ¿la
  pestaña quedó con la versión vieja en caché? Recarga fuerte (Ctrl/Cmd+Shift+R).
