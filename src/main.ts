import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './style.css';
import { Game, type GameMode, type PlaceResult } from './core/game';
import { starsForLevel } from './core/levels';
import { seedFromDate } from './core/rng';
import { coinsForScore } from './core/scoring';
import { GEM_COSTS, PRODUCTS, productById } from './meta/catalog';
import { DAILY_REWARDS, buyTheme, canClaimDaily, claimDaily, grantPurchase, spendGems } from './meta/economy';
import { dayKey, loadSave, writeSave, type SaveData } from './meta/save';
import { THEMES, themeById } from './meta/themes';
import { shouldShowInterstitial, type RewardedPlacement } from './platform/ads';
import { PRIVACY_POLICY_URL } from './platform/config';
import { createPlatform } from './platform/index';
import { initNative } from './native';
import { Sfx } from './ui/audio';
import { haptic } from './native';
import { GameView } from './ui/gameView';
import { hydrateIcons, icon } from './ui/icons';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();

const save: SaveData = loadSave(storage);
const sfx = new Sfx();
sfx.enabled = save.settings.sound;
let game: Game | null = null;
let hammerMode = false;
let lastCoinsEarned = 0;
let coinsDoubled = false;

const persist = () => writeSave(storage, save);

// ---------- Diálogos ----------
type Actions = Record<string, () => void>;
const dialogActions = new WeakMap<HTMLElement, Actions>();

function openDialog(html: string, actions: Actions = {}, onBackdrop?: () => void): () => void {
  const el = document.createElement('div');
  el.className = 'modal';
  el.innerHTML = `<div class="card">${html}</div>`;
  dialogActions.set(el, actions);
  el.addEventListener('click', (e) => {
    if (e.target === el && onBackdrop) {
      close();
      onBackdrop();
    }
  });
  $('#app').appendChild(el);
  const close = () => el.remove();
  return close;
}

function closeAllDialogs(): void {
  document.querySelectorAll('#app > .modal').forEach((m) => m.remove());
}

function confirmDialog(msg: string): Promise<boolean> {
  return new Promise((resolve) => {
    const close = openDialog(
      `<h2>Confirmar</h2><p>${msg}</p><div class="stack">
        <button class="btn primary" data-action="yes">Aceptar</button>
        <button class="btn ghost" data-action="no">Cancelar</button></div>`,
      { yes: () => (close(), resolve(true)), no: () => (close(), resolve(false)) },
    );
  });
}

function adOverlay(label: string, seconds: number, skippable: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    let left = seconds;
    const close = openDialog(
      `<div class="ad-sim"><p>${label}</p><p class="legal">(simulado en desarrollo · en Android será AdMob)</p>
       <div class="count">${left}</div>
       ${skippable ? '<button class="btn ghost" data-action="skip">Cerrar sin recompensa</button>' : ''}</div>`,
      { skip: () => (clearInterval(timer), close(), resolve(false)) },
    );
    const timer = setInterval(() => {
      left--;
      const c = document.querySelector('.ad-sim .count');
      if (c) c.textContent = String(left);
      if (left <= 0) {
        clearInterval(timer);
        close();
        resolve(true);
      }
    }, 1000);
  });
}

function toast(msg: string, html = false): void {
  const t = $('#toast');
  if (html) t.innerHTML = msg;
  else t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout((toast as unknown as { h?: number }).h);
  (toast as unknown as { h?: number }).h = window.setTimeout(() => t.classList.add('hidden'), 2000);
}

const platform = createPlatform({ confirm: confirmDialog, adOverlay });

// ---------- Vinculación de datos ----------
function setBind(name: string, value: string): void {
  document.querySelectorAll(`[data-bind="${name}"]`).forEach((el) => (el.textContent = value));
}

function setHtml(name: string, html: string): void {
  document.querySelectorAll(`[data-bind="${name}"]`).forEach((el) => (el.innerHTML = html));
}

