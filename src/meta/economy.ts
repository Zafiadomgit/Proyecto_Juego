import { productById } from './catalog';
import { dayKey, type SaveData } from './save';
import { themeById } from './themes';

/** Calendario de 7 días; se repite. */
export const DAILY_REWARDS: readonly { coins?: number; gems?: number; hammers?: number }[] = [
  { coins: 50 },
  { coins: 80 },
  { hammers: 1 },
  { coins: 120 },
  { gems: 10 },
  { coins: 200 },
  { gems: 25, hammers: 1 },
];

export function canClaimDaily(save: SaveData, now: Date): boolean {
  return save.dailyReward.lastClaimDay !== dayKey(now);
}

export function claimDaily(save: SaveData, now: Date): (typeof DAILY_REWARDS)[number] | null {
  if (!canClaimDaily(save, now)) return null;
  const reward = DAILY_REWARDS[save.dailyReward.index % DAILY_REWARDS.length];
  save.coins += reward.coins ?? 0;
  save.gems += reward.gems ?? 0;
  save.hammers += reward.hammers ?? 0;
  save.dailyReward = { lastClaimDay: dayKey(now), index: save.dailyReward.index + 1 };
  return reward;
}

export type BuyThemeResult = 'ok' | 'owned' | 'insufficient' | 'exclusive';

export function buyTheme(save: SaveData, themeId: string): BuyThemeResult {
  const theme = themeById(themeId);
  if (save.ownedThemes.includes(theme.id)) return 'owned';
  if (theme.exclusiveTo) return 'exclusive';
  if (!theme.price) return 'owned';
  const wallet = theme.price.currency === 'coins' ? 'coins' : 'gems';
  if (save[wallet] < theme.price.amount) return 'insufficient';
  save[wallet] -= theme.price.amount;
  save.ownedThemes.push(theme.id);
  return 'ok';
}

export function spendGems(save: SaveData, amount: number): boolean {
  if (save.gems < amount) return false;
  save.gems -= amount;
  return true;
}

/**
 * Aplica una compra verificada. Idempotente para no consumibles: si ya se tenía, no se duplica.
 * Devuelve false si el producto no existe o ya estaba aplicado.
 */
export function applyPurchase(save: SaveData, productId: string): boolean {
  const product = productById(productId);
  if (!product) return false;
  if (product.type === 'non_consumable') {
    if (save.ownedProducts.includes(productId)) return false;
    save.ownedProducts.push(productId);
  }
  const g = product.grants;
  if (g.gems) save.gems += g.gems;
  if (g.removeAds) save.removeAds = true;
  for (const t of g.themes ?? []) if (!save.ownedThemes.includes(t)) save.ownedThemes.push(t);
  return true;
}

const MAX_TRACKED_PURCHASES = 300;

/**
 * Entrega una compra de Google Play identificada por su token. Devuelve true solo la primera vez:
 * Play puede reenviar la misma compra (reinicio antes de consumirla, restauración...).
 */
export function grantPurchase(save: SaveData, productId: string, purchaseToken: string): boolean {
  if (save.processedPurchases.includes(purchaseToken)) return false;
  const applied = applyPurchase(save, productId);
  save.processedPurchases.push(purchaseToken);
  if (save.processedPurchases.length > MAX_TRACKED_PURCHASES) save.processedPurchases.splice(0, save.processedPurchases.length - MAX_TRACKED_PURCHASES);
  return applied;
}
