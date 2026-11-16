// Die Spielwelt: eine 320×200-Pixel-Bühne mit Santa, Kindern, Briefkasten und Lager.
import { STOCK } from '../content.de';
import { reduceMotion } from '../ui/dom';
import { sfx } from '../ui/sfx';
import {
  DOC, ELF, EMAIL, ENVELOPE, KidPose, REINDEER_A, REINDEER_B, SANTA, giftBox, icon, kidRows, silhouette, sprite,
} from './pixels';

export const W = 320;
export const H = 200;
const GROUND = 150;

export type Pt = { x: number; y: number };
export type Mode = 'title' | 'north' | 'duesseldorf' | 'xmas';
export type SackCat = 'wunsch' | 'dringend' | 'verwaltung' | 'spam';

interface Kid {
  id: string; name: string; x: number; base: number; pal: Record<string, string>;
  pose: KidPose; facing: 1 | -1; visible: boolean; walking: boolean;
  letter: boolean; shiver: boolean; gift: HTMLCanvasElement | null; sad: boolean;
}
interface Flyer { img: HTMLCanvasElement; x: number; y: number; from: Pt; to: Pt; t0: number; dur: number; arc: number; trail?: string; done: () => void }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; grav: number }
interface Tween { obj: Record<string, number>; key: string; from: number; to: number; t0: number; dur: number; ease: (t: number) => number; done: () => void }
interface UiItem { el: HTMLElement; anchor: () => Pt; until: number; clamp: boolean }

