import { describe, expect, it } from 'vitest';
import { Game } from '../src/core/game';
import { Board } from '../src/core/board';
import { orientations, rotateShape, shapeById } from '../src/core/pieces';
import { generateLevel, starsForLevel } from '../src/core/levels';
import { linePoints } from '../src/core/scoring';

/** Juega automáticamente: primera posición válida, probando las 4 orientaciones de cada pieza. */
function autoplay(game: Game, maxMoves = 500): void {
  for (let m = 0; m < maxMoves && !game.over; m++) {
    let placed = false;
    for (let i = 0; i < game.tray.length && !placed; i++) {
      for (let rot = 0; rot < 4 && !placed && game.tray[i]; rot++) {
        for (let r = 0; r < 8 && !placed; r++)
          for (let c = 0; c < 8 && !placed; c++)
            if (game.canPlace(i, r, c)) {
              game.place(i, r, c);
              placed = true;
            }
        if (!placed) game.rotate(i);
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

describe('Giro de piezas', () => {
  it('cuatro giros devuelven la forma original', () => {
    const l = shapeById('l1');
    let s = l;
    for (let i = 0; i < 4; i++) s = rotateShape(s);
    const key = (x: typeof l) => x.cells.map(([r, c]) => `${r},${c}`).sort().join(' ');
    expect(key(s)).toBe(key(l));
    expect(key(rotateShape(l))).not.toBe(key(l));
  });

  it('las formas simétricas tienen menos orientaciones', () => {
    expect(orientations(shapeById('sq2')).length).toBe(1);
    expect(orientations(shapeById('h3')).length).toBe(2);
    expect(orientations(shapeById('t1')).length).toBe(4);
  });

  it('una pieza que solo cabe girada no termina la partida', () => {
    const b = Board.from(Array.from({ length: 8 }, (_, r) => (r === 0 ? '#.######' : '########').replace(/#/g, '#')));
    // solo queda un hueco vertical de 1 en la columna 1, fila 0: la barra horizontal no cabe, pero tampoco girada
    expect(b.fitsAnyRotation(shapeById('h2'))).toBe(false);
    const b2 = Board.from(['#.######', '#.######', '########', '########', '########', '########', '########', '########']);
    expect(b2.fitsAnywhere(shapeById('h2'))).toBe(false);
    expect(b2.fitsAnyRotation(shapeById('h2'))).toBe(true);
  });

  it('girar cambia la pieza de la bandeja y cuenta', () => {
    const g = new Game({ kind: 'classic' }, 3);
    const before = g.tray[0]!.shape.id;
    expect(g.rotate(0)).toBe(true);
    expect(g.tray[0]!.shape.id).not.toBe(before);
    expect(g.rotations).toBe(1);
  });
});

describe('Potenciadores', () => {
  it('la bomba vacía 3×3 pero respeta las gemas', () => {
    const g = new Game({ kind: 'classic' }, 5);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g.board.set(r, c, 2);
    g.board.gems[1 * 8 + 1] = true;
    const cleared = g.useBomb(1, 1);
    expect(cleared.length).toBe(8);
    expect(g.board.get(1, 1)).toBe(2);
    expect(g.board.get(0, 0)).toBe(0);
  });

  it('barajar da una bandeja nueva completa', () => {
    const g = new Game({ kind: 'classic' }, 9);
    g.tray[1] = null;
    g.shuffle();
    expect(g.tray.every((p) => p !== null)).toBe(true);
  });
});

describe('Giros limitados', () => {
  it('se empieza con 3 giros y sin giros no se puede girar', () => {
    const g = new Game({ kind: 'classic' }, 11);
    expect(g.rotationCharges).toBe(3);
    g.rotate(0);
    g.rotate(0);
    g.rotate(0);
    expect(g.rotationCharges).toBe(0);
    expect(g.rotate(0)).toBe(false);
  });

  it('despejar 2 líneas a la vez da un giro', () => {
    const g = new Game({ kind: 'classic' }, 13);
    g.rotationCharges = 1;
    for (let c = 0; c < 7; c++) {
      g.board.set(0, c, 1);
      g.board.set(1, c, 1);
    }
    g.tray[0] = { shape: shapeById('v2'), color: 1 };
    const res = g.place(0, 0, 7);
    expect(res.clear.rows.length).toBe(2);
    expect(res.rotationEarned).toBe(true);
    expect(g.rotationCharges).toBe(2);
  });
});
