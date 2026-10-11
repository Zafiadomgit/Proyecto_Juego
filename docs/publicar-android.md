# Publish on Google Play: step by step

Order matters: Google requires the app to exist in Play Console before you can create products or test purchases.

## 0. Prerequisites
- Play Console developer account ✅
- A free AdMob account (https://admob.google.com) linked to the same Google account.
- A Supabase project (free) for purchase verification.

## 1. Package name (permanent)
It's in `capacitor.config.ts` and `android/app/build.gradle` (`com.zafiadom.gemzyblocks`). **Once you upload the
first AAB it can never be changed.** If you want a different one, tell me before step 3.

## 2. Create the upload key (on your computer)
```bash
./scripts/crear-keystore.sh          # requires Java (keytool)
```
Store the `.jks` and the passwords in a password manager. **Never upload them to git.**

## 3. Build the first signed AAB
**Option A: GitHub Actions (recommended).**
1. GitHub → repo → *Settings → Actions → General* → "Allow all actions and reusable workflows".
2. If the repo is private: *Settings (your account) → Billing* → check the payment method / spending limit
   (the free plan includes 2,000 min/month on private repos; public repos are free).
3. *Settings → Secrets and variables → Actions → Secrets*: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (the script tells you how to get them).
4. Every push builds `gemzy-blocks-release-aab` (for Play) and `gemzy-blocks-debug-apk` (to install on your phone).
   Download them from the *Actions* tab → run → *Artifacts*.

**Option B: Android Studio on your PC.**
```bash
npm ci && npm run build && npx cap sync android && npx cap open android
```
In Android Studio: *Build → Generate Signed App Bundle* → use your `.jks`.

## 4. Create the app in Play Console
1. *Create app* → name "Gemzy Blocks", Game, Free. **Free can't be changed to paid later** (and that's what we want).
2. *Testing → Internal testing → Create release* → upload the AAB. Accept **Play App Signing**.
3. Add your Gmail as a tester (internal testing list).

## 5. Create the in-app products
*Monetize → Products → In-app products* (identical IDs; the price is set per country):

| ID | Type in the code | Suggested price |
|----|------------------|-----------------|
| `remove_ads` | non-consumable | 2.99 USD |
| `starter_pack` | non-consumable | 4.99 USD |
| `gems_100` | consumable | 0.99 USD |
| `gems_550` | consumable | 4.99 USD |
| `gems_1200` | consumable | 9.99 USD |

In Play, all of them are "one-time products"; the consumable/non-consumable distinction is handled by the app.
Use the **local pricing templates** (they adjust the price to each country's purchasing power: key in Latin America).

**Test purchases without paying:** *Settings → License testing* → add your Gmail. Install the app from the
internal testing link (not the sideloaded debug APK) and you'll see the "Test card, always approves / declines / delayed" options.

## 6. Verify purchases on the server (Supabase)
1. Google Cloud Console → create a **service account** (no roles needed) → create a JSON key.
2. Play Console → *Users and permissions* → invite the service account's email with the permission
   "View financial data" (and "Manage orders" if you want to issue refunds from code in the future).
3. Deploy the function:
   ```bash
   npx supabase login
   npx supabase secrets set --project-ref YOUR_PROJECT ANDROID_PACKAGE_NAME=com.zafiadom.gemzyblocks
   npx supabase secrets set --project-ref YOUR_PROJECT GOOGLE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
   npx supabase functions deploy verify-purchase --project-ref YOUR_PROJECT
   ```
4. GitHub → *Variables*: `VITE_BILLING_VALIDATOR_URL=https://YOUR_PROJECT.supabase.co/functions/v1/verify-purchase`.

> Permissions for a new service account can take up to 24–36 h to work with the Play API. During that time
> verification fails with a temporary error: purchases are **not lost**; they're delivered once it works.

Without a validator configured, the app delivers the purchase as soon as Play approves it (valid for testing, less resistant to fraud).

## 7. AdMob
1. AdMob → *Apps → Add app* → Android → (link it to Play once it's published).
2. Create two ad units: **Rewarded** and **Interstitial**.
3. GitHub → *Variables*: `ADMOB_APP_ID` (`ca-app-pub-…~…`), `VITE_ADMOB_REWARDED_ID`, `VITE_ADMOB_INTERSTITIAL_ID`.
4. AdMob → *Privacy & messaging*: create the **GDPR** message (and the US states message). The app already
   shows it with UMP and offers "Ad privacy options" in Settings.
5. Publish `app-ads.txt` at the root of your website (the one you put in the Play listing).

⚠️ Without these variables the app uses Google's **test** IDs: everything works but earns nothing. Never tap your real ads.

## 8. Privacy policy and listing
- Publish a privacy policy (it can be a public page on GitHub Pages or Notion) that mentions AdMob
  (advertising ID, consent) and Google Play Billing. Put the URL in Play Console and in the `VITE_PRIVACY_POLICY_URL` variable.
- *Data safety*: declare "Device or other IDs" (advertising ID, shared with AdMob for ads/analytics),
  "App interactions" and "Diagnostics", per AdMob's guidance.
- *Content rating* (IARC questionnaire), *Target audience*: **13+** (see `cumplimiento-play-store.md`), *Ads*: "Yes".
- Graphics: 512×512 icon (`assets/play-store-icon-512.png`), 1024×500 feature graphic, and 4–8 screenshots.

## 9. Closed testing → production
New personal accounts need **12 testers who keep the app installed for 14 days** in closed testing
before they can request production access. Use friends/family; ask them for honest feedback.
