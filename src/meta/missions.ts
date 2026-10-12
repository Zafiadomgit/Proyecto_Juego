import { Rng, seedFromDate } from '../core/rng';
import { applyReward, type Reward } from './economy';
import type { GameSummary } from './progression';
import { dayKey, type SaveData } from './save';

type MissionKind = 'games' | 'lines' | 'score' | 'combo' | 'perfect' | 'levels' | 'gems';

export interface MissionDef {
  id: string;
  text: string;
  kind: MissionKind;
  target: number;
  /** true: se suma entre partidas; false: hay que lograrlo en una sola partida. */
  cumulative: boolean;
  reward: Reward;
}

const EASY: MissionDef[] = [
  { id: 'e-games3', text: 'Juega 3 partidas', kind: 'games', target: 3, cumulative: true, reward: { coins: 60 } },
  { id: 'e-lines15', text: 'Despeja 15 líneas', kind: 'lines', target: 15, cumulative: true, reward: { coins: 60 } },
  { id: 'e-score300', text: 'Consigue 300 puntos en una partida', kind: 'score', target: 300, cumulative: false, reward: { coins: 60 } },
];
const MEDIUM: MissionDef[] = [
  { id: 'm-combo3', text: 'Logra una racha x3', kind: 'combo', target: 3, cumulative: false, reward: { coins: 120, boosters: { hammer: 1 } } },
  { id: 'm-lines40', text: 'Despeja 40 líneas', kind: 'lines', target: 40, cumulative: true, reward: { coins: 120, boosters: { shuffle: 1 } } },
  { id: 'm-score800', text: 'Consigue 800 puntos en una partida', kind: 'score', target: 800, cumulative: false, reward: { coins: 120, boosters: { hammer: 1 } } },
  { id: 'm-levels2', text: 'Supera 2 niveles de aventura', kind: 'levels', target: 2, cumulative: true, reward: { coins: 120, boosters: { shuffle: 1 } } },
];
const HARD: MissionDef[] = [
  { id: 'h-perfect', text: 'Deja el tablero limpio', kind: 'perfect', target: 1, cumulative: true, reward: { gems: 15 } },
  { id: 'h-combo5', text: 'Logra una racha x5', kind: 'combo', target: 5, cumulative: false, reward: { gems: 15 } },
  { id: 'h-score1500', text: 'Consigue 1.500 puntos en una partida', kind: 'score', target: 1500, cumulative: false, reward: { gems: 15 } },
  { id: 'h-gems12', text: 'Recoge 12 gemas en aventura', kind: 'gems', target: 12, cumulative: true, reward: { gems: 15, boosters: { bomb: 1 } } },
];

export const ALL_MISSIONS: readonly MissionDef[] = [...EASY, ...MEDIUM, ...HARD];

export function missionById(id: string): MissionDef | undefined {
  return ALL_MISSIONS.find((m) => m.id === id);
}

/** 3 misiones al día (fácil, media, difícil), iguales para todos ese día. */
export function ensureDailyMissions(save: SaveData, now: Date): void {
  const today = dayKey(now);
  if (save.missions.day === today && save.missions.list.length === 3) return;
  const rng = new Rng(seedFromDate(now) ^ 0x5eed);
  save.missions = {
    day: today,
    list: [rng.pick(EASY), rng.pick(MEDIUM), rng.pick(HARD)].map((m) => ({ id: m.id, progress: 0, claimed: false })),
  };
}

function valueFor(kind: MissionKind, s: GameSummary): number {
  switch (kind) {
    case 'games': return 1;
    case 'lines': return s.lines;
    case 'score': return s.score;
    case 'combo': return s.maxCombo;
    case 'perfect': return s.perfects;
    case 'levels': return s.mode === 'adventure' && s.won ? 1 : 0;
    case 'gems': return s.mode === 'adventure' ? s.gems : 0;
  }
}

/** Avanza las misiones con el resultado de una partida. Devuelve las que se acaban de completar. */
export function progressMissions(save: SaveData, s: GameSummary, now: Date): MissionDef[] {
  ensureDailyMissions(save, now);
  const done: MissionDef[] = [];
  for (const st of save.missions.list) {
    const def = missionById(st.id);
    if (!def || st.progress >= def.target) continue;
    const v = valueFor(def.kind, s);
    st.progress = Math.min(def.target, def.cumulative ? st.progress + v : Math.max(st.progress, v));
    if (st.progress >= def.target) done.push(def);
  }
  return done;
}

export function claimableMissions(save: SaveData): number {
  return save.missions.list.filter((st) => {
    const def = missionById(st.id);
    return def && !st.claimed && st.progress >= def.target;
  }).length;
}

export function claimMission(save: SaveData, id: string): Reward | null {
  const st = save.missions.list.find((m) => m.id === id);
  const def = missionById(id);
  if (!st || !def || st.claimed || st.progress < def.target) return null;
  st.claimed = true;
  applyReward(save, def.reward);
  return def.reward;
}