const EASE = {
  linear: (t: number) => t,
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: (t: number) => t * t * t,
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
const SACK_X: Record<SackCat, number> = { wunsch: 116, dringend: 138, verwaltung: 160, spam: 182 };
const SACK_COLOR: Record<SackCat, [string, string]> = {
  wunsch: ['#d62f3a', '#8f1d2c'], dringend: ['#e0651a', '#a8460e'], verwaltung: ['#4a7fd6', '#2a4a8f'], spam: ['#9aa3b5', '#5c6378'],
};
const SLEIGH_SLOTS: Pt[] = [
  { x: 26, y: -21 }, { x: 34, y: -21 }, { x: 30, y: -29 }, { x: 26, y: -37 }, { x: 34, y: -37 }, { x: 30, y: -45 }, { x: 38, y: -29 }, { x: 22, y: -29 },
];

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export class World {
  readonly canvas: HTMLCanvasElement;
  readonly ui: HTMLElement;
  private g: CanvasRenderingContext2D;
  mode: Mode = 'title';
  time = 0;
  private last = 0;
  private bg = new Map<Mode, HTMLCanvasElement>();

  private flakes: { x: number; y: number; s: number; d: number; r: number }[] = [];
  private stars: { x: number; y: number; tw: number }[] = [];
  fx = { storm: 0, snowLevel: 0, shake: 0, wipe: 0, glow: 0, buzz: 0, cartX: 360, titleX: -120, scan: 0, flash: 0 };

  kids = new Map<string, Kid>();
  sleigh = { x: 124, y: 152, flying: 0 };
  santa = { phone: false, sweat: false, wave: false };
  pile = 0;
  unsure = 0;
  sacks = { visible: false, onSleigh: false, counts: { wunsch: 0, dringend: 0, verwaltung: 0, spam: 0 } as Record<SackCat, number> };
  sleighGifts: HTMLCanvasElement[] = [];
  stock = STOCK.map(s => ({ id: s.id, have: s.inStock, need: s.requested }));
  shelfOn = false;
  stockAlert = false;
  cart = { visible: false, boxes: 0 };
  elf = { x: 222, jump: 0 };
  cloud = { visible: false, doc: true, found: false };
  basket = { count: 0 };
  fireworks = false;

  private flyers: Flyer[] = [];
  private particles: Particle[] = [];
  private tweens: Tween[] = [];
  private uiItems: UiItem[] = [];
  private tagMap = new Map<string, UiItem>();

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.canvas = canvas;
    this.ui = ui;
    canvas.width = W;
    canvas.height = H;
    this.g = canvas.getContext('2d')!;
    this.g.imageSmoothingEnabled = false;
    for (let i = 0; i < 260; i++) this.flakes.push({ x: Math.random() * W, y: Math.random() * H, s: 0.3 + Math.random() * 0.8, d: Math.random() * 6, r: Math.random() < 0.15 ? 2 : 1 });
    for (let i = 0; i < 46; i++) this.stars.push({ x: Math.floor(rand(i) * W), y: Math.floor(rand(i + 99) * 105), tw: rand(i + 7) });
    requestAnimationFrame(t => { this.last = t; this.loop(t); });
  }

  // ---------------------------------------------------------------- Loop
  private loop = (t: number) => {
    const dt = Math.min(50, t - this.last);
    this.last = t;
    this.time += dt;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const now = this.time;
    for (const tw of [...this.tweens]) {
      const p = Math.min(1, (now - tw.t0) / tw.dur);
      tw.obj[tw.key] = tw.from + (tw.to - tw.from) * tw.ease(p);
      if (p >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.done(); }
    }
    const k = dt / 16.7;
    const target = this.mode === 'title' ? 60 : 70 + Math.round(this.fx.storm * 190);
    for (let i = 0; i < Math.min(target, this.flakes.length); i++) {
      const f = this.flakes[i];
      f.d += 0.02 * k;
      f.y += f.s * (0.5 + this.fx.storm * 1.6) * k;
      f.x += (Math.sin(f.d) * 0.3 - this.fx.storm * 2.4) * k;
      if (f.y > H) { f.y = -2; f.x = Math.random() * (W + 80); }
      if (f.x < -4) f.x += W + 8;
    }
    for (const fl of [...this.flyers]) {
      const p = Math.min(1, (now - fl.t0) / fl.dur);
      const e = EASE.inOut(p);
      fl.x = fl.from.x + (fl.to.x - fl.from.x) * e;
      fl.y = fl.from.y + (fl.to.y - fl.from.y) * e - fl.arc * 4 * p * (1 - p);
      if (fl.trail && Math.random() < 0.7) this.particle(fl.x, fl.y, fl.trail, { life: 380, size: 1, vy: 0.05 });
      if (p >= 1) { this.flyers.splice(this.flyers.indexOf(fl), 1); fl.done(); }
    }
    for (const p of [...this.particles]) {
      p.life -= dt;
      p.vy += p.grav * k;
      p.x += p.vx * k;
      p.y += p.vy * k;
      if (p.life <= 0) this.particles.splice(this.particles.indexOf(p), 1);
    }
    // Schornsteinrauch
    if ((this.mode === 'north' || this.mode === 'xmas') && Math.random() < 0.05 * k) {
      const h = HOUSES[Math.random() < 0.5 ? 0 : 1];
      this.particle(h.x + h.w - 9, GROUND - h.h - h.w * 0.38 - 4, '#b9c1d6', { life: 1800, size: 2, vy: -0.25, vx: -0.15 - this.fx.storm, grav: 0 });
    }
    if (this.fireworks && Math.random() < 0.025 * k) this.firework();
    if (this.mode === 'xmas' && this.sleigh.flying) {
      this.sleigh.x += 0.5 * k;
      this.sleigh.y = 62 + Math.sin(this.time / 900) * 6;
      if (this.sleigh.x > W + 20) this.sleigh.x = -110;
      if (Math.random() < 0.3 * k) this.particle(this.sleigh.x + 2, this.sleigh.y - 4, Math.random() < 0.5 ? '#ffd34d' : '#ffffff', { life: 700, vy: 0.1 });
    }
    if (this.mode === 'title') {
      this.fx.titleX += 0.55 * k;
      if (this.fx.titleX > W + 40) this.fx.titleX = -130;
    }
    this.fx.shake = Math.max(0, this.fx.shake - dt);
    this.fx.buzz = Math.max(0, this.fx.buzz - dt);
    this.fx.flash = Math.max(0, this.fx.flash - dt);
    this.elf.jump = Math.max(0, this.elf.jump - dt);
    this.updateUi(now);
  }

  // ---------------------------------------------------------------- Zeichnen
  private px(x: number, y: number, w: number, h: number, c: string) {
    this.g.fillStyle = c;
    this.g.fillRect(Math.round(x), Math.round(y), w, h);
  }

  private draw() {
    const g = this.g;
    g.save();
    if (this.fx.shake > 0 && !reduceMotion()) g.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 3));
    g.drawImage(this.background(this.mode), 0, 0);
    this.drawStars();
    if (this.mode === 'title') this.drawTitle();
    else if (this.mode === 'duesseldorf') this.drawDuesseldorf();
    else this.drawNorth();
    for (const fl of this.flyers) g.drawImage(fl.img, Math.round(fl.x - fl.img.width / 2), Math.round(fl.y - fl.img.height / 2));
    for (const p of this.particles) {
      g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
      this.px(p.x, p.y, p.size, p.size, p.color);
    }
    g.globalAlpha = 1;
    this.drawSnow();
    if (this.fx.flash > 0) { g.globalAlpha = this.fx.flash / 300; this.px(0, 0, W, H, '#ffffff'); g.globalAlpha = 1; }
    if (this.fx.wipe > 0) {
      const r = (1 - this.fx.wipe) * 200;
      g.fillStyle = '#05050f';
      g.beginPath();
      g.rect(-10, -10, W + 20, H + 20);
      g.arc(W / 2, H / 2, Math.max(0, r), 0, Math.PI * 2, true);
      g.fill('evenodd');
    }
    g.restore();
  }

  private drawStars() {
    for (const s of this.stars) {
      const on = Math.sin(this.time / 500 + s.tw * 20) > -0.6;
      this.px(s.x, s.y, 1, 1, on ? '#ffffff' : '#6d6aa8');
      if (s.tw > 0.85 && on) { this.px(s.x - 1, s.y, 1, 1, '#8c88c8'); this.px(s.x + 1, s.y, 1, 1, '#8c88c8'); }
    }
  }

  private drawSnow() {
    const target = this.mode === 'title' ? 60 : 70 + Math.round(this.fx.storm * 190);
    for (let i = 0; i < Math.min(target, this.flakes.length); i++) {
      const f = this.flakes[i];
      this.px(f.x, f.y, f.r, f.r, i % 5 ? '#ffffff' : '#dfe6f5');
    }
  }

  // ---- Hintergründe (einmal gezeichnet, dann gecacht)
  private background(mode: Mode): HTMLCanvasElement {
    const key = mode === 'xmas' ? 'north' : mode;
    const hit = this.bg.get(key);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    const px = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    // Himmel mit Dithering
    const bands = ['#07071a', '#0c0b26', '#131234', '#1b1944', '#252257', '#302b68', '#3c3477'];
    const bh = 22;
    for (let y = 0; y < H; y++) {
      const i = Math.min(bands.length - 1, Math.floor(y / bh));
      const n = bands[Math.min(bands.length - 1, i + 1)];
      px(0, y, W, 1, bands[i]);
      if (y % bh >= bh - 4) for (let x = (y % 2); x < W; x += 2) if ((y % bh) - (bh - 4) >= (x % 4 === 0 ? 0 : 2)) px(x, y, 1, 1, n);
    }
    const moon = (cx: number, cy: number, r: number) => {
      for (let y = -r - 3; y <= r + 3; y++) for (let x = -r - 3; x <= r + 3; x++) {
        const d = Math.hypot(x, y);
        if (d <= r) px(cx + x, cy + y, 1, 1, '#fff3c4');
        else if (d <= r + 3 && (x + y) % 2 === 0) px(cx + x, cy + y, 1, 1, '#4b4583');
      }
      [[-0.3, -0.2, 0.18], [0.25, 0.15, 0.12], [-0.1, 0.4, 0.1]].forEach(([dx, dy, rr]) => {
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (Math.hypot(x - dx * r, y - dy * r) < rr * r) px(cx + x, cy + y, 1, 1, '#ead9a0');
      });
    };
    const hills = (base: number, amp: number, f: number, ph: number, col: string, dither?: string) => {
      for (let x = 0; x < W; x++) {
        const y = Math.round(base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph * 2) * amp * 0.4);
        px(x, y, 1, H - y, col);
        if (dither && x % 2 === 0) px(x, y, 1, 1, dither);
      }
    };
    const pine = (x: number, base: number, h: number, col = '#1d4a3a') => {
      for (let i = 0; i < h; i++) {
        const w = Math.floor((i / h) * (h * 0.55)) + 1;
        px(x - Math.floor(w / 2), base - h + i, w, 1, col);
        if (i % 4 === 0 && i > 0) px(x - Math.floor(w / 2), base - h + i, w, 1, '#e8eefc');
      }
      px(x - 1, base, 2, 2, '#3e2416');
    };

    if (key === 'title') {
      moon(160, 74, 40);
      hills(150, 6, 0.03, 1, '#1a1a3a');
      hills(162, 5, 0.05, 3, '#232350');
      for (let i = 0; i < 9; i++) pine(18 + i * 36 + (i % 2) * 8, 160 + (i % 3), 16 + (i % 3) * 5, '#101028');
      px(0, 178, W, 22, '#2b2b5c');
      return this.bg.set(key, c), c;
    }

    if (key === 'duesseldorf') {
      moon(40, 28, 12);
      // Medienhafen: geschwungene Gehry-Bauten
      for (let b = 0; b < 3; b++) {
        const bx = 6 + b * 17, top = 104 + (b % 2) * 8;
        for (let y = top; y < 142; y++) {
          const off = Math.round(Math.sin((y - top) * 0.18 + b) * 2);
          px(bx + off, y, 14, 1, b === 1 ? '#8f6a52' : '#c9cfe0');
          if ((y - top) % 5 === 2) for (let x = 2; x < 13; x += 3) px(bx + off + x, y, 1, 2, '#ffd34d');
        }
      }
      // Rheinturm
      const rx = 78;
      px(rx, 36, 1, 16, '#c9cfe0');
      px(rx - 1, 52, 3, 92, '#3a3f66');
      px(rx - 6, 54, 13, 3, '#4b507c');
      px(rx - 5, 57, 11, 2, '#3a3f66');
      px(rx - 4, 59, 9, 1, '#ffd34d');
      for (let y = 70; y < 144; y += 6) px(rx, y, 1, 2, '#ffd34d');
      // Altstadt mit Giebeln und St. Lambertus
      const roofs = ['#3a2a3a', '#2e2a48', '#3a2f3f'];
      let x = 100;
      let i = 0;
      while (x < 200) {
        const w = 12 + (i % 3) * 3, h = 24 + ((i * 7) % 12);
        px(x, 142 - h, w, h, ['#5d4a5e', '#4d4a6e', '#665060'][i % 3]);
        for (let r = 0; r < 6; r++) px(x + r, 142 - h - 6 + r, w - 2 * r, 1, roofs[i % 3]);
        for (let wy = 142 - h + 4; wy < 138; wy += 6) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (rand(wx * wy) > 0.3) px(wx, wy, 2, 3, '#ffd34d');
        x += w + 1; i++;
      }
      px(150, 92, 8, 50, '#4d4a6e');
      for (let r = 0; r < 26; r++) px(154 - Math.floor(r / 6), 66 + r, 1 + 2 * Math.floor(r / 6), 1, r % 4 < 2 ? '#2f6b5a' : '#245446');
      px(153, 62, 1, 4, '#ffd34d');
      // Rheinkniebrücke
      px(244, 60, 3, 84, '#c9cfe0');
      for (let c2 = 0; c2 < 6; c2++) {
        for (let t = 0; t < 1; t += 0.01) {
          px(Math.round(245 - t * (60 - c2 * 6)), Math.round(64 + c2 * 3 + t * (74 - c2 * 3)), 1, 1, '#9aa3c5');
          px(Math.round(245 + t * (60 - c2 * 6)), Math.round(64 + c2 * 3 + t * (74 - c2 * 3)), 1, 1, '#9aa3c5');
        }
      }
      px(170, 138, 150, 3, '#c9cfe0');
      // Rhein
      for (let y = 142; y < 170; y++) px(0, y, W, 1, y % 3 ? '#1c2a5a' : '#223268');
      // Promenade
      px(0, 168, W, 32, '#8c8fa8');
      for (let y = 172; y < H; y += 6) for (let x2 = (y % 12) ? 0 : 6; x2 < W; x2 += 12) px(x2, y, 11, 1, '#7b7e96');
      px(0, 168, W, 2, '#eef2fb');
      // Suppenküche
      const sx = 236, sy = 120;
      px(sx, sy, 70, 50, '#9b6b4a');
      for (let y = sy; y < sy + 50; y += 4) for (let x2 = sx + ((y / 4) % 2 ? 0 : 4); x2 < sx + 70; x2 += 8) px(x2, y, 7, 1, '#8a5c3e');
      for (let r = 0; r < 10; r++) px(sx - 4 + r, sy - 10 + r, 78 - 2 * r, 1, '#5a3442');
      px(sx - 4, sy - 1, 78, 2, '#eef2fb');
      px(sx + 29, sy + 26, 12, 24, '#5a3420');
      px(sx + 30, sy + 27, 10, 22, '#ffcf6b');
      [[sx + 6, sy + 12], [sx + 50, sy + 12], [sx + 6, sy + 30], [sx + 50, sy + 30]].forEach(([wx, wy]) => {
        px(wx, wy, 14, 10, '#3a2a1a'); px(wx + 1, wy + 1, 12, 8, '#ffcf6b'); px(wx + 7, wy + 1, 1, 8, '#c08a3a'); px(wx + 1, wy + 5, 12, 1, '#c08a3a');
      });
      return this.bg.set(key, c), c;
    }

    // Nordpol
    moon(196, 26, 11);
    hills(126, 5, 0.035, 0.5, '#9fabcc', '#b8c3e0');
    for (let i = 0; i < 12; i++) pine(8 + i * 27 + (i % 3) * 5, 130 + (i % 2) * 3, 10 + (i % 4) * 3, '#244a52');
    hills(138, 4, 0.05, 2, '#c8d2ea', '#dbe2f4');
    px(0, GROUND - 2, W, H - GROUND + 2, '#eef2fb');
    for (let y = GROUND; y < H; y += 2) for (let x = (y % 4) ? 0 : 1; x < W; x += 2) if (rand(x * 3 + y) > 0.72) px(x, y, 1, 1, '#dbe2f2');
    for (let x = 0; x < W; x += 2) px(x, GROUND - 2, 1, 1, '#ffffff');
    // Häuser
    for (const h of HOUSES) {
      const top = GROUND - h.h;
      px(h.x, top, h.w, h.h, h.wall);
      for (let y = top + 2; y < GROUND; y += 4) for (let x = h.x + ((y / 4) % 2 ? 1 : 4); x < h.x + h.w - 2; x += 7) px(x, y, 5, 1, h.wall2);
      const roofH = Math.round(h.w * 0.38);
      for (let r = 0; r <= roofH; r++) {
        const half = Math.round((r / roofH) * (h.w / 2 + 4));
        const cx = h.x + h.w / 2;
        px(cx - half, top - roofH + r, half * 2, 1, h.roof);
        px(cx - half, top - roofH + r, 2, 1, '#ffffff');
        px(cx + half - 2, top - roofH + r, 2, 1, '#ffffff');
      }
      px(h.x - 4, top, h.w + 8, 2, '#ffffff');
      for (let x = h.x - 3; x < h.x + h.w + 3; x += 3) px(x, top + 2, 1, 1 + (x % 2), '#cfe3ff');
      // Schornstein
      px(h.x + h.w - 12, top - roofH + 2, 6, 10, '#5a3440');
      px(h.x + h.w - 13, top - roofH + 1, 8, 2, '#ffffff');
      // Fenster
      const win = (wx: number, wy: number) => { px(wx, wy, 9, 8, '#3a2a1a'); px(wx + 1, wy + 1, 7, 6, '#ffd34d'); px(wx + 4, wy + 1, 1, 6, '#c08a3a'); px(wx + 1, wy + 4, 7, 1, '#c08a3a'); px(wx - 1, wy - 1, 11, 1, '#ffffff'); };
      win(h.x + 4, top + 8);
      win(h.x + h.w - 13, top + 8);
      px(h.door - 4, GROUND - 14, 9, 14, '#4a2c1c');
      px(h.door - 3, GROUND - 13, 7, 13, '#6b3e26');
      px(h.door + 2, GROUND - 7, 1, 1, '#ffd34d');
      px(h.door - 2, GROUND - 11, 5, 4, '#2f9e5a');
      px(h.door - 1, GROUND - 10, 3, 2, '#14301f');
    }
    // Tannenbaum beim Lager
    for (let i = 0; i < 34; i++) {
      const w = Math.floor(i * 0.62) + 1;
      px(214 - Math.floor(w / 2), 114 + i, w, 1, i % 6 < 3 ? '#1f6b45' : '#1b5e3a');
      if (i % 6 === 5) px(214 - Math.floor(w / 2), 114 + i, w, 1, '#e8eefc');
    }
    px(213, 148, 3, 3, '#3e2416');
    // Regal (Rahmen)
    const s = SHELF;
    px(s.x, s.y, 3, GROUND - s.y, '#6b3e26');
    px(s.x + 73, s.y, 3, GROUND - s.y, '#6b3e26');
    [s.y, s.y + 22, s.y + 44, s.y + 66].forEach(by => { px(s.x, by, 76, 3, '#8a5a35'); px(s.x, by, 76, 1, '#a8774a'); });
    px(s.x - 2, s.y - 1, 80, 2, '#ffffff');
    return this.bg.set(key, c), c;
  }

  // ---- Titelbild
  private drawTitle() {
    const x = Math.round(this.fx.titleX);
    const y = Math.round(70 + Math.sin(this.time / 600) * 4 - (x - 40) * 0.08);
    const col = '#141434';
    this.drawSleigh(x, y, col);
  }

  // ---- Nordpol
  private drawNorth() {
    const t = this.time;
    // Lichterketten an den Häusern
    const lights = ['#ff4d4d', '#ffd34d', '#4dff88', '#4db8ff'];
    HOUSES.forEach((h, hi) => {
      for (let i = 0, x = h.x - 3; x < h.x + h.w + 3; x += 4, i++) {
        const on = Math.floor(t / 400 + i + hi) % 3 !== 0;
        this.px(x, GROUND - h.h + 3, 1, 1, on ? lights[i % 4] : '#3a3a5a');
      }
    });
    for (let i = 0; i < 9; i++) {
      const on = Math.floor(t / 350 + i) % 2 === 0;
      this.px(214 - 2 - (i % 3) * 3 + (i % 2) * 6, 120 + i * 3, 1, 1, on ? lights[i % 4] : '#1b5e3a');
    }
    this.px(213, 111, 3, 3, Math.floor(t / 500) % 2 ? '#ffd34d' : '#fff3a0');

    if (this.cloud.visible) this.drawCloud();
    this.drawShelf();
    this.drawMailbox();
    this.drawSleigh(this.sleigh.x, this.sleigh.y);
    this.drawPile();
    if (this.sacks.visible) this.drawSacks();
    this.drawCart();
    const elfY = GROUND - 12 - (this.elf.jump > 0 ? Math.round(Math.sin((this.elf.jump / 500) * Math.PI) * 5) : 0);
    this.g.drawImage(sprite(ELF), this.elf.x, elfY);
    for (const kid of this.kids.values()) this.drawKid(kid);
    this.drawUnsure();
  }

  private drawSleigh(sx: number, sy: number, tint?: string) {
    const g = this.g;
    sx = Math.round(sx); sy = Math.round(sy);
    const flying = this.sleigh.flying > 0 || this.mode === 'title' || tint !== undefined;
    const bob = flying ? Math.round(Math.sin(this.time / 220) * 1) : 0;
    const P = (x: number, y: number, w: number, h: number, c: string) => this.px(x, y, w, h, tint ?? c);
    const draw = (img: HTMLCanvasElement, x: number, y: number) => g.drawImage(tint ? silhouette(img, tint) : img, x, y);

    // Geschenke & Sack hinten
    if (!tint) {
      if (this.sacks.onSleigh) this.drawSackShape(sx - 3, sy - 29, 'wunsch', 13);
      this.sleighGifts.forEach((img, i) => {
        const s = SLEIGH_SLOTS[i % SLEIGH_SLOTS.length];
        g.drawImage(img, sx + s.x, sy + s.y);
      });
    }
    // Santa
    const sy2 = sy - 30 + (this.santa.wave ? Math.round(Math.sin(this.time / 150)) : 0);
    draw(sprite(SANTA), sx + 10, sy2);
    if (!tint && this.santa.phone) {
      const shake = this.fx.buzz > 0 ? (Math.floor(this.time / 40) % 2 ? 1 : -1) : 0;
      const pxp = sx + 15 + shake, pyp = sy - 21;
      const glow = 0.25 + Math.sin(this.time / 300) * 0.1 + (this.fx.buzz > 0 ? 0.3 : 0);
      g.globalAlpha = glow;
      this.px(pxp - 2, pyp - 2, 8, 10, '#e0651a');
      g.globalAlpha = 1;
      this.px(pxp, pyp, 4, 6, '#17172f');
      this.px(pxp + 1, pyp + 1, 2, 3, this.fx.buzz > 0 ? '#ffffff' : '#ffb98a');
      this.px(pxp - 1, pyp + 3, 1, 2, '#0d0d1a');
      this.px(pxp + 4, pyp + 3, 1, 2, '#0d0d1a');
    }
    if (!tint && this.santa.sweat) {
      const d = Math.floor(this.time / 120) % 8;
      this.px(sx + 8, sy - 27 + d, 1, 2, '#9fe0ff');
      this.px(sx + 25, sy - 25 + ((d + 4) % 8), 1, 2, '#9fe0ff');
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
    // Zaumzeug
    for (let i = 0; i < 8; i++) P(sx + 38 + i, sy - 8 + Math.round(i / 4), 1, 1, '#6b3e26');
    for (let i = 0; i < 10; i++) P(sx + 56 + i, sy - 8 + bob, 1, 1, '#6b3e26');
    // Rentiere
    const frame = flying && Math.floor(this.time / 140) % 2 ? REINDEER_B : REINDEER_A;
    draw(sprite(frame, { N: '#3e2416' }), sx + 44, sy - 13 + bob);
    const lead = sprite(frame, { N: '#ff3b3b' });
    draw(lead, sx + 64, sy - 13 - bob);
    if (!tint && Math.floor(this.time / 300) % 2) { this.g.globalAlpha = 0.35; this.px(sx + 80, sy - 10 - bob, 3, 3, '#ff6b6b'); this.g.globalAlpha = 1; }
  }

  private drawKid(k: Kid) {
    if (!k.visible) return;
    const frame = k.walking ? Math.floor(this.time / 140) : 0;
    const img = sprite(kidRows(k.walking ? 'walk' : k.pose, frame), k.pal);
    let x = Math.round(k.x);
    if (k.shiver) x += Math.floor(this.time / 70) % 2 ? 1 : 0;
    const y = Math.round(k.base - 16 - (k.pose === 'cheer' ? Math.abs(Math.round(Math.sin(this.time / 160) * 2)) : 0));
    const g = this.g;
    if (k.facing < 0) {
      g.save(); g.translate(x + 10, 0); g.scale(-1, 1); g.drawImage(img, 0, y); g.restore();
    } else g.drawImage(img, x, y);
    if (k.letter) { this.px(x + 7, y + 9, 6, 4, '#0d0d1a'); this.px(x + 8, y + 10, 4, 2, '#ffffff'); }
    if (k.gift) g.drawImage(k.gift, x + 1, y - 10 - Math.abs(Math.round(Math.sin(this.time / 200) * 1)));
    if (k.sad) { this.px(x + 3, y - 5, 1, 1, '#c9d3ea'); this.px(x + 5, y - 5, 1, 1, '#c9d3ea'); this.px(x + 7, y - 5, 1, 1, '#c9d3ea'); }
  }

  private drawMailbox() {
    const { x, top } = MAILBOX;
    this.px(x + 4, top + 14, 3, GROUND - top - 14, '#5c6378');
    this.px(x, top + 3, 11, 12, '#d62f3a');
    this.px(x + 1, top + 1, 9, 2, '#d62f3a');
    this.px(x + 2, top, 7, 1, '#d62f3a');
    this.px(x, top + 13, 11, 2, '#8f1d2c');
    this.px(x + 2, top + 5, 7, 1, '#0d0d1a');
    this.px(x + 3, top + 8, 5, 3, '#ffffff');
    this.px(x + 1, top + 2, 1, 9, '#ff7b7b');
    const L = this.fx.snowLevel;
    if (L <= 0.01) return;
    // Schneehaube
    this.px(x - 1, top - Math.round(3 * L), 13, Math.round(3 * L) + 1, '#ffffff');
    // Schneeberg
    const hgt = Math.round(27 * L), half = 6 + 14 * L, cx = x + 5;
    for (let dy = 0; dy <= hgt; dy++) {
      const w = Math.round(half * Math.sqrt(1 - Math.pow(dy / (hgt + 1), 2)));
      const y = GROUND + 2 - dy;
      this.px(cx - w, y, w * 2, 1, '#ffffff');
      this.px(cx - w, y, Math.max(1, Math.round(w * 0.35)), 1, '#dbe2f4');
      if (dy % 3 === 0) this.px(cx + w - 2, y, 1, 1, '#c9d3ea');
    }
  }

  private drawPile() {
    const env = sprite(ENVELOPE);
    for (let i = 0; i < this.pile; i++) {
      const x = 124 + ((i * 13) % 44) + (Math.floor(i / 4) % 2) * 3;
      const y = 154 - Math.floor(i / 5) * 4 - (i % 2) * 2;
      this.g.drawImage(env, x, y);
    }
  }

  private pileTop(): Pt {
    const i = Math.max(0, this.pile - 1);
    return { x: 124 + ((i * 13) % 44) + 5, y: 158 - Math.floor(i / 5) * 4 };
  }

  private drawUnsure() {
    const env = sprite(EMAIL);
    for (let i = 0; i < this.unsure; i++) {
      const x = this.sleigh.x + 2 + i * 14;
      const y = this.sleigh.y - 52 + Math.round(Math.sin(this.time / 300 + i) * 2);
      this.g.drawImage(env, x, y);
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
    (Object.keys(SACK_X) as SackCat[]).forEach(cat => this.drawSackShape(SACK_X[cat], 172, cat));
  }

  sackPt(cat: SackCat): Pt { return { x: SACK_X[cat] + 7, y: 176 }; }

  private drawShelf() {
    const t = this.time;
    this.stock.forEach((s, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = SHELF.x + 4 + col * 36, y = SHELF.y + 3 + row * 22;
      this.g.drawImage(icon(s.id), x, y + 8);
      const ratio = Math.min(1, s.have / s.need);
      const short = s.have < s.need;
      const boxes = Math.round(ratio * 6);
      for (let b = 0; b < boxes; b++) this.g.drawImage(giftBox(b + i), x + 10 + (b % 3) * 7, y + (b < 3 ? 11 : 3) + (b < 3 ? 0 : 0));
      // Balken
      const blink = short && this.stockAlert && Math.floor(t / 300) % 2 === 0;
      this.px(x + 10, y - 1, 22, 3, '#0d0d1a');
      this.px(x + 11, y, Math.max(1, Math.round(20 * ratio)), 1, short ? (blink ? '#ffffff' : '#ff4d4d') : '#4dff88');
      if (short && this.stockAlert && blink) { this.px(x + 2, y + 1, 2, 4, '#ff4d4d'); this.px(x + 2, y + 6, 2, 1, '#ff4d4d'); }
    });
    if (this.shelfOn) {
      this.g.globalAlpha = 0.18 + Math.sin(t / 400) * 0.06;
      this.px(SHELF.x - 1, SHELF.y - 3, 78, 2, '#e0651a');
      this.g.globalAlpha = 1;
    }
  }

  slotPt(id: string): Pt {
    const i = this.stock.findIndex(s => s.id === id);
    const col = i % 2, row = Math.floor(i / 2);
    return { x: SHELF.x + 20 + col * 36, y: SHELF.y + 12 + row * 22 };
  }

  private drawCart() {
    if (!this.cart.visible) return;
    const x = Math.round(this.fx.cartX), y = GROUND + 6;
    this.px(x, y - 6, 24, 6, '#8a5a35');
    this.px(x, y - 6, 24, 1, '#a8774a');
    this.px(x - 2, y, 28, 1, '#c9971c');
    this.px(x - 3, y - 2, 1, 2, '#c9971c');
    for (let b = 0; b < this.cart.boxes; b++) this.g.drawImage(giftBox(b), x + 1 + (b % 3) * 8, y - 14 - Math.floor(b / 3) * 8);
    this.g.drawImage(sprite(ELF, { g: '#c8323c', G: '#8f1d2c' }), x + 26, y - 12);
  }

  private drawCloud() {
    const cx = 72, cy = 44;
    const circles: [number, number, number][] = [[-9, 2, 7], [0, -3, 9], [9, 2, 7], [3, 4, 7]];
    for (let y = -14; y < 13; y++) for (let x = -18; x < 18; x++) {
      const inside = circles.some(([a, b, r]) => Math.hypot(x - a, y - b) < r);
      const edge = !inside && circles.some(([a, b, r]) => Math.hypot(x - a, y - b) < r + 1.2);
      if (inside) this.px(cx + x, cy + y, 1, 1, y > 4 ? '#c9d3ea' : '#eef2fb');
      else if (edge) this.px(cx + x, cy + y, 1, 1, '#7d8bb8');
    }
    if (this.cloud.doc) {
      if (!this.cloud.found) this.g.globalAlpha = 0.55;
      this.g.drawImage(sprite(DOC), cx - 4, cy - 6 + Math.round(Math.sin(this.time / 400)));
      this.g.globalAlpha = 1;
      if (!this.cloud.found) {
        const z = Math.floor(this.time / 500) % 3;
        this.px(cx + 8 + z * 2, cy - 12 - z * 3, 3, 1, '#c9d3ea');
        this.px(cx + 10 + z * 2, cy - 11 - z * 3, 1, 1, '#c9d3ea');
        this.px(cx + 8 + z * 2, cy - 10 - z * 3, 3, 1, '#c9d3ea');
      }
    }
    if (this.fx.scan > 0) {
      const p = this.phonePt();
      const r = this.fx.scan * 120;
      for (let a = 0; a < Math.PI * 2; a += 0.05) {
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.8;
        if (Math.floor(a * 20) % 2) this.px(x, y, 1, 1, '#e0651a');
      }
    }
  }

  // ---- Düsseldorf
  private drawDuesseldorf() {
    const t = this.time;
    this.px(78, 35, 1, 1, Math.floor(t / 600) % 2 ? '#ff3b3b' : '#5a1a1a');
    for (let i = 0; i < 14; i++) {
      const x = (i * 37 + t / 40) % W;
      this.px(x, 146 + (i % 5) * 4, 4 + (i % 3) * 2, 1, '#4a6ab0');
    }
    // Warteschlange / Leute vor der Tür
    for (let i = 0; i < 3; i++) {
      const x = 252 + i * 7;
      this.px(x, 156, 4, 12, ['#4a4a6a', '#5a4a3a', '#3a5a5a'][i]);
      this.px(x, 152, 4, 4, '#f6c9a4');
      this.px(x, 151, 4, 2, ['#d62f3a', '#2f9e5a', '#4a7fd6'][i]);
    }
    // Korb
    const bx = 196, by = 172;
    for (let i = 0; i < Math.min(this.basket.count, 12); i++) this.g.drawImage(giftBox(i), bx + 3 + (i % 4) * 7, by - 6 - Math.floor(i / 4) * 5);
    this.px(bx, by, 36, 14, '#b07a3a');
    for (let y = by + 2; y < by + 14; y += 3) for (let x = bx + ((y / 3) % 2 ? 0 : 2); x < bx + 36; x += 4) this.px(x, y, 2, 1, '#8a5a2a');
    this.px(bx - 1, by, 38, 2, '#d9a066');
    this.px(bx + 4, by - 10, 2, 10, '#8a5a2a');
    this.px(bx + 30, by - 10, 2, 10, '#8a5a2a');
    this.px(bx + 4, by - 11, 28, 2, '#8a5a2a');
    this.drawSleigh(this.sleigh.x, this.sleigh.y);
  }

  basketPt(): Pt { return { x: 214, y: 168 }; }

  // ---------------------------------------------------------------- UI-Overlays
  private toPct(p: Pt) { return { left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }; }

  private updateUi(now: number) {
    const sw = this.ui.clientWidth;
    const sh = this.ui.clientHeight;
    const placed: { l: number; r: number; t: number; b: number }[] = [];
    for (const it of [...this.uiItems]) {
      if (it.until && now > it.until) { this.removeUi(it); continue; }
      const p = it.anchor();
      let left = (p.x / W) * sw;
      if (!it.clamp) {
        it.el.style.left = `${left}px`;
        it.el.style.top = this.toPct(p).top;
        continue;
      }
      // Sprechblasen: am Rand halten und überlappende nach oben schieben
      const w = it.el.offsetWidth, h = it.el.offsetHeight;
      const half = w / 2;
      left = Math.max(half + 4, Math.min(sw - half - 4, left));
      const tail = Math.max(8, Math.min(w - 8, (p.x / W) * sw - (left - half)));
      it.el.style.setProperty('--tail', `${tail}px`);
      let bottom = (p.y / H) * sh - 6;
      for (let guard = 0; guard < 4; guard++) {
        const hit = placed.find(r => left - half < r.r && left + half > r.l && bottom - h < r.b && bottom > r.t);
        if (!hit) break;
        bottom = hit.t - 4;
      }
      bottom = Math.max(h + 2, bottom);
      placed.push({ l: left - half, r: left + half, t: bottom - h, b: bottom });
      it.el.style.left = `${left}px`;
      it.el.style.top = `${bottom + 6}px`;
    }
  }

  private removeUi(it: UiItem) {
    this.uiItems.splice(this.uiItems.indexOf(it), 1);
    it.el.classList.add('out');
    setTimeout(() => it.el.remove(), 250);
  }

  anchor(who: string): () => Pt {
    if (who === 'santa') return () => ({ x: this.sleigh.x + 17, y: this.sleigh.y - 33 });
    if (who === 'phone') return () => this.phonePt();
    if (who === 'elf') return () => ({ x: this.elf.x + 4, y: GROUND - 15 });
    if (who === 'cloud') return () => ({ x: 72, y: 30 });
    if (who === 'shelf') return () => ({ x: SHELF.x + 38, y: SHELF.y - 4 });
    if (who === 'mailbox') return () => ({ x: MAILBOX.x + 5, y: MAILBOX.top - 6 });
    if (who === 'basket') return () => ({ x: 214, y: 158 });
    return () => {
      const k = this.kids.get(who);
      return k ? { x: k.x + 5, y: k.base - 19 } : { x: W / 2, y: H / 2 };
    };
  }

  phonePt(): Pt { return { x: this.sleigh.x + 17, y: this.sleigh.y - 18 }; }

  /** Sprechblase über einer Figur. */
  say(who: string, text: string, ms = 2600, cls = ''): Promise<void> {
    const el = document.createElement('div');
    el.className = `say ${cls}`;
    el.textContent = text;
    this.ui.appendChild(el);
    const it: UiItem = { el, anchor: this.anchor(who), until: this.time + ms, clamp: true };
    // Nahe Sprechblasen ersetzen statt überlappen
    const p = it.anchor();
    for (const other of [...this.uiItems]) {
      if (!other.el.classList.contains('say')) continue;
      const q = other.anchor();
      if (Math.abs(q.x - p.x) < 60 && Math.abs(q.y - p.y) < 30) this.removeUi(other);
    }
    this.uiItems.push(it);
    sfx.pop();
    this.updateUi(this.time);
    return new Promise(r => setTimeout(r, Math.min(ms, 1200)));
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
    return new Promise(r => setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); r(); }, 300); }, reduceMotion() ? 900 : 1700));
  }

  // ---------------------------------------------------------------- Effekte
  tween(obj: object, key: string, to: number, ms: number, ease: EaseName = 'inOut'): Promise<void> {
    const o = obj as Record<string, number>;
    this.tweens = this.tweens.filter(t => !(t.obj === o && t.key === key));
    if (reduceMotion()) ms = Math.min(ms, 120);
    return new Promise(done => this.tweens.push({ obj: o, key, from: o[key], to, t0: this.time, dur: Math.max(1, ms), ease: EASE[ease], done }));
  }

  fly(img: HTMLCanvasElement, from: Pt, to: Pt, opts: { dur?: number; arc?: number; trail?: string } = {}): Promise<void> {
    const dur = reduceMotion() ? 150 : opts.dur ?? 700;
    return new Promise(done => this.flyers.push({ img, x: from.x, y: from.y, from, to, t0: this.time, dur, arc: opts.arc ?? 20, trail: opts.trail, done }));
  }

  particle(x: number, y: number, color: string, o: { life?: number; size?: number; vx?: number; vy?: number; grav?: number } = {}) {
    if (this.particles.length > 400) return;
    const life = o.life ?? 600;
    this.particles.push({ x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, life, max: life, color, size: o.size ?? 1, grav: o.grav ?? 0 });
  }

  sparkle(p: Pt, colors = ['#ffd34d', '#e0651a', '#ffffff'], n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 0.4 + Math.random() * 1.2;
      this.particle(p.x, p.y, colors[i % colors.length], { vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3, grav: 0.03, life: 500 + Math.random() * 300, size: Math.random() < 0.3 ? 2 : 1 });
    }
  }

  poof(p: Pt) { this.sparkle(p, ['#ffffff', '#dfe6f5', '#c9d3ea'], 12); }

  shake(ms = 400) { this.fx.shake = ms; }
  flash() { this.fx.flash = 300; }

  private firework() {
    const x = 30 + Math.random() * 260, y = 20 + Math.random() * 60;
    const colors = [['#ff4d4d', '#ffd34d'], ['#4dff88', '#ffffff'], ['#4db8ff', '#b57bd6'], ['#e0651a', '#ffd34d']][Math.floor(Math.random() * 4)];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, s = 0.9 + Math.random() * 0.4;
      this.particle(x, y, colors[i % 2], { vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: 0.02, life: 900, size: 1 });
    }
    sfx.firework();
  }

  // ---------------------------------------------------------------- Figuren
  addKid(id: string, x?: number, base = 158) {
    const def = KIDS[id];
    const kid: Kid = { id, name: def.name, x: x ?? def.home, base, pal: { ...def.pal }, pose: 'stand', facing: 1, visible: true, walking: false, letter: false, shiver: false, gift: null, sad: false };
    this.kids.set(id, kid);
    return kid;
  }

  kid(id: string) { return this.kids.get(id)!; }

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
    const door = k.x < 50 ? HOUSES[0].door : HOUSES[1].door;
    await this.walk(id, door - 5);
    k.visible = false;
  }

  // ---------------------------------------------------------------- Story-Aktionen
  async buryMailbox() {
    sfx.storm();
    this.tween(this.fx, 'storm', 1, 600);
    this.shake(2400);
    await this.tween(this.fx, 'snowLevel', 1, 2600, 'out');
    await this.tween(this.fx, 'storm', 0.25, 1200);
  }

  async throwLetter(id: string) {
    const k = this.kid(id);
    if (!k) return;
    k.letter = false;
    const from = { x: k.x + 9, y: k.base - 8 };
    const env = sprite(ENVELOPE);
    sfx.whoosh();
    await this.fly(env, from, { x: MAILBOX.x + 5, y: MAILBOX.top - 2 }, { dur: 600, arc: 22 });
    sfx.bonk();
    this.poof({ x: MAILBOX.x + 5, y: MAILBOX.top - 2 });
    await this.fly(env, { x: MAILBOX.x + 5, y: MAILBOX.top - 2 }, { x: k.x + 14 + Math.random() * 8, y: 160 }, { dur: 450, arc: 10 });
    this.poof({ x: k.x + 16, y: 160 });
  }

  async sendEmail(from: Pt) {
    sfx.mail();
    await this.fly(sprite(EMAIL), from, this.phonePt(), { dur: 750, arc: 34, trail: '#e0651a' });
    this.pile++;
    this.fx.buzz = 260;
    sfx.buzz();
  }

  async sortOne(cat: SackCat) {
    const from = this.pileTop();
    if (this.pile > 0) this.pile--;
    await this.fly(sprite(ENVELOPE), from, this.sackPt(cat), { dur: 450, arc: 16 });
    this.sacks.counts[cat]++;
    this.updateSackTags();
    sfx.pop();
  }

  async resolveUnsure(i: number, cat: SackCat) {
    const from = this.unsurePt(i);
    this.unsure = Math.max(0, this.unsure - 1);
    await this.fly(sprite(EMAIL), from, this.sackPt(cat), { dur: 500, arc: 14, trail: '#ffd34d' });
    this.sacks.counts[cat]++;
    this.updateSackTags();
    sfx.pop();
  }

  updateSackTags() {
    (Object.keys(SACK_X) as SackCat[]).forEach(cat => {
      const icons: Record<SackCat, string> = { wunsch: '💌', dringend: '🔥', verwaltung: '📁', spam: '🚫' };
      this.tag(`sack-${cat}`, { x: SACK_X[cat] + 7, y: 196 }, `${icons[cat]}${this.sacks.counts[cat]}`, 'tag-sack');
    });
  }

  async sackToSleigh() {
    (['dringend', 'verwaltung', 'spam'] as SackCat[]).forEach(c => this.untag(`sack-${c}`));
    this.untag('sack-wunsch');
    this.sacks.visible = false;
    this.poof({ x: 150, y: 178 });
    sfx.whoosh();
    await this.fly(giftBox(0), this.sackPt('wunsch'), { x: this.sleigh.x + 5, y: this.sleigh.y - 22 }, { dur: 600, arc: 30, trail: '#d62f3a' });
    this.sacks.onSleigh = true;
    this.sparkle({ x: this.sleigh.x + 5, y: this.sleigh.y - 22 });
  }

  async deliver(order: Record<string, number>) {
    const ids = Object.keys(order).filter(id => order[id] > 0);
    this.cart.visible = true;
    this.cart.boxes = Math.min(6, ids.length + 2);
    this.fx.cartX = 340;
    sfx.whoosh();
    await this.tween(this.fx, 'cartX', 286, 1200, 'out');
    for (const id of ids) {
      const s = this.stock.find(x => x.id === id);
      if (!s) continue;
      this.cart.boxes = Math.max(0, this.cart.boxes - 1);
      await this.fly(giftBox(ids.indexOf(id)), { x: this.fx.cartX + 10, y: GROUND - 10 }, this.slotPt(id), { dur: 450, arc: 24 });
      await this.tween(s, 'have', s.have + order[id], 350, 'out');
      this.sparkle(this.slotPt(id), ['#4dff88', '#ffffff', '#ffd34d'], 10);
      sfx.coin();
    }
    this.stockAlert = false;
    await this.tween(this.fx, 'cartX', 360, 900, 'in');
    this.cart.visible = false;
  }

  async giftToSleigh(img: HTMLCanvasElement, from?: Pt) {
    const slot = SLEIGH_SLOTS[this.sleighGifts.length % SLEIGH_SLOTS.length];
    const to = { x: this.sleigh.x + slot.x + 4, y: this.sleigh.y + slot.y + 4 };
    await this.fly(img, from ?? { x: SHELF.x + 38, y: SHELF.y + 30 }, to, { dur: 650, arc: 30, trail: '#ffd34d' });
    this.sleighGifts.push(img);
    this.sparkle(to);
    sfx.coin();
  }

  async scan() {
    sfx.power();
    for (let i = 0; i < 2; i++) {
      this.fx.scan = 0;
      await this.tween(this.fx, 'scan', 1, 900, 'out');
    }
    this.fx.scan = 0;
    this.cloud.found = true;
    this.sparkle({ x: 72, y: 40 }, ['#e0651a', '#ffd34d', '#ffffff'], 20);
    sfx.unlock();
  }

  async docToPhone() {
    this.cloud.doc = false;
    await this.fly(sprite(DOC), { x: 72, y: 40 }, this.phonePt(), { dur: 900, arc: 26, trail: '#4a7fd6' });
    this.fx.buzz = 300;
    this.sparkle(this.phonePt());
  }

  async takeOff() {
    this.sleigh.flying = 1;
    sfx.whoosh();
    const trail = setInterval(() => this.sparkle({ x: this.sleigh.x + 2, y: this.sleigh.y - 4 }, ['#ffd34d', '#ffffff'], 3), 60);
    this.tween(this.sleigh, 'y', 40, 2000, 'in');
    await this.tween(this.sleigh, 'x', 360, 2200, 'in');
    clearInterval(trail);
  }

  async wipe(fn: () => void) {
    await this.tween(this.fx, 'wipe', 1, 500, 'in');
    fn();
    await this.tween(this.fx, 'wipe', 0, 600, 'out');
  }

  async flyIn(x: number, y: number) {
    this.sleigh.flying = 1;
    this.sleigh.x = -90;
    this.sleigh.y = y - 20;
    const trail = setInterval(() => this.sparkle({ x: this.sleigh.x + 2, y: this.sleigh.y - 4 }, ['#ffd34d', '#ffffff'], 2), 70);
    this.tween(this.sleigh, 'y', y, 2000, 'out');
    await this.tween(this.sleigh, 'x', x, 2000, 'out');
    clearInterval(trail);
  }

  async dropGift(img: HTMLCanvasElement) {
    const from = { x: this.sleigh.x + 20, y: this.sleigh.y - 8 };
    sfx.drop();
    await this.fly(img, from, { x: 214, y: 166 }, { dur: 600, arc: -6, trail: '#ffd34d' });
    this.basket.count++;
    this.sparkle({ x: 214, y: 166 }, ['#4dff88', '#ffd34d', '#ffffff'], 16);
    sfx.coin();
  }

  // ---------------------------------------------------------------- Modi & Zustände
  setMode(mode: Mode) {
    this.mode = mode;
    this.clearTags();
    this.clearBubbles();
    this.flyers = [];
    this.fireworks = false;
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
    if (i === 1) {
      if (this.pile === 0 && !this.sacks.onSleigh) this.pile = 18;
      for (const id of MAIN_KIDS) if (!this.kids.has(id)) { const k = this.addKid(id, 40 + MAIN_KIDS.indexOf(id) * 11); k.pose = 'stand'; }
    } else {
      this.pile = 0;
      this.unsure = 0;
      for (const id of MAIN_KIDS) { const k = this.kids.get(id); if (k) k.visible = false; }
      if (!this.sacks.onSleigh) this.sacks.onSleigh = true;
      this.sacks.visible = false;
      (['wunsch', 'dringend', 'verwaltung', 'spam'] as SackCat[]).forEach(c => this.untag(`sack-${c}`));
    }
    if (i >= 3) this.stockAlert = false;
    if (i >= 4 && this.kids.get('mateo')) this.kid('mateo').visible = false;
    if (i >= 4) this.cloud.visible = true;
    if (i >= 5) { this.cloud.found = true; this.cloud.doc = false; }
    if (i >= 6 && this.kids.get('jonas')) this.kid('jonas').visible = false;
  }

  reset() {
    this.kids.clear();
    this.pile = 0; this.unsure = 0;
    this.sacks = { visible: false, onSleigh: false, counts: { wunsch: 0, dringend: 0, verwaltung: 0, spam: 0 } };
    this.sleighGifts = [];
    this.stock = STOCK.map(s => ({ id: s.id, have: s.inStock, need: s.requested }));
    this.shelfOn = false; this.stockAlert = false;
    this.cloud = { visible: false, doc: true, found: false };
    this.basket.count = 0;
    this.santa = { phone: false, sweat: false, wave: false };
    this.fx.snowLevel = 0; this.fx.storm = 0; this.fx.wipe = 0;
    this.particles = [];
    this.setMode('title');
  }
}
