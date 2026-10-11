interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string;
}

interface FloatText {
  x: number; y: number; text: string; life: number; max: number; size: number; color: string;
}

interface Ghost {
  x: number; y: number; size: number; color: string; life: number; max: number; delay: number;
}

/** Partículas, textos flotantes, bloques que se desvanecen y temblor de pantalla. */
export class Fx {
  particles: Particle[] = [];
  texts: FloatText[] = [];
  ghosts: Ghost[] = [];
  shake = 0;
  flash = 0;

  burst(x: number, y: number, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      const max = 0.5 + Math.random() * 0.5;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, life: max, max, size: 2 + Math.random() * 4, color });
    }
  }

  text(x: number, y: number, text: string, size: number, color = '#fff'): void {
    this.texts.push({ x, y, text, life: 1.2, max: 1.2, size, color });
  }

  ghost(x: number, y: number, size: number, color: string, delay: number): void {
    this.ghosts.push({ x, y, size, color, life: 0.35, max: 0.35, delay });
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 50 * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const g of this.ghosts) {
      if (g.delay > 0) g.delay -= dt;
      else g.life -= dt;
    }
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flash = Math.max(0, this.flash - dt * 2.5);
  }

  draw(ctx: CanvasRenderingContext2D, drawBlock: (x: number, y: number, s: number, c: string, a: number) => void): void {
    for (const g of this.ghosts) {
      const k = g.delay > 0 ? 1 : g.life / g.max;
      const s = g.size * (0.4 + 0.6 * k);
      const off = (g.size - s) / 2;
      drawBlock(g.x + off, g.y + off, s, g.color, k);
    }
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.life / t.max;
      const pop = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `900 ${Math.round(t.size * pop)}px ui-rounded, "Nunito", system-ui, sans-serif`;
      ctx.lineWidth = t.size * 0.18;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
