// Die Spielwelt: eine 320×200-Pixel-Bühne mit Kamera, Parallax-Ebenen und animierten Figuren.
import { STOCK } from '../content.de';
import { reduceMotion } from '../ui/dom';
import { sfx } from '../ui/sfx';
import {
  DOC, ELF, EMAIL, ENVELOPE, KidPose, REINDEER_A, REINDEER_B, SANTA, flip, giftBox, icon, kidRows, silhouette, sprite,
} from './pixels';

export const W = 320;
export const H = 200;
const GROUND = 150;

export type Pt = { x: number; y: number };
export type Mode = 'title' | 'north' | 'duesseldorf' | 'xmas';
export type SackCat = 'wunsch' | 'dringend' | 'verwaltung' | 'spam';
export type Shot = 'wide' | 'village' | 'workshop' | 'cloud' | 'mid' | 'basket';

/** Kamera-Einstellungen: [x, y, zoom] */
const SHOTS: Record<Shot, [number, number, number]> = {
  wide: [160, 100, 1],
  village: [107, 133, 1.5], // Kinder, Briefkasten, Santa, Säcke
  workshop: [213, 118, 1.5], // Santa und das Lager
  cloud: [107, 104, 1.5], // Drive-Wolke über den Häusern
  mid: [160, 120, 1.25],
  basket: [213, 128, 1.5], // Spendenkorb in Düsseldorf
};

interface Kid {
  id: string; name: string; x: number; base: number; pal: Record<string, string>;
  pose: KidPose; facing: 1 | -1; visible: boolean; walking: boolean;
  letter: boolean; shiver: boolean; gift: HTMLCanvasElement | null; sad: boolean;
  hop: number; phase: number;
}
interface Flyer { img: HTMLCanvasElement; x: number; y: number; from: Pt; to: Pt; t0: number; dur: number; arc: number; trail?: string; spin: boolean; done: () => void }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; grav: number; kind: 0 | 1 | 2; grow: number }
interface Tween { obj: Record<string, number>; key: string; from: number; to: number; t0: number; dur: number; ease: (t: number) => number; done: () => void }
interface UiItem { el: HTMLElement; anchor: () => Pt; until: number; clamp: boolean }
interface Layers { sky: HTMLCanvasElement; far: HTMLCanvasElement; near: HTMLCanvasElement }
type Fill = (x: number, y: number, w: number, h: number, c: string) => void;

const EASE = {
  linear: (t: number) => t,
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: (t: number) => t * t * t,
  back: (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
};
export type EaseName = keyof typeof EASE;

export const KIDS: Record<string, { name: string; home: number; pal: Record<string, string> }> = {
  lena: { name: 'Lena', home: 10, pal: { t: '#2f9e5a', T: '#1b5e3a', h: '#6b3e26' } },
  ben: { name: 'Ben', home: 26, pal: { t: '#4a7fd6', T: '#2a4a8f', h: '#f2d16b' } },
  emma: { name: 'Emma', home: 56, pal: { t: '#9b5fc0', T: '#6b3a8a', h: '#2a1d14' } },
  paul: { name: 'Paul', home: 76, pal: { t: '#e0651a', T: '#a8460e', h: '#b5451b' } },
  mateo: { name: 'Mateo', home: 34, pal: { t: '#2bb3a3', T: '#18786d', h: '#2a1d14' } },
  jonas: { name: 'Jonas', home: 64, pal: { t: '#8a8f9e', T: '#5c6378', h: '#7a4a2a' } },
};
export const MAIN_KIDS = ['lena', 'ben', 'emma', 'paul'];

const HOUSES = [
  { x: 2, w: 46, h: 42, wall: '#a8473a', wall2: '#8e3a30', roof: '#4b2c3f', door: 21 },
  { x: 54, w: 36, h: 30, wall: '#5a6e9c', wall2: '#4a5c86', roof: '#2e2f55', door: 68 },
];
const MAILBOX = { x: 98, top: 124 };
const SHELF = { x: 240, y: 82 };
const CLOUD = { x: 72, y: 66 };
const TREE_X = 214;
const SACK_X: Record<SackCat, number> = { wunsch: 116, dringend: 138, verwaltung: 160, spam: 182 };
const SACK_COLOR: Record<SackCat, [string, string]> = {
  wunsch: ['#d62f3a', '#8f1d2c'], dringend: ['#e0651a', '#a8460e'], verwaltung: ['#4a7fd6', '#2a4a8f'], spam: ['#9aa3b5', '#5c6378'],
};
const SACK_ICON: Record<SackCat, string> = { wunsch: '💌', dringend: '🔥', verwaltung: '📁', spam: '🚫' };
const SLEIGH_SLOTS: Pt[] = [
  { x: 26, y: -21 }, { x: 34, y: -21 }, { x: 30, y: -29 }, { x: 26, y: -37 }, { x: 34, y: -37 }, { x: 30, y: -45 }, { x: 38, y: -29 }, { x: 22, y: -29 },
];
const LIGHTS = ['#ff4d4d', '#ffd34d', '#4dff88', '#4db8ff'];
const MOONS: Record<string, { x: number; y: number; r: number }> = {
  title: { x: 160, y: 74, r: 40 }, north: { x: 196, y: 26, r: 11 }, duesseldorf: { x: 40, y: 28, r: 12 },
};
const SKIN = '#f6c9a4';

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function makeLayer(): [HTMLCanvasElement, Fill] {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  return [c, (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }];
}

const moonCache = new Map<number, HTMLCanvasElement>();
function moonSprite(r: number): HTMLCanvasElement {
  const hit = moonCache.get(r);
  if (hit) return hit;
  const pad = 4, d = r * 2 + pad * 2 + 1;
  const c = document.createElement('canvas');
  c.width = d; c.height = d;
  const g = c.getContext('2d')!;
  const cx = r + pad, cy = r + pad;
  for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) {
    const dist = Math.hypot(x - cx, y - cy);
    if (dist <= r) g.fillStyle = '#fff3c4';
    else if (dist <= r + 3 && (x + y) % 2 === 0) g.fillStyle = '#4b4583';
    else continue;
    g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = '#ead9a0';
  [[-0.3, -0.2, 0.18], [0.25, 0.15, 0.12], [-0.1, 0.4, 0.1]].forEach(([dx, dy, rr]) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (Math.hypot(x - dx * r, y - dy * r) < rr * r) g.fillRect(cx + x, cy + y, 1, 1);
  });
  moonCache.set(r, c);
  return c;
}

let cloudCache: HTMLCanvasElement | null = null;
function cloudSprite(): HTMLCanvasElement {
  if (cloudCache) return cloudCache;
  const c = document.createElement('canvas');
  c.width = 40; c.height = 30;
  const g = c.getContext('2d')!;
  const circles: [number, number, number][] = [[-9, 2, 7], [0, -3, 9], [9, 2, 7], [3, 4, 7]];
  for (let y = -15; y < 15; y++) for (let x = -20; x < 20; x++) {
    const inside = circles.some(([a, b, r]) => Math.hypot(x - a, y - b) < r);
    const edge = !inside && circles.some(([a, b, r]) => Math.hypot(x - a, y - b) < r + 1.2);
    if (inside) g.fillStyle = y > 4 ? '#c9d3ea' : '#eef2fb';
    else if (edge) g.fillStyle = '#7d8bb8';
    else continue;
    g.fillRect(x + 20, y + 15, 1, 1);
  }
  cloudCache = c;
  return c;
}

export class World {
  readonly canvas: HTMLCanvasElement;
  readonly ui: HTMLElement;
  private g: CanvasRenderingContext2D;
  /** Geräte-Pixel pro Welt-Pixel (ganzzahlig, damit alles scharf bleibt) */
  private S = 0;
  private view = { q: 2, tx: 0, ty: 0 };
  private shakeX = 0;
  private shakeY = 0;
  mode: Mode = 'title';
  time = 0;
  private last = 0;
  camera = { x: W / 2, y: H / 2, zoom: 1 };
  private layerCache = new Map<string, Layers>();
  private dusWin: Pt[] = [];

  private flakes: { x: number; y: number; s: number; d: number; r: number }[] = [];
  private stars: { x: number; y: number; tw: number }[] = [];
  fx = { storm: 0, snowLevel: 0, shake: 0, wipe: 0, buzz: 0, cartX: 360, titleX: -120, scan: 0, flash: 0 };

  kids = new Map<string, Kid>();
  sleigh = { x: 124, y: 152, flying: 0, bump: 0 };
  santa = { phone: false, sweat: false, wave: false, laugh: 0 };
  pile = 0;
  private pileBump = 0;
  unsure = 0;
  litter: Pt[] = [];
  sacks = {
    visible: false, onSleigh: false,
    counts: { wunsch: 0, dringend: 0, verwaltung: 0, spam: 0 } as Record<SackCat, number>,
    bump: { wunsch: 0, dringend: 0, verwaltung: 0, spam: 0 } as Record<SackCat, number>,
  };
  sleighGifts: HTMLCanvasElement[] = [];
  stock = STOCK.map(s => ({ id: s.id, have: s.inStock, need: s.requested }));
  shelfOn = false;
  shelfScan = false;
  stockAlert = false;
  cart = { visible: false, boxes: 0 };
  private lastCartX = 360;
  elf = { x: 222, jump: 0 };
  cloud = { visible: false, doc: true, found: false };
  basket = { count: 0, bump: 0, cheer: 0 };
  fireworks = false;
  private doorOpen = [0, 0];
  private rockets: { x: number; y: number; ty: number; c: number }[] = [];
  private shooting: { x: number; y: number; life: number } | null = null;
  private nextShoot = 3500;

