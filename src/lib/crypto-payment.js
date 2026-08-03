/**
 * Contenido que se dibuja dentro del QR de cobro: la DIRECCIÓN pelada, sin
 * esquema ni parámetros (base58 en Solana, G… en Stellar).
 *
 * Es el formato de MÁXIMA COMPATIBILIDAD: el único que escanean los lectores
 * estrictos. La wallet propia de Pangea llegó a la misma conclusión en
 * lib/qr/uri.ts —"hasta `solana:<dirección>` lo rechaza el escáner de Decaf,
 * así que NO lo usamos"—; una URI `solana:`/`web+stellar:` con parámetros da
 * "QR inválido" en Decaf y otros escáneres estrictos.
 *
 * ⚠️ EL PRECIO DE ESTE FORMATO — una dirección pelada NO DICE DE QUÉ RED ES.
 * Las wallets multi-cadena (Decaf hace Solana y Stellar) escanean DENTRO de la
 * red que ya tengas elegida en pantalla, así que un QR de Solana leído desde el
 * envío de Stellar abre un envío por Stellar. No se arregla en el contenido del
 * QR —cualquier esquema que marque la red vuelve a dar "QR inválido"—, así que
 * se arregla en la UI: se dice qué red elegir ANTES de escanear y se muestra la
 * dirección abreviada para comprobar que la wallet abrió la correcta.
 *
 * No viaja el monto: se teclea a mano y la detección lo casa por el MONTO
 * EXACTO marcado (único por cobro). La URI completa —con monto y
 * referencia/memo, para autocompletar— sigue disponible en el botón "Abrir en
 * una wallet compatible".
 *
 * @param {{ chain: 'solana' | 'stellar', payTo: string, payUri: string }} intent
 */
export function paymentQrPayload(intent) {
  return intent.payTo.trim();
}

/**
 * Dirección abreviada `3axp…3tSo`, con el mismo recorte que usan las wallets
 * para mostrarla. Sirve para lo único que importa aquí: comparar de un vistazo
 * lo que abrió la wallet con lo que pide esta pantalla, y cazar así el envío
 * por la red equivocada ANTES de mandar el dinero.
 *
 * @param {string} address @param {number} [visible] caracteres por lado
 */
export function shortAddress(address, visible = 4) {
  const value = address.trim();
  return value.length <= visible * 2 + 1 ? value : `${value.slice(0, visible)}…${value.slice(-visible)}`;
}

/** @param {'solana' | 'stellar'} chain @param {string} address */
export function isPaymentAddressForChain(chain, address) {
  const value = address.trim();
  if (chain === 'solana') return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  return /^G[A-Z2-7]{55}$/.test(value);
}

/** Evita convertir una respuesta upstream inesperada en un enlace ejecutable. */
export function isPaymentUriForChain(chain, payUri) {
  const value = payUri.trim();
  return chain === 'solana' ? value.startsWith('solana:') : value.startsWith('web+stellar:pay?');
}

/** Nombre humano del plan para las pantallas de suscripción. */
export function planLabel(plan) {
  switch (plan) {
    case 'rodeo-monthly':
      return 'Plan mensual';
    case 'rodeo-yearly':
      return 'Plan anual';
    case 'rodeo-test':
      return 'Prueba de cobro';
    default:
      return 'Premium';
  }
}

/**
 * Días de validez del plan, o null si no tiene vencimiento fijo (la prueba).
 * El cobro en cripto es un pago único on-chain: no se renueva solo, así que la
 * pantalla habla de "vence el…", no de "se renueva".
 */
export function planPeriodDays(plan) {
  if (plan === 'rodeo-monthly') return 30;
  if (plan === 'rodeo-yearly') return 365;
  return null;
}

/**
 * URL del explorador para VER la transacción en la cadena (red principal).
 * Devuelve null si no hay txId. Es el "recibo" verificable del pago.
 */
export function explorerTxUrl(chain, txId) {
  const id = String(txId == null ? '' : txId).trim();
  if (id === '') return null;
  return chain === 'solana'
    ? `https://solscan.io/tx/${encodeURIComponent(id)}`
    : `https://stellar.expert/explorer/public/tx/${encodeURIComponent(id)}`;
}

/** Unidades base de USDC (6 decimales) a decimal legible, sin floats. */
export function formatUsdcBaseUnits(baseUnits) {
  if (!/^\d+$/.test(baseUnits)) return '0';
  const value = baseUnits.replace(/^0+(?=\d)/, '').padStart(7, '0');
  const integer = value.slice(0, -6);
  const fraction = value.slice(-6).replace(/0+$/, '');
  return fraction === '' ? integer : `${integer}.${fraction}`;
}
