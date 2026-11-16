export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function esc(s: string | number): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function el<T extends HTMLElement = HTMLElement>(html: string): T {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as T;
}

export function $<T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string): T {
  const n = root.querySelector<T>(sel);
  if (!n) throw new Error(`Element fehlt: ${sel}`);
  return n;
}

export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, reduceMotion() ? Math.min(ms, 80) : ms));

export const fmt = (n: number) => new Intl.NumberFormat('de-DE').format(n);

/** Tippt Text Zeichen für Zeichen in ein Element. */
export async function typeText(node: HTMLElement, text: string, speed = 28) {
  if (reduceMotion()) { node.textContent = text; return; }
  node.textContent = '';
  for (const ch of text) {
    node.textContent += ch;
    await new Promise(r => setTimeout(r, speed));
  }
}

/** Zählt eine Zahl hoch. */
export async function countUp(node: HTMLElement, to: number, ms = 900) {
  if (reduceMotion()) { node.textContent = fmt(to); return; }
  const start = performance.now();
  // Fallback, falls requestAnimationFrame pausiert (z. B. Tab im Hintergrund)
  setTimeout(() => { node.textContent = fmt(to); }, ms + 150);
  await new Promise<void>(res => {
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      node.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
      p < 1 ? requestAnimationFrame(tick) : res();
    };
    requestAnimationFrame(tick);
  });
}

export function scrollIntoViewSoft(node: Element) {
  node.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
}
