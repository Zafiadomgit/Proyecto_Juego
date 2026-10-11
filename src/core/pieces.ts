/** Una pieza es una lista de celdas [fila, columna] normalizada a la esquina superior izquierda. */
export type Cell = readonly [number, number];

export interface PieceShape {
  id: string;
  cells: readonly Cell[];
  /** Peso relativo de aparición; las piezas grandes/difíciles salen menos. */
  weight: number;
}

export interface Piece {
  shape: PieceShape;
  color: number;
}

export const COLOR_COUNT = 7;

function shape(id: string, rows: string[], weight: number): PieceShape {
  const cells: Cell[] = [];
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '#') cells.push([r, c]);
    });
  });
  return { id, cells, weight };
}

export const SHAPES: readonly PieceShape[] = [
  shape('dot', ['#'], 4),
  shape('h2', ['##'], 6),
  shape('v2', ['#', '#'], 6),
  shape('h3', ['###'], 6),
  shape('v3', ['#', '#', '#'], 6),
  shape('h4', ['####'], 4),
  shape('v4', ['#', '#', '#', '#'], 4),
  shape('h5', ['#####'], 2),
  shape('v5', ['#', '#', '#', '#', '#'], 2),
  shape('sq2', ['##', '##'], 6),
  shape('sq3', ['###', '###', '###'], 2),
  shape('rect23', ['###', '###'], 3),
  shape('rect32', ['##', '##', '##'], 3),
  shape('l1', ['#.', '#.', '##'], 3),
  shape('l2', ['###', '#..'], 3),
  shape('l3', ['##', '.#', '.#'], 3),
  shape('l4', ['..#', '###'], 3),
  shape('j1', ['.#', '.#', '##'], 3),
  shape('j2', ['#..', '###'], 3),
  shape('j3', ['##', '#.', '#.'], 3),
  shape('j4', ['###', '..#'], 3),
  shape('t1', ['###', '.#.'], 3),
  shape('t2', ['.#.', '###'], 3),
  shape('t3', ['#.', '##', '#.'], 3),
  shape('t4', ['.#', '##', '.#'], 3),
  shape('s1', ['.##', '##.'], 2),
  shape('s2', ['#.', '##', '.#'], 2),
  shape('z1', ['##.', '.##'], 2),
  shape('z2', ['.#', '##', '#.'], 2),
  shape('c2', ['##', '#.'], 4),
  shape('c3', ['##', '.#'], 4),
  shape('c4', ['#.', '##'], 4),
  shape('c1', ['.#', '##'], 4),
  shape('bigL', ['#..', '#..', '###'], 1),
  shape('bigJ', ['###', '..#', '..#'], 1),
];

export function shapeSize(s: PieceShape): { rows: number; cols: number } {
  let rows = 0;
  let cols = 0;
  for (const [r, c] of s.cells) {
    rows = Math.max(rows, r + 1);
    cols = Math.max(cols, c + 1);
  }
  return { rows, cols };
}

export function shapeById(id: string): PieceShape {
  const s = SHAPES.find((x) => x.id === id);
  if (!s) throw new Error(`Pieza desconocida: ${id}`);
  return s;
}
