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

/** Unidades base de USDC (6 decimales) a decimal legible, sin floats. */
export function formatUsdcBaseUnits(baseUnits) {
  if (!/^\d+$/.test(baseUnits)) return '0';
  const value = baseUnits.replace(/^0+(?=\d)/, '').padStart(7, '0');
  const integer = value.slice(0, -6);
  const fraction = value.slice(-6).replace(/0+$/, '');
  return fraction === '' ? integer : `${integer}.${fraction}`;
}
