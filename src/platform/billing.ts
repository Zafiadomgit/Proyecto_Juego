import { PRODUCTS } from '../meta/catalog';

export interface StoreProduct {
  id: string;
  /** Precio localizado tal y como lo devuelve Google Play (p. ej. "1,09 €"). */
  price: string;
}

export type PurchaseOutcome =
  | { status: 'purchased' }
  | { status: 'pending' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/**
 * Se llama cuando una compra está pagada y verificada y hay que entregar su contenido.
 * `purchaseToken` identifica la compra de forma única: sirve para no entregarla dos veces.
 * Debe guardar el progreso de forma síncrona; justo después la compra se reconoce/consume en Play.
 */
export type GrantHandler = (productId: string, purchaseToken: string) => void;

/**
 * Abstracción de Google Play Billing. Las compras pueden llegar en cualquier momento (pagos pendientes
 * que se completan más tarde, compras no terminadas en una sesión anterior), por eso la entrega se hace
 * a través de `onGrant` y no del resultado de `purchase()`.
 */
export interface BillingService {
  init(onGrant: GrantHandler): Promise<void>;
  getProducts(): Promise<StoreProduct[]>;
  purchase(productId: string): Promise<PurchaseOutcome>;
  /** Vuelve a consultar a Play las compras del usuario; las que falten se entregan vía `onGrant`. */
  restore(): Promise<void>;
}

/** Implementación simulada para desarrollo en navegador. Solo se usa fuera de Android. */
export class MockBilling implements BillingService {
  private owned = new Map<string, string>();
  private onGrant: GrantHandler = () => undefined;

  constructor(private confirm: (msg: string) => Promise<boolean>) {}

  async init(onGrant: GrantHandler): Promise<void> {
    this.onGrant = onGrant;
  }

  async getProducts(): Promise<StoreProduct[]> {
    return PRODUCTS.map((p) => ({ id: p.id, price: `US$${p.referencePriceUsd.toFixed(2)}` }));
  }

  async purchase(productId: string): Promise<PurchaseOutcome> {
    const p = PRODUCTS.find((x) => x.id === productId);
    if (!p) return { status: 'error', message: 'Producto desconocido' };
    const ok = await this.confirm(`[Simulación] ¿Comprar "${p.title}" por US$${p.referencePriceUsd}?`);
    if (!ok) return { status: 'cancelled' };
    const token = `mock-${productId}-${Date.now()}`;
    if (p.type === 'non_consumable') this.owned.set(productId, token);
    this.onGrant(productId, token);
    return { status: 'purchased' };
  }

  async restore(): Promise<void> {
    for (const [id, token] of this.owned) this.onGrant(id, token);
  }
}
