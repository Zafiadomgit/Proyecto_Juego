import type { Game, PlaceResult } from '../core/game';
import { shapeSize, type Piece } from '../core/pieces';
import type { Theme } from '../meta/themes';
import { drawBlock, drawEmpty, drawGem, drawLit, roundRect } from './draw';
import { Fx } from './fx';

export interface GameViewHooks {
  theme(): Theme;
  onPick(): void;
  onPlaced(result: PlaceResult): void;
  onInvalid(): void;
  /** Modo martillo: devuelve true si se consumió el toque. */
  onCellTap(row: number, col: number): boolean;
  hammerActive(): boolean;
}

interface Drag {
  index: number;
  x: number;
  y: number;
  target: { row: number; col: number } | null;
}

/** Vista en canvas: tablero, bandeja de piezas, arrastrar y soltar y efectos. */
export class GameView {
  private ctx: CanvasRenderingContext2D;
  private game: Game | null = null;
  private fx = new Fx();
  private drag: Drag | null = null;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private cell = 0;
  private boardX = 0;
  private boardY = 0;
  private trayY = 0;
  private trayCell = 0;
  private placedAt = new Map<number, number>();
  private trayBornAt = 0;
  private trayRef: (Piece | null)[] = [];
  private last = performance.now();
  private running = false;

