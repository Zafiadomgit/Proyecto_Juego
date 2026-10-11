/** Temas puramente cosméticos: nunca dan ventaja de juego (evita el "pay-to-win"). */
export interface Theme {
  id: string;
  name: string;
  price: { currency: 'coins' | 'gems'; amount: number } | null;
  /** Solo se obtiene con un producto concreto (p. ej. el pack de inicio). */
  exclusiveTo?: string;
  background: [string, string];
  boardBg: string;
  cellEmpty: string;
  blocks: string[];
}

export const THEMES: readonly Theme[] = [
  {
    id: 'classic',
    name: 'Clásico',
    price: null,
    background: ['#1b2a6b', '#0d1440'],
    boardBg: '#101a4d',
    cellEmpty: '#1c2a6e',
    blocks: ['#ff5d5d', '#ffa53b', '#ffd93b', '#5ee05e', '#3bc8ff', '#6c7bff', '#c46cff'],
  },
  {
    id: 'neon',
    name: 'Neón',
    price: { currency: 'coins', amount: 400 },
    background: ['#120024', '#000000'],
    boardBg: '#0b0016',
    cellEmpty: '#1d0838',
    blocks: ['#ff2bd6', '#ff7b00', '#f5ff00', '#00ff9d', '#00e5ff', '#4d6bff', '#b300ff'],
  },
  {
    id: 'ocean',
    name: 'Océano',
    price: { currency: 'coins', amount: 800 },
    background: ['#0a6c8f', '#03263d'],
    boardBg: '#063a55',
    cellEmpty: '#0b4d6e',
    blocks: ['#ff8a80', '#ffcc80', '#fff59d', '#a5d6a7', '#80deea', '#90caf9', '#ce93d8'],
  },
  {
    id: 'candy',
    name: 'Dulce',
    price: { currency: 'coins', amount: 1200 },
    background: ['#ffb3d1', '#c86b9f'],
    boardBg: '#8e3d6b',
    cellEmpty: '#a8507f',
    blocks: ['#ff4f81', '#ff9e5e', '#ffe066', '#7be495', '#5ed1ff', '#8f8cff', '#e07bff'],
  },
  {
    id: 'galaxy',
    name: 'Galaxia',
    price: { currency: 'gems', amount: 150 },
    background: ['#2b1055', '#0a0420'],
    boardBg: '#160a33',
    cellEmpty: '#25134d',
    blocks: ['#ff6fb5', '#ffb86f', '#fff06f', '#6fffb0', '#6fd8ff', '#8f7bff', '#d86fff'],
  },
  {
    id: 'gold',
    name: 'Oro Real',
    price: null,
    exclusiveTo: 'starter_pack',
    background: ['#3d2a00', '#120c00'],
    boardBg: '#241900',
    cellEmpty: '#3a2900',
    blocks: ['#ffd700', '#ffb300', '#ffe680', '#f0c419', '#d4a017', '#ffcf40', '#e6be8a'],
  },
];

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
