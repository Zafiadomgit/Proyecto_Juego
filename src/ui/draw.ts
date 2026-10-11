export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Oscurece (amount < 0) o aclara (amount > 0) un color hex. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const f = (v: number) => clamp(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/**
 * Bloque del sistema de diseño: degradado vertical (color → color profundo) más el bisel
 * (`shadow-bevel`): borde inferior oscuro, borde superior claro y una sombra de 2px debajo.
 */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  deep?: string,
  alpha = 1,
): void {
  const pad = size * 0.045;
  const s = size - pad * 2;
  const r = s * 0.22;
  const bx = x + pad;
  const by = y + pad;
  ctx.save();
  ctx.globalAlpha *= alpha;

  // sombra base (0 2px 0 rgba(0,0,0,.25))
  roundRect(ctx, bx, by + s * 0.04, s, s, r);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();

  roundRect(ctx, bx, by, s, s, r);
  const grad = ctx.createLinearGradient(0, by, 0, by + s);
  grad.addColorStop(0, color);
  grad.addColorStop(1, deep ?? shade(color, -0.3));
  ctx.fillStyle = grad;
  ctx.fill();

  // bisel interior: banda inferior oscura y banda superior clara, recortadas a la forma del bloque
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(bx, by + s * 0.88, s, s * 0.12);
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillRect(bx, by, s, s * 0.09);
  ctx.restore();
}

/** Celda vacía: un hueco (`shadow-hollow`), no una baldosa. */
export function drawEmpty(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  const pad = size * 0.045;
  const s = size - pad * 2;
  ctx.save();
  roundRect(ctx, x + pad, y + pad, s, s, s * 0.2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + pad, y + pad, s, s * 0.06);
  ctx.restore();
}

/** Celda de una línea a punto de despejarse: blanco→cian con resplandor (`shadow-gem-glow`). */
export function drawLit(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number): void {
  const pad = size * 0.045;
  const s = size - pad * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(127,243,255,0.85)';
  ctx.shadowBlur = size * (0.35 + Math.sin(t * 0.012) * 0.1);
  roundRect(ctx, x + pad, y + pad, s, s, s * 0.22);
  const g = ctx.createLinearGradient(0, y + pad, 0, y + pad + s);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#d9fbff');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

export function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const s = size * (0.3 + Math.sin(t * 0.004) * 0.02);
  ctx.save();
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.9, cy - s * 0.25);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s * 0.9, cy - s * 0.25);
    ctx.closePath();
  };
  path();
  const g = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
  g.addColorStop(0, '#f0feff');
  g.addColorStop(0.45, '#5be7ff');
  g.addColorStop(1, '#2a6bff');
  ctx.fillStyle = g;
  ctx.shadowColor = '#7ff3ff';
  ctx.shadowBlur = size * 0.35;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, size * 0.045);
  ctx.lineJoin = 'round';
  ctx.stroke();
  // facetas
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = Math.max(0.75, size * 0.02);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.9, cy - s * 0.25);
  ctx.lineTo(cx + s * 0.9, cy - s * 0.25);
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx - s * 0.3, cy - s * 0.25);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx + s * 0.3, cy - s * 0.25);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
