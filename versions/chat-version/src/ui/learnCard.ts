import { AGENT_ICON } from './brand';
import { el, esc } from './dom';

/** Zeigt die Karte „Was OneMachine gerade getan hat“ als Bottom-Sheet. */
export function showLearnCard(overlay: HTMLElement, card: { title: string; text: string }, button = 'Weiter'): Promise<void> {
  return new Promise(resolve => {
    const sheet = el(`
      <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="learn-title">
        <div class="sheet">
          <div class="sheet-head">${AGENT_ICON}<span class="eyebrow">Was OneMachine gerade getan hat</span></div>
          <h2 id="learn-title">${esc(card.title)}</h2>
          <p>${esc(card.text)}</p>
          <button class="btn btn-primary btn-block" type="button">${esc(button)} →</button>
        </div>
      </div>`);
    overlay.appendChild(sheet);
    const btn = sheet.querySelector('button')!;
    requestAnimationFrame(() => { sheet.classList.add('open'); btn.focus(); });
    btn.addEventListener('click', () => {
      sheet.classList.remove('open');
      setTimeout(() => { sheet.remove(); resolve(); }, 250);
    });
  });
}

export function toast(overlay: HTMLElement, text: string) {
  const t = el(`<div class="toast" role="status">${esc(text)}</div>`);
  overlay.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
}
