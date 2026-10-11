import type { Game, PlaceResult } from '../core/game';
import { shapeSize, type Piece } from '../core/pieces';
import type { Theme } from '../meta/themes';
import { drawBlock, drawGem, roundRect } from './draw';
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
      const color = theme.blocks[(c.color - 1) % theme.blocks.length];
      this.fx.ghost(x, y, this.cell, color, k * 0.008);
      this.fx.burst(x + this.cell / 2, y + this.cell / 2, c.gem ? '#7ff3ff' : color, c.gem ? 14 : 5, 220 + lines * 40);
    });
    const ys = clear.cells.map((c) => c.r);
    const midY = this.boardY + ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * this.cell;
    this.fx.text(cx, midY, `+${result.points}`, this.cell * 0.7, '#ffe066');
    if (result.label) this.fx.text(cx, midY - this.cell * 0.9, result.label, this.cell * 0.8, '#ffffff');
    if (result.perfect) {
      this.fx.text(cx, this.boardY + this.cell * 4, '¡TABLERO LIMPIO!', this.cell * 0.75, '#7ff3ff');
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

    // Tablero
    const bp = cell * size;
    roundRect(ctx, this.boardX - 8, this.boardY - 8, bp + 16, bp + 16, 16);
    ctx.fillStyle = theme.boardBg;
    ctx.fill();
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        roundRect(ctx, this.boardX + c * cell + 2, this.boardY + r * cell + 2, cell - 4, cell - 4, cell * 0.16);
        ctx.fillStyle = theme.cellEmpty;
        ctx.fill();
      }

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
    const dragColor = dragPiece ? theme.blocks[(dragPiece.color - 1) % theme.blocks.length] : '';

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
        const highlighted = clearRows.has(r) || clearCols.has(c);
        const color = highlighted ? dragColor : theme.blocks[(v - 1) % theme.blocks.length];
        const off = (cell - s) / 2;
        drawBlock(ctx, this.boardX + c * cell + off, this.boardY + r * cell + off, s, color);
        if (g.board.isGem(r, c)) drawGem(ctx, this.boardX + c * cell, this.boardY + r * cell, cell, t);
      }

    // Fantasma de la pieza en el destino
    if (d && d.target && dragPiece) {
      for (const [dr, dc] of dragPiece.shape.cells)
        drawBlock(ctx, this.boardX + (d.target.col + dc) * cell, this.boardY + (d.target.row + dr) * cell, cell, dragColor, 0.45);
      for (const r of clearRows) this.glowLine(this.boardX, this.boardY + r * cell, bp, cell, t);
      for (const c of clearCols) this.glowLine(this.boardX + c * cell, this.boardY, cell, bp, t);
    }

    // Modo martillo
    if (this.hooks.hammerActive()) {
      ctx.strokeStyle = `rgba(255,224,102,${0.6 + Math.sin(t * 0.008) * 0.3})`;
      ctx.lineWidth = 4;
      roundRect(ctx, this.boardX - 8, this.boardY - 8, bp + 16, bp + 16, 16);
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
      const color = theme.blocks[(piece.color - 1) % theme.blocks.length];
      for (const [dr, dc] of piece.shape.cells) drawBlock(ctx, ox + dc * tc, oy + dr * tc, tc, color, fits ? 1 : 0.3);
    });

    this.fx.draw(ctx, (x, y, s, c, a) => drawBlock(ctx, x, y, s, c, a));

    // Pieza arrastrada (encima de todo)
    if (d && dragPiece) {
      const o = this.dragOrigin(dragPiece);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      for (const [dr, dc] of dragPiece.shape.cells) drawBlock(ctx, o.x + dc * cell, o.y + dr * cell, cell, dragColor);
      ctx.restore();
    }
    ctx.restore();

    if (this.fx.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.fx.flash * 0.35})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  private glowLine(x: number, y: number, w: number, h: number, t: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(t * 0.012) * 0.12;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.restore();
  }
}

function easeOutBack(k: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
