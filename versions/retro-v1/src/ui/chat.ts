// OneMachine-App auf Santas Handy: Composer, Nutzer-Nachricht, Agenten-Antwort.
import { el, esc, scrollIntoViewSoft, typeText, wait } from './dom';
import { sfx } from './sfx';

export const OM_AVATAR = '<span class="om-avatar" aria-hidden="true">&gt;&gt;</span>';

export interface Thread {
  root: HTMLElement;
  list: HTMLElement;
  dock: HTMLElement;
}

export function createThread(root: HTMLElement, heading: { eyebrow: string; title: string; intro?: string }): Thread {
  root.innerHTML = `
    <section class="level">
      <div class="app-bar">${OM_AVATAR}<span class="app-name">OneMachine</span><span class="app-agent">${esc(heading.eyebrow)}</span></div>
      <div class="level-head">
        <h1>${esc(heading.title)}</h1>
        ${heading.intro ? `<p class="lede">${esc(heading.intro)}</p>` : ''}
      </div>
      <div class="thread" aria-live="polite"></div>
      <div class="composer-dock"></div>
    </section>`;
  return { root, list: root.querySelector('.thread')!, dock: root.querySelector('.composer-dock')! };
}

/** Composer, der den Prompt selbst tippt; der Spieler tippt auf „Senden“. */
export function ask(t: Thread, prompt: string, agent = '@Postfach-Agent'): Promise<void> {
  return new Promise(async resolve => {
    t.dock.innerHTML = `
      <div class="composer">
        <div class="composer-input"><span class="mention">${esc(agent)}</span> <span class="typed"></span><span class="caret"></span></div>
        <div class="composer-row">
          <span class="chip">Quellen: Auto</span>
          <button class="send" type="button" aria-label="Senden" disabled>▲</button>
        </div>
      </div>`;
    const typed = t.dock.querySelector<HTMLElement>('.typed')!;
    const send = t.dock.querySelector<HTMLButtonElement>('.send')!;
    await typeText(typed, prompt, 24);
    t.dock.querySelector('.caret')?.remove();
    send.disabled = false;
    send.classList.add('pulse');
    send.focus({ preventScroll: true });
    send.addEventListener('click', () => {
      sfx.select();
      t.dock.innerHTML = '';
      userMsg(t, `<span class="mention">${esc(agent)}</span> ${esc(prompt)}`);
      resolve();
    }, { once: true });
  });
}

export function userMsg(t: Thread, html: string) {
  const m = el(`<div class="msg msg-user"><div class="bubble">${html}</div></div>`);
  t.list.appendChild(m);
  scrollIntoViewSoft(m);
  return m;
}

export function agentMsg(t: Thread, html: string, cls = '') {
  const m = el(`<div class="msg msg-agent ${cls}">${OM_AVATAR}<div class="agent-body">${html}</div></div>`);
  t.list.appendChild(m);
  requestAnimationFrame(() => scrollIntoViewSoft(m));
  return m;
}

export async function thinking(t: Thread, label: string, ms = 1100) {
  const m = agentMsg(t, `<div class="thinking"><span class="dots"><i></i><i></i><i></i></span>${esc(label)}</div>`);
  await wait(ms);
  m.remove();
}

/** Ein Knopf im Dock; löst auf, wenn er gedrückt wird. */
export function dockButton(t: Thread, label: string, cls = 'btn-primary'): Promise<void> {
  return new Promise(resolve => {
    t.dock.innerHTML = `<button class="btn ${cls} btn-block" type="button">${esc(label)}</button>`;
    const b = t.dock.querySelector('button')!;
    b.addEventListener('click', () => { sfx.select(); t.dock.innerHTML = ''; resolve(); }, { once: true });
  });
}
