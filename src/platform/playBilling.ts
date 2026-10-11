/// <reference path="../../node_modules/cordova-plugin-purchase/www/store.d.ts" />
import { PRODUCTS, productById } from '../meta/catalog';
import type { BillingService, GrantHandler, PurchaseOutcome, StoreProduct } from './billing';
import { BILLING_VALIDATOR_KEY, BILLING_VALIDATOR_URL } from './config';

function deviceReady(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as unknown as { CdvPurchase?: unknown }).CdvPurchase) resolve();
    else document.addEventListener('deviceready', () => resolve(), { once: true });
  });
}

/**
 * Google Play Billing (Billing Library 9) a través de cordova-plugin-purchase.
 *
 * Flujo de una compra:
 *   order() → approved → verify() en servidor → verified → onGrant() (guardar) → finish()
 * `finish()` consume las gemas o reconoce los no consumibles. Si no se reconoce en 3 días, Google reembolsa.
 * Si la app se cierra antes de finish(), Play vuelve a entregar la compra en el siguiente arranque y
 * `onGrant` la descarta porque el token ya está registrado.
 */
export class PlayBilling implements BillingService {
  private store!: CdvPurchase.Store;
  private onGrant: GrantHandler = () => undefined;
  private waiting: { productId: string; resolve: (o: PurchaseOutcome) => void } | null = null;

  async init(onGrant: GrantHandler): Promise<void> {
    this.onGrant = onGrant;
    await deviceReady();
    const { store, ProductType, Platform, LogLevel } = CdvPurchase;
    this.store = store;
    store.verbosity = LogLevel.WARNING;
    store.register(
      PRODUCTS.map((p) => ({
        id: p.id,
        type: p.type === 'consumable' ? ProductType.CONSUMABLE : ProductType.NON_CONSUMABLE,
        platform: Platform.GOOGLE_PLAY,
      })),
    );

    const useValidator = !!BILLING_VALIDATOR_URL;
    if (useValidator) {
      store.validator = {
        url: BILLING_VALIDATOR_URL,
        headers: BILLING_VALIDATOR_KEY ? { Authorization: `Bearer ${BILLING_VALIDATOR_KEY}`, apikey: BILLING_VALIDATOR_KEY } : {},
        timeout: 20000,
      };
    }

    store
      .when()
      .approved((tx) => {
        if (useValidator) void tx.verify();
        else this.deliver(tx).then(() => tx.finish());
      })
      .verified((receipt) => {
        const validIds = new Set(receipt.collection.map((p) => p.id));
        const approved = receipt.sourceReceipt.transactions.filter(
          (tx) => tx.state === CdvPurchase.TransactionState.APPROVED && tx.products.every((p) => validIds.has(p.id)),
        );
        void Promise.all(approved.map((tx) => this.deliver(tx))).then(() => receipt.finish());
      })
      .unverified((u) => {
        this.settle({ status: 'error', message: `No se pudo verificar la compra (${u.payload.message ?? u.payload.code ?? 'error'})` });
      })
      .pending(() => {
        this.settle({ status: 'pending' });
      })
      .receiptsReady(() => this.grantOwnedNonConsumables());

    const errors = await store.initialize([Platform.GOOGLE_PLAY]);
    for (const e of errors) console.warn('[billing]', e.code, e.message);
  }

  private async deliver(tx: CdvPurchase.Transaction): Promise<void> {
    for (const p of tx.products) {
      if (!productById(p.id)) continue;
      this.onGrant(p.id, tx.purchaseId ?? tx.transactionId);
      if (this.waiting?.productId === p.id) this.settle({ status: 'purchased' });
    }
  }

  /** Reinstalación o dispositivo nuevo: Play conserva los no consumibles y aquí se vuelven a activar. */
  private grantOwnedNonConsumables(): void {
    const { TransactionState } = CdvPurchase;
    for (const receipt of this.store.localReceipts)
      for (const tx of receipt.transactions) {
        if (tx.state !== TransactionState.FINISHED) continue;
        for (const p of tx.products)
          if (productById(p.id)?.type === 'non_consumable') this.onGrant(p.id, tx.purchaseId ?? tx.transactionId);
      }
  }

  private settle(outcome: PurchaseOutcome): void {
    const w = this.waiting;
    this.waiting = null;
    w?.resolve(outcome);
  }

  async getProducts(): Promise<StoreProduct[]> {
    return PRODUCTS.map((def) => {
      const p = this.store.get(def.id, CdvPurchase.Platform.GOOGLE_PLAY);
      return { id: def.id, price: p?.pricing?.price ?? '—' };
    }).filter((p) => p.price !== '—');
  }

  purchase(productId: string): Promise<PurchaseOutcome> {
    const product = this.store.get(productId, CdvPurchase.Platform.GOOGLE_PLAY);
    const offer = product?.getOffer();
    if (!offer) return Promise.resolve({ status: 'error', message: 'Producto no disponible ahora mismo' });
    this.settle({ status: 'cancelled' });
    return new Promise((resolve) => {
      this.waiting = { productId, resolve };
      void offer.order().then((err) => {
        if (!err) return; // el resultado llega por los eventos approved/verified/pending
        if (err.code === CdvPurchase.ErrorCode.PAYMENT_CANCELLED) this.settle({ status: 'cancelled' });
        else this.settle({ status: 'error', message: err.message });
      });
    });
  }

  async restore(): Promise<void> {
    await this.store.restorePurchases();
    this.grantOwnedNonConsumables();
  }
}
