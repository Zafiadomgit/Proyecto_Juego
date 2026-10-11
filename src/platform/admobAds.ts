import { AdMob, AdmobConsentStatus, MaxAdContentRating } from '@capacitor-community/admob';
import type { AdsService, RewardedPlacement } from './ads';
import { ADMOB } from './config';

/**
 * Google AdMob con consentimiento UMP (obligatorio en el EEE, Reino Unido y Suiza, y útil para las leyes
 * estatales de EE. UU.). No se piden anuncios hasta que UMP diga que se puede (`canRequestAds`).
 */
export class AdMobAds implements AdsService {
  private canRequestAds = false;
  private privacyOptionsRequired = false;
  private rewardedReady: Promise<boolean> | null = null;
  private interstitialReady: Promise<boolean> | null = null;

  async init(): Promise<void> {
    try {
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) await AdMob.showConsentForm();
      const after = await AdMob.requestConsentInfo();
      this.canRequestAds = after.canRequestAds;
      this.privacyOptionsRequired = String(after.privacyOptionsRequirementStatus) === 'REQUIRED';
    } catch (e) {
      console.warn('[ads] consentimiento', e);
    }
    if (!this.canRequestAds) return;
    await AdMob.initialize({
      // Juego para todos los públicos pero dirigido a 13+: contenido de anuncios limitado a "General".
      maxAdContentRating: MaxAdContentRating.General,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    this.preloadRewarded();
  }

  get privacyOptionsAvailable(): boolean {
    return this.privacyOptionsRequired;
  }

  async showPrivacyOptions(): Promise<void> {
    await AdMob.showPrivacyOptionsForm();
  }

  private preloadRewarded(): void {
    this.rewardedReady = AdMob.prepareRewardVideoAd({ adId: ADMOB.rewardedId })
      .then(() => true)
      .catch(() => false);
  }

  private preloadInterstitial(): void {
    this.interstitialReady = AdMob.prepareInterstitial({ adId: ADMOB.interstitialId })
      .then(() => true)
      .catch(() => false);
  }

  async showRewarded(_placement: RewardedPlacement): Promise<boolean> {
    if (!this.canRequestAds) return false;
    if (!this.rewardedReady) this.preloadRewarded();
    const ready = await this.rewardedReady;
    this.rewardedReady = null;
    if (!ready) {
      this.preloadRewarded();
      return false;
    }
    try {
      const reward = await AdMob.showRewardVideoAd();
      return !!reward && reward.amount > 0;
    } catch {
      return false;
    } finally {
      this.preloadRewarded();
    }
  }

  async showInterstitial(): Promise<void> {
    if (!this.canRequestAds) return;
    if (!this.interstitialReady) {
      // Se precarga para la próxima vez; nunca hacemos esperar al jugador por un intersticial.
      this.preloadInterstitial();
      return;
    }
    const ready = await this.interstitialReady;
    this.interstitialReady = null;
    if (ready) await AdMob.showInterstitial().catch(() => undefined);
    this.preloadInterstitial();
  }
}
