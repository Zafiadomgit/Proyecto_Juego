/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_ADMOB_REWARDED_ID?: string;
  readonly VITE_ADMOB_INTERSTITIAL_ID?: string;
  readonly VITE_BILLING_VALIDATOR_URL?: string;
  readonly VITE_BILLING_VALIDATOR_KEY?: string;
  readonly VITE_PRIVACY_POLICY_URL?: string;
}
