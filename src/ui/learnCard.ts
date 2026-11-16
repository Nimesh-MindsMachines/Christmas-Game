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
