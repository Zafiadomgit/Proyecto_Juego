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

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const f = (v: number) => clamp(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

/** Bloque con relieve (biselado) para que se vea "jugoso" y táctil. */
export function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha = 1): void {
  const pad = size * 0.04;
  const s = size - pad * 2;
  const r = s * 0.18;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const grad = ctx.createLinearGradient(x, y, x, y + s);
  grad.addColorStop(0, shade(color, 0.25));
  grad.addColorStop(1, shade(color, -0.2));
  roundRect(ctx, x + pad, y + pad, s, s, r);
  ctx.fillStyle = grad;
  ctx.fill();
  // brillo superior
  roundRect(ctx, x + pad + s * 0.12, y + pad + s * 0.08, s * 0.76, s * 0.28, r * 0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fill();
  // borde inferior oscuro
  roundRect(ctx, x + pad, y + pad, s, s, r);
  ctx.strokeStyle = shade(color, -0.4);
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.stroke();
  ctx.restore();
}

export function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const s = size * (0.28 + Math.sin(t * 0.004) * 0.02);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s * 0.85, cy - s * 0.2);
  ctx.lineTo(cx, cy + s);
  ctx.lineTo(cx - s * 0.85, cy - s * 0.2);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
  g.addColorStop(0, '#e0fbff');
  g.addColorStop(0.5, '#5be7ff');
  g.addColorStop(1, '#2a7bff');
  ctx.fillStyle = g;
  ctx.shadowColor = '#7ff3ff';
  ctx.shadowBlur = size * 0.3;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.stroke();
  ctx.restore();
}
