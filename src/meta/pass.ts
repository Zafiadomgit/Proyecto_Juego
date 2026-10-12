import { applyReward, type Reward } from './economy';
import type { SaveData } from './save';

/**
 * Pase Gemzy (temporada 1): 30 niveles que se suben con la XP de jugar.
 * Vía gratuita para todos; vía premium con la compra `gemzy_pass_s1`.
 * Sin cuenta atrás artificial: la temporada dura hasta que publiquemos la siguiente.
 */
export const PASS_TIERS = 30;
export const PASS_XP_PER_TIER = 120;
export const PASS_PRODUCT_ID = 'gemzy_pass_s1';

export function freeReward(tier: number): Reward {
  if (tier % 10 === 0) return { gems: 20 };
  if (tier % 5 === 0) return { gems: 10 };
  if (tier % 3 === 0) return { boosters: { hammer: 1 } };
  return { coins: 40 + tier * 4 };
}

export function premiumReward(tier: number): Reward {
  if (tier === PASS_TIERS) return { theme: 'aurora', gems: 100 };
  if (tier % 5 === 0) return { gems: 40, boosters: { bomb: 2 } };
  if (tier % 2 === 0) return { gems: 15, boosters: { shuffle: 1 } };
  return { coins: 150 + tier * 10, boosters: { hammer: 1 } };
}

export function passTier(save: SaveData): number {
  return Math.min(PASS_TIERS, Math.floor(save.pass.xp / PASS_XP_PER_TIER));
}

export function passProgress(save: SaveData): { tier: number; into: number; needed: number } {
  const tier = passTier(save);
  if (tier >= PASS_TIERS) return { tier, into: PASS_XP_PER_TIER, needed: PASS_XP_PER_TIER };
  return { tier, into: save.pass.xp - tier * PASS_XP_PER_TIER, needed: PASS_XP_PER_TIER };
}

export type PassTrack = 'free' | 'premium';

export function canClaimPass(save: SaveData, tier: number, track: PassTrack): boolean {
  if (tier < 1 || tier > passTier(save)) return false;
  if (track === 'premium' && !save.pass.premium) return false;
  const claimed = track === 'free' ? save.pass.claimedFree : save.pass.claimedPremium;
  return !claimed.includes(tier);
}

export function claimPass(save: SaveData, tier: number, track: PassTrack): Reward | null {
  if (!canClaimPass(save, tier, track)) return null;
  const reward = track === 'free' ? freeReward(tier) : premiumReward(tier);
  (track === 'free' ? save.pass.claimedFree : save.pass.claimedPremium).push(tier);
  applyReward(save, reward);
  return reward;
}

export function claimablePass(save: SaveData): number {
  let n = 0;
  for (let t = 1; t <= passTier(save); t++) {
    if (canClaimPass(save, t, 'free')) n++;
    if (canClaimPass(save, t, 'premium')) n++;
  }
  return n;
}
