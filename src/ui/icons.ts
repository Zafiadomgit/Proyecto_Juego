/**
 * Iconos SVG en línea (sistema de diseño: trazo 2.4–2.6, extremos redondeados, cuadrícula de 24).
 * Sustituyen a los emoji, que se ven distintos en cada Android y no siguen la paleta.
 */
const stroke = (d: string, color = 'currentColor', width = 2.5) =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const ICONS = {
  coin: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="var(--gold)" stroke="var(--gold-deep)" stroke-width="2"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="var(--gold-deep)" stroke-width="2"/></svg>`,
  gem: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 21 9 12 22 3 9Z" fill="var(--gem-glow)" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 9h18M12 2 9 9l3 13 3-13Z" fill="none" stroke="#fff" stroke-width=".9" opacity=".7"/></svg>`,
  play: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" fill="currentColor"/></svg>`,
  pause: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1.5" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1.5" fill="currentColor"/></svg>`,
  settings: stroke('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>', 'currentColor', 2),
  map: stroke('<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z"/><path d="M9 4v13M15 6.5v13"/>'),
  calendar: stroke('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>'),
  palette: stroke('<path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="15" cy="7.5" r="1.2" fill="currentColor"/>'),
  cart: stroke('<path d="M3 4h2.5l2.2 11h10.6l2-8H6.6"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>'),
  gift: stroke('<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12M12 9C9 9 7 7.5 7 6s1.5-2 2.5-2C11 4 12 6.5 12 9Zm0 0c3 0 5-1.5 5-3s-1.5-2-2.5-2C13 4 12 6.5 12 9Z"/>'),
  hammer: stroke('<path d="m14 7-9.5 9.5a2.1 2.1 0 0 0 3 3L17 10"/><path d="m12 5 3-3 7 7-3 3-2-2-2 2-3-3 2-2-2-2Z"/>'),
  trophy: stroke('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>', 'var(--gold)'),
  restart: stroke('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/>'),
  soundOn: stroke('<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  soundOff: stroke('<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="m17 9 5 6M22 9l-5 6"/>'),
  star: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  target: stroke('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'),
  crown: stroke('<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/>', 'currentColor', 2.3),
  bomb: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="14" r="7" fill="currentColor"/><path d="M14.5 8.5 17 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M18 2.5v2M21.5 6h-2M20.5 3.5l-1.4 1.4" stroke="var(--gold)" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="11.5" r="1.6" fill="#fff" opacity=".55"/></svg>`,
  shuffle: stroke('<path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6C14.3 16 15.5 17 17.5 17H21"/><path d="M3 17h3.5c1.4 0 2.4-.5 3.2-1.4M14.3 8.4c.8-.9 1.8-1.4 3.2-1.4H21"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/>'),
  lock: stroke('<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  check: stroke('<path d="M20 6 9 17l-5-5"/>', 'currentColor', 3),
  rotate: stroke('<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>'),
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName): string {
  return ICONS[name];
}

/** Rellena los marcadores estáticos `<i data-icon="coin"></i>` del HTML. */
export function hydrateIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
    const name = el.dataset.icon as IconName;
    if (name in ICONS) el.innerHTML = ICONS[name];
  });
}
