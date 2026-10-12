/**
 * Lógica pura de verificación (sin APIs de Deno) para poder testearla con vitest.
 * Respuesta de Google: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products
 */
export interface GoogleProductPurchase {
  purchaseState?: number; // 0 comprado, 1 cancelado, 2 pendiente
  consumptionState?: number; // 0 sin consumir, 1 consumido
  acknowledgementState?: number; // 0 sin reconocer, 1 reconocido
  orderId?: string;
  purchaseTimeMillis?: string;
  productId?: string;
}

export type ProductKind = 'consumable' | 'non_consumable';

/** Debe coincidir con src/meta/catalog.ts */
export const ALLOWED_PRODUCTS: Record<string, ProductKind> = {
  remove_ads: 'non_consumable',
  starter_pack: 'non_consumable',
  gemzy_pass_s1: 'non_consumable',
  boosters_pack: 'consumable',
  gems_100: 'consumable',
  gems_550: 'consumable',
  gems_1200: 'consumable',
};

export type Verdict = { ok: true } | { ok: false; status: number; code: number; message: string };

// Códigos de error de cordova-plugin-purchase (CdvPurchase.ErrorCode).
const ERR_VALIDATION = 6778003; // PURCHASE_NOT_VALID-like
const ERR_PURCHASE_EXPIRED = 6778004;

export function evaluate(productId: string, purchase: GoogleProductPurchase): Verdict {
  const kind = ALLOWED_PRODUCTS[productId];
  if (!kind) return { ok: false, status: 400, code: ERR_VALIDATION, message: 'Producto desconocido' };
  if (purchase.purchaseState === 2) return { ok: false, status: 200, code: ERR_VALIDATION, message: 'Pago pendiente' };
  if (purchase.purchaseState !== 0) return { ok: false, status: 200, code: ERR_PURCHASE_EXPIRED, message: 'Compra cancelada o reembolsada' };
  // Un consumible ya consumido ya se entregó (el cliente consume DESPUÉS de guardar): no se puede reutilizar el token.
  if (kind === 'consumable' && purchase.consumptionState === 1)
    return { ok: false, status: 200, code: ERR_VALIDATION, message: 'Compra ya consumida' };
  return { ok: true };
}

export function successPayload(productId: string, token: string, p: GoogleProductPurchase) {
  const kind = ALLOWED_PRODUCTS[productId];
  return {
    ok: true as const,
    data: {
      id: productId,
      latest_receipt: true,
      transaction: { type: 'android-playstore', ...p, purchaseToken: token },
      collection: [
        {
          id: productId,
          platform: 'android-playstore',
          purchaseId: token,
          transactionId: p.orderId ?? token,
          purchaseDate: p.purchaseTimeMillis ? Number(p.purchaseTimeMillis) : undefined,
          isAcknowledged: p.acknowledgementState === 1,
          isConsumed: kind === 'consumable' ? p.consumptionState === 1 : undefined,
        },
      ],
      date: new Date().toISOString(),
    },
  };
}
