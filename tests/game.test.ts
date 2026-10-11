import { describe, expect, it } from 'vitest';
import { Game } from '../src/core/game';
import { generateLevel, starsForLevel } from '../src/core/levels';
import { linePoints } from '../src/core/scoring';

/** Juega automáticamente colocando la primera pieza en la primera posición válida. */
function autoplay(game: Game, maxMoves = 500): void {
  for (let m = 0; m < maxMoves && !game.over; m++) {
    let placed = false;
    for (let i = 0; i < game.tray.length && !placed; i++) {
      for (let r = 0; r < 8 && !placed; r++)
        for (let c = 0; c < 8 && !placed; c++)
          if (game.canPlace(i, r, c)) {
            game.place(i, r, c);
            placed = true;
          }
    }
    if (!placed) break;
  }
}

describe('Game', () => {
  it('siempre ofrece una bandeja con al menos una pieza colocable mientras haya hueco', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = new Game({ kind: 'classic' }, seed);
      expect(g.hasAnyMove()).toBe(true);
    }
  });

  it('las partidas terminan y la puntuación crece', () => {
    const g = new Game({ kind: 'classic' }, 42);
    autoplay(g);
    expect(g.over).toBe(true);
    expect(g.score).toBeGreaterThan(0);
  });

  it('el reto diario es reproducible con la misma semilla', () => {
    const a = new Game({ kind: 'daily', seed: 1234 });
    const b = new Game({ kind: 'daily', seed: 1234 });
    expect(a.tray.map((p) => p?.shape.id)).toEqual(b.tray.map((p) => p?.shape.id));
  });

  it('revivir solo se permite una vez y deja jugar de nuevo', () => {
    const g = new Game({ kind: 'classic' }, 7);
    autoplay(g);
    expect(g.canRevive()).toBe(true);
    g.revive();
    expect(g.over).toBe(false);
    expect(g.hasAnyMove()).toBe(true);
    autoplay(g);
    expect(g.canRevive()).toBe(false);
  });

  it('las jugadas múltiples y las rachas puntúan más', () => {
    expect(linePoints(2, 1)).toBeGreaterThan(2 * linePoints(1, 1));
    expect(linePoints(1, 3)).toBeGreaterThan(linePoints(1, 1));
  });

  it('el martillo no puede romper gemas', () => {
    const g = new Game({ kind: 'adventure', level: 3 });
    const size = g.board.size;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) if (g.board.isGem(r, c)) expect(g.canHammer(r, c)).toBe(false);
  });
});

describe('Niveles de aventura', () => {
  it('son deterministas, tienen gemas y no empiezan con líneas completas', () => {
    for (let n = 1; n <= 60; n++) {
      const a = generateLevel(n);
      const b = generateLevel(n);
      expect(a.board.cells).toEqual(b.board.cells);
      expect(a.gemTarget).toBeGreaterThan(0);
      const full = a.board.findFullLines();
      expect(full.rows.length + full.cols.length).toBe(0);
    }
  });

  it('la dificultad crece con el número de nivel', () => {
    expect(generateLevel(30).gemTarget).toBeGreaterThan(generateLevel(1).gemTarget);
  });

  it('otorga más estrellas cuanto más eficiente', () => {
    expect(starsForLevel(4, 5)).toBe(3);
    expect(starsForLevel(4, 100)).toBe(1);
  });
});
