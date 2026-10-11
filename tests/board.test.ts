import { describe, expect, it } from 'vitest';
import { Board } from '../src/core/board';
import { shapeById } from '../src/core/pieces';

describe('Board', () => {
  it('coloca piezas solo en huecos libres y dentro del tablero', () => {
    const b = new Board();
    const sq = shapeById('sq2');
    expect(b.canPlace(sq, 0, 0)).toBe(true);
    b.place(sq, 0, 0, 1);
    expect(b.canPlace(sq, 0, 0)).toBe(false);
    expect(b.canPlace(sq, 1, 1)).toBe(false);
    expect(b.canPlace(sq, 7, 7)).toBe(false);
    expect(b.canPlace(sq, 6, 6)).toBe(true);
  });

  it('despeja filas y columnas a la vez sin contar dos veces el cruce', () => {
    const b = Board.from([
      '#######.',
      '.......#',
      '.......#',
      '.......#',
      '.......#',
      '.......#',
      '.......#',
      '.......#',
    ]);
    b.place(shapeById('dot'), 0, 7, 2);
    const res = b.clearFullLines();
    expect(res.rows).toEqual([0]);
    expect(res.cols).toEqual([7]);
    expect(res.cells.length).toBe(15);
    expect(b.isEmpty()).toBe(true);
  });

  it('cuenta las gemas recogidas', () => {
    const b = Board.from([
      '*#*####.',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ]);
    b.place(shapeById('dot'), 0, 7, 3);
    expect(b.clearFullLines().gemsCollected).toBe(2);
    expect(b.gemCount()).toBe(0);
  });

  it('detecta cuándo una pieza no cabe en ningún sitio', () => {
    const rows = Array.from({ length: 8 }, (_, r) => (r % 2 === 0 ? '#.#.#.#.' : '.#.#.#.#'));
    const b = Board.from(rows);
    expect(b.fitsAnywhere(shapeById('dot'))).toBe(true);
    expect(b.fitsAnywhere(shapeById('h2'))).toBe(false);
  });
});
