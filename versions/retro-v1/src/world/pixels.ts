// Pixel-Art: Sprites als Zeichen-Raster. Jedes Zeichen = eine Farbe, '.' = transparent.

export const PAL: Record<string, string> = {
  k: '#0d0d1a', w: '#ffffff', W: '#c9d3ea', r: '#d62f3a', R: '#8f1d2c', s: '#f6c9a4', S: '#d79a72',
  b: '#7a4a2a', B: '#3e2416', g: '#2f9e5a', G: '#1b5e3a', y: '#ffd34d', Y: '#c9971c', o: '#e0651a',
  n: '#17172f', u: '#4a7fd6', U: '#2a4a8f', v: '#9fe0ff', c: '#9aa3b5', C: '#5c6378', e: '#d9a066',
  p: '#9b5fc0', N: '#3e2416', t: '#2f9e5a', T: '#1b5e3a', h: '#6b3e26', q: '#2a2a40', x: '#b06a3b', X: '#e9bd86',
};

const cache = new Map<string, HTMLCanvasElement>();

export function sprite(rows: string[], pal: Record<string, string> = {}): HTMLCanvasElement {
  const key = rows.join('|') + JSON.stringify(pal);
  const hit = cache.get(key);
  if (hit) return hit;
  const w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w; c.height = rows.length;
  const g = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      g.fillStyle = pal[ch] ?? PAL[ch] ?? '#ff00ff';
      g.fillRect(x, y, 1, 1);
    }
  });
  cache.set(key, c);
  return c;
}

/** Einfarbige Silhouette eines Sprites (für Gegenlicht vor dem Mond). */
const silCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
export function silhouette(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  let m = silCache.get(src);
  if (!m) { m = new Map(); silCache.set(src, m); }
  const hit = m.get(color);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  m.set(color, c);
  return c;
}

// ---------- Figuren ----------

export const SANTA = [
  '....rrrrr.....',
  '...rrrrrrr.ww.',
  '..rrrrrrrrrww.',
  '..wwwwwwwwww..',
  '..wssssssssw..',
  '..ssksssskss..',
  '..wsssrrsssw..',
  '..wwwwwwwwww..',
  '.rwwwwwwwwwwr.',
  'rrrwwwwwwwwrrr',
  'rrrrwwwwwwrrrr',
  'krrrrwwwwrrrrk',
  'rrrrrrwwrrrrrr',
  'kkkkkkyykkkkkk',
  'rrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrr',
];

const KID_TOP = [
  '....ww....',
  '...tttt...',
  '..tttttt..',
  '..TTTTTT..',
  '..hssssh..',
  '..skssks..',
  '..ssrrss..',
  '...ssss...',
  '..yyyyyy..',
  '.tttttttt.',
];
const KID_ARMS = ['.tTttttTt.', '.k.tttt.k.', '...tttt...'];
const KID_TYPE = ['.tTtvvtTt.', '..kvvvvk..', '...tttt...'];
const KID_CHEER = ['ktTttttTtk', '...tttt...', '...tttt...'];
const LEGS_A = ['...q..q...', '...q..q...', '..kk..kk..'];
const LEGS_B = ['....qq....', '...q..q...', '..kk...kk.'];

export type KidPose = 'stand' | 'walk' | 'type' | 'cheer';
export function kidRows(pose: KidPose, frame: number): string[] {
  const arms = pose === 'type' ? KID_TYPE : pose === 'cheer' ? KID_CHEER : KID_ARMS;
  const legs = pose === 'walk' && frame % 2 ? LEGS_B : LEGS_A;
  return [...KID_TOP, ...arms, ...legs];
}

export const REINDEER_A = [
  '...........B.B....',
  '...........BBB.B..',
  '............BBBB..',
  '............bbbb..',
  '............bkbbbN',
  '...........bbbbb..',
  '..bbbbbbbbbbbb....',
  '.bbbbbbbbbbbbb....',
  '.bbXXXXXXXbbbb....',
  '.bbbbbbbbbbbb.....',
  '..b.b......b.b....',
  '..b.b......b.b....',
  '..k.k......k.k....',
];
export const REINDEER_B = [
  ...REINDEER_A.slice(0, 10),
  '.b...b....b...b...',
  'b.....b..b.....b..',
  'k.....k..k.....k..',
];

export const ELF = [
  '......y.',
  '.....gg.',
  '....ggg.',
  '...gggg.',
  '..wwwwww',
  '.ssssss.',
  '.sksskS.',
  '..ssrs..',
  '..gggg..',
  '.sgyygs.',
  '..gggg..',
  '..r..r..',
];

// ---------- Gegenstände ----------