  private flyers: Flyer[] = [];
  private particles: Particle[] = [];
  private tweens: Tween[] = [];
  private uiItems: UiItem[] = [];
  private tagMap = new Map<string, UiItem>();

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.canvas = canvas;
    this.ui = ui;
    this.g = canvas.getContext('2d')!;
    this.resize();
    if ('ResizeObserver' in window) new ResizeObserver(this.resize).observe(canvas);
    window.addEventListener('resize', this.resize);
    for (let i = 0; i < 300; i++) {
      const near = Math.random() < 0.22;
      this.flakes.push({ x: Math.random() * W, y: Math.random() * H, s: near ? 0.7 + Math.random() * 0.6 : 0.25 + Math.random() * 0.45, d: Math.random() * 6, r: near ? 1.6 : Math.random() < 0.5 ? 1 : 0.7 });
    }
    for (let i = 0; i < 56; i++) this.stars.push({ x: Math.floor(rand(i) * W), y: Math.floor(rand(i + 99) * 108), tw: rand(i + 7) });
    requestAnimationFrame(t => { this.last = t; this.loop(t); });
  }

  private resize = () => {
    const cssW = this.canvas.clientWidth || W;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const S = Math.max(2, Math.min(5, Math.round((cssW * dpr) / W)));
    if (S === this.S) return;
    this.S = S;
    this.canvas.width = W * S;
    this.canvas.height = H * S;
  };

  // ================================================================ Loop
  private loop = (t: number) => {
    const dt = Math.min(50, t - this.last);
    this.last = t;
    this.time += dt;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop);
  };

  private flakeCount() {
    return this.mode === 'title' ? 70 : Math.min(this.flakes.length, 80 + Math.round(this.fx.storm * 210));
  }

  private update(dt: number) {
    const now = this.time;
    const k = dt / 16.7;
    for (const tw of [...this.tweens]) {
      const p = Math.min(1, (now - tw.t0) / tw.dur);
      tw.obj[tw.key] = tw.from + (tw.to - tw.from) * tw.ease(p);
      if (p >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.done(); }
    }
    const storm = this.fx.storm;
    const n = this.flakeCount();
    for (let i = 0; i < n; i++) {
      const f = this.flakes[i];
      f.d += 0.02 * k;
      f.y += f.s * (0.45 + storm * 1.6) * k;
      f.x += (Math.sin(f.d) * 0.25 - storm * (1.2 + f.s * 1.4)) * k;
      if (f.y > H + 2) { f.y = -2; f.x = Math.random() * (W + 70 * storm); }
      if (f.x < -4) f.x += W + 8;
    }
    for (const fl of [...this.flyers]) {
      const p = Math.min(1, (now - fl.t0) / fl.dur);
      const e = EASE.inOut(p);
      fl.x = fl.from.x + (fl.to.x - fl.from.x) * e;
      fl.y = fl.from.y + (fl.to.y - fl.from.y) * e - fl.arc * 4 * p * (1 - p);
      if (fl.trail && Math.random() < 0.6 * k) this.particle(fl.x + (Math.random() - 0.5) * 3, fl.y + (Math.random() - 0.5) * 3, fl.trail, { life: 420, size: 1, vy: 0.04, kind: Math.random() < 0.3 ? 1 : 0 });
      if (p >= 1) { this.flyers.splice(this.flyers.indexOf(fl), 1); fl.done(); }
    }
    for (const p of [...this.particles]) {
      p.life -= dt;
      p.vy += p.grav * k;
      p.x += p.vx * k;
      p.y += p.vy * k;
      if (p.life <= 0) this.particles.splice(this.particles.indexOf(p), 1);
    }
    this.ambient(dt, k);

    const dec = (v: number) => Math.max(0, v - dt);
    this.fx.shake = dec(this.fx.shake);
    this.fx.buzz = dec(this.fx.buzz);
    this.fx.flash = dec(this.fx.flash);
    this.elf.jump = dec(this.elf.jump);
    this.sleigh.bump = dec(this.sleigh.bump);
    this.pileBump = dec(this.pileBump);
    this.santa.laugh = dec(this.santa.laugh);
    this.basket.bump = dec(this.basket.bump);
    this.basket.cheer = dec(this.basket.cheer);
    this.doorOpen[0] = dec(this.doorOpen[0]);
    this.doorOpen[1] = dec(this.doorOpen[1]);
    for (const c of Object.keys(this.sacks.bump) as SackCat[]) this.sacks.bump[c] = dec(this.sacks.bump[c]);
    for (const kid of this.kids.values()) kid.hop = dec(kid.hop);
    this.updateUi(now);
  }

  /** Kleine Hintergrund-Animationen, die die Welt lebendig machen. */
  private ambient(dt: number, k: number) {
    const m = this.mode;
    const chance = (perSec: number) => Math.random() < (perSec * dt) / 1000;
    if (m === 'north' || m === 'xmas') {
      if (chance(3.2)) {
        const h = HOUSES[Math.random() < 0.5 ? 0 : 1];
        const roofH = Math.round(h.w * 0.38);
        this.particle(h.x + h.w - 9, GROUND - h.h - roofH - 1, '#7f87a8', { life: 2200, size: 1.2, grow: 2.2, vy: -0.2, vx: -0.1 - this.fx.storm * 1.3 });
      }
      if (chance(1.4)) this.particle(4 + Math.random() * (W - 8), GROUND + 3 + Math.random() * 44, '#ffffff', { life: 520, size: 1, kind: 1 });
      if (!this.sleigh.flying && chance(0.7)) this.particle(this.sleigh.x + 83, this.sleigh.y - 8, '#dfe6f5', { life: 900, size: 1, grow: 2.2, vx: 0.18, vy: -0.08 });
      for (const kid of this.kids.values()) {
        if (kid.visible && kid.shiver && chance(1.5)) this.particle(kid.x + 9, kid.base - 9, '#dfe6f5', { life: 800, size: 1, grow: 2, vx: 0.15, vy: -0.1 });
      }
      if (this.cart.visible && Math.abs(this.fx.cartX - this.lastCartX) > 0.15) {
        this.particle(this.fx.cartX + (this.fx.cartX < this.lastCartX ? 28 : -2), GROUND + 6, '#ffffff', { life: 420, size: 1.5, vx: (Math.random() - 0.3) * 0.8, vy: -0.5 - Math.random() * 0.5, grav: 0.05 });
      }
      this.lastCartX = this.fx.cartX;
      if (m === 'xmas' && this.sleigh.flying) {
        this.sleigh.x += 0.5 * k;
        this.sleigh.y = 60 + Math.sin(this.time / 900) * 6;
        if (this.sleigh.x > W + 20) this.sleigh.x = -110;
        if (chance(26)) this.particle(this.sleigh.x + 2, this.sleigh.y - 4 + Math.random() * 4, Math.random() < 0.5 ? '#ffd34d' : '#ffffff', { life: 800, vy: 0.08, kind: Math.random() < 0.4 ? 1 : 0 });
      }
    }
    if (m === 'duesseldorf' && chance(4)) this.particle(294 + Math.random() * 3, 111, '#c9cfe0', { life: 2000, size: 1.4, grow: 2.6, vy: -0.22, vx: -0.06 });
    if (m === 'title') {
      this.fx.titleX += 0.5 * k;
      if (this.fx.titleX > W + 40) this.fx.titleX = -130;
      if (chance(22)) this.particle(this.fx.titleX + 2, 66 + Math.sin(this.time / 600) * 4 - (this.fx.titleX - 40) * 0.08 + Math.random() * 4, Math.random() < 0.5 ? '#ffd34d' : '#ffffff', { life: 900, vy: 0.06, kind: Math.random() < 0.4 ? 1 : 0 });
    }
    // Sternschnuppen
    if (m !== 'duesseldorf') {
      this.nextShoot -= dt;
      if (this.nextShoot <= 0 && !this.shooting) {
        this.shooting = { x: 10 + Math.random() * 170, y: 4 + Math.random() * 30, life: 800 };
        this.nextShoot = 5000 + Math.random() * 7000;
      }
    }
    if (this.shooting) {
      this.shooting.x += 2.6 * k;
      this.shooting.y += 1 * k;
      this.shooting.life -= dt;
      if (this.shooting.life <= 0) this.shooting = null;
    }
    // Feuerwerk
    if (this.fireworks && chance(1.2)) {
      this.rockets.push({ x: 30 + Math.random() * 260, y: GROUND - 8, ty: 20 + Math.random() * 50, c: Math.floor(Math.random() * 4) });
      sfx.firework();
    }
    for (const r of [...this.rockets]) {
      r.y -= 2.5 * k;
      this.particle(r.x + (Math.random() - 0.5), r.y + 2, '#ffd34d', { life: 260, size: 1 });
      if (r.y <= r.ty) { this.rockets.splice(this.rockets.indexOf(r), 1); this.burst(r.x, r.y, r.c); }
    }
  }

  private burst(x: number, y: number, c: number) {
    const colors = [['#ff4d4d', '#ffd34d'], ['#4dff88', '#ffffff'], ['#4db8ff', '#b57bd6'], ['#e0651a', '#ffd34d']][c % 4];
    this.particle(x, y, '#ffffff', { life: 260, size: 3, kind: 1 });
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2, s = (i % 2 ? 1.25 : 0.7) + Math.random() * 0.25;
      this.particle(x, y, colors[i % 2], { vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: 0.022, life: 900 + Math.random() * 400, size: 1, kind: i % 5 === 0 ? 1 : 0 });
    }
  }

  // ================================================================ Zeichnen
  private clamped() {
    const z = Math.max(1, this.camera.zoom);
    const hw = W / (2 * z), hh = H / (2 * z);
    return { zoom: z, x: Math.max(hw, Math.min(W - hw, this.camera.x)), y: Math.max(hh, Math.min(H - hh, this.camera.y)) };
  }

  /** Welt-Koordinate → Bühnen-Koordinate (0..W, 0..H) unter der aktuellen Kamera. */
  project(p: Pt): Pt {
    const c = this.clamped();
    return { x: (p.x - c.x) * c.zoom + W / 2, y: (p.y - c.y) * c.zoom + H / 2 };
  }

  /** Stellt die Ansicht für eine Ebene ein. f = Parallax-Faktor (1 = Vordergrund). */
  private setView(f: number) {
    const c = this.clamped();
    const z = 1 + (c.zoom - 1) * f;
    const cx = W / 2 + (c.x - W / 2) * f, cy = H / 2 + (c.y - H / 2) * f;
    const q = this.S * z;
    this.view = { q, tx: Math.round((W / 2) * this.S - cx * q) + this.shakeX, ty: Math.round((H / 2) * this.S - cy * q) + this.shakeY };
  }

  private px(x: number, y: number, w: number, h: number, c: string) {
    const v = this.view;
    const x0 = Math.round(x * v.q + v.tx), y0 = Math.round(y * v.q + v.ty);
    const x1 = Math.round((x + w) * v.q + v.tx), y1 = Math.round((y + h) * v.q + v.ty);
    this.g.fillStyle = c;
    this.g.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
  }

  private blit(img: HTMLCanvasElement, x: number, y: number, w = img.width, h = img.height) {
    const v = this.view;
    const x0 = Math.round(x * v.q + v.tx), y0 = Math.round(y * v.q + v.ty);
    const x1 = Math.round((x + w) * v.q + v.tx), y1 = Math.round((y + h) * v.q + v.ty);
    if (x1 <= x0 || y1 <= y0) return;
    this.g.drawImage(img, x0, y0, x1 - x0, y1 - y0);
  }

  private shadow(cx: number, y: number, w: number) {
    if (w < 2) return;
    this.g.globalAlpha = 0.16;
    this.px(cx - w / 2, y, w, 1, '#1b1b4a');
    this.px(cx - w / 2 + 1, y + 1, w - 2, 1, '#1b1b4a');
    this.g.globalAlpha = 1;
  }

  private draw() {
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 1;
    g.fillStyle = '#07071a';
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const shaking = this.fx.shake > 0 && !reduceMotion();
    this.shakeX = shaking ? Math.round((Math.random() - 0.5) * 3 * this.S) : 0;
    this.shakeY = shaking ? Math.round((Math.random() - 0.5) * 2 * this.S) : 0;
    const L = this.layers(this.mode);

    this.setView(0.2);
    this.blit(L.sky, 0, 0);
    this.drawSky();
    this.setView(0.55);
    this.blit(L.far, 0, 0);
    if (this.mode === 'duesseldorf') this.drawSkylineLights();
    this.setView(1);
    this.blit(L.near, 0, 0);
    if (this.mode === 'title') this.drawSleigh(this.fx.titleX, 70 + Math.sin(this.time / 600) * 4 - (this.fx.titleX - 40) * 0.08, '#141434');
    else if (this.mode === 'duesseldorf') this.drawDuesseldorf();
    else this.drawNorth();

    for (const fl of this.flyers) {
      const w = fl.spin ? Math.max(1.2, Math.abs(Math.cos((this.time - fl.t0) / 85)) * fl.img.width) : fl.img.width;
      this.blit(fl.img, fl.x - w / 2, fl.y - fl.img.height / 2, w, fl.img.height);
    }
    for (const p of this.particles) {
      const f = p.life / p.max;
      g.globalAlpha = Math.max(0, Math.min(1, f * 1.6));
      if (p.kind === 1) {
        const s = p.size * (0.4 + Math.sin(f * Math.PI) * 0.9);
        this.px(p.x - s, p.y, s * 2 + 1, 1, p.color);
        this.px(p.x, p.y - s, 1, s * 2 + 1, p.color);
      } else if (p.kind === 2) {
        const r = (1 - f) * p.size;
        for (let a = 0; a < 18; a++) this.px(p.x + Math.cos(a * 0.349) * r, p.y + Math.sin(a * 0.349) * r * 0.75, 1, 1, p.color);
      } else {
        const s = p.size + (1 - f) * p.grow;
        this.px(p.x - s / 2, p.y - s / 2, s, s, p.color);
      }
    }
    g.globalAlpha = 1;

    // Ab hier Bildschirm-Koordinaten (unabhängig von der Kamera)
    this.view = { q: this.S, tx: 0, ty: 0 };
    this.drawSnow();
    if (this.fx.flash > 0) { g.globalAlpha = this.fx.flash / 320; this.px(0, 0, W, H, '#ffffff'); g.globalAlpha = 1; }
    if (this.fx.wipe > 0) {
      const cw = this.canvas.width, ch = this.canvas.height;
      const r = (1 - this.fx.wipe) * 200 * this.S;
      g.fillStyle = '#05050f';
      g.beginPath();
      g.rect(0, 0, cw, ch);
      g.arc(cw / 2, ch / 2, Math.max(0, r), 0, Math.PI * 2, true);
      g.fill('evenodd');
    }
  }

  private drawSky() {
    const t = this.time, g = this.g;
    for (const s of this.stars) {
      const tw = Math.sin(t / 520 + s.tw * 20);
      this.px(s.x, s.y, 1, 1, tw > -0.6 ? '#ffffff' : '#6d6aa8');
      if (s.tw > 0.8 && tw > 0.3) {
        g.globalAlpha = 0.6;
        this.px(s.x - 1, s.y, 3, 1, '#b9b5f0');
        this.px(s.x, s.y - 1, 1, 3, '#b9b5f0');
        g.globalAlpha = 1;
      }
    }
    if (this.mode !== 'duesseldorf') {
      // Polarlicht
      const cols = ['#4dffb0', '#3fd6c8', '#7c6cff'];
      const strength = this.mode === 'title' ? 0.6 : 1;
      for (let x = 0; x < W; x += 2) {
        const base = 36 + Math.sin(x * 0.021 + t * 0.00025) * 9 + Math.sin(x * 0.047 - t * 0.0004) * 5;
        const amp = 0.5 + 0.5 * Math.sin(x * 0.013 + t * 0.0003);
        for (let b = 0; b < 3; b++) {
          g.globalAlpha = (0.15 - b * 0.04) * (0.3 + amp * 0.7) * strength;
          this.px(x, base + b * 7, 2, 9 + b * 2, cols[b]);
        }
      }
      g.globalAlpha = 1;
    }
    const m = MOONS[this.mode === 'xmas' ? 'north' : this.mode];
    this.blit(moonSprite(m.r), m.x - m.r - 4, m.y - m.r - 4);
    const sh = this.shooting;
    if (sh) {
      for (let i = 0; i < 8; i++) {
        g.globalAlpha = (1 - i / 8) * Math.min(1, sh.life / 250);
        this.px(sh.x - i * 2.4, sh.y - i * 0.92, i < 2 ? 2 : 1.4, 1, '#ffffff');
      }
      g.globalAlpha = 1;
    }
  }

  private drawSnow() {
    const g = this.g;
    const n = this.flakeCount();
    for (let i = 0; i < n; i++) {
      const f = this.flakes[i];
      g.globalAlpha = f.r > 1.2 ? 1 : f.r < 1 ? 0.6 : 0.85;
      this.px(f.x, f.y, f.r, f.r, '#ffffff');
    }
    if (this.fx.storm > 0.55) {
      g.globalAlpha = Math.min(0.5, (this.fx.storm - 0.55) * 1.1);
      for (let i = 0; i < 10; i++) {
        const x = W + 40 - ((this.time * (0.45 + i * 0.06) + i * 97) % (W + 120));
        this.px(x, (i * 53 + 17) % H, 20 + (i % 3) * 12, 1, '#ffffff');
      }
    }
    g.globalAlpha = 1;
  }

  // ---- Hintergrund-Ebenen (einmal gezeichnet, dann gecacht)
  private layers(mode: Mode): Layers {
    const key = mode === 'xmas' ? 'north' : mode;
    const hit = this.layerCache.get(key);
    if (hit) return hit;
    const [sky, ps] = makeLayer();
    const [far, pf] = makeLayer();
    const [near, pn] = makeLayer();

    // Himmel mit Dithering
    const bands = ['#07071a', '#0c0b26', '#131234', '#1b1944', '#252257', '#302b68', '#3c3477', '#463d85', '#4f458f'];
    const bh = 22;
    for (let y = 0; y < H; y++) {
      const i = Math.min(bands.length - 1, Math.floor(y / bh));
      const nxt = bands[Math.min(bands.length - 1, i + 1)];
      ps(0, y, W, 1, bands[i]);
      if (y % bh >= bh - 4) for (let x = y % 2; x < W; x += 2) if ((y % bh) - (bh - 4) >= (x % 4 === 0 ? 0 : 2)) ps(x, y, 1, 1, nxt);
    }
    const hills = (p: Fill, base: number, amp: number, f: number, ph: number, col: string, dither?: string) => {
      for (let x = 0; x < W; x++) {
        const y = Math.round(base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph * 2) * amp * 0.4);
        p(x, y, 1, H - y, col);
        if (dither && x % 2 === 0) p(x, y, 1, 1, dither);
      }
    };
    const pine = (p: Fill, x: number, base: number, h: number, col: string) => {
      for (let i = 0; i < h; i++) {
        const w = Math.floor((i / h) * (h * 0.55)) + 1;
        p(x - Math.floor(w / 2), base - h + i, w, 1, col);
        if (i % 4 === 0 && i > 0) p(x - Math.floor(w / 2), base - h + i, w, 1, '#e8eefc');
      }
      p(x - 1, base, 2, 2, '#3e2416');
    };

    if (key === 'title') {
      hills(pf, 150, 6, 0.03, 1, '#1a1a3a');
      hills(pn, 162, 5, 0.05, 3, '#232350');
      for (let i = 0; i < 9; i++) pine(pn, 18 + i * 36 + (i % 2) * 8, 160 + (i % 3), 16 + (i % 3) * 5, '#101028');
      pn(0, 178, W, 22, '#2b2b5c');
    } else if (key === 'duesseldorf') {
      this.dusWin = [];
      // Medienhafen: geschwungene Bauten
      for (let b = 0; b < 3; b++) {
        const bx = 6 + b * 17, top = 104 + (b % 2) * 8;
        for (let y = top; y < 142; y++) {
          const off = Math.round(Math.sin((y - top) * 0.18 + b) * 2);
          pf(bx + off, y, 14, 1, b === 1 ? '#8f6a52' : '#c9cfe0');
          if ((y - top) % 5 === 2) for (let x = 2; x < 13; x += 3) pf(bx + off + x, y, 1, 2, '#ffd34d');
        }
      }
      // Rheinturm
      const rx = 78;
      pf(rx, 36, 1, 16, '#c9cfe0');
      pf(rx - 1, 52, 3, 92, '#3a3f66');
      pf(rx - 6, 54, 13, 3, '#4b507c');
      pf(rx - 5, 57, 11, 2, '#3a3f66');
      pf(rx - 4, 59, 9, 1, '#ffd34d');
      for (let y = 70; y < 144; y += 6) pf(rx, y, 1, 2, '#ffd34d');
      // Altstadt mit Giebeln und St. Lambertus
      const roofs = ['#3a2a3a', '#2e2a48', '#3a2f3f'];
      let x = 100, i = 0;
      while (x < 200) {
        const w = 12 + (i % 3) * 3, h = 24 + ((i * 7) % 12);
        pf(x, 142 - h, w, h, ['#5d4a5e', '#4d4a6e', '#665060'][i % 3]);
        for (let r = 0; r < 6; r++) pf(x + r, 142 - h - 6 + r, w - 2 * r, 1, roofs[i % 3]);
        for (let wy = 142 - h + 4; wy < 138; wy += 6) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (rand(wx * wy) > 0.3) { pf(wx, wy, 2, 3, '#ffd34d'); this.dusWin.push({ x: wx, y: wy }); }
        x += w + 1; i++;
      }
      pf(150, 92, 8, 50, '#4d4a6e');
      for (let r = 0; r < 26; r++) pf(154 - Math.floor(r / 6), 66 + r, 1 + 2 * Math.floor(r / 6), 1, r % 4 < 2 ? '#2f6b5a' : '#245446');
      pf(153, 62, 1, 4, '#ffd34d');
      // Rheinkniebrücke
      pf(244, 60, 3, 84, '#c9cfe0');
      for (let c2 = 0; c2 < 6; c2++) {
        for (let t = 0; t < 1; t += 0.01) {
          pf(Math.round(245 - t * (60 - c2 * 6)), Math.round(64 + c2 * 3 + t * (74 - c2 * 3)), 1, 1, '#9aa3c5');
          pf(Math.round(245 + t * (60 - c2 * 6)), Math.round(64 + c2 * 3 + t * (74 - c2 * 3)), 1, 1, '#9aa3c5');
        }
      }
      pf(170, 138, 150, 3, '#c9cfe0');
      pf(0, 141, W, H - 141, '#1c2a5a');
      // Rhein
      for (let y = 142; y < 170; y++) pn(0, y, W, 1, y % 3 ? '#1c2a5a' : '#223268');
      // Promenade
      pn(0, 168, W, 32, '#8c8fa8');
      for (let y = 172; y < H; y += 6) for (let x2 = y % 12 ? 0 : 6; x2 < W; x2 += 12) pn(x2, y, 11, 1, '#7b7e96');
      pn(0, 168, W, 2, '#eef2fb');
      // Suppenküche
      const sx = 236, sy = 120;
      pn(sx, sy, 70, 50, '#9b6b4a');
      for (let y = sy; y < sy + 50; y += 4) for (let x2 = sx + ((y / 4) % 2 ? 0 : 4); x2 < sx + 70; x2 += 8) pn(x2, y, 7, 1, '#8a5c3e');
      for (let r = 0; r < 10; r++) pn(sx - 4 + r, sy - 10 + r, 78 - 2 * r, 1, '#5a3442');
      pn(sx - 4, sy - 1, 78, 2, '#eef2fb');
      pn(sx + 56, sy - 14, 6, 8, '#5a3440');
      pn(sx + 55, sy - 15, 8, 2, '#eef2fb');
      pn(sx + 29, sy + 26, 12, 24, '#5a3420');
      pn(sx + 30, sy + 27, 10, 22, '#ffcf6b');
      [[sx + 6, sy + 12], [sx + 50, sy + 12], [sx + 6, sy + 30], [sx + 50, sy + 30]].forEach(([wx, wy]) => {
        pn(wx, wy, 14, 10, '#3a2a1a'); pn(wx + 1, wy + 1, 12, 8, '#ffcf6b'); pn(wx + 7, wy + 1, 1, 8, '#c08a3a'); pn(wx + 1, wy + 5, 12, 1, '#c08a3a');
      });
    } else {
      // Nordpol: ferne Hügel mit Tannen
      hills(pf, 126, 5, 0.035, 0.5, '#9fabcc', '#b8c3e0');
      for (let i = 0; i < 12; i++) pine(pf, 8 + i * 27 + (i % 3) * 5, 130 + (i % 2) * 3, 10 + (i % 4) * 3, '#244a52');
      // Vordergrund
      hills(pn, 138, 4, 0.05, 2, '#c8d2ea', '#dbe2f4');
      pn(0, GROUND - 2, W, H - GROUND + 2, '#eef2fb');
      for (let y = GROUND; y < H; y += 2) for (let x = y % 4 ? 0 : 1; x < W; x += 2) if (rand(x * 3 + y) > 0.72) pn(x, y, 1, 1, '#dbe2f2');
      for (let x = 0; x < W; x += 2) pn(x, GROUND - 2, 1, 1, '#ffffff');
      for (const h of HOUSES) {
        const top = GROUND - h.h;
        pn(h.x, top, h.w, h.h, h.wall);
        for (let y = top + 2; y < GROUND; y += 4) for (let x = h.x + ((y / 4) % 2 ? 1 : 4); x < h.x + h.w - 2; x += 7) pn(x, y, 5, 1, h.wall2);
        const roofH = Math.round(h.w * 0.38);
        // Schornstein hinter dem Dach
        pn(h.x + h.w - 12, top - roofH + 2, 6, 10, '#5a3440');
        pn(h.x + h.w - 13, top - roofH + 1, 8, 2, '#ffffff');
        for (let r = 0; r <= roofH; r++) {
          const half = Math.round((r / roofH) * (h.w / 2 + 4));
          const cx = h.x + h.w / 2;
          pn(cx - half, top - roofH + r, half * 2, 1, h.roof);
          pn(cx - half, top - roofH + r, 2, 1, '#ffffff');
          pn(cx + half - 2, top - roofH + r, 2, 1, '#ffffff');
        }
        pn(h.x - 4, top, h.w + 8, 2, '#ffffff');
        for (let x = h.x - 3; x < h.x + h.w + 3; x += 3) pn(x, top + 2, 1, 1 + (x % 2), '#cfe3ff');
        const win = (wx: number, wy: number) => { pn(wx, wy, 9, 8, '#3a2a1a'); pn(wx + 1, wy + 1, 7, 6, '#ffd34d'); pn(wx + 4, wy + 1, 1, 6, '#c08a3a'); pn(wx + 1, wy + 4, 7, 1, '#c08a3a'); pn(wx - 1, wy - 1, 11, 1, '#ffffff'); };
        win(h.x + 4, top + 8);
        win(h.x + h.w - 13, top + 8);
        pn(h.door - 4, GROUND - 14, 9, 14, '#4a2c1c');
        pn(h.door - 3, GROUND - 13, 7, 13, '#6b3e26');
        pn(h.door + 2, GROUND - 7, 1, 1, '#ffd34d');
        pn(h.door - 2, GROUND - 11, 5, 4, '#2f9e5a');
        pn(h.door - 1, GROUND - 10, 3, 2, '#14301f');
      }
      // Tannenbaum beim Lager
      for (let i = 0; i < 34; i++) {
        const w = Math.floor(i * 0.62) + 1;
        pn(TREE_X - Math.floor(w / 2), 114 + i, w, 1, i % 6 < 3 ? '#1f6b45' : '#1b5e3a');
        if (i % 6 === 5) pn(TREE_X - Math.floor(w / 2), 114 + i, w, 1, '#e8eefc');
      }
      pn(TREE_X - 1, 148, 3, 3, '#3e2416');
      // Regal (Rahmen)
      const s = SHELF;
      pn(s.x, s.y, 3, GROUND - s.y, '#6b3e26');
      pn(s.x + 73, s.y, 3, GROUND - s.y, '#6b3e26');
      [s.y, s.y + 22, s.y + 44, s.y + 66].forEach(by => { pn(s.x, by, 76, 3, '#8a5a35'); pn(s.x, by, 76, 1, '#a8774a'); });
      pn(s.x - 2, s.y - 1, 80, 2, '#ffffff');
    }
    const L = { sky, far, near };
    this.layerCache.set(key, L);
    return L;
  }

  // ---- Nordpol
  private drawNorth() {
    const t = this.time, g = this.g;
    HOUSES.forEach((h, hi) => {
      const top = GROUND - h.h;
      // warmer Fensterschein, flackert leicht
      g.globalAlpha = 0.1 + Math.sin(t / 380 + hi * 2) * 0.03 + (Math.sin(t / 97 + hi) > 0.93 ? 0.05 : 0);
      this.px(h.x + 2, top + 6, 13, 12, '#ffd34d');
      this.px(h.x + h.w - 15, top + 6, 13, 12, '#ffd34d');
      g.globalAlpha = 1;
      // Lichterkette als Lauflicht
      const step = Math.floor(t / 300) + hi;
      for (let i = 0, x = h.x - 3; x < h.x + h.w + 3; x += 4, i++) {
        const on = (i + step) % 4 !== 0;
        const col = LIGHTS[i % 4];
        this.px(x, top + 3, 1, 1, on ? col : '#3a3a5a');
        if (on && (i + step) % 4 === 2) { g.globalAlpha = 0.28; this.px(x - 1, top + 2, 3, 3, col); g.globalAlpha = 1; }
      }
      if (this.doorOpen[hi] > 0) {
        this.px(h.door - 3, GROUND - 13, 7, 13, '#ffcf6b');
        g.globalAlpha = 0.3;
        this.px(h.door - 6, GROUND, 13, 4, '#ffcf6b');
        g.globalAlpha = 1;
      }
    });
    // Baumlichter
    for (let i = 0; i < 10; i++) {
      const row = 5 + i * 3;
      const w = Math.floor(row * 0.62) + 1;
      const x = TREE_X - Math.floor(w / 2) + ((i * 5 + 1) % Math.max(1, w - 1));
      const on = Math.sin(t / 300 + i * 1.7) > -0.2;
      this.px(x, 114 + row, 1, 1, on ? LIGHTS[i % 4] : '#14402b');
      if (on) { g.globalAlpha = 0.22; this.px(x - 1, 113 + row, 3, 3, LIGHTS[i % 4]); g.globalAlpha = 1; }
    }
    this.px(TREE_X - 1, 111, 3, 3, '#ffd34d');
    if (Math.sin(t / 450) > 0.4) { this.px(TREE_X, 109, 1, 7, '#fff8c9'); this.px(TREE_X - 3, 112, 7, 1, '#fff8c9'); }

    if (this.cloud.visible) this.drawCloud();
    this.drawShelf();
    this.drawMailbox();
    for (const p of this.litter) this.blit(sprite(ENVELOPE), p.x - 5, p.y - 5, 10, 6);
    this.drawSleigh(this.sleigh.x, this.sleigh.y);
    this.drawPile();
    if (this.sacks.visible) this.drawSacks();
    this.drawCart();
    this.drawElf();
    for (const kid of this.kids.values()) this.drawKid(kid);
    this.drawUnsure();
  }

  private drawSleigh(sx: number, sy: number, tint?: string) {
    const g = this.g, t = this.time;
    const flying = this.sleigh.flying > 0 || tint !== undefined;
    if (flying) sy += Math.sin(t / 380) * 1.5;
    else if (this.sleigh.bump > 0) sy += Math.sin((this.sleigh.bump / 220) * Math.PI) * 1.3;
    const P = (x: number, y: number, w: number, h: number, c: string) => this.px(x, y, w, h, tint ?? c);
    const draw = (img: HTMLCanvasElement, x: number, y: number) => this.blit(tint ? silhouette(img, tint) : img, x, y);
    if (!flying) { this.shadow(sx + 19, sy, 46); this.shadow(sx + 54, sy, 18); this.shadow(sx + 74, sy, 18); }

    // Ladung hinter Santa
    if (!tint) {
      if (this.sacks.onSleigh) this.drawSackShape(sx - 3, sy - 29, 'wunsch', 13);
      this.sleighGifts.forEach((img, i) => {
        const s = SLEIGH_SLOTS[i % SLEIGH_SLOTS.length];
        this.blit(img, sx + s.x, sy + s.y);
      });
    }
    // Santa: atmet, blinzelt, lacht, hüpft bei neuen Nachrichten
    const breathe = Math.sin(t / 650) * 0.5;
    const laugh = this.santa.laugh > 0 ? Math.sin(t / 42) * 0.9 : 0;
    const hop = this.fx.buzz > 0 ? -Math.sin(Math.min(1, this.fx.buzz / 260) * Math.PI) * 1.6 : 0;
    const sy2 = sy - 30 + breathe + laugh + hop;
    draw(sprite(SANTA), sx + 10, sy2);
    if (!tint) {
      if (t % 3400 < 130) { this.px(sx + 14, sy2 + 5, 1, 1, SKIN); this.px(sx + 19, sy2 + 5, 1, 1, SKIN); }
      if (this.santa.wave) {
        const f = Math.floor(t / 190) % 2;
        this.px(sx + 23, sy2 + 6 - f * 2, 2, 4, '#d62f3a');
        this.px(sx + 24, sy2 + 3 - f * 2, 2, 3, '#ffffff');
      }
      if (this.santa.phone) {
        const shake = this.fx.buzz > 0 ? (Math.floor(t / 40) % 2 ? 0.8 : -0.8) : 0;
        const px0 = sx + 15 + shake, py0 = sy2 + 9;
        g.globalAlpha = 0.22 + Math.sin(t / 300) * 0.08 + (this.fx.buzz > 0 ? 0.3 : 0);
        this.px(px0 - 2, py0 - 2, 8, 10, '#e0651a');
        g.globalAlpha = 1;
        this.px(px0, py0, 4, 6, '#17172f');
        this.px(px0 + 1, py0 + 1, 2, 3, this.fx.buzz > 0 ? '#ffffff' : '#ffb98a');
        this.px(px0 - 1, py0 + 3, 1, 2, '#0d0d1a');
        this.px(px0 + 4, py0 + 3, 1, 2, '#0d0d1a');
      }
      if (this.santa.sweat) {
        const d = (t / 110) % 8;
        this.px(sx + 8, sy2 + 3 + d, 1, 2, '#9fe0ff');
        this.px(sx + 25, sy2 + 5 + ((d + 4) % 8), 1, 2, '#9fe0ff');
      }
    }
    // Schlitten
    P(sx + 2, sy - 13, 34, 9, '#d62f3a');
    P(sx, sy - 17, 8, 13, '#d62f3a');
    P(sx + 34, sy - 11, 4, 7, '#d62f3a');
    P(sx + 2, sy - 6, 36, 2, '#8f1d2c');
    P(sx + 2, sy - 11, 34, 1, '#ffd34d');
    P(sx, sy - 17, 8, 1, '#ffd34d');
    P(sx + 1, sy - 16, 1, 10, '#ff7b7b');
    P(sx + 6, sy - 4, 2, 3, '#c9971c');
    P(sx + 30, sy - 4, 2, 3, '#c9971c');
    P(sx - 2, sy - 1, 42, 1, '#c9971c');
    P(sx + 40, sy - 3, 1, 2, '#c9971c');
    P(sx + 41, sy - 6, 1, 3, '#c9971c');
    P(sx + 40, sy - 7, 1, 1, '#c9971c');
    // Rentiere: im Flug galoppieren sie versetzt, am Boden atmen sie ruhig
    const gallop = flying ? Math.floor(t / 120) % 2 : 0;
    const b1 = flying ? Math.sin(t / 120) * 1 : Math.sin(t / 700) * 0.3;
    const b2 = flying ? Math.sin(t / 120 + 1.6) * 1 : Math.sin(t / 700 + 2) * 0.3;
    for (let i = 0; i < 8; i++) P(sx + 38 + i, sy - 8 + i / 4, 1, 1, '#6b3e26');
    for (let i = 0; i < 10; i++) P(sx + 56 + i, sy - 8 + b1 + ((b2 - b1) * i) / 10, 1, 1, '#6b3e26');
    draw(sprite(gallop ? REINDEER_B : REINDEER_A, { N: '#3e2416' }), sx + 44, sy - 13 + b1);
    draw(sprite(flying && !gallop ? REINDEER_B : REINDEER_A, { N: '#ff3b3b' }), sx + 64, sy - 13 + b2);
    if (!tint) {
      // Rudolphs Nase glüht
      const glow = 0.22 + Math.sin(t / 260) * 0.14;
      g.globalAlpha = glow * 0.5;
      this.px(sx + 79, sy - 11 + b2, 5, 5, '#ff5a5a');
      g.globalAlpha = glow + 0.1;
      this.px(sx + 80, sy - 10 + b2, 3, 3, '#ff6b6b');
      g.globalAlpha = 1;
    }
  }

  private drawKid(k: Kid) {
    if (!k.visible) return;
    const g = this.g;
    const t = this.time + k.phase;
    const step = Math.floor(t / 130);
    const base = sprite(kidRows(k.walking ? 'walk' : k.pose, step), k.pal);
    const img = k.facing < 0 ? flip(base) : base;
    const x = k.x + (k.shiver ? (Math.floor(t / 60) % 2 ? 0.6 : -0.3) : 0);
    let lift = 0;
    if (k.walking) lift = step % 2 ? 1 : 0;
    else if (k.pose === 'cheer') lift = Math.abs(Math.sin(t / 170)) * 4;
    else lift = 0.4 + Math.sin(t / 500) * 0.4;
    if (k.hop > 0) lift += Math.sin((1 - k.hop / 320) * Math.PI) * 5;
    const y = k.base - 16 - lift + (k.sad ? 1 : 0);
    this.shadow(k.x + 5, k.base, 9 - Math.min(4, lift));
    this.blit(img, x, y);
    if ((t + 900) % 2900 < 120) { this.px(x + 3, y + 5, 1, 1, SKIN); this.px(x + 6, y + 5, 1, 1, SKIN); }
    if (k.pose === 'type' && !k.walking && Math.floor(t / 90) % 3) {
      g.globalAlpha = 0.35;
      this.px(x + 2, y + 9, 6, 4, '#9fe0ff');
      g.globalAlpha = 1;
    }
    if (k.letter) { this.px(x + 7, y + 9, 6, 4, '#0d0d1a'); this.px(x + 8, y + 10, 4, 2, '#ffffff'); }
    if (k.gift) this.blit(k.gift, x + 1, y - 10 - Math.abs(Math.sin(t / 220)) * 1.5);
    if (k.sad) this.px(x + 2, y + 7 + ((t / 120) % 5), 1, 1, '#9fe0ff');
  }

  private drawElf() {
    const t = this.time;
    const hop = this.elf.jump > 0 ? Math.sin((this.elf.jump / 500) * Math.PI) * 6 : 0.3 + Math.sin(t / 560) * 0.3;
    const y = GROUND - 12 - hop;
    this.shadow(this.elf.x + 4, GROUND, 8 - Math.min(4, hop));
    this.blit(sprite(ELF), this.elf.x, y);
    if ((t + 1500) % 3100 < 120) { this.px(this.elf.x + 2, y + 6, 1, 1, SKIN); this.px(this.elf.x + 5, y + 6, 1, 1, SKIN); }
  }

  private drawMailbox() {
    const t = this.time;
    const L = this.fx.snowLevel;
    const x = MAILBOX.x + (this.fx.storm > 0.6 && L < 0.98 ? (Math.floor(t / 50) % 2 ? 0.5 : -0.5) : 0);
    const top = MAILBOX.top;
    this.px(x + 4, top + 14, 3, GROUND - top - 14, '#5c6378');
    this.px(x, top + 3, 11, 12, '#d62f3a');
    this.px(x + 1, top + 1, 9, 2, '#d62f3a');
    this.px(x + 2, top, 7, 1, '#d62f3a');
    this.px(x, top + 13, 11, 2, '#8f1d2c');
    this.px(x + 2, top + 5, 7, 1, '#0d0d1a');
    this.px(x + 3, top + 8, 5, 3, '#ffffff');
    this.px(x + 1, top + 2, 1, 9, '#ff7b7b');
    if (L <= 0.01) return;
    this.px(x - 1, top - 3 * L, 13, 3 * L + 1, '#ffffff');
    const hgt = Math.round(27 * L), half = 6 + 14 * L, cx = MAILBOX.x + 5;
    for (let dy = 0; dy <= hgt; dy++) {
      const w = Math.round(half * Math.sqrt(1 - Math.pow(dy / (hgt + 1), 2)));
      const y = GROUND + 2 - dy;
      this.px(cx - w, y, w * 2, 1, '#ffffff');
      this.px(cx - w, y, Math.max(1, Math.round(w * 0.35)), 1, '#dbe2f4');
      if (dy % 3 === 0) this.px(cx + w - 2, y, 1, 1, '#c9d3ea');
    }
    if (L > 0.9 && Math.sin(t / 400) > 0.5) { this.px(cx + 4, GROUND - 14, 3, 1, '#9fe0ff'); this.px(cx + 5, GROUND - 15, 1, 3, '#9fe0ff'); }
  }

  private pileSlot(i: number): Pt {
    return { x: 124 + ((i * 13) % 44) + (Math.floor(i / 4) % 2) * 3, y: 162 - Math.floor(i / 5) * 4 - (i % 2) * 2 };
  }

  private drawPile() {
    const env = sprite(ENVELOPE);
    for (let i = 0; i < this.pile; i++) {
      const p = this.pileSlot(i);
      const bump = i === this.pile - 1 && this.pileBump > 0 ? Math.sin((this.pileBump / 220) * Math.PI) * 4 : 0;
      this.blit(env, p.x, p.y - bump);
    }
  }

  private pileTop(): Pt {
    const p = this.pileSlot(Math.max(0, this.pile - 1));
    return { x: p.x + 5, y: p.y + 4 };
  }

  private drawUnsure() {
    const env = sprite(EMAIL);
    for (let i = 0; i < this.unsure; i++) {
      const x = this.sleigh.x + 2 + i * 14;
      const y = this.sleigh.y - 52 + Math.sin(this.time / 300 + i) * 2;
      this.g.globalAlpha = 0.25;
      this.px(x - 1, y - 1, 12, 10, '#ffd34d');
      this.g.globalAlpha = 1;
      this.blit(env, x, y);
      this.px(x + 4, y - 7, 3, 1, '#ffd34d'); this.px(x + 6, y - 6, 1, 2, '#ffd34d'); this.px(x + 5, y - 4, 1, 1, '#ffd34d'); this.px(x + 5, y - 2, 1, 1, '#ffd34d');
    }
  }

  unsurePt(i: number): Pt {
    return { x: this.sleigh.x + 7 + i * 14, y: this.sleigh.y - 48 };
  }

  private drawSackShape(x: number, y: number, cat: SackCat, size = 14) {
    const [c, d] = SACK_COLOR[cat];
    if (cat === 'spam') {
      this.px(x + 1, y + 2, size - 2, size - 2, c);
      this.px(x, y, size, 2, d);
      this.px(x + size / 2 - 2, y - 1, 4, 1, d);
      for (let i = x + 3; i < x + size - 2; i += 3) this.px(i, y + 4, 1, size - 7, d);
      return;
    }
    for (let r = 0; r < size; r++) {
      const w = Math.round(size * (r < 3 ? 0.45 : r < size - 2 ? 1 : 0.85));
      this.px(x + Math.round((size - w) / 2), y + r, w, 1, r > size - 4 ? d : c);
    }
    this.px(x + size / 2 - 3, y + 2, 6, 1, '#ffd34d');
    this.px(x + 2, y + 5, 1, size - 8, d);
  }

  private drawSacks() {
    (Object.keys(SACK_X) as SackCat[]).forEach(cat => {
      const b = this.sacks.bump[cat] > 0 ? Math.sin((this.sacks.bump[cat] / 200) * Math.PI) * 2 : 0;
      this.shadow(SACK_X[cat] + 7, 186, 14);
      this.drawSackShape(SACK_X[cat], 172 - b, cat);
    });
  }

  sackPt(cat: SackCat): Pt { return { x: SACK_X[cat] + 7, y: 176 }; }

  private drawShelf() {
    const t = this.time, g = this.g;
    this.stock.forEach((s, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = SHELF.x + 4 + col * 36, y = SHELF.y + 3 + row * 22;
      this.blit(icon(s.id), x, y + 8);
      const ratio = Math.min(1, s.have / s.need);
      const short = s.have < s.need;
      const boxes = Math.round(ratio * 6);
      for (let b = 0; b < boxes; b++) this.blit(giftBox(b + i), x + 10 + (b % 3) * 7, y + (b < 3 ? 11 : 3));
      const blink = short && this.stockAlert && Math.floor(t / 300) % 2 === 0;
      this.px(x + 10, y - 1, 22, 3, '#0d0d1a');
      this.px(x + 11, y, Math.max(1, 20 * ratio), 1, short ? (blink ? '#ffffff' : '#ff4d4d') : '#4dff88');
      if (short && this.stockAlert) {
        const b = Math.abs(Math.sin(t / 220 + i)) * 2;
        this.px(x + 2, y - b, 2, 4, '#ff4d4d');
        this.px(x + 2, y + 5 - b, 2, 1, '#ff4d4d');
      }
    });
    if (this.shelfScan) {
      const y = SHELF.y + 3 + ((t / 9) % 64);
      g.globalAlpha = 0.7;
      this.px(SHELF.x + 3, y, 70, 1, '#e0651a');
      g.globalAlpha = 0.18;
      this.px(SHELF.x + 3, y - 4, 70, 4, '#e0651a');
      g.globalAlpha = 1;
    }
    if (this.shelfOn) {
      g.globalAlpha = 0.2 + Math.sin(t / 400) * 0.08;
      this.px(SHELF.x - 1, SHELF.y - 3, 78, 2, '#e0651a');
      g.globalAlpha = 1;
    }
  }

  slotPt(id: string): Pt {
    const i = Math.max(0, this.stock.findIndex(s => s.id === id));
    return { x: SHELF.x + 20 + (i % 2) * 36, y: SHELF.y + 12 + Math.floor(i / 2) * 22 };
  }

  private drawCart() {
    if (!this.cart.visible) return;
    const x = this.fx.cartX, y = GROUND + 6 + Math.sin(this.time / 90) * 0.3;
    this.shadow(x + 14, GROUND + 7, 30);
    this.px(x, y - 6, 24, 6, '#8a5a35');
    this.px(x, y - 6, 24, 1, '#a8774a');
    this.px(x - 2, y, 28, 1, '#c9971c');
    this.px(x - 3, y - 2, 1, 2, '#c9971c');
    for (let b = 0; b < this.cart.boxes; b++) this.blit(giftBox(b), x + 1 + (b % 3) * 8, y - 14 - Math.floor(b / 3) * 8);
    this.blit(sprite(ELF, { g: '#c8323c' }), x + 26, y - 12);
  }

  private cloudPos(): Pt {
    return { x: CLOUD.x + Math.sin(this.time / 2100) * 2, y: CLOUD.y + Math.sin(this.time / 1300) * 1 };
  }

  private drawCloud() {
    const g = this.g, t = this.time;
    const c = this.cloudPos();
    if (this.cloud.found && this.cloud.doc) {
      g.globalAlpha = 0.18 + Math.sin(t / 250) * 0.08;
      this.px(c.x - 9, c.y - 11, 18, 20, '#e0651a');
      g.globalAlpha = 1;
    }
    this.blit(cloudSprite(), c.x - 20, c.y - 15);
    if (this.cloud.doc) {
      if (!this.cloud.found) g.globalAlpha = 0.55;
      this.blit(sprite(DOC), c.x - 4, c.y - 6 + Math.sin(t / 400) * 0.8);
      g.globalAlpha = 1;
      if (!this.cloud.found) {
        const z = (t / 500) % 3;
        g.globalAlpha = 1 - z / 3;
        this.px(c.x + 8 + z * 2, c.y - 12 - z * 3, 3, 1, '#c9d3ea');
        this.px(c.x + 10 + z * 2, c.y - 11 - z * 3, 1, 1, '#c9d3ea');
        this.px(c.x + 8 + z * 2, c.y - 10 - z * 3, 3, 1, '#c9d3ea');
        g.globalAlpha = 1;
      }
    }
    if (this.fx.scan > 0) {
      const p = this.phonePt();
      const r = this.fx.scan * 105;
      g.globalAlpha = 1 - this.fx.scan * 0.6;
      for (let a = 0; a < 80; a++) {
        if ((a + Math.floor(t / 60)) % 2) continue;
        const ang = (a / 80) * Math.PI * 2;
        this.px(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r * 0.8, 1, 1, '#e0651a');
      }
      g.globalAlpha = 1;
    }
  }

  // ---- Düsseldorf
  private drawSkylineLights() {
    const t = this.time;
    this.dusWin.forEach((w, i) => { if (Math.sin(t / 900 + i * 12.9898) > 0.8) this.px(w.x, w.y, 2, 3, '#4a4468'); });
    this.px(78, 35, 1, 1, Math.floor(t / 600) % 2 ? '#ff3b3b' : '#5a1a1a');
    this.px(74 + (Math.floor(t / 250) % 9), 59, 1, 1, '#ffffff');
  }

  private drawDuesseldorf() {
    const t = this.time, g = this.g;
    // Wellen auf dem Rhein
    for (let i = 0; i < 16; i++) {
      const x = (i * 37 + t / 40) % (W + 10) - 8;
      this.px(x, 145 + (i % 6) * 4, 4 + (i % 3) * 2, 1, '#4a6ab0');
    }
    // Rheinschiff
    const bx0 = W + 20 - ((t / 70) % (W + 80));
    this.px(bx0, 153, 18, 2, '#2a2a40');
    this.px(bx0 + 5, 150, 8, 3, '#c9cfe0');
    this.px(bx0 + 7, 151, 1, 1, '#ffd34d'); this.px(bx0 + 10, 151, 1, 1, '#ffd34d');
    g.globalAlpha = 0.3;
    this.px(bx0 + 5, 156, 8, 1, '#ffd34d');
    g.globalAlpha = 1;
    // Türlicht der Suppenküche flackert warm
    g.globalAlpha = 0.14 + Math.sin(t / 300) * 0.04;
    this.px(262, 144, 18, 28, '#ffcf6b');
    g.globalAlpha = 1;
    // Gäste vor der Tür
    for (let i = 0; i < 3; i++) {
      const x = 250 + i * 7;
      const lift = this.basket.cheer > 0 ? Math.abs(Math.sin(t / 110 + i)) * 3 : 0.3 + Math.sin(t / 600 + i * 2) * 0.3;
      this.shadow(x + 2, 168, 6);
      this.px(x, 156 - lift, 4, 12, ['#4a4a6a', '#5a4a3a', '#3a5a5a'][i]);
      this.px(x, 152 - lift, 4, 4, SKIN);
      this.px(x, 151 - lift, 4, 2, ['#d62f3a', '#2f9e5a', '#4a7fd6'][i]);
    }
    // Spendenkorb
    const bx = 196, by = 172 + (this.basket.bump > 0 ? Math.sin((this.basket.bump / 250) * Math.PI) * 1.5 : 0);
    this.shadow(bx + 18, 186, 40);
    for (let i = 0; i < Math.min(this.basket.count, 12); i++) this.blit(giftBox(i), bx + 3 + (i % 4) * 7, by - 6 - Math.floor(i / 4) * 5);
    this.px(bx, by, 36, 14, '#b07a3a');
    for (let y = 2; y < 14; y += 3) for (let x = (y / 3) % 2 ? 0 : 2; x < 36; x += 4) this.px(bx + x, by + y, 2, 1, '#8a5a2a');
    this.px(bx - 1, by, 38, 2, '#d9a066');
    this.px(bx + 4, by - 10, 2, 10, '#8a5a2a');
    this.px(bx + 30, by - 10, 2, 10, '#8a5a2a');
    this.px(bx + 4, by - 11, 28, 2, '#8a5a2a');
    this.drawSleigh(this.sleigh.x, this.sleigh.y);
  }

  basketPt(): Pt { return { x: 214, y: 166 }; }

  // ================================================================ UI-Overlays
  private updateUi(now: number) {
    const sw = this.ui.clientWidth, sh = this.ui.clientHeight;
    const placed: { l: number; r: number; t: number; b: number }[] = [];
    for (const it of [...this.uiItems]) {
      if (it.until && now > it.until) { this.removeUi(it); continue; }
      const p = this.project(it.anchor());
      let left = (p.x / W) * sw;
      if (!it.clamp) {
        it.el.style.left = `${left}px`;
        it.el.style.top = `${(p.y / H) * sh}px`;
        continue;
      }
      // Sprechblasen: am Rand halten und überlappende nach oben schieben
      const w = it.el.offsetWidth, h = it.el.offsetHeight;
      const half = w / 2;
      left = Math.max(half + 5, Math.min(sw - half - 5, left));
      it.el.style.setProperty('--tail', `${Math.max(10, Math.min(w - 10, (p.x / W) * sw - (left - half)))}px`);
      let bottom = (p.y / H) * sh - 7;
      for (let guard = 0; guard < 4; guard++) {
        const hit = placed.find(r => left - half < r.r && left + half > r.l && bottom - h < r.b && bottom > r.t);
        if (!hit) break;
        bottom = hit.t - 5;
      }
      bottom = Math.max(h + 3, bottom);
      placed.push({ l: left - half, r: left + half, t: bottom - h, b: bottom });
      it.el.style.left = `${left}px`;
      it.el.style.top = `${bottom}px`;
    }
  }

  private removeUi(it: UiItem) {
    const i = this.uiItems.indexOf(it);
    if (i >= 0) this.uiItems.splice(i, 1);
    it.el.classList.add('out');
    setTimeout(() => it.el.remove(), 250);
  }

  anchor(who: string): () => Pt {
    if (who === 'santa') return () => ({ x: this.sleigh.x + 17, y: this.sleigh.y - 33 });
    if (who === 'phone') return () => this.phonePt();
    if (who === 'elf') return () => ({ x: this.elf.x + 4, y: GROUND - 15 });
    if (who === 'cloud') return () => { const c = this.cloudPos(); return { x: c.x, y: c.y - 14 }; };
    if (who === 'shelf') return () => ({ x: SHELF.x + 38, y: SHELF.y - 4 });
    if (who === 'mailbox') return () => ({ x: MAILBOX.x + 5, y: MAILBOX.top - 6 });
    if (who === 'basket') return () => ({ x: 214, y: 158 });
    return () => {
      const k = this.kids.get(who);
      return k ? { x: k.x + 5, y: k.base - 19 } : { x: W / 2, y: H / 2 };
    };
  }

  phonePt(): Pt { return { x: this.sleigh.x + 17, y: this.sleigh.y - 18 }; }

  private bubble(who: string, text: string, ms: number, cls: string) {
    const el = document.createElement('div');
    el.className = `say ${cls}`;
    el.textContent = text;
    this.ui.appendChild(el);
    const it: UiItem = { el, anchor: this.anchor(who), until: this.time + ms, clamp: true };
    this.uiItems.push(it);
    this.updateUi(this.time);
    return it;
  }

  /** Sprechblase über einer Figur. */
  say(who: string, text: string, ms = 2600, cls = ''): Promise<void> {
    // Blasen derselben Figur ersetzen statt stapeln
    const p = this.anchor(who)();
    for (const other of [...this.uiItems]) {
      if (!other.el.classList.contains('say') || other.el.classList.contains('emote')) continue;
      const q = other.anchor();
      if (Math.abs(q.x - p.x) < 8 && Math.abs(q.y - p.y) < 8) this.removeUi(other);
    }
    this.bubble(who, text, ms, cls);
    sfx.pop();
    return new Promise(r => setTimeout(r, Math.min(ms, 1200)));
  }

  /** Kurzes Symbol über dem Kopf: „!“, „?“, „♥“ … */
  emote(who: string, symbol: string, ms = 1300) {
    this.bubble(who, symbol, ms, `emote ${symbol === '♥' ? 'emote-heart' : symbol === '?' ? 'emote-q' : ''}`);
  }

  /** Aufsteigender Punkte-Text („+10“). */
  float(at: string | Pt, text: string, cls = '') {
    const p = this.project(typeof at === 'string' ? this.anchor(at)() : at);
    const el = document.createElement('div');
    el.className = `floater ${cls}`;
    el.textContent = text;
    el.style.left = `${Math.max(8, Math.min(92, (p.x / W) * 100))}%`;
    el.style.top = `${Math.max(14, (p.y / H) * 100)}%`;
    this.ui.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  clearBubbles() {
    for (const it of [...this.uiItems]) if (it.el.classList.contains('say')) this.removeUi(it);
  }

  /** Dauerhaftes Etikett in der Welt. */
  tag(id: string, who: string | Pt, html: string, cls = '') {
    let it = this.tagMap.get(id);
    if (!it) {
      const el = document.createElement('div');
      el.className = `tag ${cls}`;
      this.ui.appendChild(el);
      it = { el, anchor: typeof who === 'string' ? this.anchor(who) : () => who, until: 0, clamp: false };
      this.uiItems.push(it);
      this.tagMap.set(id, it);
    } else if (it.el.innerHTML !== html) {
      it.el.classList.remove('bump');
      void it.el.offsetWidth;
      it.el.classList.add('bump');
    }
    it.el.innerHTML = html;
    this.updateUi(this.time);
    return it.el;
  }

  untag(id: string) {
    const it = this.tagMap.get(id);
    if (!it) return;
    this.tagMap.delete(id);
    this.removeUi(it);
  }

  clearTags() { for (const id of [...this.tagMap.keys()]) this.untag(id); }

  banner(title: string, sub: string): Promise<void> {
    const el = document.createElement('div');
    el.className = 'level-banner';
    el.innerHTML = `<b>${title}</b><span>${sub}</span>`;
    this.ui.appendChild(el);
    sfx.fanfare();
    return new Promise(r => setTimeout(() => { el.remove(); r(); }, reduceMotion() ? 1000 : 2000));
  }

  /** Bereich der Welt als CSS-Prozentwerte auf der Bühne (für Drop-Zonen). */
  screenRect(x: number, y: number, w: number, h: number) {
    const a = this.project({ x, y }), b = this.project({ x: x + w, y: y + h });
    const pct = (v: number, of: number) => `${Math.max(0, Math.min(100, (v / of) * 100))}%`;
    return { left: pct(a.x, W), top: pct(a.y, H), width: pct(b.x - a.x, W), height: pct(Math.min(H, b.y) - a.y, H) };
  }

  // ================================================================ Kamera & Effekte
  private stopTweens(obj: object) {
    for (const tw of [...this.tweens]) {
      if (tw.obj !== obj) continue;
      this.tweens.splice(this.tweens.indexOf(tw), 1);
      tw.done();
    }
  }

  tween(obj: object, key: string, to: number, ms: number, ease: EaseName = 'inOut'): Promise<void> {
    const o = obj as Record<string, number>;
    for (const tw of [...this.tweens]) {
      if (tw.obj === o && tw.key === key) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.done(); }
    }
    if (reduceMotion()) ms = Math.min(ms, 120);
    return new Promise(done => this.tweens.push({ obj: o, key, from: o[key], to, t0: this.time, dur: Math.max(1, ms), ease: EASE[ease], done }));
  }

  /** Kamerafahrt zu einer benannten Einstellung. */
  shot(name: Shot, ms = 1000): Promise<void> {
    const [x, y, zoom] = SHOTS[name];
    if (ms <= 0) {
      this.stopTweens(this.camera);
      Object.assign(this.camera, { x, y, zoom });
      return Promise.resolve();
    }
    void this.tween(this.camera, 'x', x, ms);
    void this.tween(this.camera, 'y', y, ms);
    return this.tween(this.camera, 'zoom', zoom, ms);
  }

  fly(img: HTMLCanvasElement, from: Pt, to: Pt, opts: { dur?: number; arc?: number; trail?: string; spin?: boolean } = {}): Promise<void> {
    const dur = reduceMotion() ? 150 : opts.dur ?? 700;
    return new Promise(done => this.flyers.push({ img, x: from.x, y: from.y, from, to, t0: this.time, dur, arc: opts.arc ?? 20, trail: opts.trail, spin: !!opts.spin, done }));
  }

  particle(x: number, y: number, color: string, o: { life?: number; size?: number; vx?: number; vy?: number; grav?: number; kind?: 0 | 1 | 2; grow?: number } = {}) {
    if (this.particles.length > 500) return;
    const life = o.life ?? 600;
    this.particles.push({ x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, life, max: life, color, size: o.size ?? 1, grav: o.grav ?? 0, kind: o.kind ?? 0, grow: o.grow ?? 0 });
  }

  sparkle(p: Pt, colors = ['#ffd34d', '#e0651a', '#ffffff'], n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 0.4 + Math.random() * 1.2;
      this.particle(p.x, p.y, colors[i % colors.length], { vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3, grav: 0.03, life: 500 + Math.random() * 350, size: Math.random() < 0.3 ? 2 : 1, kind: i % 3 === 0 ? 1 : 0 });
    }
  }

  poof(p: Pt) { this.sparkle(p, ['#ffffff', '#dfe6f5', '#c9d3ea'], 12); }
  ring(p: Pt, color = '#e0651a', size = 14) { this.particle(p.x, p.y, color, { kind: 2, size, life: 480 }); }
  shake(ms = 400) { this.fx.shake = ms; }
  flash() { this.fx.flash = 320; }
  hoho() { this.santa.laugh = 700; }

  heart(p: Pt) {
    const to = { x: p.x + (Math.random() - 0.5) * 16, y: p.y - 24 - Math.random() * 8 };
    void this.fly(icon('herz'), p, to, { dur: 1100, arc: 0 }).then(() => this.sparkle(to, ['#ff7b8a', '#ffffff'], 6));
  }

  // ================================================================ Figuren
  addKid(id: string, x?: number, base = 158) {
    const def = KIDS[id];
    const kid: Kid = {
      id, name: def.name, x: x ?? def.home, base, pal: { ...def.pal }, pose: 'stand', facing: 1, visible: true, walking: false,
      letter: false, shiver: false, gift: null, sad: false, hop: 0, phase: Math.random() * 3000,
    };
    this.kids.set(id, kid);
    return kid;
  }

  kid(id: string) { return this.kids.get(id)!; }

  hopKid(id: string) { const k = this.kids.get(id); if (k) k.hop = 320; }

  async walk(id: string, x: number, msPerPx = 22) {
    const k = this.kids.get(id);
    if (!k) return;
    k.facing = x < k.x ? -1 : 1;
    k.walking = true;
    await this.tween(k, 'x', x, Math.abs(x - k.x) * msPerPx, 'linear');
    k.walking = false;
  }

  async goHome(id: string) {
    const k = this.kids.get(id);
    if (!k) return;
    const hi = k.x < 50 ? 0 : 1;
    await this.walk(id, HOUSES[hi].door - 5);
    this.doorOpen[hi] = 520;
    k.visible = false;
  }

  // ================================================================ Story-Aktionen
  async buryMailbox() {
    sfx.storm();
    void this.tween(this.fx, 'storm', 1, 700);
    this.shake(2600);
    const chunks = window.setInterval(() => {
      for (let i = 0; i < 3; i++) {
        this.particle(MAILBOX.x - 8 + Math.random() * 46, GROUND - 70 - Math.random() * 30, '#ffffff', { vx: -0.9 - Math.random() * 0.5, vy: 1.6 + Math.random(), size: 1.5 + Math.random() * 1.5, life: 800, grav: 0.04 });
      }
    }, 70);
    await this.tween(this.fx, 'snowLevel', 1, 2600, 'out');
    clearInterval(chunks);
    this.poof({ x: MAILBOX.x + 5, y: GROUND - 20 });
    this.poof({ x: MAILBOX.x + 12, y: GROUND - 8 });
    await this.tween(this.fx, 'storm', 0.25, 1400);
  }

  async throwLetter(id: string) {
    const k = this.kids.get(id);
    if (!k) return;
    k.letter = false;
    k.hop = 320;
    const env = sprite(ENVELOPE);
    const hit = { x: MAILBOX.x + 5, y: MAILBOX.top - 2 };
    sfx.whoosh();
    await this.fly(env, { x: k.x + 9, y: k.base - 8 }, hit, { dur: 620, arc: 24, spin: true });
    sfx.bonk();
    this.poof(hit);
    const land = { x: k.x + 13 + Math.random() * 6, y: 161 + Math.random() * 3 };
    await this.fly(env, hit, land, { dur: 480, arc: 12, spin: true });
    this.litter.push(land);
    this.poof(land);
  }

  async sendEmail(from: Pt) {
    sfx.mail();
    await this.fly(sprite(EMAIL), from, this.phonePt(), { dur: 800, arc: 36, trail: '#e0651a' });
    this.pile++;
    this.pileBump = 220;
    this.fx.buzz = 260;
    this.ring(this.phonePt());
    sfx.buzz();
  }

  async sortOne(cat: SackCat) {
    const from = this.pileTop();
    if (this.pile > 0) this.pile--;
    await this.fly(sprite(ENVELOPE), from, this.sackPt(cat), { dur: 460, arc: 18, spin: true });
    this.sacks.counts[cat]++;
    this.sacks.bump[cat] = 200;
    this.updateSackTags();
    sfx.pop();
  }

  async resolveUnsure(i: number, cat: SackCat) {
    const from = this.unsurePt(i);
    this.unsure = Math.max(0, this.unsure - 1);
    await this.fly(sprite(EMAIL), from, this.sackPt(cat), { dur: 520, arc: 16, trail: '#ffd34d', spin: true });
    this.sacks.counts[cat]++;
    this.sacks.bump[cat] = 200;
    this.updateSackTags();
    this.sparkle(this.sackPt(cat), ['#ffd34d', '#ffffff'], 8);
    sfx.pop();
  }

  updateSackTags() {
    (Object.keys(SACK_X) as SackCat[]).forEach(cat => {
      this.tag(`sack-${cat}`, { x: SACK_X[cat] + 7, y: 198 }, `${SACK_ICON[cat]} ${this.sacks.counts[cat]}`, 'tag-sack');
    });
  }

  async sackToSleigh() {
    (Object.keys(SACK_X) as SackCat[]).forEach(c => this.untag(`sack-${c}`));
    this.sacks.visible = false;
    (['dringend', 'verwaltung', 'spam'] as SackCat[]).forEach(c => this.poof(this.sackPt(c)));
    sfx.whoosh();
    const to = { x: this.sleigh.x + 4, y: this.sleigh.y - 22 };
    await this.fly(giftBox(0), this.sackPt('wunsch'), to, { dur: 650, arc: 32, trail: '#d62f3a' });
    this.sacks.onSleigh = true;
    this.sleigh.bump = 220;
    this.sparkle(to);
    sfx.coin();
  }

  async deliver(order: Record<string, number>) {
    const ids = Object.keys(order).filter(id => order[id] > 0);
    this.cart.visible = true;
    this.cart.boxes = Math.min(6, ids.length + 2);
    this.fx.cartX = 340;
    sfx.whoosh();
    await this.tween(this.fx, 'cartX', 284, 1300, 'out');
    for (const [n, id] of ids.entries()) {
      const s = this.stock.find(x => x.id === id);
      if (!s) continue;
      this.cart.boxes = Math.max(0, this.cart.boxes - 1);
      await this.fly(giftBox(n), { x: this.fx.cartX + 10, y: GROUND - 10 }, this.slotPt(id), { dur: 480, arc: 26, spin: true });
      await this.tween(s, 'have', s.have + order[id], 380, 'out');
      this.sparkle(this.slotPt(id), ['#4dff88', '#ffffff', '#ffd34d'], 10);
      this.ring(this.slotPt(id), '#4dff88', 10);
      sfx.coin();
    }
    this.stockAlert = false;
    await this.tween(this.fx, 'cartX', 364, 950, 'in');
    this.cart.visible = false;
  }

  async giftToSleigh(img: HTMLCanvasElement, from?: Pt) {
    const slot = SLEIGH_SLOTS[this.sleighGifts.length % SLEIGH_SLOTS.length];
    const to = { x: this.sleigh.x + slot.x + 4, y: this.sleigh.y + slot.y + 4 };
    await this.fly(img, from ?? { x: SHELF.x + 30, y: SHELF.y + 30 }, to, { dur: 680, arc: 32, trail: '#ffd34d' });
    this.sleighGifts.push(img);
    this.sleigh.bump = 220;
    this.sparkle(to);
    sfx.coin();
  }

  async scan() {
    sfx.power();
    for (let i = 0; i < 2; i++) {
      this.fx.scan = 0;
      await this.tween(this.fx, 'scan', 1, 950, 'out');
    }
    this.fx.scan = 0;
    this.cloud.found = true;
    this.sparkle(this.cloudPos(), ['#e0651a', '#ffd34d', '#ffffff'], 20);
    this.ring(this.cloudPos(), '#ffd34d', 18);
    sfx.unlock();
  }

  async docToPhone() {
    this.cloud.doc = false;
    await this.fly(sprite(DOC), this.cloudPos(), this.phonePt(), { dur: 950, arc: 26, trail: '#4a7fd6' });
    this.fx.buzz = 300;
    this.ring(this.phonePt());
    this.sparkle(this.phonePt());
  }

  async takeOff() {
    this.sleigh.flying = 1;
    this.hoho();
    sfx.whoosh();
    const trail = window.setInterval(() => {
      this.sparkle({ x: this.sleigh.x + 2, y: this.sleigh.y - 4 }, ['#ffd34d', '#ffffff'], 3);
      if (this.sleigh.y > 135) this.particle(this.sleigh.x + 10 + Math.random() * 60, GROUND + 2, '#ffffff', { vx: -0.8 - Math.random(), vy: -0.6 - Math.random() * 0.8, grav: 0.05, size: 1.5, life: 500 });
    }, 55);
    void this.tween(this.sleigh, 'y', 34, 2400, 'in');
    await this.tween(this.sleigh, 'x', 380, 2400, 'in');
    clearInterval(trail);
  }

  async wipe(fn: () => void) {
    await this.tween(this.fx, 'wipe', 1, 520, 'in');
    fn();
    await this.tween(this.fx, 'wipe', 0, 650, 'out');
  }

  async flyIn(x: number, y: number) {
    this.sleigh.flying = 1;
    this.sleigh.x = -100;
    this.sleigh.y = y - 26;
    const trail = window.setInterval(() => this.sparkle({ x: this.sleigh.x + 2, y: this.sleigh.y - 4 }, ['#ffd34d', '#ffffff'], 2), 65);
    void this.tween(this.sleigh, 'y', y, 2300, 'out');
    await this.tween(this.sleigh, 'x', x, 2300, 'out');
    clearInterval(trail);
  }

  async dropGift(img: HTMLCanvasElement) {
    sfx.drop();
    const to = this.basketPt();
    await this.fly(img, { x: this.sleigh.x + 22, y: this.sleigh.y - 8 }, to, { dur: 620, arc: -8, trail: '#ffd34d', spin: true });
    this.basket.count++;
    this.basket.bump = 250;
    this.basket.cheer = 900;
    this.sparkle(to, ['#4dff88', '#ffd34d', '#ffffff'], 16);
    this.ring(to, '#4dff88', 16);
    this.heart({ x: 262 + Math.random() * 16, y: 150 });
    sfx.coin();
  }

  // ================================================================ Modi & Zustände
  setMode(mode: Mode) {
    this.mode = mode;
    this.clearTags();
    this.clearBubbles();
    this.flyers = [];
    this.rockets = [];
    this.fireworks = false;
    this.stopTweens(this.camera);
    Object.assign(this.camera, { x: W / 2, y: H / 2, zoom: 1 });
    if (mode === 'title') { this.fx.storm = 0; return; }
    if (mode === 'duesseldorf') { this.fx.storm = 0.1; this.sleigh.flying = 1; return; }
    this.sleigh.x = 124; this.sleigh.y = 152; this.sleigh.flying = 0;
    this.fx.storm = mode === 'xmas' ? 0.15 : 0.25;
    if (mode === 'north') {
      this.tag('sign-lager', 'shelf', 'LAGER', 'tag-sign');
      this.tag('sign-post', 'mailbox', 'POST', 'tag-sign tag-small');
    }
  }

  /** Bringt die Welt in den Zustand „Szene X beginnt“ – fürs Überspringen und für Direktsprünge. */
  prepare(scene: string) {
    const order = ['intro', 'inbox', 'inventory', 'translate', 'drive', 'decision', 'audit', 'donate'];
    const i = order.indexOf(scene);
    if (i < 1) return;
    if (this.mode !== 'north') this.setMode('north');
    this.fx.snowLevel = 1;
    this.santa.phone = true;
    this.santa.sweat = false;
    this.shelfOn = true;
    this.shelfScan = false;
    this.untag('scan-shelf');
    this.untag('audit-scan');
    if (i === 1) {
      if (this.pile === 0 && !this.sacks.onSleigh) this.pile = 18;
      for (const id of MAIN_KIDS) if (!this.kids.has(id)) this.addKid(id, 34 + MAIN_KIDS.indexOf(id) * 12);
    } else {
      this.pile = 0;
      this.unsure = 0;
      this.litter = [];
      for (const id of MAIN_KIDS) { const k = this.kids.get(id); if (k) k.visible = false; }
      this.sacks.onSleigh = true;
      this.sacks.visible = false;
      (Object.keys(SACK_X) as SackCat[]).forEach(c => this.untag(`sack-${c}`));
    }
    if (i >= 3) { this.stockAlert = false; this.cart.visible = false; }
    if (i >= 4) { const m = this.kids.get('mateo'); if (m) m.visible = false; }
    if (i >= 4) this.cloud.visible = true;
    if (i >= 5) { this.cloud.found = true; this.cloud.doc = false; this.fx.scan = 0; }
    if (i >= 6) { const j = this.kids.get('jonas'); if (j) j.visible = false; }
  }

  reset() {
    this.kids.clear();
    this.pile = 0; this.unsure = 0; this.litter = [];
    this.sacks.visible = false; this.sacks.onSleigh = false;
    (Object.keys(SACK_X) as SackCat[]).forEach(c => { this.sacks.counts[c] = 0; });
    this.sleighGifts = [];
    this.stock = STOCK.map(s => ({ id: s.id, have: s.inStock, need: s.requested }));
    this.shelfOn = false; this.shelfScan = false; this.stockAlert = false;
    this.cart.visible = false;
    this.cloud = { visible: false, doc: true, found: false };
    this.basket = { count: 0, bump: 0, cheer: 0 };
    this.santa = { phone: false, sweat: false, wave: false, laugh: 0 };
    this.fx.snowLevel = 0; this.fx.storm = 0; this.fx.wipe = 0; this.fx.scan = 0;
    this.particles = [];
    this.setMode('title');
  }
}
