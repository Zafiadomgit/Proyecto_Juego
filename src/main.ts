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
import { DAILY_REWARDS, buyTheme, canClaimDaily, claimDaily, grantPurchase, spendGems, type Reward } from './meta/economy';
import { claimMission, claimableMissions, ensureDailyMissions, missionById, progressMissions, type MissionDef } from './meta/missions';
import { PASS_PRODUCT_ID, PASS_TIERS, canClaimPass, claimPass, claimablePass, freeReward, passProgress, premiumReward } from './meta/pass';
import { gainXp, levelInfo, xpForGame, type GameSummary } from './meta/progression';
import { dayKey, loadSave, writeSave, type BoosterId, type SaveData } from './meta/save';
import { THEMES, themeById } from './meta/themes';
import { shouldShowInterstitial, type RewardedPlacement } from './platform/ads';
import { PRIVACY_POLICY_URL } from './platform/config';
import { createPlatform } from './platform/index';
import { haptic, initNative } from './native';
import { Sfx } from './ui/audio';
import { GameView, type BoardTool } from './ui/gameView';
import { hydrateIcons, icon, type IconName } from './ui/icons';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();

const save: SaveData = loadSave(storage);
ensureDailyMissions(save, new Date());
const sfx = new Sfx();
sfx.enabled = save.settings.sound;
let game: Game | null = null;
let tool: BoardTool = null;
let lastCoinsEarned = 0;
let coinsDoubled = false;
let recordAnnounced = false;
let feverAnnounced = false;
let shownScore = 0;

const persist = () => writeSave(storage, save);

const BOOSTERS: Record<BoosterId, { name: string; desc: string; icon: IconName; cost: number }> = {
  hammer: { name: 'Martillo', desc: 'Rompe un bloque', icon: 'hammer', cost: GEM_COSTS.hammer },
  bomb: { name: 'Bomba', desc: 'Limpia un área de 3×3', icon: 'bomb', cost: GEM_COSTS.bomb },
  shuffle: { name: 'Barajar', desc: 'Cambia las 3 piezas', icon: 'shuffle', cost: GEM_COSTS.shuffle },
};

// ---------- Diálogos ----------
type Actions = Record<string, () => void>;
const dialogActions = new WeakMap<HTMLElement, Actions>();

function openDialog(html: string, actions: Actions = {}, onBackdrop?: () => void, extraClass = ''): () => void {
  const el = document.createElement('div');
  el.className = 'modal';
  el.innerHTML = `<div class="card ${extraClass}">${html}</div>`;
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
  (toast as unknown as { h?: number }).h = window.setTimeout(() => t.classList.add('hidden'), 2200);
}

const platform = createPlatform({ confirm: confirmDialog, adOverlay });

function rewardLabel(r: Reward): string {
  const parts: string[] = [];
  if (r.coins) parts.push(`<span class="rw">${icon('coin')}${r.coins}</span>`);
  if (r.gems) parts.push(`<span class="rw">${icon('gem')}${r.gems}</span>`);
  for (const [id, n] of Object.entries(r.boosters ?? {})) if (n) parts.push(`<span class="rw">${icon(BOOSTERS[id as BoosterId].icon)}${n}</span>`);
  if (r.theme) parts.push(`<span class="rw">${icon('palette')}${themeById(r.theme).name}</span>`);
  return parts.join(' ');
}

const fmt = (n: number) => n.toLocaleString('es');

// ---------- Vinculación de datos ----------
function setBind(name: string, value: string): void {
  document.querySelectorAll(`[data-bind="${name}"]`).forEach((el) => (el.textContent = value));
}

function setHtml(name: string, html: string): void {
  document.querySelectorAll(`[data-bind="${name}"]`).forEach((el) => (el.innerHTML = html));
}

function setBadge(name: string, n: number): void {
  document.querySelectorAll(`[data-bind="${name}"]`).forEach((el) => {
    el.textContent = String(n);
    el.classList.toggle('hidden', n <= 0);
  });
}

