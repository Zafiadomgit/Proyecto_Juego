import { applyReward, type Reward } from './economy';
import type { SaveData } from './save';

/** Resumen de una partida terminada: alimenta XP, misiones y pase. */
export interface GameSummary {
  mode: 'classic' | 'daily' | 'adventure';
  score: number;
  lines: number;
  maxCombo: number;
  perfects: number;
  gems: number;
  won: boolean;
}

/** XP necesaria para pasar del nivel `level` al siguiente: sube suave para que los primeros niveles lleguen rápido. */
export function xpToNext(level: number): number {
  return 80 + (level - 1) * 30;
}

export function levelInfo(totalXp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let rest = totalXp;
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, needed: xpToNext(level) };
}

export function xpForGame(s: GameSummary): number {
  const xp = Math.floor(s.score / 20) + s.lines * 2 + s.maxCombo * 4 + s.perfects * 15 + (s.won ? 25 : 0);
  return Math.max(5, xp);
}

/** Recompensa por alcanzar el nivel `level`. Cada 5 niveles, premio grande. */
export function levelReward(level: number): Reward {
  if (level % 5 === 0) return { coins: 100 + level * 10, gems: 15, boosters: { bomb: 1 } };
  if (level % 2 === 0) return { coins: 60 + level * 5, boosters: { hammer: 1 } };
  return { coins: 60 + level * 5 };
}

/** Suma XP (al jugador y al pase) y entrega las recompensas de los niveles subidos. */
export function gainXp(save: SaveData, amount: number): { before: number; after: number; rewards: { level: number; reward: Reward }[] } {
  const before = levelInfo(save.xp).level;
  save.xp += amount;
  save.pass.xp += amount;
  const after = levelInfo(save.xp).level;
  const rewards: { level: number; reward: Reward }[] = [];
  for (let l = before + 1; l <= after; l++) {
    const reward = levelReward(l);
    applyReward(save, reward);
    rewards.push({ level: l, reward });
  }
  return { before, after, rewards };
}
