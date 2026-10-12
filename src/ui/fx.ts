interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; gravity: number; glow: boolean;
}

interface FloatText {
  x: number; y: number; text: string; life: number; max: number; size: number; color: string; shadow: string; glow: boolean; rise: number; banner: boolean;
}

interface Ghost {
  x: number; y: number; size: number; color: string; deep: string | undefined; life: number; max: number; delay: number;
}

/** Haz de luz que barre una fila o columna despejada. */
interface Beam {
  x: number; y: number; w: number; h: number; horizontal: boolean; life: number; max: number; delay: number;
}

/** Onda expansiva (anillo) para jugadas grandes y bombas. */
interface Ring {
  x: number; y: number; r0: number; r1: number; life: number; max: number; color: string; width: number;
}

const easeOutBack = (k: number) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);

/** Partículas con brillo, haces, ondas, textos flotantes, rótulos grandes, bloques que se desvanecen y temblor. */
export class Fx {
  particles: Particle[] = [];
  texts: FloatText[] = [];
  ghosts: Ghost[] = [];
  beams: Beam[] = [];
  rings: Ring[] = [];
  shake = 0;
  flash = 0;

  burst(x: number, y: number, color: string, count: number, speed: number, glow = true): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      const max = 0.5 + Math.random() * 0.6;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, life: max, max, size: 2 + Math.random() * 4, color, gravity: 900, glow });
    }
  }

  /** Destellos que suben flotando (tablero limpio, récord, fiebre). */
  sparkle(x: number, y: number, w: number, h: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const max = 0.8 + Math.random() * 0.8;
      this.particles.push({
        x: x + Math.random() * w, y: y + Math.random() * h,
        vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 80,
        life: max, max, size: 1.5 + Math.random() * 3, color, gravity: -20, glow: true,
      });
    }
  }

  /** Polvo suave al apoyar una pieza. */
  dust(x: number, y: number, color: string): void {
    for (let i = 0; i < 3; i++) {
      const max = 0.25 + Math.random() * 0.2;
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 60, life: max, max, size: 1.5 + Math.random() * 2, color, gravity: 300, glow: false });
    }
  }

  beam(x: number, y: number, w: number, h: number, horizontal: boolean, delay = 0): void {
    this.beams.push({ x, y, w, h, horizontal, life: 0.42, max: 0.42, delay });
  }

  ring(x: number, y: number, r0: number, r1: number, color: string, width: number): void {
    this.rings.push({ x, y, r0, r1, life: 0.5, max: 0.5, color, width });
  }

  /** Texto flotante (estilo `burst`): sombra sólida desplazada y, opcionalmente, resplandor cian. */
  text(x: number, y: number, text: string, size: number, color: string, shadow: string, glow: boolean): void {
    this.texts.push({ x, y, text, life: 1.2, max: 1.2, size, color, shadow, glow, rise: 50, banner: false });
  }

  /** Rótulo grande que entra con rebote y se queda quieto (¡Increíble!, ¡Nuevo récord!, ¡Fiebre!). */
  banner(x: number, y: number, text: string, size: number, color: string, shadow: string): void {
    this.texts.push({ x, y, text, life: 1.5, max: 1.5, size, color, shadow, glow: true, rise: 8, banner: true });
  }

  ghost(x: number, y: number, size: number, color: string, deep: string | undefined, delay: number): void {
    this.ghosts.push({ x, y, size, color, deep, life: 0.35, max: 0.35, delay });
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= t.rise * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const g of this.ghosts) {
      if (g.delay > 0) g.delay -= dt;
      else g.life -= dt;
    }
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
    for (const b of this.beams) {
      if (b.delay > 0) b.delay -= dt;
      else b.life -= dt;
    }
    this.beams = this.beams.filter((b) => b.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flash = Math.max(0, this.flash - dt * 2.5);
  }

  /** Capa bajo los textos: bloques que se van, haces, ondas y partículas. */
  draw(
    ctx: CanvasRenderingContext2D,
    drawBlock: (x: number, y: number, s: number, c: string, deep: string | undefined, a: number) => void,
  ): void {
    for (const g of this.ghosts) {
      const k = g.delay > 0 ? 1 : g.life / g.max;
      const s = g.size * (0.4 + 0.6 * k);
      const off = (g.size - s) / 2;
      drawBlock(g.x + off, g.y + off, s, g.color, g.deep, k);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.beams) {
      if (b.delay > 0) continue;
      const k = 1 - b.life / b.max; // 0 → 1
      const alpha = Math.sin(k * Math.PI);
      const len = b.horizontal ? b.w : b.h;
      const head = len * Math.min(1, k * 1.6);
      const g = b.horizontal
        ? ctx.createLinearGradient(b.x + head - len * 0.6, 0, b.x + head, 0)
        : ctx.createLinearGradient(0, b.y + head - len * 0.6, 0, b.y + head);
      g.addColorStop(0, 'rgba(127,243,255,0)');
      g.addColorStop(0.8, `rgba(127,243,255,${0.55 * alpha})`);
      g.addColorStop(1, `rgba(255,255,255,${0.95 * alpha})`);
      ctx.fillStyle = g;
      const pad = (b.horizontal ? b.h : b.w) * 0.1;
      if (b.horizontal) ctx.fillRect(b.x, b.y + pad, Math.max(0, head), b.h - pad * 2);
      else ctx.fillRect(b.x + pad, b.y, b.w - pad * 2, Math.max(0, head));
    }
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - k * 0.7);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 3)), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      if (p.glow) {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = a * 0.22;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    for (const p of this.particles) {
      if (p.glow) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  /** Capa superior: textos y rótulos (siempre por encima de la pieza arrastrada). */
  drawTexts(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.life / t.max; // 1 → 0
      const age = 1 - k;
      let scale: number;
      if (t.banner) scale = age < 0.25 ? 0.3 + 0.7 * easeOutBack(age / 0.25) : 1;
      else scale = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
      ctx.globalAlpha = Math.min(1, k * (t.banner ? 4 : 2));
      ctx.font = `${Math.round(t.size * scale)}px "Lilita One", "Nunito", system-ui, sans-serif`;
      // "pegatina": contorno y sombra sólida en el color de sombra, desplazados hacia abajo
      const dy = t.size * 0.1;
      ctx.lineJoin = 'round';
      ctx.lineWidth = t.size * 0.18;
      ctx.strokeStyle = t.shadow;
      ctx.strokeText(t.text, t.x, t.y + dy);
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.shadow;
      ctx.fillText(t.text, t.x, t.y + dy);
      ctx.save();
      if (t.glow) {
        ctx.shadowColor = 'rgba(127,243,255,0.9)';
        ctx.shadowBlur = t.size * 0.6;
      }
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
