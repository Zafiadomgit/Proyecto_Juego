import { Board, type ClearResult } from './board';
import { generateLevel } from './levels';
import { COLOR_COUNT, SHAPES, rotateShape, type Piece, type PieceShape } from './pieces';
import { Rng } from './rng';
import {
  COMBO_GRACE_MOVES,
  PERFECT_CLEAR_BONUS,
  comboLabel,
  linePoints,
  placementPoints,
} from './scoring';

export type GameMode =
  | { kind: 'classic' }
  | { kind: 'daily'; seed: number }
  | { kind: 'adventure'; level: number };

export const TRAY_SIZE = 3;
/** Giros: recurso táctico. Se empieza con 3 y se gana 1 por despejar 2+ líneas a la vez (máx. 5). */
export const START_ROTATIONS = 3;
export const MAX_ROTATIONS = 5;

export interface PlaceResult {
  points: number;
  clear: ClearResult;
  combo: number;
  label: string | null;
  perfect: boolean;
  gameOver: boolean;
  won: boolean;
  rotationEarned: boolean;
}

export class Game {
  readonly mode: GameMode;
  readonly board: Board;
  readonly rng: Rng;
  tray: (Piece | null)[] = [];
  score = 0;
  combo = 0;
  movesSinceClear = 0;
  moves = 0;
  linesCleared = 0;
  gemsCollected = 0;
  gemTarget = 0;
  revivesUsed = 0;
  maxCombo = 0;
  perfects = 0;
  rotations = 0;
  rotationCharges = START_ROTATIONS;
  over = false;
  won = false;

  constructor(mode: GameMode, seed = Date.now()) {
    this.mode = mode;
    if (mode.kind === 'adventure') {
      const level = generateLevel(mode.level);
      this.board = level.board;
      this.gemTarget = level.gemTarget;
      this.rng = new Rng(level.seed + 1);
    } else {
      this.board = new Board();
      this.rng = new Rng(mode.kind === 'daily' ? mode.seed : seed);
    }
    this.refillTray();
  }

  /**
   * Rellena la bandeja con 3 piezas. Regla de justicia: si alguna pieza del catálogo cabe,
   * garantizamos que al menos una de la bandeja cabe. Con el tablero lleno se favorecen piezas pequeñas.
   */
  refillTray(): void {
    const fill = this.board.filledCount() / (this.board.size * this.board.size);
    const weights = SHAPES.map((s) => {
      const n = s.cells.length;
      if (fill > 0.55 && n >= 5) return s.weight * 0.4;
      if (fill > 0.55 && n <= 3) return s.weight * 1.6;
      return s.weight;
    });
    const drawShape = () => SHAPES[this.rng.weighted(weights)];
    const makePiece = (shape: PieceShape): Piece => ({ shape, color: 1 + this.rng.int(COLOR_COUNT) });

    // Intentamos varias bandejas y nos quedamos con la primera en la que todas las piezas caben
    // individualmente; así se evitan las muertes "injustas" por piezas imposibles.
    let tray: Piece[] = [];
    for (let attempt = 0; attempt < 12; attempt++) {
      tray = Array.from({ length: TRAY_SIZE }, () => makePiece(drawShape()));
      if (tray.every((p) => this.fits(p.shape))) break;
    }

    if (!tray.some((p) => this.fits(p.shape))) {
      const fitting = SHAPES.filter((s) => this.board.fitsAnywhere(s));
      if (fitting.length > 0) tray[this.rng.int(TRAY_SIZE)] = makePiece(this.rng.pick(fitting));
    }
    this.tray = tray;
  }

  canPlace(trayIndex: number, row: number, col: number): boolean {
    const piece = this.tray[trayIndex];
    return !!piece && !this.over && this.board.canPlace(piece.shape, row, col);
  }

  /** Celdas que se despejarían si se coloca la pieza ahí (para la vista previa). */
  previewClears(trayIndex: number, row: number, col: number): { rows: number[]; cols: number[] } {
    const piece = this.tray[trayIndex];
    if (!piece || !this.board.canPlace(piece.shape, row, col)) return { rows: [], cols: [] };
    const sim = this.board.clone();
    sim.place(piece.shape, row, col, piece.color);
    return sim.findFullLines();
  }

