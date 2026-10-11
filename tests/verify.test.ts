import { describe, expect, it } from 'vitest';
import { ALLOWED_PRODUCTS, evaluate, successPayload } from '../supabase/functions/verify-purchase/logic';
import { PRODUCTS } from '../src/meta/catalog';

describe('Verificación de compras en servidor', () => {
  it('el catálogo del servidor coincide con el del juego', () => {
    expect(Object.keys(ALLOWED_PRODUCTS).sort()).toEqual(PRODUCTS.map((p) => p.id).sort());
    for (const p of PRODUCTS) expect(ALLOWED_PRODUCTS[p.id]).toBe(p.type);
  });

  it('acepta compras pagadas y rechaza pendientes, canceladas, desconocidas y consumibles reutilizados', () => {
    expect(evaluate('gems_100', { purchaseState: 0, consumptionState: 0 }).ok).toBe(true);
    expect(evaluate('remove_ads', { purchaseState: 0, acknowledgementState: 1 }).ok).toBe(true);
    expect(evaluate('gems_100', { purchaseState: 2 }).ok).toBe(false);
    expect(evaluate('gems_100', { purchaseState: 1 }).ok).toBe(false);
    expect(evaluate('gems_999999', { purchaseState: 0 }).ok).toBe(false);
    expect(evaluate('gems_100', { purchaseState: 0, consumptionState: 1 }).ok).toBe(false);
  });

  it('devuelve el formato que espera cordova-plugin-purchase', () => {
    const r = successPayload('gems_100', 'tok', { purchaseState: 0, orderId: 'GPA.1' });
    expect(r.ok).toBe(true);
    expect(r.data.id).toBe('gems_100');
    expect(r.data.collection[0]).toMatchObject({ id: 'gems_100', purchaseId: 'tok', transactionId: 'GPA.1' });
  });
});
