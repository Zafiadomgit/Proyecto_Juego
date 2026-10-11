/**
 * Puntuación:
 * - 1 punto por celda colocada.
 * - Líneas: 10 por línea, multiplicado por el nº de líneas simultáneas (premia jugadas grandes).
 * - Racha (combo): despejar en jugadas consecutivas multiplica el bonus de líneas.
 * - Tablero limpio: bonus fijo grande.
 */
export const PERFECT_CLEAR_BONUS = 300;
/** Jugadas sin despejar que se toleran antes de romper la racha. */
export const COMBO_GRACE_MOVES = 3;

export function placementPoints(cellCount: number): number {
  return cellCount;
}

export function linePoints(lines: number, combo: number): number {
  if (lines <= 0) return 0;
  const base = 10 * lines * lines;
  const comboMultiplier = 1 + Math.max(0, combo - 1) * 0.5;
  return Math.round(base * comboMultiplier);
}

export function comboLabel(lines: number, combo: number): string | null {
  if (combo >= 3) return `¡Racha x${combo}!`;
  if (lines >= 4) return '¡Increíble!';
  if (lines === 3) return '¡Genial!';
  if (lines === 2) return '¡Muy bien!';
  return null;
}

/** Monedas otorgadas al terminar una partida. Generosas para que la tienda sea alcanzable sin pagar. */
export function coinsForScore(score: number): number {
  return Math.floor(score / 50) + 5;
}