function refresh(): void {
  setBind('coins', String(save.coins));
  setBind('gems', String(save.gems));
  setBind('best', String(save.bestScore));
  setBind('level', String(save.adventureLevel));
  setBind('hammers', String(save.hammers));
  const today = dayKey(new Date());
  setBind('dailyBest', save.dailyChallenge.day === today && save.dailyChallenge.best > 0 ? `· ${save.dailyChallenge.best}` : '· ¡nuevo!');
  document.querySelector('[data-bind="giftDot"]')?.classList.toggle('hidden', !canClaimDaily(save, new Date()));
  if (game) {
    setBind('score', String(game.score));
    if (game.mode.kind === 'adventure') setHtml('goal', `${icon('gem')} ${game.gemsCollected}/${game.gemTarget} · Nivel ${game.mode.level}`);
    else if (game.mode.kind === 'daily') setBind('goal', `Reto diario · Mejor: ${save.dailyChallenge.day === today ? save.dailyChallenge.best : 0}`);
    else setBind('goal', `Récord: ${Math.max(save.bestScore, game.score)}`);
  }
  $('[data-action="hammer"]').classList.toggle('active', hammerMode);
}


function showScreen(id: 'menu' | 'game'): void {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

// ---------- Partida ----------
const view = new GameView($('#board') as HTMLCanvasElement, {
  theme: () => themeById(save.theme),
  onPick: () => sfx.pick(),
  onInvalid: () => sfx.invalid(),
  onPlaced,
  hammerActive: () => hammerMode,
  onCellTap: (r, c) => {
    if (!game || !game.canHammer(r, c) || save.hammers <= 0) return false;
    game.useHammer(r, c);
    save.hammers--;
    hammerMode = false;
    persist();
    sfx.place();
    haptic(save.settings.haptics, 30);
    refresh();
    return true;
  },
});

function startGame(mode: GameMode): void {
  closeAllDialogs();
  game = new Game(mode);
  hammerMode = false;
  showScreen('game');
  view.setGame(game);
  refresh();
}

function onPlaced(result: PlaceResult): void {
  if (!game) return;
  const lines = result.clear.rows.length + result.clear.cols.length;
  if (result.perfect) sfx.perfect();
  else if (lines > 0) sfx.clear(lines, result.combo);
  else sfx.place();
  haptic(save.settings.haptics, lines > 0 ? [20, 30, 40] : 12);
  refresh();
  if (result.gameOver) setTimeout(() => onGameOver(), result.won ? 500 : 800);
}

function onGameOver(): void {
  if (!game) return;
  if (game.won) return showLevelComplete();
  sfx.gameOver();
  if (game.canRevive()) return showRevive();
  showResults();
}

function showRevive(): void {
  const g = game!;
  const close = openDialog(
    `<h2>¡Sin espacio!</h2><p>Puntuación actual</p><div class="big-number">${g.score}</div>
     <p>Libera 3 filas y sigue jugando</p>
     <div class="stack">
       <button class="btn ad big" data-action="ad">${icon('play')}Continuar gratis (anuncio)</button>
       <button class="btn gem" data-action="gems" ${save.gems < GEM_COSTS.revive ? 'disabled' : ''}>${icon('gem')}Continuar · ${GEM_COSTS.revive}</button>
       <button class="btn ghost" data-action="no">No, gracias</button>
     </div>`,
    {
      ad: async () => {
        close();
        if (await rewarded('revive')) doRevive();
        else showResults();
      },
      gems: () => {
        if (!spendGems(save, GEM_COSTS.revive)) return;
        close();
        persist();
        doRevive();
      },
      no: () => (close(), showResults()),
    },
  );
}

function doRevive(): void {
  game!.revive();
  view.setGame(game!);
  sfx.coin();
  refresh();
}

function finishGameStats(): void {
  save.stats.gamesPlayed++;
  save.stats.gamesSinceInterstitial++;
  persist();
}

function showResults(): void {
  const g = game!;
  const newRecord = g.mode.kind === 'classic' && g.score > save.bestScore;
  if (g.mode.kind === 'classic') save.bestScore = Math.max(save.bestScore, g.score);
  if (g.mode.kind === 'daily') {
    const today = dayKey(new Date());
    if (save.dailyChallenge.day !== today) save.dailyChallenge = { day: today, best: 0 };
    save.dailyChallenge.best = Math.max(save.dailyChallenge.best, g.score);
  }
  lastCoinsEarned = coinsForScore(g.score);
  coinsDoubled = false;
  save.coins += lastCoinsEarned;
  finishGameStats();
  refresh();

  const close = openDialog(
    `<h2>${newRecord ? `${icon('trophy')}¡Nuevo récord!` : 'Fin de la partida'}</h2>
     <div class="big-number">${g.score}</div>
     <p>Líneas: ${g.linesCleared} · Mejor: ${save.bestScore}</p>
     <div class="reward">+${icon('coin')}<b id="coins-earned">${lastCoinsEarned}</b></div>
     <div class="stack">
       <button class="btn ad" data-action="double">${icon('play')}Duplicar monedas (anuncio)</button>
       <button class="btn primary big" data-action="again">${icon('restart')}Otra vez</button>
       <button class="btn ghost" data-action="menu">Menú</button>
     </div>`,
    {
      double: async () => {
        if (coinsDoubled) return;
        if (await rewarded('double_coins')) {
          coinsDoubled = true;
          save.coins += lastCoinsEarned;
          persist();
          sfx.coin();
          const el = document.getElementById('coins-earned');
          if (el) el.textContent = String(lastCoinsEarned * 2);
          document.querySelector<HTMLButtonElement>('[data-action="double"]')?.setAttribute('disabled', '');
          refresh();
        }
      },
      again: () => (close(), afterGame(() => startGame(g.mode))),
      menu: () => (close(), afterGame(goMenu)),
    },
  );
}

function showLevelComplete(): void {
  const g = game!;
  const level = (g.mode as { level: number }).level;
  const stars = starsForLevel(g.gemTarget, g.moves);
  const reward = 20 + stars * 10;
  save.levelStars[level] = Math.max(save.levelStars[level] ?? 0, stars);
  if (level === save.adventureLevel) save.adventureLevel++;
  save.coins += reward;
  finishGameStats();
  sfx.win();
  refresh();
  const close = openDialog(
    `<h2>¡Nivel ${level} superado!</h2>
     <div class="stars" role="img" aria-label="${stars} de 3 estrellas">${icon('star').repeat(stars)}${`<span class="off">${icon('star')}</span>`.repeat(3 - stars)}</div>
     <p>${g.moves} jugadas · ${g.score} puntos</p>
     <div class="reward">+${icon('coin')}${reward}</div>
     <div class="stack">
       <button class="btn adventure big" data-action="next">Siguiente nivel${icon('play')}</button>
       <button class="btn ghost" data-action="menu">Menú</button>
     </div>`,
    {
      next: () => (close(), afterGame(() => startGame({ kind: 'adventure', level: save.adventureLevel }))),
      menu: () => (close(), afterGame(goMenu)),
    },
  );
}

/** Punto natural de pausa: único lugar donde puede aparecer un intersticial. */
async function afterGame(next: () => void): Promise<void> {
  const now = Date.now();
  if (shouldShowInterstitial({ removeAds: save.removeAds, ...save.stats }, now)) {
    await platform.ads.showInterstitial();
    save.stats.gamesSinceInterstitial = 0;
    save.stats.lastInterstitialAt = now;
    persist();
  }
  next();
}

async function rewarded(placement: RewardedPlacement): Promise<boolean> {
  const ok = await platform.ads.showRewarded(placement);
  if (!ok) toast('Sin recompensa: el anuncio no se completó');
  return ok;
}

function goMenu(): void {
  closeAllDialogs();
  view.stop();
  game = null;
  showScreen('menu');
  refresh();
}

// ---------- Menús ----------
function showPause(): void {
  const g = game;
  if (!g) return;
  const close = openDialog(
    `<h2>Pausa</h2><div class="stack">
      <button class="btn primary big" data-action="resume">${icon('play')}Continuar</button>
      <button class="btn" data-action="restart">${icon('restart')}Reiniciar</button>
      <button class="btn" data-action="sound">${save.settings.sound ? `${icon('soundOn')}Sonido: sí` : `${icon('soundOff')}Sonido: no`}</button>
      <button class="btn ghost" data-action="menu">Salir al menú</button></div>`,
    {
      resume: () => close(),
      restart: () => startGame(g.mode),
      sound: () => {
        save.settings.sound = !save.settings.sound;
        sfx.enabled = save.settings.sound;
        persist();
        close();
        showPause();
      },
      menu: () => goMenu(),
    },
    () => undefined,
  );
}

async function showShop(): Promise<void> {
  const products = await platform.billing.getProducts();
  const price = (id: string) => products.find((p) => p.id === id)?.price ?? '';
  const items = PRODUCTS.filter((p) => !(p.type === 'non_consumable' && save.ownedProducts.includes(p.id)))
    .filter((p) => !(p.id === 'remove_ads' && save.removeAds))
    .filter((p) => price(p.id) !== '')
    .map(
      (p) => `<div class="item"><div class="info"><b>${p.title}${p.highlight ? `<span class="tag">${p.highlight}</span>` : ''}</b>
        <span>${p.description}</span></div><button class="btn primary" data-action="buy:${p.id}">${price(p.id)}</button></div>`,
    )
    .join('');
  const actions: Actions = {
    close: () => close(),
    hammerGems: () => {
      if (!spendGems(save, GEM_COSTS.hammer)) return toast('No tienes suficientes gemas');
      save.hammers++;
      persist();
      refresh();
      toast('+1 martillo');
    },
    hammerAd: async () => {
      if (await rewarded('free_hammer')) {
        save.hammers++;
        persist();
        refresh();
        toast('+1 martillo');
      }
    },
    restore: async () => {
      const before = save.ownedProducts.length;
      await platform.billing.restore();
      const restored = save.ownedProducts.length - before;
      toast(restored > 0 ? `${restored} compra(s) restaurada(s)` : 'No hay compras que restaurar');
      if (restored > 0) (close(), void showShop());
    },
  };
  for (const p of PRODUCTS) actions[`buy:${p.id}`] = () => purchase(p.id, close);
  const close = openDialog(
    `<h2>${icon('cart')}Tienda</h2>
     ${platform.simulated ? '<p class="legal">Modo desarrollo: las compras son simuladas.</p>' : ''}
     <div class="section-title">Ofertas</div><div class="list">${items || `<p>${products.length === 0 ? 'La tienda no está disponible ahora mismo. Comprueba tu conexión.' : '¡Ya lo tienes todo!'}</p>`}</div>
     <div class="section-title">Potenciadores</div>
     <div class="list"><div class="item"><div class="info"><b>${icon('hammer')}Martillo</b><span>Rompe un bloque. Tienes ${save.hammers}.</span></div>
       <button class="btn ad" data-action="hammerAd">${icon('play')}Gratis</button><button class="btn gem" data-action="hammerGems">${icon('gem')}${GEM_COSTS.hammer}</button></div></div>
     <p class="legal">Los pagos se procesan de forma segura con Google Play. Precios con impuestos incluidos según tu país.
       Ningún producto contiene recompensas aleatorias. Todo el contenido de juego puede conseguirse jugando.</p>
     <div class="stack"><button class="btn ghost" data-action="restore">Restaurar compras</button>
     <button class="btn" data-action="close">Cerrar</button></div>`,
    actions,
    () => undefined,
  );
}

async function purchase(productId: string, closeShop: () => void): Promise<void> {
  const res = await platform.billing.purchase(productId);
  if (res.status === 'purchased') {
    closeShop();
    void showShop();
  } else if (res.status === 'pending') toast('Pago pendiente: recibirás tu compra cuando se confirme');
  else if (res.status === 'error') toast(res.message);
}

/** Única vía de entrega de compras: la llama la plataforma cuando una compra está pagada y verificada. */
function onPurchaseGranted(productId: string, purchaseToken: string): void {
  const isNew = grantPurchase(save, productId, purchaseToken);
  persist();
  if (!isNew) return;
  sfx.coin();
  toast(`¡Gracias! ${productById(productId)?.title ?? ''} activado`);
  refresh();
}

function showThemes(): void {
  const items = THEMES.map((t) => {
    const owned = save.ownedThemes.includes(t.id);
    const selected = save.theme === t.id;
    const swatch = `<div class="swatch" style="background:${t.boardBg}">${t.blocks.slice(0, 8).map((c) => `<i style="background:${c}"></i>`).join('')}</div>`;
    let btn: string;
    if (selected) btn = '<button class="btn" disabled>En uso</button>';
    else if (owned) btn = `<button class="btn adventure" data-action="use:${t.id}">Usar</button>`;
    else if (t.exclusiveTo) btn = `<button class="btn" data-action="shop">Pack de inicio</button>`;
    else btn = `<button class="btn ${t.price!.currency === 'gems' ? 'gem' : 'primary'}" data-action="buy:${t.id}">${icon(t.price!.currency === 'gems' ? 'gem' : 'coin')}${t.price!.amount}</button>`;
    return `<div class="item">${swatch}<div class="info"><b>${t.name}</b><span>${owned ? 'Desbloqueado' : 'Cosmético'}</span></div>${btn}</div>`;
  }).join('');
  const actions: Actions = { close: () => close(), shop: () => (close(), void showShop()) };
  for (const t of THEMES) {
    actions[`use:${t.id}`] = () => {
      save.theme = t.id;
      persist();
      close();
      refresh();
      showThemes();
    };
    actions[`buy:${t.id}`] = () => {
      const r = buyTheme(save, t.id);
      if (r === 'insufficient') return toast(t.price?.currency === 'gems' ? 'Te faltan gemas' : '¡Juega para ganar más monedas!');
      if (r === 'ok') {
        save.theme = t.id;
        persist();
        sfx.coin();
        close();
        refresh();
        showThemes();
      }
    };
  }
  const close = openDialog(
    `<h2>${icon('palette')}Temas</h2><div class="list">${items}</div><div class="stack"><button class="btn" data-action="close">Cerrar</button></div>`,
    actions,
    () => undefined,
  );
}

function rewardLabel(r: (typeof DAILY_REWARDS)[number]): string {
  return [r.coins ? `<span>${icon('coin')}${r.coins}</span>` : '', r.gems ? `<span>${icon('gem')}${r.gems}</span>` : '', r.hammers ? `<span>${icon('hammer')}${r.hammers}</span>` : ''].filter(Boolean).join(' ');
}

function showDailyReward(): void {
  const now = new Date();
  const can = canClaimDaily(save, now);
  const current = save.dailyReward.index % DAILY_REWARDS.length;
  const cells = DAILY_REWARDS.map((r, i) => {
    const cls = i < current ? 'done' : i === current && can ? 'today' : '';
    return `<div class="${cls}"><b>Día ${i + 1}</b>${rewardLabel(r)}</div>`;
  }).join('');
  const close = openDialog(
    `<h2>${icon('gift')}Regalo diario</h2><p>Vuelve cada día. ¡Si te saltas un día no pierdes tu progreso!</p>
     <div class="calendar">${cells}</div>
     <div class="stack">${can ? '<button class="btn primary big" data-action="claim">Reclamar</button>' : '<p>Vuelve mañana para el siguiente regalo.</p>'}
     <button class="btn ghost" data-action="close">Cerrar</button></div>`,
    {
      claim: () => {
        const r = claimDaily(save, now);
        persist();
        if (r) {
          sfx.coin();
          toast(`+ ${rewardLabel(r)}`, true);
        }
        close();
        refresh();
      },
      close: () => close(),
    },
    () => undefined,
  );
}

function showSettings(): void {
  const close = openDialog(
    `<h2>${icon('settings')}Ajustes</h2>
     <label class="toggle">Sonido <input type="checkbox" id="opt-sound" ${save.settings.sound ? 'checked' : ''}></label>
     <label class="toggle">Vibración <input type="checkbox" id="opt-haptics" ${save.settings.haptics ? 'checked' : ''}></label>
     <div class="stack">
       <button class="btn" data-action="privacy">Política de privacidad</button>
       ${platform.ads.privacyOptionsAvailable ? '<button class="btn" data-action="adPrivacy">Opciones de privacidad de anuncios</button>' : ''}
       <button class="btn ghost" data-action="close">Cerrar</button>
     </div><p class="legal">Gemzy Blocks v${__APP_VERSION__}</p>`,
    {
      privacy: () => (PRIVACY_POLICY_URL ? window.open(PRIVACY_POLICY_URL, '_blank') : toast('Política de privacidad pendiente de publicar')),
      adPrivacy: () => void platform.ads.showPrivacyOptions(),
      close: () => {
        save.settings.sound = (document.getElementById('opt-sound') as HTMLInputElement).checked;
        save.settings.haptics = (document.getElementById('opt-haptics') as HTMLInputElement).checked;
        sfx.enabled = save.settings.sound;
        persist();
        close();
      },
    },
  );
}

// ---------- Eventos globales ----------
const menuActions: Actions = {
  'play-classic': () => startGame({ kind: 'classic' }),
  'play-adventure': () => startGame({ kind: 'adventure', level: save.adventureLevel }),
  'play-daily': () => startGame({ kind: 'daily', seed: seedFromDate(new Date()) }),
  themes: showThemes,
  shop: () => void showShop(),
  'daily-reward': showDailyReward,
  settings: showSettings,
  pause: showPause,
  hammer: () => {
    if (save.hammers <= 0) return void showShop();
    hammerMode = !hammerMode;
    if (hammerMode) toast('Toca un bloque para romperlo');
    refresh();
  },
};

document.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target || (target as HTMLButtonElement).disabled) return;
  const action = target.dataset.action!;
  const dialog = target.closest<HTMLElement>('.modal');
  const handler = dialog ? dialogActions.get(dialog)?.[action] : menuActions[action];
  if (handler) {
    sfx.tap();
    handler();
  }
});

hydrateIcons();
// El canvas no carga fuentes por sí solo: la pedimos ya para que los textos de racha salgan en Lilita One.
void document.fonts?.load('32px "Lilita One"').catch(() => undefined);
refresh();
if (canClaimDaily(save, new Date()) && save.stats.gamesPlayed > 0) showDailyReward();

initNative({
  onBack: () => {
    const dialogs = document.querySelectorAll('#app > .modal');
    if (dialogs.length > 0) return true; // los diálogos se cierran con sus botones; no salimos por accidente
    if (game && !game.over) {
      showPause();
      return true;
    }
    if (game) {
      goMenu();
      return true;
    }
    return false;
  },
  onPause: () => persist(),
});
void platform.billing.init(onPurchaseGranted).catch((e) => console.warn('[billing] init', e));
void platform.ads.init().catch((e) => console.warn('[ads] init', e));

// Acceso de depuración para pruebas automáticas (solo en desarrollo, no se incluye en la build).
if (import.meta.env.DEV) (window as unknown as { __game: () => Game | null }).__game = () => game;
