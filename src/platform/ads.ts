export type RewardedPlacement = 'revive' | 'double_coins' | 'free_hammer';

/**
 * Abstracción de anuncios (en Android: Google AdMob con UMP para consentimiento GDPR/CCPA).
 * Los anuncios con recompensa son SIEMPRE opcionales y el jugador sabe qué recibe antes de verlos.
 */
export interface AdsService {
  showRewarded(placement: RewardedPlacement): Promise<boolean>;
  showInterstitial(): Promise<void>;
}

/**
 * Política de frecuencia de intersticiales. Responde a la queja nº1 de las reseñas (exceso de anuncios):
 * - Nunca durante la partida, solo entre partidas.
 * - Nunca en las primeras partidas de un jugador nuevo.
 * - Como máximo uno cada 3 partidas y con 3 minutos de separación.
 * - Nunca si el jugador compró "Sin anuncios".
 */
export const INTERSTITIAL_POLICY = {
  graceGames: 3,
  everyNGames: 3,
  minIntervalMs: 3 * 60 * 1000,
} as const;

export function shouldShowInterstitial(
  state: { removeAds: boolean; gamesPlayed: number; gamesSinceInterstitial: number; lastInterstitialAt: number },
  now: number,
): boolean {
  if (state.removeAds) return false;
  if (state.gamesPlayed < INTERSTITIAL_POLICY.graceGames) return false;
  if (state.gamesSinceInterstitial < INTERSTITIAL_POLICY.everyNGames) return false;
  return now - state.lastInterstitialAt >= INTERSTITIAL_POLICY.minIntervalMs;
}

/** Anuncios simulados para desarrollo: muestran una cuenta atrás en pantalla. */
export class MockAds implements AdsService {
  constructor(private overlay: (label: string, seconds: number, skippable: boolean) => Promise<boolean>) {}

  showRewarded(placement: RewardedPlacement): Promise<boolean> {
    return this.overlay(`Anuncio con recompensa (${placement})`, 3, true);
  }

  async showInterstitial(): Promise<void> {
    await this.overlay('Anuncio', 2, false);
  }
}
