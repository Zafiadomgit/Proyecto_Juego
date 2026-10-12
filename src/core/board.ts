import { orientations, type PieceShape } from './pieces';

export const BOARD_SIZE = 8;

export interface ClearResult {
  rows: number[];
  cols: number[];
  /** Celdas despejadas, con su color previo (para efectos visuales). */
  cells: { r: number; c: number; color: number; gem: boolean }[];
  gemsCollected: number;
}

/**
 * Tablero de juego. 0 = vacío, 1..N = color del bloque.
 * `gems` marca bloques especiales (modo aventura) que se recogen al despejar su línea.
 */
export class Board {
  readonly size: number;
  readonly cells: number[];
  readonly gems: boolean[];

  constructor(size = BOARD_SIZE) {
    this.size = size;
    this.cells = new Array(size * size).fill(0);
    this.gems = new Array(size * size).fill(false);
  }

  static from(rows: string[]): Board {
    const b = new Board(rows.length);
    rows.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (ch === '#') b.set(r, c, 1);
        if (ch === '*') {
          b.set(r, c, 1);
          b.gems[r * b.size + c] = true;
        }
      }),
    );
    return b;
  }

  clone(): Board {
    const b = new Board(this.size);
    b.cells.splice(0, this.cells.length, ...this.cells);
    b.gems.splice(0, this.gems.length, ...this.gems);
    return b;
  }

  get(r: number, c: number): number {
    return this.cells[r * this.size + c];
  }

  set(r: number, c: number, v: number): void {
    this.cells[r * this.size + c] = v;
  }

  isGem(r: number, c: number): boolean {
    return this.gems[r * this.size + c];
  }

  inBounds(r: number, c: number): boolean {
    return r >= 0 && c >= 0 && r < this.size && c < this.size;
  }

  canPlace(shape: PieceShape, row: number, col: number): boolean {
    for (const [dr, dc] of shape.cells) {
      const r = row + dr;
      const c = col + dc;
      if (!this.inBounds(r, c) || this.get(r, c) !== 0) return false;
    }
    return true;
  }

  place(shape: PieceShape, row: number, col: number, color: number): void {
    if (!this.canPlace(shape, row, col)) throw new Error('Colocación inválida');
    for (const [dr, dc] of shape.cells) this.set(row + dr, col + dc, color);
  }

  /** Filas y columnas que quedarían completas (sin modificar el tablero). */
  findFullLines(): { rows: number[]; cols: number[] } {
    const rows: number[] = [];
    const cols: number[] = [];
    for (let i = 0; i < this.size; i++) {
      let rowFull = true;
      let colFull = true;
      for (let j = 0; j < this.size; j++) {
        if (this.get(i, j) === 0) rowFull = false;
        if (this.get(j, i) === 0) colFull = false;
      }
      if (rowFull) rows.push(i);
      if (colFull) cols.push(i);
    }
    return { rows, cols };
  }

  /** Despeja las líneas completas y devuelve lo que se eliminó. */
  clearFullLines(): ClearResult {
    const { rows, cols } = this.findFullLines();
    const seen = new Set<number>();
    const cells: ClearResult['cells'] = [];
    const mark = (r: number, c: number) => {
      const idx = r * this.size + c;
      if (seen.has(idx)) return;
      seen.add(idx);
      cells.push({ r, c, color: this.cells[idx], gem: this.gems[idx] });
    };
    for (const r of rows) for (let c = 0; c < this.size; c++) mark(r, c);
    for (const c of cols) for (let r = 0; r < this.size; r++) mark(r, c);
    let gemsCollected = 0;
    for (const { r, c, gem } of cells) {
      const idx = r * this.size + c;
      this.cells[idx] = 0;
      this.gems[idx] = false;
      if (gem) gemsCollected++;
    }
    return { rows, cols, cells, gemsCollected };
  }

  fitsAnywhere(shape: PieceShape): boolean {
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++) if (this.canPlace(shape, r, c)) return true;
    return false;
  }

  /** ¿Cabe en alguna orientación? (el jugador puede girar las piezas) */
  fitsAnyRotation(shape: PieceShape): boolean {
    return orientations(shape).some((o) => this.fitsAnywhere(o));
  }

  isEmpty(): boolean {
    return this.cells.every((v) => v === 0);
  }

  filledCount(): number {
    return this.cells.reduce((n, v) => n + (v !== 0 ? 1 : 0), 0);
  }

  gemCount(): number {
    return this.gems.reduce((n, g) => n + (g ? 1 : 0), 0);
  }
}