  constructor(private canvas: HTMLCanvasElement, private hooks: GameViewHooks) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', () => (this.drag = null));
    new ResizeObserver(() => this.layout()).observe(canvas.parentElement ?? canvas);
  }

  setGame(game: Game): void {
    this.game = game;
    this.drag = null;
    this.placedAt.clear();
    this.trayRef = [];
    this.layout();
    if (!this.running) {
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame((t) => this.frame(t));
    }
  }

  stop(): void {
    this.running = false;
  }

  private layout(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    const size = this.game?.board.size ?? 8;
    const boardPx = Math.min(this.w - 24, this.h * 0.66);
    this.cell = Math.floor(boardPx / size);
    const bp = this.cell * size;
    this.boardX = Math.round((this.w - bp) / 2);
    this.boardY = Math.round(Math.max(8, (this.h - bp - this.cell * 3.6) / 2));
    this.trayY = this.boardY + bp + this.cell * 0.5;
    this.trayCell = Math.min(this.cell * 0.55, (this.w / 3 - 16) / 5);
  }

  /** Centro del hueco i de la bandeja. */
  private slotCenter(i: number): { x: number; y: number } {
    const slotW = this.w / 3;
    return { x: slotW * i + slotW / 2, y: this.trayY + this.cell * 1.5 };
  }

  private pos(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private boardCellAt(x: number, y: number): { row: number; col: number } | null {
    const size = this.game?.board.size ?? 8;
    const col = Math.floor((x - this.boardX) / this.cell);
    const row = Math.floor((y - this.boardY) / this.cell);
    if (row < 0 || col < 0 || row >= size || col >= size) return null;
    return { row, col };
  }

  private onDown(e: PointerEvent): void {
    const g = this.game;
    if (!g || g.over) return;
    const p = this.pos(e);
    if (this.hooks.hammerActive()) {
      const c = this.boardCellAt(p.x, p.y);
      if (c && this.hooks.onCellTap(c.row, c.col)) {
        const color = this.hooks.theme().blocks[0];
        this.fx.burst(this.boardX + (c.col + 0.5) * this.cell, this.boardY + (c.row + 0.5) * this.cell, color, 14, 260);
        this.fx.shake = 4;
      }
      return;
    }
    if (p.y < this.trayY) return;
    const i = Math.min(2, Math.max(0, Math.floor(p.x / (this.w / 3))));
    if (!g.tray[i]) return;
    this.canvas.setPointerCapture(e.pointerId);
    this.drag = { index: i, x: p.x, y: p.y, target: null };
    this.hooks.onPick();
    this.updateTarget();
  }

  private onMove(e: PointerEvent): void {
    if (!this.drag) return;
    const p = this.pos(e);
    this.drag.x = p.x;
    this.drag.y = p.y;
    this.updateTarget();
  }

  /** Esquina superior izquierda (en píxeles) de la pieza arrastrada; se dibuja por encima del dedo. */
  private dragOrigin(piece: Piece): { x: number; y: number } {
    const d = this.drag!;
    const { rows, cols } = shapeSize(piece.shape);
    return { x: d.x - (cols * this.cell) / 2, y: d.y - rows * this.cell - this.cell * 1.2 };
  }

  private updateTarget(): void {
    const g = this.game;
    const d = this.drag;
    if (!g || !d) return;
    const piece = g.tray[d.index];
    if (!piece) return;
    const o = this.dragOrigin(piece);
    const col = Math.round((o.x - this.boardX) / this.cell);
    const row = Math.round((o.y - this.boardY) / this.cell);
    d.target = g.canPlace(d.index, row, col) ? { row, col } : null;
  }

  private onUp(e: PointerEvent): void {
    const g = this.game;
    const d = this.drag;
    this.drag = null;
    if (!g || !d) return;
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    if (!d.target) {
      const p = this.pos(e);
      if (p.y < this.trayY) this.hooks.onInvalid();
      return;
    }
    const piece = g.tray[d.index]!;
    const { row, col } = d.target;
    const theme = this.hooks.theme();
    const now = performance.now();
    for (const [dr, dc] of piece.shape.cells) this.placedAt.set((row + dr) * g.board.size + col + dc, now);
    const result = g.place(d.index, row, col);
    this.spawnClearFx(result, theme);
    this.hooks.onPlaced(result);
  }

  private spawnClearFx(result: PlaceResult, theme: Theme): void {
    const { clear } = result;
    const lines = clear.rows.length + clear.cols.length;
    if (lines === 0) return;
    const cx = this.boardX + (this.cell * 8) / 2;
    clear.cells.forEach((c, k) => {
      const x = this.boardX + c.c * this.cell;
      const y = this.boardY + c.r * this.cell;
      const [color, deep] = blockColors(theme, c.color);
      this.fx.ghost(x, y, this.cell, color, deep, k * 0.008);
      this.fx.burst(x + this.cell / 2, y + this.cell / 2, c.gem ? '#7ff3ff' : color, c.gem ? 14 : 5, 220 + lines * 40);
    });
    const ys = clear.cells.map((c) => c.r);
    // Textos apilados hacia arriba (puntos, racha, tablero limpio) sin salirse del tablero.
    const stack = [{ text: `+${result.points}`, size: 0.75, color: '#ffc93c', shadow: '#7a4b00', glow: false }];
    if (result.label) stack.push({ text: result.label, size: 0.85, color: '#ffffff', shadow: '#4a2bd6', glow: true });
    if (result.perfect) stack.push({ text: '¡Tablero limpio!', size: 0.8, color: '#ffffff', shadow: '#4a2bd6', glow: true });
    const step = this.cell * 1.05;
    let baseY = this.boardY + ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * this.cell;
    baseY = Math.max(baseY, this.boardY + this.cell * 0.8 + step * (stack.length - 1));
    stack.forEach((l, i) => this.fx.text(cx, baseY - step * i, l.text, this.cell * l.size, l.color, l.shadow, l.glow));
    if (result.perfect) {
      this.fx.flash = 1;
    }
    this.fx.shake = Math.min(14, 3 + lines * 3 + result.combo);
  }

  private frame(t: number): void {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.fx.update(dt);
    this.render(t);
    requestAnimationFrame((tt) => this.frame(tt));
  }

  private render(t: number): void {
    const g = this.game;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (!g) return;
    const theme = this.hooks.theme();
    const size = g.board.size;
    const cell = this.cell;

    ctx.save();
    if (this.fx.shake > 0) ctx.translate((Math.random() - 0.5) * this.fx.shake, (Math.random() - 0.5) * this.fx.shake);

    // Tablero: marco flotante (shadow-panel) y celdas vacías como huecos
    const bp = cell * size;
    const frame = Math.max(8, cell * 0.22);
    ctx.save();
    roundRect(ctx, this.boardX - frame, this.boardY - frame, bp + frame * 2, bp + frame * 2, frame * 2);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = theme.boardBg;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();
    ctx.restore();
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) drawEmpty(ctx, this.boardX + c * cell, this.boardY + r * cell, cell, theme.cellEmpty);

    // Vista previa: líneas que se despejarían
    const d = this.drag;
    const dragPiece = d ? g.tray[d.index] : null;
    const clearRows = new Set<number>();
    const clearCols = new Set<number>();
    if (d && d.target && dragPiece) {
      const pv = g.previewClears(d.index, d.target.row, d.target.col);
      pv.rows.forEach((r) => clearRows.add(r));
      pv.cols.forEach((c) => clearCols.add(c));
    }
    const [dragColor, dragDeep] = dragPiece ? blockColors(theme, dragPiece.color) : ['', ''];

    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        const v = g.board.get(r, c);
        if (v === 0) continue;
        const idx = r * size + c;
        const born = this.placedAt.get(idx);
        let s = cell;
        if (born !== undefined) {
          const k = Math.min(1, (t - born) / 160);
          s = cell * (0.8 + 0.2 * easeOutBack(k));
          if (k >= 1) this.placedAt.delete(idx);
        }
        const off = (cell - s) / 2;
        if (clearRows.has(r) || clearCols.has(c)) drawLit(ctx, this.boardX + c * cell, this.boardY + r * cell, cell, t);
        else {
          const [color, deep] = blockColors(theme, v);
          drawBlock(ctx, this.boardX + c * cell + off, this.boardY + r * cell + off, s, color, deep);
        }
        if (g.board.isGem(r, c)) drawGem(ctx, this.boardX + c * cell, this.boardY + r * cell, cell, t);
      }

    // Fantasma de la pieza en el destino
    if (d && d.target && dragPiece) {
      for (const [dr, dc] of dragPiece.shape.cells) {
        const r = d.target.row + dr;
        const c = d.target.col + dc;
        if (clearRows.has(r) || clearCols.has(c)) drawLit(ctx, this.boardX + c * cell, this.boardY + r * cell, cell, t);
        else drawBlock(ctx, this.boardX + c * cell, this.boardY + r * cell, cell, dragColor, dragDeep, 0.45);
      }
    }

    // Modo martillo
    if (this.hooks.hammerActive()) {
      ctx.strokeStyle = `rgba(255,201,60,${0.6 + Math.sin(t * 0.008) * 0.3})`;
      ctx.lineWidth = 4;
      roundRect(ctx, this.boardX - frame, this.boardY - frame, bp + frame * 2, bp + frame * 2, frame * 2);
      ctx.stroke();
    }

    // Bandeja
    if (this.trayRef.length !== g.tray.length || g.tray.some((p, i) => p !== null && p !== this.trayRef[i])) {
      if (g.tray.every((p) => p !== null)) this.trayBornAt = t;
      this.trayRef = [...g.tray];
    }
    const trayK = easeOutBack(Math.min(1, (t - this.trayBornAt) / 300));
    g.tray.forEach((piece, i) => {
      if (!piece || (d && d.index === i)) return;
      const fits = g.board.fitsAnywhere(piece.shape);
      const { rows, cols } = shapeSize(piece.shape);
      const tc = this.trayCell * trayK;
      const center = this.slotCenter(i);
      const ox = center.x - (cols * tc) / 2;
      const oy = center.y - (rows * tc) / 2;
      const [color, deep] = blockColors(theme, piece.color);
      for (const [dr, dc] of piece.shape.cells) drawBlock(ctx, ox + dc * tc, oy + dr * tc, tc, color, deep, fits ? 1 : 0.3);
    });

    this.fx.draw(ctx, (x, y, s, c, deep, a) => drawBlock(ctx, x, y, s, c, deep, a));

    // Pieza arrastrada (encima de todo)
    if (d && dragPiece) {
      const o = this.dragOrigin(dragPiece);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      for (const [dr, dc] of dragPiece.shape.cells) drawBlock(ctx, o.x + dc * cell, o.y + dr * cell, cell, dragColor, dragDeep);
      ctx.restore();
    }
    ctx.restore();

    if (this.fx.flash > 0) {
      // destello solo sobre el tablero (tablero limpio)
      const bp = this.cell * size;
      const frame = Math.max(8, this.cell * 0.22);
      roundRect(ctx, this.boardX - frame, this.boardY - frame, bp + frame * 2, bp + frame * 2, frame * 2);
      ctx.fillStyle = `rgba(127,243,255,${this.fx.flash * 0.3})`;
      ctx.fill();
    }
  }
}

/** Par [color superior, color inferior] del bloque `v` (1..N) en el tema. */
function blockColors(theme: Theme, v: number): [string, string | undefined] {
  const i = (v - 1) % theme.blocks.length;
  return [theme.blocks[i], theme.blocksDeep?.[i]];
}

function easeOutBack(k: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
