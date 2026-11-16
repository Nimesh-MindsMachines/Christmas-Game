// Retro-Dialogbox (wie in klassischen Rollenspielen): Text tippt sich, Tippen = weiter.
import { dataUrl, ELF, SANTA, kidRows, sprite } from '../world/pixels';
import { KIDS } from '../world/world';
import { esc, reduceMotion } from './dom';
import { sfx } from './sfx';

export interface Speaker { name: string; portrait?: string; cls?: string }

let hideTimer = 0;

const portraitCache = new Map<string, string>();
function portrait(key: string, make: () => HTMLCanvasElement) {
  if (!portraitCache.has(key)) portraitCache.set(key, dataUrl(make(), 6));
  return portraitCache.get(key)!;
}

export const SPEAKERS = {
  narrator: (): Speaker => ({ name: 'Erzähler', cls: 'dlg-narrator' }),
  santa: (): Speaker => ({ name: 'Weihnachtsmann', portrait: portrait('santa', () => sprite(SANTA)) }),
  elf: (): Speaker => ({ name: 'Elfe Pepper', portrait: portrait('elf', () => sprite(ELF)) }),
  onemachine: (): Speaker => ({ name: 'OneMachine', portrait: 'om', cls: 'dlg-om' }),
  kid: (id: string): Speaker => ({ name: KIDS[id].name, portrait: portrait(`kid-${id}`, () => sprite(kidRows('stand', 0), KIDS[id].pal)) }),
};

export function createDialog(box: HTMLElement) {
  return (who: Speaker, text: string): Promise<void> => new Promise(resolve => {
    clearTimeout(hideTimer);
    box.hidden = false;
    box.className = `dialog ${who.cls ?? ''}`;
    const pic = who.portrait === 'om'
      ? '<span class="dlg-om-icon" aria-hidden="true">&gt;&gt;</span>'
      : who.portrait ? `<img src="${who.portrait}" alt="" />` : '<span class="dlg-star" aria-hidden="true">✶</span>';
    box.innerHTML = `
      <div class="dlg-portrait">${pic}</div>
      <div class="dlg-body">
        <b class="dlg-name">${esc(who.name)}</b>
        <p class="dlg-text" aria-live="polite"></p>
        <span class="dlg-next" aria-hidden="true">▼</span>
      </div>
      <button class="dlg-hit" type="button" aria-label="Weiter"></button>`;
    const p = box.querySelector<HTMLElement>('.dlg-text')!;
    const hit = box.querySelector<HTMLButtonElement>('.dlg-hit')!;
    let i = 0;
    let typing = true;
    const chars = [...text];
    const tick = () => {
      if (!typing) return;
      i = Math.min(chars.length, i + (reduceMotion() ? chars.length : 1));
      p.textContent = chars.slice(0, i).join('');
      if (i % 2 === 0) sfx.type();
      if (i >= chars.length) { typing = false; box.classList.add('done'); return; }
      setTimeout(tick, chars[i - 1] === '.' || chars[i - 1] === '!' || chars[i - 1] === '?' ? 160 : 24);
    };
    tick();
    const next = () => {
      if (typing) { typing = false; p.textContent = text; box.classList.add('done'); return; }
      sfx.select();
      hit.removeEventListener('click', next);
      document.removeEventListener('keydown', key);
      hideTimer = window.setTimeout(() => { box.hidden = true; }, 80);
      resolve();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } };
    hit.addEventListener('click', next);
    document.addEventListener('keydown', key);
    hit.focus({ preventScroll: true });
  });
}
