export type PaymentChain = 'solana' | 'stellar';

/** Comprobante mínimo devuelto únicamente después de confirmar on-chain. */
export interface CryptoReceipt {
  chain: PaymentChain;
  plan: string;
  txId: string;
  amountBaseUnits: string;
  paidAtMs: number | null;
}
