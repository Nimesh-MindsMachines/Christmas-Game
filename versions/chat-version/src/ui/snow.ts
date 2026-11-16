import { reduceMotion } from './dom';

export function startSnow(canvas: HTMLCanvasElement) {
  if (reduceMotion()) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let w = 0, h = 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);
  const count = Math.round(Math.min(120, (w * h) / 9000));
  const flakes = Array.from({ length: count }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: 0.8 + Math.random() * 2.4, s: 0.3 + Math.random() * 0.9, d: Math.random() * Math.PI * 2,
  }));
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const f of flakes) {
      f.y += f.s; f.d += 0.01; f.x += Math.sin(f.d) * 0.35;
      if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
