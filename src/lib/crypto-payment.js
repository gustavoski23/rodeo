/**
 * Contenido que se dibuja dentro del QR de cobro.
 *
 * En Solana usamos la dirección base58 pelada: es el formato de máxima
 * compatibilidad para lectores estrictos y para QRs fotografiados desde otra
 * pantalla. El monto exacto sigue visible y copiable al lado; Pangea lo usa
 * para atribuir pagos que llegan sin la referencia de Solana Pay.
 *
 * En Stellar se conserva la URI completa porque el memo forma parte del pago.
 * El botón de deep-link sigue usando `payUri` en ambas redes.
 *
 * @param {{ chain: 'solana' | 'stellar', payTo: string, payUri: string }} intent
 */
export function paymentQrPayload(intent) {
  // Las dos redes: la URI completa de pago (Solana Pay / SEP-7). Lleva monto,
  // token y referencia dentro, así que una wallet compatible autocompleta todo
  // y la atribución por referencia (Solana) o memo (Stellar) queda intacta.
  //
  // Antes Solana usaba la dirección base58 pelada "para Decaf", pero Decaf es
  // una wallet de Stellar y no lee pagos de Solana en NINGÚN formato (al
  // escanear muestra una cuenta que no es la del QR). Ese formato no ayudaba a
  // nadie y les quitaba el autocompletado a las wallets de Solana de verdad.
  return intent.payUri.trim();
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
