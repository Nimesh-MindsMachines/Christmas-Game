import type { SceneCtx } from '../main';
import { MATEO } from '../content.de';
import { ledger } from '../state';
import { agentMsg, createThread, dockButton, thinking } from '../ui/chat';
import { el, esc, wait } from '../ui/dom';
import { AGENT_ICON } from '../ui/brand';

export async function translate(ctx: SceneCtx) {
  const t = createThread(ctx.root, {
    eyebrow: 'Level 3 · Übersetzungs-Erweiterung',
    title: 'Ein Brief in einer anderen Sprache',
    intro: 'Gerade kam noch eine E-Mail rein. Santa versteht kein Wort. Zum Glück ist die OneMachine-Erweiterung im Browser installiert.',
  });

  const browser = el(`
    <div class="browser">
      <div class="browser-bar">
        <span class="dots3" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="url">mail.nordpol.de/posteingang/mateo</span>
        <button class="ext-btn pulse" type="button" aria-label="OneMachine-Erweiterung öffnen" aria-expanded="false">${AGENT_ICON}</button>
      </div>
      <div class="browser-body">
        <div class="letter-meta"><b>${esc(MATEO.from)}</b> · ${esc(MATEO.subject)}</div>
        <p class="letter-text" lang="es">${esc(MATEO.original)}</p>
        <div class="lang-row"></div>
      </div>
    </div>`);
  t.list.appendChild(browser);
  t.dock.innerHTML = '<p class="muted" style="text-align:center;font-size:13.5px">👆 Tippe oben rechts auf das OneMachine-Symbol</p>';

  const ext = browser.querySelector<HTMLButtonElement>('.ext-btn')!;
  const text = browser.querySelector<HTMLElement>('.letter-text')!;

  await new Promise<void>(res => ext.addEventListener('click', () => res(), { once: true }));
  if (!ctx.isActive()) return;
  ext.classList.remove('pulse');
  ext.setAttribute('aria-expanded', 'true');
  t.dock.innerHTML = '';

  const pop = el(`
    <div class="ext-pop card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">${AGENT_ICON.replace('class="agent-icon"', 'class="agent-icon" width="22" height="22"')}<b style="font-size:14px">OneMachine</b></div>
      <p style="font-size:13px;color:var(--ink-2)">Sprache erkannt: <b>${esc(MATEO.languageLabel)}</b></p>
      <button class="btn btn-accent btn-block btn-sm" type="button" style="margin-top:10px">Auf Deutsch übersetzen</button>
    </div>`);
  browser.appendChild(pop);
  browser.style.position = 'relative';
  const go = pop.querySelector('button')!;
  go.focus({ preventScroll: true });

  await new Promise<void>(res => go.addEventListener('click', () => res(), { once: true }));
  if (!ctx.isActive()) return;
  pop.remove();
  text.classList.add('fade');
  await wait(320);
  text.textContent = MATEO.translated;
  text.lang = 'de';
  text.classList.remove('fade');
  ledger.translated = true;

  const row = browser.querySelector('.lang-row')!;
  row.innerHTML = `
    <div class="lang-toggle" role="group" aria-label="Sprache">
      <button type="button" data-l="de" aria-pressed="true">Deutsch</button>
      <button type="button" data-l="es" aria-pressed="false">Original</button>
    </div>`;
  row.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.addEventListener('click', () => {
    row.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    text.textContent = b.dataset.l === 'de' ? MATEO.translated : MATEO.original;
    text.lang = b.dataset.l!;
  }));

  await wait(500);
  if (!ctx.isActive()) return;
  await thinking(t, 'Prüfe Wunsch und Lager …', 900);
  if (!ctx.isActive()) return;
  agentMsg(t, `
    <p>Wunsch erkannt und automatisch abgeglichen:</p>
    <div class="card" style="display:flex;align-items:center;gap:10px;padding:12px 14px">
      <span style="font-size:26px" aria-hidden="true">🔭</span>
      <div style="flex:1"><b>${esc(MATEO.summary)}</b><div class="muted" style="font-size:13px">Teleskop · 1 Stück reserviert</div></div>
      <span class="chip chip-green">auf Lager</span>
    </div>`);

  await dockButton(t, 'Zur Wunschliste hinzufügen →');
  ctx.finish('translate');
}