function refresh(): void {
  setBind('coins', fmt(save.coins));
  setBind('gems', fmt(save.gems));
  setBind('best', fmt(save.bestScore));
  setBind('level', String(save.adventureLevel));
  const lv = levelInfo(save.xp);
  setBind('playerLevel', String(lv.level));
  document.querySelectorAll<HTMLElement>('[data-bind-style="xpBar"]').forEach((el) => (el.style.width = `${(lv.into / lv.needed) * 100}%`));
  for (const id of Object.keys(BOOSTERS) as BoosterId[]) setBind(`booster-${id}`, String(save.boosters[id]));
  if (game) {
    setBind('rotations', String(game.rotationCharges));
    document.querySelector('.rot-pill')?.classList.toggle('empty', game.rotationCharges === 0);
  }
  const today = dayKey(new Date());
  setBind('dailyBest', save.dailyChallenge.day === today && save.dailyChallenge.best > 0 ? `· ${fmt(save.dailyChallenge.best)}` : '· ¡nuevo!');
  document.querySelector('[data-bind="giftDot"]')?.classList.toggle('hidden', !canClaimDaily(save, new Date()));
  setBadge('missionsBadge', claimableMissions(save));
  setBadge('passBadge', claimablePass(save));
  if (game) {
    animateScore(game.score);
    if (game.mode.kind === 'adventure') setHtml('goal', `${icon('gem')} ${game.gemsCollected}/${game.gemTarget} · Nivel ${game.mode.level}`);
    else if (game.mode.kind === 'daily') setBind('goal', `Reto diario · Mejor: ${fmt(save.dailyChallenge.day === today ? save.dailyChallenge.best : 0)}`);
    else setBind('goal', `Récord: ${fmt(Math.max(save.bestScore, game.score))}`);
    updateComboMeter();
  }
  for (const id of Object.keys(BOOSTERS) as BoosterId[])
    document.querySelector(`[data-action="booster:${id}"]`)?.classList.toggle('active', tool === id);
}

/** El marcador cuenta hacia arriba en lugar de saltar: cada punto se siente. */
function animateScore(target: number): void {
  const el = document.querySelector<HTMLElement>('[data-bind="score"]');
  if (!el) return;
  if (target < shownScore) shownScore = 0;
  const from = shownScore;
  if (target === from) {
    el.textContent = fmt(target);
    return;
  }
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  const start = performance.now();
  const dur = Math.min(600, 200 + (target - from) * 2);
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / dur);
    shownScore = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)));
    el.textContent = fmt(shownScore);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function updateComboMeter(): void {
  const meter = document.querySelector('.combo-meter');
  if (!meter || !game) return;
  const c = Math.min(game.combo, 5);
  meter.querySelectorAll('i').forEach((seg, i) => seg.classList.toggle('on', i < c));
  const fever = game.combo >= 3;
  meter.classList.toggle('fever', fever);
  $('#game').classList.toggle('fever', fever);
  setBind('comboLabel', fever ? `¡Fiebre x${game.combo}!` : game.combo > 0 ? `Racha x${game.combo}` : '');
}

