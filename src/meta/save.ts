export type BoosterId = 'hammer' | 'bomb' | 'shuffle';

export interface MissionState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface SaveData {
  version: 2;
  coins: number;
  gems: number;
  removeAds: boolean;
  ownedThemes: string[];
  theme: string;
  ownedProducts: string[];
  /** Tokens de compra ya entregados (evita entregar dos veces la misma compra de Play). */
  processedPurchases: string[];
  bestScore: number;
  adventureLevel: number;
  levelStars: Record<number, number>;
  boosters: Record<BoosterId, number>;
  /** Experiencia total del jugador (el nivel se calcula a partir de ella). */
  xp: number;
  /** Calendario de recompensas: perder un día NO reinicia el progreso (sin presión FOMO). */
  dailyReward: { lastClaimDay: string | null; index: number };
  dailyChallenge: { day: string | null; best: number };
  missions: { day: string | null; list: MissionState[] };
  pass: { season: string; xp: number; premium: boolean; claimedFree: number[]; claimedPremium: number[] };
  flags: { welcomeOfferShown: boolean };
  settings: { sound: boolean; haptics: boolean };
  stats: { gamesPlayed: number; gamesSinceInterstitial: number; lastInterstitialAt: number; totalLines: number; bestCombo: number };
}

const KEY = 'gemzy-blocks-save';

export function defaultSave(): SaveData {
  return {
    version: 2,
    coins: 0,
    gems: 20,
    removeAds: false,
    ownedThemes: ['classic'],
    theme: 'classic',
    ownedProducts: [],
    processedPurchases: [],
    bestScore: 0,
    adventureLevel: 1,
    levelStars: {},
    boosters: { hammer: 2, bomb: 1, shuffle: 1 },
    xp: 0,
    dailyReward: { lastClaimDay: null, index: 0 },
    dailyChallenge: { day: null, best: 0 },
    missions: { day: null, list: [] },
    pass: { season: 'S1', xp: 0, premium: false, claimedFree: [], claimedPremium: [] },
    flags: { welcomeOfferShown: false },
    settings: { sound: true, haptics: true },
    stats: { gamesPlayed: 0, gamesSinceInterstitial: 0, lastInterstitialAt: 0, totalLines: 0, bestCombo: 0 },
  };
}

export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadSave(storage: Storage | null): SaveData {
  const base = defaultSave();
  if (!storage) return base;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SaveData> & { hammers?: number };
    const save: SaveData = {
      ...base,
      ...parsed,
      version: 2,
      boosters: { ...base.boosters, ...parsed.boosters },
      dailyReward: { ...base.dailyReward, ...parsed.dailyReward },
      dailyChallenge: { ...base.dailyChallenge, ...parsed.dailyChallenge },
      missions: { ...base.missions, ...parsed.missions },
      pass: { ...base.pass, ...parsed.pass },
      flags: { ...base.flags, ...parsed.flags },
      settings: { ...base.settings, ...parsed.settings },
      stats: { ...base.stats, ...parsed.stats },
    };
    // Migración desde la versión 1 (solo había martillos).
    if (parsed.version === undefined || (parsed.version as number) < 2) {
      if (typeof parsed.hammers === 'number') save.boosters.hammer = parsed.hammers;
    }
    delete (save as Partial<SaveData> & { hammers?: number }).hammers;
    return save;
  } catch {
    return base;
  }
}

export function writeSave(storage: Storage | null, data: SaveData): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* almacenamiento lleno o bloqueado: el juego sigue funcionando */
  }
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
