import { describe, expect, it } from 'vitest';
import { applyPurchase, buyTheme, canClaimDaily, claimDaily, grantPurchase } from '../src/meta/economy';
import { defaultSave, loadSave, writeSave } from '../src/meta/save';
import { PRODUCTS } from '../src/meta/catalog';
import { shouldShowInterstitial } from '../src/platform/ads';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('Economía', () => {
  it('la recompensa diaria se reclama una vez al día y no se reinicia al saltarse días', () => {
    const s = defaultSave();
    const d1 = new Date('2026-10-01T10:00:00Z');
    expect(claimDaily(s, d1)).not.toBeNull();
    expect(canClaimDaily(s, d1)).toBe(false);
    const d5 = new Date('2026-10-05T10:00:00Z');
    claimDaily(s, d5);
    expect(s.dailyReward.index).toBe(2);
  });

  it('los temas se compran con la moneda correcta y los exclusivos no se venden sueltos', () => {
    const s = defaultSave();
    expect(buyTheme(s, 'neon')).toBe('insufficient');
    s.coins = 1000;
    expect(buyTheme(s, 'neon')).toBe('ok');
    expect(s.coins).toBe(600);
    expect(buyTheme(s, 'neon')).toBe('owned');
    expect(buyTheme(s, 'gold')).toBe('exclusive');
  });

  it('las compras no consumibles son idempotentes', () => {
    const s = defaultSave();
    expect(applyPurchase(s, 'starter_pack')).toBe(true);
    const gems = s.gems;
    expect(applyPurchase(s, 'starter_pack')).toBe(false);
    expect(s.gems).toBe(gems);
    expect(s.removeAds).toBe(true);
    expect(s.ownedThemes).toContain('gold');
  });

  it('los consumibles se pueden comprar varias veces', () => {
    const s = defaultSave();
    applyPurchase(s, 'gems_100');
    applyPurchase(s, 'gems_100');
    expect(s.gems).toBe(220);
  });

  it('una misma compra de Play (mismo token) solo se entrega una vez', () => {
    const s = defaultSave();
    expect(grantPurchase(s, 'gems_100', 'tok-1')).toBe(true);
    expect(grantPurchase(s, 'gems_100', 'tok-1')).toBe(false);
    expect(grantPurchase(s, 'gems_100', 'tok-2')).toBe(true);
    expect(s.gems).toBe(220);
  });

  it('el catálogo no contiene recompensas aleatorias', () => {
    for (const p of PRODUCTS) expect(Object.keys(p.grants).every((k) => ['gems', 'removeAds', 'themes', 'pass', 'boosters'].includes(k))).toBe(true);
  });
});

describe('Guardado', () => {
  it('persiste y recupera, tolerando datos corruptos', () => {
    const st = memoryStorage();
    const s = defaultSave();
    s.coins = 77;
    writeSave(st, s);
    expect(loadSave(st).coins).toBe(77);
    st.setItem('gemzy-blocks-save', '{roto');
    expect(loadSave(st).coins).toBe(0);
  });
});

describe('Política de intersticiales', () => {
  const base = { removeAds: false, gamesPlayed: 10, gamesSinceInterstitial: 3, lastInterstitialAt: 0 };
  it('respeta compra sin anuncios, periodo de gracia y frecuencia', () => {
    const now = 10 * 60 * 1000;
    expect(shouldShowInterstitial(base, now)).toBe(true);
    expect(shouldShowInterstitial({ ...base, removeAds: true }, now)).toBe(false);
    expect(shouldShowInterstitial({ ...base, gamesPlayed: 1 }, now)).toBe(false);
    expect(shouldShowInterstitial({ ...base, gamesSinceInterstitial: 1 }, now)).toBe(false);
    expect(shouldShowInterstitial({ ...base, lastInterstitialAt: now - 1000 }, now)).toBe(false);
  });
});
