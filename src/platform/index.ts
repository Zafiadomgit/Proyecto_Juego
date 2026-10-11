import { Capacitor } from '@capacitor/core';
import { MockAds, type AdsService } from './ads';
import { AdMobAds } from './admobAds';
import { MockBilling, type BillingService } from './billing';
import { PlayBilling } from './playBilling';

export interface Platform {
  billing: BillingService;
  ads: AdsService;
  /** true en el navegador: las compras y los anuncios son simulados. */
  simulated: boolean;
}

export function createPlatform(ui: {
  confirm: (msg: string) => Promise<boolean>;
  adOverlay: (label: string, seconds: number, skippable: boolean) => Promise<boolean>;
}): Platform {
  if (Capacitor.getPlatform() === 'android') return { billing: new PlayBilling(), ads: new AdMobAds(), simulated: false };
  return { billing: new MockBilling(ui.confirm), ads: new MockAds(ui.adOverlay), simulated: true };
}
