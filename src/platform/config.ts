/**
 * Configuración de monetización, inyectada en la build con variables de entorno (ver .env.example).
 * Si no se definen, se usan los IDs de PRUEBA oficiales de Google: los anuncios funcionan pero no generan
 * ingresos. Nunca hagas clic en tus propios anuncios reales: AdMob puede suspender la cuenta.
 */
const env = import.meta.env;

const TEST_REWARDED = 'ca-app-pub-3940256099942544/5224354917';
const TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';

export const ADMOB = {
  rewardedId: env.VITE_ADMOB_REWARDED_ID || TEST_REWARDED,
  interstitialId: env.VITE_ADMOB_INTERSTITIAL_ID || TEST_INTERSTITIAL,
  get usingTestIds(): boolean {
    return this.rewardedId === TEST_REWARDED;
  },
};

/** Endpoint que verifica los tokens de compra con la Google Play Developer API (supabase/functions/verify-purchase). */
export const BILLING_VALIDATOR_URL: string = env.VITE_BILLING_VALIDATOR_URL || '';
/** Clave pública ("anon"/"publishable") del proyecto Supabase, necesaria para llamar a la función. */
export const BILLING_VALIDATOR_KEY: string = env.VITE_BILLING_VALIDATOR_KEY || '';

export const PRIVACY_POLICY_URL: string = env.VITE_PRIVACY_POLICY_URL || '';