export const ENVELOPE = [
  'kkkkkkkkkk',
  'kwwwwwwwwk',
  'kWwwwwwwWk',
  'kwWwwwwWwk',
  'kwwWwwWwwk',
  'kwwwWWwwwk',
  'kwwwwwwwwk',
  'kkkkkkkkkk',
];
export const EMAIL = ENVELOPE.map(r => r.replace(/k/g, 'o'));
export const EMAIL_SEALED = EMAIL.map((r, i) => (i === 5 ? 'owwwrrwwwo' : r));

export const DOC = [
  'wwwwwW..',
  'wwwwwWW.',
  'wuuuwwww',
  'wwwwwwww',
  'wuuuuuuw',
  'wwwwwwww',
  'wuuuuuuw',
  'wwwwwwww',
  'wuuuuwww',
  'wwwwwwww',
];

export const ICONS: Record<string, { rows: string[]; pal?: Record<string, string> }> = {
  fussball: { rows: ['..kkkk..', '.kwwwwk.', 'kwwkkwwk', 'kwkkkkwk', 'kwwkkwwk', 'kwwwwwwk', '.kwwwwk.', '..kkkk..'] },
  malset: { rows: ['..eeee..', '.eeeeee.', 'eereeyee', 'eeeeeeue', 'egee..ee', 'eeee..ee', '.eeeeee.', '..eeee..'] },
  bausteine: { rows: ['.y.y....', 'yyyy.u.u', 'yyyyuuuu', 'r.r.uuuu', 'rrrrg.g.', 'rrrrgggg', 'rrrrgggg', 'rrrrgggg'] },
  pluesch: { rows: ['xx....xx', 'xxxxxxxx', '.xkxxkx.', '.xxXXxx.', '.xxkkxx.', 'xxxxxxxx', 'xXxxxxXx', '.xx..xx.'] },
  buecher: { rows: ['rrrrrrr.', 'rwwwwwr.', '.uuuuuuu', '.uwwwwwu', 'gggggggg', 'gwwwwwwg', 'yyyyyyy.', 'ywwwwwy.'] },
  auto: { rows: ['........', '..rrrr..', '.rrvvrr.', 'rrrrrrrr', 'ryrrrryr', 'kkrrrrkk', 'kk....kk', '........'] },
  fahrrad: { rows: ['.....kk.', '....r...', '.rrrrr..', '..r..r..', '.kkk.kkk', 'k.rk.k.k', 'k..k.k.k', '.kkk.kkk'] },
  teleskop: { rows: ['......kk', '.....uuk', '....uuu.', '...uuu..', '..uuu...', '..kk....', '.k..k...', 'k....k..'] },
  jacke: { rows: ['..rrrr..', '.rr..rr.', 'rrrwwrrr', 'rrrwwrrr', 'r.rwwr.r', 'r.rwwr.r', '..rwwr..', '..rrrr..'] },
  box: { rows: ['..y..y..', '...yy...', 'cccyyccc', 'cccyyccc', 'yyyyyyyy', 'cccyyccc', 'cccyyccc', 'cccyyccc'] },
  ball: { rows: ['..kkkk..', '.kwwwwk.', 'kwwkkwwk', 'kwkkkkwk', 'kwwkkwwk', 'kwwwwwwk', '.kwwwwk.', '..kkkk..'] },
  buch: { rows: ['rrrrrrr.', 'rwwwwwr.', '.uuuuuuu', '.uwwwwwu', 'gggggggg', 'gwwwwwwg', 'yyyyyyy.', 'ywwwwwy.'] },
  herz: { rows: ['.rr..rr.', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...', '........'] },
  suppe: { rows: ['..w.w...', '...w.w..', '........', 'yyyyyyyy', 'xyyyyyyx', '.xxxxxx.', '..xxxx..', '........'] },
};

export const ICON_PAL: Record<string, Record<string, string>> = {
  pluesch: { x: '#a0663a', X: '#e0b07a' },
  box: { c: '#d62f3a' },
};

export function icon(name: string, pal?: Record<string, string>) {
  const def = ICONS[name] ?? ICONS.box;
  return sprite(def.rows, { ...(ICON_PAL[name] ?? {}), ...(pal ?? {}) });
}

export const BOX_COLORS = ['#d62f3a', '#2f9e5a', '#4a7fd6', '#9b5fc0', '#e0651a'];
export function giftBox(i: number) {
  return icon('box', { c: BOX_COLORS[i % BOX_COLORS.length] });
}

/** Sprite als Data-URL (für HTML-Elemente wie Dialog-Porträts). */
export function dataUrl(c: HTMLCanvasElement, scale = 4): string {
  const out = document.createElement('canvas');
  out.width = c.width * scale; out.height = c.height * scale;
  const g = out.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(c, 0, 0, out.width, out.height);
  return out.toDataURL();
}
