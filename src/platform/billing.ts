import { PRODUCTS } from '../meta/catalog';

export interface StoreProduct {
  id: string;
  /** Precio localizado tal y como lo devuelve Google Play (p. ej. "1,09 €"). */
  price: string;
}

export type PurchaseOutcome = { status: 'purchased'; productId: string } | { status: 'cancelled' } | { status: 'error'; message: string };

/**
 * Abstracción de Google Play Billing.
 * En Android se implementa con Play Billing Library (vía plugin de Capacitor) y se debe:
 *   1. Verificar el token de compra en servidor (Google Play Developer API).
 *   2. Reconocer (acknowledge) la compra en menos de 3 días o Google la reembolsa.
 *   3. Consumir los productos consumibles tras otorgarlos.
 */
export interface BillingService {
  readonly available: boolean;
  getProducts(): Promise<StoreProduct[]>;
  purchase(productId: string): Promise<PurchaseOutcome>;
  /** Devuelve los no consumibles ya comprados (restaurar en reinstalación / otro dispositivo). */
  restore(): Promise<string[]>;
}

/** Implementación simulada para desarrollo en navegador. NUNCA se usa en la build de producción. */
export class MockBilling implements BillingService {
  readonly available = true;
  private owned = new Set<string>();

  constructor(private confirm: (msg: string) => Promise<boolean>) {}

  async getProducts(): Promise<StoreProduct[]> {
    return PRODUCTS.map((p) => ({ id: p.id, price: `US$${p.referencePriceUsd.toFixed(2)}` }));
  }

  async purchase(productId: string): Promise<PurchaseOutcome> {
    const p = PRODUCTS.find((x) => x.id === productId);
    if (!p) return { status: 'error', message: 'Producto desconocido' };
    const ok = await this.confirm(`[Simulación] ¿Comprar "${p.title}" por US$${p.referencePriceUsd}?`);
    if (!ok) return { status: 'cancelled' };
    if (p.type === 'non_consumable') this.owned.add(productId);
    return { status: 'purchased', productId };
  }

  async restore(): Promise<string[]> {
    return [...this.owned];
  }
}
