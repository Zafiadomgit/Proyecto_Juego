import { MockAds, type AdsService } from './ads';
import { MockBilling, type BillingService } from './billing';

export interface Platform {
  billing: BillingService;
  ads: AdsService;
  /** true en desarrollo/web: las compras y anuncios son simulados. */
  simulated: boolean;
}

/**
 * Selecciona la implementación según el entorno.
 * Fase 2 (Android con Capacitor): sustituir aquí por PlayBilling (Google Play Billing Library 7+)
 * y AdMobAds (Google Mobile Ads SDK + UMP para consentimiento). Ver docs/hoja-de-ruta.md.
 */
export function createPlatform(ui: {
  confirm: (msg: string) => Promise<boolean>;
  adOverlay: (label: string, seconds: number, skippable: boolean) => Promise<boolean>;
}): Platform {
  return { billing: new MockBilling(ui.confirm), ads: new MockAds(ui.adOverlay), simulated: true };
}
