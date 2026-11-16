import './styles.css';
import { LEARN } from './content.de';
import { ledger, LevelId, resetLedger } from './state';
import { BRAND_HTML } from './ui/brand';
import { $ } from './ui/dom';
import { showLearnCard } from './ui/learnCard';
import { startSnow } from './ui/snow';
import { intro } from './scenes/intro';
import { inbox } from './scenes/inbox';
import { inventory } from './scenes/inventory';
import { translate } from './scenes/translate';
import { drive } from './scenes/drive';
import { decision } from './scenes/decision';
import { audit } from './scenes/audit';
import { donate } from './scenes/donate';

export interface SceneCtx {
  root: HTMLElement;
  overlay: HTMLElement;
  /** Level abschließen: Lernkarte zeigen, dann weiter. */
  finish: (learnKey?: keyof typeof LEARN) => Promise<void>;
  /** Zurück zum Anfang. */
  restart: () => void;
  /** Wird true, sobald die Szene verlassen wurde (z. B. durch Überspringen). */
  isActive: () => boolean;
}

type Scene = { id: 'intro' | LevelId | 'donate'; label: string; run: (ctx: SceneCtx) => void };

const SCENES: Scene[] = [
  { id: 'intro', label: 'Start', run: intro },
  { id: 'inbox', label: 'Postfach', run: inbox },
  { id: 'inventory', label: 'Lager', run: inventory },
  { id: 'translate', label: 'Übersetzung', run: translate },
  { id: 'drive', label: 'Drive', run: drive },
  { id: 'decision', label: 'Entscheidung', run: decision },
  { id: 'audit', label: 'Prüfbericht', run: audit },
  { id: 'donate', label: 'Spende', run: donate },
];
const LEVELS = SCENES.filter(s => s.id !== 'intro' && s.id !== 'donate');

const sceneRoot = $(document, '#scene');
const overlay = $(document, '#overlay');
const topbar = $(document, '#topbar');
const progress = $(document, '#progress');
const skipBtn = $<HTMLButtonElement>(document, '#skip');
$(topbar, '.brand').innerHTML = BRAND_HTML;

let current = 0;
let token = 0;

function renderProgress() {
  const id = SCENES[current].id;
  const idx = LEVELS.findIndex(l => l.id === id);
  progress.innerHTML = LEVELS.map((l, i) => {
    const state = i < idx || id === 'donate' ? 'done' : i === idx ? 'now' : '';
    return `<li class="${state}" title="${l.label}"><span class="sr-only">${l.label}${state === 'done' ? ' (erledigt)' : state === 'now' ? ' (aktuell)' : ''}</span>❄</li>`;
  }).join('');
}

function go(index: number) {
  current = index;
  const scene = SCENES[current];
  const my = ++token;
  overlay.innerHTML = '';
  topbar.hidden = scene.id === 'intro';
  skipBtn.hidden = !LEVELS.some(l => l.id === scene.id);
  renderProgress();
  sceneRoot.innerHTML = '';
  sceneRoot.scrollTop = 0;
  sceneRoot.className = `scene-${scene.id}`;
  const ctx: SceneCtx = {
    root: sceneRoot,
    overlay,
    isActive: () => my === token,
    finish: async learnKey => {
      if (my !== token) return;
      if (learnKey) await showLearnCard(overlay, LEARN[learnKey]);
      if (my === token) go(current + 1);
    },
    restart: () => { resetLedger(); go(0); },
  };
  scene.run(ctx);
  sceneRoot.focus({ preventScroll: true });
}

skipBtn.addEventListener('click', () => {
  const id = SCENES[current].id as LevelId;
  ledger.skipped.add(id);
  go(current + 1);
});

startSnow($(document, '#snow'));

// Entwickler-Abkürzung: ?scene=audit springt direkt zu einer Szene.
const start = new URLSearchParams(location.search).get('scene');
const startIdx = SCENES.findIndex(s => s.id === start);
go(startIdx > 0 ? startIdx : 0);
