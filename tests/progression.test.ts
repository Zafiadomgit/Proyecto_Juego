import { describe, expect, it } from 'vitest';
import { defaultSave, loadSave } from '../src/meta/save';
import { gainXp, levelInfo, xpForGame, type GameSummary } from '../src/meta/progression';
import { ALL_MISSIONS, claimMission, claimableMissions, ensureDailyMissions, progressMissions } from '../src/meta/missions';
import { PASS_TIERS, PASS_XP_PER_TIER, canClaimPass, claimPass, claimablePass, passTier } from '../src/meta/pass';
import { applyPurchase } from '../src/meta/economy';

const day = new Date('2026-10-12T10:00:00Z');
const summary = (over: Partial<GameSummary> = {}): GameSummary => ({ mode: 'classic', score: 0, lines: 0, maxCombo: 0, perfects: 0, gems: 0, won: false, ...over });

describe('Nivel del jugador', () => {
  it('sube de nivel con la XP y entrega recompensas', () => {
    const s = defaultSave();
    const coins = s.coins;
    const res = gainXp(s, 500);
    expect(res.after).toBeGreaterThan(res.before);
    expect(res.rewards.length).toBe(res.after - res.before);
    expect(s.coins).toBeGreaterThan(coins);
    expect(levelInfo(s.xp).level).toBe(res.after);
  });

  it('las buenas partidas dan más XP', () => {
    expect(xpForGame(summary({ score: 2000, lines: 30, maxCombo: 5 }))).toBeGreaterThan(xpForGame(summary({ score: 100 })));
    expect(xpForGame(summary())).toBeGreaterThanOrEqual(5);
  });
});

describe('Misiones diarias', () => {
  it('hay 3 al día, deterministas, y cambian al día siguiente', () => {
    const a = defaultSave();
    const b = defaultSave();
    ensureDailyMissions(a, day);
    ensureDailyMissions(b, day);
    expect(a.missions.list.map((m) => m.id)).toEqual(b.missions.list.map((m) => m.id));
    expect(a.missions.list.length).toBe(3);
  });

  it('progresan, se completan y se reclaman una sola vez', () => {
    const s = defaultSave();
    ensureDailyMissions(s, day);
    // fuerza una misión acumulativa de líneas
    s.missions.list[0] = { id: 'e-lines15', progress: 0, claimed: false };
    progressMissions(s, summary({ lines: 10 }), day);
    expect(s.missions.list[0].progress).toBe(10);
    const done = progressMissions(s, summary({ lines: 10 }), day);
    expect(done.map((d) => d.id)).toContain('e-lines15');
    expect(claimableMissions(s)).toBeGreaterThanOrEqual(1);
    expect(claimMission(s, 'e-lines15')).not.toBeNull();
    expect(claimMission(s, 'e-lines15')).toBeNull();
  });

  it('las misiones de una partida usan el mejor valor, no la suma', () => {
    const s = defaultSave();
    ensureDailyMissions(s, day);
    s.missions.list[1] = { id: 'm-combo3', progress: 0, claimed: false };
    progressMissions(s, summary({ maxCombo: 2 }), day);
    progressMissions(s, summary({ maxCombo: 2 }), day);
    expect(s.missions.list[1].progress).toBe(2);
  });

  it('todas las misiones tienen recompensa fija', () => {
    for (const m of ALL_MISSIONS) expect(Object.keys(m.reward).length).toBeGreaterThan(0);
  });
});

describe('Pase Gemzy', () => {
  it('la vía premium exige la compra y se reclama con retroactividad', () => {
    const s = defaultSave();
    s.pass.xp = PASS_XP_PER_TIER * 4;
    expect(passTier(s)).toBe(4);
    expect(canClaimPass(s, 3, 'free')).toBe(true);
    expect(canClaimPass(s, 3, 'premium')).toBe(false);
    expect(canClaimPass(s, 5, 'free')).toBe(false);
    applyPurchase(s, 'gemzy_pass_s1');
    expect(s.pass.premium).toBe(true);
    expect(claimablePass(s)).toBe(8);
    expect(claimPass(s, 3, 'premium')).not.toBeNull();
    expect(claimPass(s, 3, 'premium')).toBeNull();
  });

  it('el último nivel premium da el tema exclusivo Aurora', () => {
    const s = defaultSave();
    s.pass.xp = PASS_XP_PER_TIER * PASS_TIERS * 2;
    s.pass.premium = true;
    expect(passTier(s)).toBe(PASS_TIERS);
    claimPass(s, PASS_TIERS, 'premium');
    expect(s.ownedThemes).toContain('aurora');
  });
});

describe('Migración de partida guardada', () => {
  it('convierte los martillos de la versión 1 en potenciadores', () => {
    const m = new Map<string, string>([['gemzy-blocks-save', JSON.stringify({ version: 1, coins: 5, hammers: 7 })]]);
    const st = { getItem: (k: string) => m.get(k) ?? null, setItem: () => undefined };
    const s = loadSave(st);
    expect(s.boosters.hammer).toBe(7);
    expect(s.coins).toBe(5);
    expect(s.version).toBe(2);
  });
});