  place(trayIndex: number, row: number, col: number): PlaceResult {
    const piece = this.tray[trayIndex];
    if (!piece) throw new Error('No hay pieza en esa posición');
    if (this.over) throw new Error('La partida ha terminado');
    this.board.place(piece.shape, row, col, piece.color);
    this.tray[trayIndex] = null;
    this.moves++;

    let points = placementPoints(piece.shape.cells.length);
    const clear = this.board.clearFullLines();
    const lines = clear.rows.length + clear.cols.length;

    if (lines > 0) {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.movesSinceClear = 0;
      this.linesCleared += lines;
      points += linePoints(lines, this.combo);
    } else {
      this.movesSinceClear++;
      if (this.movesSinceClear >= COMBO_GRACE_MOVES) this.combo = 0;
    }

    const perfect = lines > 0 && this.board.isEmpty();
    let rotationEarned = false;
    if ((lines >= 2 || perfect) && this.rotationCharges < MAX_ROTATIONS) {
      this.rotationCharges++;
      rotationEarned = true;
    }
    if (perfect) {
      points += PERFECT_CLEAR_BONUS;
      this.perfects++;
    }
    this.score += points;
    this.gemsCollected += clear.gemsCollected;

    if (this.mode.kind === 'adventure' && this.gemsCollected >= this.gemTarget) {
      this.won = true;
      this.over = true;
    }

    if (this.tray.every((p) => p === null)) this.refillTray();
    if (!this.over && !this.hasAnyMove()) this.over = true;

    return {
      points,
      clear,
      combo: this.combo,
      label: lines > 0 ? comboLabel(lines, this.combo) : null,
      perfect,
      gameOver: this.over,
      won: this.won,
      rotationEarned,
    };
  }

  /** ¿Puede colocarse esta forma? Si quedan giros, vale cualquier orientación. */
  fits(shape: PieceShape): boolean {
    return this.rotationCharges > 0 ? this.board.fitsAnyRotation(shape) : this.board.fitsAnywhere(shape);
  }

  hasAnyMove(): boolean {
    return this.tray.some((p) => p !== null && this.fits(p.shape));
  }

  /** Gira 90° la pieza de la bandeja gastando un giro. */
  rotate(trayIndex: number): boolean {
    const piece = this.tray[trayIndex];
    if (!piece || this.over || this.rotationCharges <= 0) return false;
    this.tray[trayIndex] = { ...piece, shape: rotateShape(piece.shape) };
    this.rotations++;
    this.rotationCharges--;
    // Sin giros, una pieza que solo cabía girada puede dejar la partida sin movimientos.
    if (!this.hasAnyMove()) this.over = true;
    return true;
  }

  /** Bomba: vacía un área de 3×3 alrededor de la celda (las gemas resisten). Devuelve las celdas vaciadas. */
  useBomb(row: number, col: number): { r: number; c: number; color: number }[] {
    if (this.over || !this.board.inBounds(row, col)) return [];
    const cleared: { r: number; c: number; color: number }[] = [];
    for (let r = row - 1; r <= row + 1; r++)
      for (let c = col - 1; c <= col + 1; c++) {
        if (!this.board.inBounds(r, c) || this.board.isGem(r, c)) continue;
        const v = this.board.get(r, c);
        if (v === 0) continue;
        cleared.push({ r, c, color: v });
        this.board.set(r, c, 0);
      }
    return cleared;
  }

  /** Barajar: cambia las piezas de la bandeja por otras nuevas. */
  shuffle(): boolean {
    if (this.over) return false;
    this.refillTray();
    return true;
  }

  /** Martillo: elimina un bloque normal (no gemas). No puede completar líneas, solo abre hueco. */
  canHammer(row: number, col: number): boolean {
    return !this.over && this.board.inBounds(row, col) && this.board.get(row, col) !== 0 && !this.board.isGem(row, col);
  }

  useHammer(row: number, col: number): void {
    if (!this.canHammer(row, col)) throw new Error('No se puede usar el martillo ahí');
    this.board.set(row, col, 0);
  }

  /**
   * Segunda oportunidad (anuncio recompensado o gemas): vacía las 3 filas más llenas
   * (conservando las gemas del modo aventura) y da una bandeja nueva. Máximo una por partida.
   */
  canRevive(): boolean {
    return this.over && !this.won && this.revivesUsed < 1;
  }

  revive(): void {
    if (!this.canRevive()) throw new Error('No se puede revivir');
    const size = this.board.size;
    const rows = [...Array(size).keys()]
      .map((r) => ({ r, n: [...Array(size).keys()].filter((c) => this.board.get(r, c) !== 0).length }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 3);
    for (const { r } of rows)
      for (let c = 0; c < size; c++) if (!this.board.isGem(r, c)) this.board.set(r, c, 0);
    this.revivesUsed++;
    this.over = false;
    this.combo = 0;
    this.refillTray();
  }
}