function showScreen(id: 'menu' | 'game'): void {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

// ---------- Partida ----------
const view = new GameView($('#board') as HTMLCanvasElement, {
  theme: () => themeById(save.theme),
  onPick: () => sfx.pick(),
  onRotate: () => {
    sfx.rotate();
    haptic(save.settings.haptics, 8);
    refresh();
  },
  onRotateDenied: () => {
    sfx.invalid();
    toast('Sin giros: despeja 2 líneas a la vez para ganar uno');
  },
  onStuck: () => setTimeout(() => onGameOver(), 700),
  onInvalid: () => sfx.invalid(),
  onPlaced,
  tool: () => tool,
  fever: () => !!game && game.combo >= 3,
  onToolTap: (r, c) => {
    if (!game || !tool || save.boosters[tool] <= 0) return null;
    let cleared: { r: number; c: number; color: number }[] = [];
    if (tool === 'hammer') {
      if (!game.canHammer(r, c)) return null;
      cleared = [{ r, c, color: game.board.get(r, c) }];
      game.useHammer(r, c);
      sfx.place();
    } else {
      cleared = game.useBomb(r, c);
      if (cleared.length === 0) return null;
      sfx.bomb();
    }
    save.boosters[tool]--;
    tool = null;
    persist();
    haptic(save.settings.haptics, [30, 20, 60]);
    refresh();
    return cleared;
  },
});

function startGame(mode: GameMode): void {
  closeAllDialogs();
  game = new Game(mode);
  tool = null;
  recordAnnounced = false;
  feverAnnounced = false;
  shownScore = 0;
  showScreen('game');
  view.setGame(game);
  refresh();
  // Primera partida: enseña el gesto de girar
  if (save.stats.gamesPlayed === 0) setTimeout(() => toast(`${icon('rotate')} Toca una pieza para girarla (3 giros)`, true), 600);
}

function onPlaced(result: PlaceResult): void {
  if (!game) return;
  const lines = result.clear.rows.length + result.clear.cols.length;
  if (result.perfect) sfx.perfect();
  else if (lines > 0) sfx.clear(lines, result.combo);
  else sfx.place();
  haptic(save.settings.haptics, lines > 0 ? [20, 30, 40 + lines * 10] : 12);

  if (game.combo >= 3 && !feverAnnounced) {
    feverAnnounced = true;
    view.banner('¡Fiebre!', '#ffc93c', '#7a4b00');
    sfx.fever();
  }
  if (game.combo === 0) feverAnnounced = false;

  if (!recordAnnounced && game.mode.kind === 'classic' && save.bestScore > 0 && game.score > save.bestScore) {
    recordAnnounced = true;
    setTimeout(() => {
      view.banner('¡Nuevo récord!', '#ffc93c', '#7a4b00');
      view.celebrate();
      sfx.record();
    }, 350);
  }
  refresh();
  if (result.gameOver) setTimeout(() => onGameOver(), result.won ? 600 : 900);
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
    `<h2>¡Sin espacio!</h2><p>Puntuación actual</p><div class="big-number">${fmt(g.score)}</div>
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

/** Cierra la partida: XP, misiones, pase y estadísticas. Devuelve el bloque HTML de progreso. */
function settleProgress(g: Game): string {
  const summary: GameSummary = {
    mode: g.mode.kind,
    score: g.score,
    lines: g.linesCleared,
    maxCombo: g.maxCombo,
    perfects: g.perfects,
    gems: g.gemsCollected,
    won: g.won,
  };
  save.stats.gamesPlayed++;
  save.stats.gamesSinceInterstitial++;
  save.stats.totalLines += g.linesCleared;
  save.stats.bestCombo = Math.max(save.stats.bestCombo, g.maxCombo);
  const xp = xpForGame(summary);
  const lvBefore = levelInfo(save.xp);
  const tierBefore = passProgress(save).tier;
  const lv = gainXp(save, xp);
  const completed = progressMissions(save, summary, new Date());
  const tierAfter = passProgress(save).tier;
  persist();

  const after = levelInfo(save.xp);
  const startPct = lv.after > lv.before ? 0 : (lvBefore.into / lvBefore.needed) * 100;
  const endPct = (after.into / after.needed) * 100;
  let html = `<div class="xp-row"><span class="lvl">${after.level}</span>
    <div class="xp-bar"><i style="--from:${startPct}%;--to:${endPct}%"></i></div><b>+${xp} XP</b></div>`;
  if (lv.rewards.length > 0) {
    const last = lv.rewards[lv.rewards.length - 1];
    // suma de todas las recompensas de los niveles subidos en esta partida
    const total: Reward = { coins: 0, gems: 0, boosters: {} };
    for (const { reward } of lv.rewards) {
      total.coins! += reward.coins ?? 0;
      total.gems! += reward.gems ?? 0;
      for (const [id, n] of Object.entries(reward.boosters ?? {})) total.boosters![id as BoosterId] = (total.boosters![id as BoosterId] ?? 0) + (n ?? 0);
    }
    html += `<div class="levelup">${icon('star')}¡Nivel ${last.level}! <span>${rewardLabel(total)}</span></div>`;
    setTimeout(() => sfx.levelUp(), 450);
  }
  if (tierAfter > tierBefore) html += `<div class="note-row">${icon('crown')}Pase Gemzy: ¡nivel ${tierAfter} alcanzado!</div>`;
  for (const m of completed) html += `<div class="note-row done">${icon('check')}Misión completada: ${m.text}</div>`;
  if (completed.length > 0) setTimeout(() => sfx.mission(), 800);
  return html;
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
  const progress = settleProgress(g);
  refresh();

  const close = openDialog(
    `<h2>${newRecord ? `${icon('trophy')}¡Nuevo récord!` : 'Fin de la partida'}</h2>
     <div class="big-number">${fmt(g.score)}</div>
     <p>Líneas: ${g.linesCleared} · Mejor racha: x${g.maxCombo} · Récord: ${fmt(save.bestScore)}</p>
     <div class="reward">+${icon('coin')}<b id="coins-earned">${lastCoinsEarned}</b></div>
     ${progress}
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
  const progress = settleProgress(g);
  sfx.win();
  view.celebrate('#7ff3ff');
  refresh();
  const close = openDialog(
    `<h2>¡Nivel ${level} superado!</h2>
     <div class="stars" role="img" aria-label="${stars} de 3 estrellas">${icon('star').repeat(stars)}${`<span class="off">${icon('star')}</span>`.repeat(3 - stars)}</div>
     <p>${g.moves} jugadas · ${fmt(g.score)} puntos</p>
     <div class="reward">+${icon('coin')}${reward}</div>
     ${progress}
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

/** Punto natural de pausa: único lugar donde puede aparecer un intersticial o la oferta de bienvenida. */
async function afterGame(next: () => void): Promise<void> {
  const now = Date.now();
  if (shouldShowInterstitial({ removeAds: save.removeAds, ...save.stats }, now)) {
    await platform.ads.showInterstitial();
    save.stats.gamesSinceInterstitial = 0;
    save.stats.lastInterstitialAt = now;
    persist();
  }
  if (save.stats.gamesPlayed >= 3 && !save.flags.welcomeOfferShown && !save.ownedProducts.includes('starter_pack')) {
    save.flags.welcomeOfferShown = true;
    persist();
    return showWelcomeOffer(next);
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
  tool = null;
  $('#game').classList.remove('fever');
  showScreen('menu');
  refresh();
}

// ---------- Potenciadores ----------
function useBooster(id: BoosterId): void {
  if (!game || game.over) return;
  if (save.boosters[id] <= 0) return showBoosterOffer(id);
  if (id === 'shuffle') {
    game.shuffle();
    save.boosters.shuffle--;
    tool = null;
    persist();
    sfx.rotate();
    view.setGame(game);
    refresh();
    return;
  }
  tool = tool === id ? null : id;
  if (tool) toast(id === 'hammer' ? 'Toca un bloque para romperlo' : 'Toca el tablero donde quieres la bomba');
  refresh();
}

function showBoosterOffer(id: BoosterId): void {
  const b = BOOSTERS[id];
  const close = openDialog(
    `<h2>${icon(b.icon)}${b.name}</h2><p>${b.desc}. No te quedan.</p>
     <div class="stack">
       <button class="btn gem big" data-action="gems" ${save.gems < b.cost ? 'disabled' : ''}>${icon('gem')}Comprar 1 · ${b.cost}</button>
       ${id !== 'bomb' ? `<button class="btn ad" data-action="ad">${icon('play')}1 gratis (anuncio)</button>` : ''}
       <button class="btn" data-action="shop">${icon('cart')}Ver tienda</button>
       <button class="btn ghost" data-action="close">Cerrar</button>
     </div>`,
    {
      gems: () => {
        if (!spendGems(save, b.cost)) return;
        save.boosters[id]++;
        persist();
        sfx.coin();
        close();
        refresh();
      },
      ad: async () => {
        close();
        if (await rewarded('free_hammer')) {
          save.boosters[id]++;
          persist();
          refresh();
          toast(`+1 ${b.name.toLowerCase()}`);
        }
      },
      shop: () => (close(), void showShop()),
      close: () => close(),
    },
    () => undefined,
  );
}

// ---------- Misiones, pase y nivel ----------
function showMissions(): void {
  ensureDailyMissions(save, new Date());
  const rows = save.missions.list
    .map((st) => {
      const def = missionById(st.id) as MissionDef;
      const pct = Math.min(100, (st.progress / def.target) * 100);
      const done = st.progress >= def.target;
      const btn = st.claimed
        ? `<span class="claimed">${icon('check')}</span>`
        : done
          ? `<button class="btn primary" data-action="claim:${st.id}">Reclamar</button>`
          : `<span class="reward-mini">${rewardLabel(def.reward)}</span>`;
      return `<div class="item mission ${st.claimed ? 'is-claimed' : ''}"><div class="info"><b>${def.text}</b>
        <div class="progress"><i style="width:${pct}%"></i></div><span>${fmt(Math.min(st.progress, def.target))} / ${fmt(def.target)}</span></div>${btn}</div>`;
    })
    .join('');
  const actions: Actions = { close: () => close() };
  for (const st of save.missions.list)
    actions[`claim:${st.id}`] = () => {
      const r = claimMission(save, st.id);
      if (!r) return;
      persist();
      sfx.mission();
      toast(`+ ${rewardLabel(r)}`, true);
      close();
      refresh();
      showMissions();
    };
  const close = openDialog(
    `<h2>${icon('target')}Misiones de hoy</h2><p>Se renuevan cada día. Las recompensas son siempre las que ves.</p>
     <div class="list">${rows}</div>
     <div class="stack"><button class="btn primary big" data-action="play">${icon('play')}Jugar</button><button class="btn ghost" data-action="close">Cerrar</button></div>`,
    { ...actions, play: () => startGame({ kind: 'classic' }) },
    () => undefined,
  );
}

async function showPass(): Promise<void> {
  const prog = passProgress(save);
  const products = await platform.billing.getProducts();
  const price = products.find((p) => p.id === PASS_PRODUCT_ID)?.price;
  const rows: string[] = [];
  for (let t = 1; t <= PASS_TIERS; t++) {
    const reached = t <= prog.tier;
    const cell = (track: 'free' | 'premium') => {
      const reward = track === 'free' ? freeReward(t) : premiumReward(t);
      const claimed = (track === 'free' ? save.pass.claimedFree : save.pass.claimedPremium).includes(t);
      const locked = track === 'premium' && !save.pass.premium;
      let action = '';
      if (claimed) action = `<span class="claimed">${icon('check')}</span>`;
      else if (canClaimPass(save, t, track)) action = `<button class="btn primary mini" data-action="pass:${track}:${t}">Reclamar</button>`;
      else if (locked) action = `<span class="locked">${icon('lock')}</span>`;
      return `<div class="pass-cell ${track} ${claimed ? 'is-claimed' : ''}">${rewardLabel(reward)}${action}</div>`;
    };
    rows.push(`<div class="pass-row ${reached ? 'reached' : ''}"><span class="tier">${t}</span>${cell('free')}${cell('premium')}</div>`);
  }
  const actions: Actions = { close: () => close(), buy: () => purchase(PASS_PRODUCT_ID, () => (close(), void showPass())) };
  for (let t = 1; t <= PASS_TIERS; t++)
    for (const track of ['free', 'premium'] as const)
      actions[`pass:${track}:${t}`] = () => {
        const r = claimPass(save, t, track);
        if (!r) return;
        persist();
        sfx.coin();
        toast(`+ ${rewardLabel(r)}`, true);
        close();
        refresh();
        void showPass();
      };
  const premiumBox = save.pass.premium
    ? `<div class="pass-premium owned">${icon('crown')}Premium activo</div>`
    : `<div class="pass-premium"><div><b>${icon('crown')}Vía premium</b><span>Más gemas, bombas y el tema exclusivo Aurora. Lo que ya hayas alcanzado se reclama al momento.</span></div>
       ${price ? `<button class="btn primary" data-action="buy">${price}</button>` : '<span class="legal">No disponible ahora</span>'}</div>`;
  const close = openDialog(
    `<h2>${icon('crown')}Pase Gemzy</h2>
     <p>Temporada 1 · Sube de nivel jugando: cada partida suma.</p>
     <div class="pass-head"><span>Nivel ${prog.tier} / ${PASS_TIERS}</span><div class="progress"><i style="width:${(prog.into / prog.needed) * 100}%"></i></div><span>${prog.into}/${prog.needed} XP</span></div>
     ${premiumBox}
     <div class="pass-cols"><span></span><span>Gratis</span><span>Premium</span></div>
     <div class="pass-list">${rows.join('')}</div>
     <div class="stack"><button class="btn ghost" data-action="close">Cerrar</button></div>`,
    actions,
    () => undefined,
    'wide',
  );
  // centra la vista en el nivel actual
  document.querySelector('.pass-row.reached:last-of-type, .pass-row.reached')?.scrollIntoView({ block: 'center' });
}

function showProfile(): void {
  const lv = levelInfo(save.xp);
  const close = openDialog(
    `<h2>${icon('star')}Nivel ${lv.level}</h2>
     <div class="xp-row"><span class="lvl">${lv.level}</span><div class="xp-bar"><i style="--from:${(lv.into / lv.needed) * 100}%;--to:${(lv.into / lv.needed) * 100}%"></i></div><b>${lv.into}/${lv.needed}</b></div>
     <p>Gana XP en cada partida. Cada nivel trae monedas y, cada 5 niveles, gemas y una bomba.</p>
     <div class="stats">
       <div><b>${fmt(save.stats.gamesPlayed)}</b><span>Partidas</span></div>
       <div><b>${fmt(save.stats.totalLines)}</b><span>Líneas</span></div>
       <div><b>x${save.stats.bestCombo}</b><span>Mejor racha</span></div>
       <div><b>${fmt(save.bestScore)}</b><span>Récord</span></div>
     </div>
     <div class="stack"><button class="btn ghost" data-action="close">Cerrar</button></div>`,
    { close: () => close() },
    () => undefined,
  );
}

function showWelcomeOffer(next: () => void): void {
  const p = productById('starter_pack')!;
  void platform.billing.getProducts().then((products) => {
    const price = products.find((x) => x.id === p.id)?.price;
    if (!price) return next();
    const close = openDialog(
      `<div class="offer-glow"></div>
       <h2>${icon('gift')}¡Bienvenida!</h2>
       <p>Como gracias por jugar, este pack solo se ofrece una vez en esta pantalla. También seguirá en la tienda.</p>
       <div class="offer-items">
         <div>${icon('gem')}<b>300</b><span>gemas</span></div>
         <div>${icon('palette')}<b>Oro Real</b><span>tema exclusivo</span></div>
         <div>${icon('check')}<b>Sin anuncios</b><span>para siempre</span></div>
       </div>
       <div class="stack">
         <button class="btn primary big" data-action="buy">${price}</button>
         <button class="btn ghost" data-action="no">No, gracias</button>
       </div>`,
      {
        buy: () => purchase(p.id, () => (close(), next())),
        no: () => (close(), next()),
      },
      undefined,
      'offer',
    );
  });
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
  const boosterRows = (Object.keys(BOOSTERS) as BoosterId[])
    .map((id) => {
      const b = BOOSTERS[id];
      return `<div class="item"><div class="info"><b>${icon(b.icon)}${b.name}</b><span>${b.desc}. Tienes ${save.boosters[id]}.</span></div>
        <button class="btn gem" data-action="booster:${id}" ${save.gems < b.cost ? 'disabled' : ''}>${icon('gem')}${b.cost}</button></div>`;
    })
    .join('');
  const actions: Actions = {
    close: () => close(),
    restore: async () => {
      const before = save.ownedProducts.length;
      await platform.billing.restore();
      const restored = save.ownedProducts.length - before;
      toast(restored > 0 ? `${restored} compra(s) restaurada(s)` : 'No hay compras que restaurar');
      if (restored > 0) (close(), void showShop());
    },
  };
  for (const id of Object.keys(BOOSTERS) as BoosterId[])
    actions[`booster:${id}`] = () => {
      if (!spendGems(save, BOOSTERS[id].cost)) return toast('No tienes suficientes gemas');
      save.boosters[id]++;
      persist();
      sfx.coin();
      close();
      refresh();
      void showShop();
    };
  for (const p of PRODUCTS) actions[`buy:${p.id}`] = () => purchase(p.id, close);
  const close = openDialog(
    `<h2>${icon('cart')}Tienda</h2>
     ${platform.simulated ? '<p class="legal">Modo desarrollo: las compras son simuladas.</p>' : ''}
     <div class="section-title">Ofertas</div><div class="list">${items || `<p>${products.length === 0 ? 'La tienda no está disponible ahora mismo. Comprueba tu conexión.' : '¡Ya lo tienes todo!'}</p>`}</div>
     <div class="section-title">Potenciadores con gemas</div>
     <div class="list">${boosterRows}</div>
     <p class="legal">Los pagos se procesan de forma segura con Google Play. Precios con impuestos incluidos según tu país.
       Ningún producto contiene recompensas aleatorias. Todo el contenido de juego puede conseguirse jugando.</p>
     <div class="stack"><button class="btn ghost" data-action="restore">Restaurar compras</button>
     <button class="btn" data-action="close">Cerrar</button></div>`,
    actions,
    () => undefined,
  );
}

async function purchase(productId: string, onDone: () => void): Promise<void> {
  const res = await platform.billing.purchase(productId);
  if (res.status === 'purchased') {
    onDone();
    if (productId !== PASS_PRODUCT_ID && productId !== 'starter_pack') void showShop();
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
    else if (t.exclusiveTo === PASS_PRODUCT_ID) btn = `<button class="btn" data-action="pass">${icon('crown')}Pase</button>`;
    else if (t.exclusiveTo) btn = `<button class="btn" data-action="shop">Pack de inicio</button>`;
    else btn = `<button class="btn ${t.price!.currency === 'gems' ? 'gem' : 'primary'}" data-action="buy:${t.id}">${icon(t.price!.currency === 'gems' ? 'gem' : 'coin')}${fmt(t.price!.amount)}</button>`;
    return `<div class="item">${swatch}<div class="info"><b>${t.name}</b><span>${owned ? 'Desbloqueado' : t.exclusiveTo === PASS_PRODUCT_ID ? 'Premio del Pase Gemzy' : 'Cosmético'}</span></div>${btn}</div>`;
  }).join('');
  const actions: Actions = { close: () => close(), shop: () => (close(), void showShop()), pass: () => (close(), void showPass()) };
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
  missions: showMissions,
  pass: () => void showPass(),
  profile: showProfile,
  'daily-reward': showDailyReward,
  settings: showSettings,
  pause: showPause,
  'booster:hammer': () => useBooster('hammer'),
  'booster:bomb': () => useBooster('bomb'),
  'booster:shuffle': () => useBooster('shuffle'),
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
