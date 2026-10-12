/** Temas puramente cosméticos: nunca dan ventaja de juego (evita el "pay-to-win"). */
export interface Theme {
  id: string;
  name: string;
  price: { currency: 'coins' | 'gems'; amount: number } | null;
  /** Solo se obtiene con un producto concreto (p. ej. el pack de inicio). */
  exclusiveTo?: string;
  boardBg: string;
  cellEmpty: string;
  /** Color superior de cada bloque (degradado de arriba a abajo). */
  blocks: string[];
  /** Color inferior de cada bloque; si falta se oscurece `blocks` automáticamente. */
  blocksDeep?: string[];
}

export const THEMES: readonly Theme[] = [
  {
    id: 'classic',
    name: 'Noche',
    price: null,
    boardBg: '#1a1158',
    cellEmpty: '#22186a',
    blocks: ['#ff8a8a', '#ffc078', '#ffe680', '#8ef08e', '#7fe0ff', '#a3a8ff', '#e0a3ff'],
    blocksDeep: ['#e84a5f', '#ff8c1a', '#f5c000', '#34c25a', '#1fa8e8', '#5b63f0', '#a64dff'],
  },
  {
    id: 'neon',
    name: 'Neón',
    price: { currency: 'coins', amount: 400 },
    boardBg: '#0b0016',
    cellEmpty: '#1d0838',
    blocks: ['#ff2bd6', '#ff7b00', '#f5ff00', '#00ff9d', '#00e5ff', '#4d6bff', '#b300ff'],
  },
  {
    id: 'ocean',
    name: 'Océano',
    price: { currency: 'coins', amount: 800 },
    boardBg: '#063a55',
    cellEmpty: '#0b4d6e',
    blocks: ['#ff8a80', '#ffcc80', '#fff59d', '#a5d6a7', '#80deea', '#90caf9', '#ce93d8'],
  },
  {
    id: 'candy',
    name: 'Dulce',
    price: { currency: 'coins', amount: 1200 },
    boardBg: '#8e3d6b',
    cellEmpty: '#a8507f',
    blocks: ['#ff4f81', '#ff9e5e', '#ffe066', '#7be495', '#5ed1ff', '#8f8cff', '#e07bff'],
  },
  {
    id: 'galaxy',
    name: 'Galaxia',
    price: { currency: 'gems', amount: 150 },
    boardBg: '#160a33',
    cellEmpty: '#25134d',
    blocks: ['#ff6fb5', '#ffb86f', '#fff06f', '#6fffb0', '#6fd8ff', '#8f7bff', '#d86fff'],
  },
  {
    id: 'gold',
    name: 'Oro Real',
    price: null,
    exclusiveTo: 'starter_pack',
    boardBg: '#241900',
    cellEmpty: '#3a2900',
    blocks: ['#ffd700', '#ffb300', '#ffe680', '#f0c419', '#d4a017', '#ffcf40', '#e6be8a'],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    price: null,
    exclusiveTo: 'gemzy_pass_s1',
    boardBg: '#0a1f3a',
    cellEmpty: '#11304f',
    blocks: ['#ff9ad5', '#ffd29a', '#fff6a3', '#9affc8', '#8ff3ff', '#a9b8ff', '#e1a6ff'],
    blocksDeep: ['#e0459b', '#ff9a3c', '#f0d000', '#2fd38a', '#20b9e6', '#5a6cf0', '#a855f7'],
  },
];

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
