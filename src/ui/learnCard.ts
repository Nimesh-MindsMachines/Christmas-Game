import { el, esc } from './dom';
import { sfx } from './sfx';

/** „Fähigkeit freigeschaltet“ – zeigt, was OneMachine gerade getan hat. */
export function showLearnCard(overlay: HTMLElement, card: { title: string; text: string }, button = 'Weiter'): Promise<void> {
  return new Promise(resolve => {
    sfx.unlock();
    const sheet = el(`
      <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="learn-title">
        <div class="sheet px-box">
          <div class="achv">★ Fähigkeit freigeschaltet ★</div>
          <h2 id="learn-title">${esc(card.title)}</h2>
          <p>${esc(card.text)}</p>
          <button class="btn btn-accent btn-block" type="button">${esc(button)} ▶</button>
        </div>
      </div>`);
    const box = sheet.querySelector('.sheet')!;
    const colors = ['#ffd34d', '#e0651a', '#2f9e5a', '#c9283a', '#4a7fd6'];
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI * (0.1 + (0.8 * i) / 13);
      const d = 70 + Math.random() * 70;
      box.appendChild(el(`<i class="spark" style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;--c:${colors[i % colors.length]}"></i>`));
    }
    overlay.appendChild(sheet);
    const btn = sheet.querySelector('button')!;
    requestAnimationFrame(() => { sheet.classList.add('open'); btn.focus({ preventScroll: true }); });
    btn.addEventListener('click', () => {
      sfx.select();
      sheet.classList.remove('open');
      setTimeout(() => { sheet.remove(); resolve(); }, 220);
    });
  });
}

export function toast(overlay: HTMLElement, text: string) {
  const t = el(`<div class="toast" role="status">${esc(text)}</div>`);
  overlay.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
}
