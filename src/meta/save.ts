export interface SaveData {
  version: 1;
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
  hammers: number;
  /** Calendario de recompensas: perder un día NO reinicia el progreso (sin presión FOMO). */
  dailyReward: { lastClaimDay: string | null; index: number };
  dailyChallenge: { day: string | null; best: number };
  settings: { sound: boolean; haptics: boolean };
  stats: { gamesPlayed: number; gamesSinceInterstitial: number; lastInterstitialAt: number };
}

const KEY = 'joya-bloques-save';

export function defaultSave(): SaveData {
  return {
    version: 1,
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
    hammers: 2,
    dailyReward: { lastClaimDay: null, index: 0 },
    dailyChallenge: { day: null, best: 0 },
    settings: { sound: true, haptics: true },
    stats: { gamesPlayed: 0, gamesSinceInterstitial: 0, lastInterstitialAt: 0 },
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
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...base,
      ...parsed,
      dailyReward: { ...base.dailyReward, ...parsed.dailyReward },
      dailyChallenge: { ...base.dailyChallenge, ...parsed.dailyChallenge },
      settings: { ...base.settings, ...parsed.settings },
      stats: { ...base.stats, ...parsed.stats },
    };
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
