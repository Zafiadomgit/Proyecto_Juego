import { Board } from './board';
import { COLOR_COUNT } from './pieces';
import { Rng } from './rng';

export interface LevelDef {
  number: number;
  seed: number;
  board: Board;
  gemTarget: number;
}

/**
 * Genera el nivel N de aventura de forma determinista.
 * Los bloques iniciales se agrupan en filas parciales (a un lado del tablero) en lugar de
 * dispersarse: así el resto del tablero queda abierto para piezas grandes y el nivel es justo.
 * La dificultad sube con el nº de filas ocupadas y de gemas. Nunca empieza con líneas completas.
 */
export function generateLevel(n: number): LevelDef {
  const seed = (0x9e3779b1 ^ Math.imul(n, 2654435761)) >>> 0;
  const rng = new Rng(seed);
  const board = new Board();
  const size = board.size;

  const rowsToFill = Math.min(2 + Math.floor(n / 8), 4);
  const fromTop = n % 4 === 3;
  const filled: number[] = [];
  for (let k = 0; k < rowsToFill; k++) {
    const r = fromTop ? k : size - 1 - k;
    const count = 4 + rng.int(3); // 4..6 de 8: nunca una fila completa
    const cols = [...Array(size).keys()];
    for (let i = 0; i < count; i++) {
      const j = i + rng.int(cols.length - i);
      [cols[i], cols[j]] = [cols[j], cols[i]];
      board.set(r, cols[i], 1 + rng.int(COLOR_COUNT));
      filled.push(r * size + cols[i]);
    }
  }

  const gemTarget = Math.min(2 + Math.floor(n / 4), 10, filled.length);
  for (let i = 0; i < gemTarget; i++) {
    const j = i + rng.int(filled.length - i);
    [filled[i], filled[j]] = [filled[j], filled[i]];
    board.gems[filled[i]] = true;
  }

  return { number: n, seed, board, gemTarget: board.gemCount() };
}

/** Estrellas según jugadas usadas: recompensa la eficiencia sin castigar al que termina. */
export function starsForLevel(gemTarget: number, movesUsed: number): 1 | 2 | 3 {
  const par = gemTarget * 2 + 4;
  if (movesUsed <= par) return 3;
  if (movesUsed <= par * 1.6) return 2;
  return 1;
}
