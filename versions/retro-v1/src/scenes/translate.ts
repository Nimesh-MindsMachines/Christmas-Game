import type { SceneCtx } from '../main';
import { MATEO } from '../content.de';
import { ledger } from '../state';
import { agentMsg, createThread, dockButton, OM_AVATAR, thinking } from '../ui/chat';
import { el, esc, wait } from '../ui/dom';
import { sfx } from '../ui/sfx';
import { icon } from '../world/pixels';

export async function translate(ctx: SceneCtx) {
  const { world } = ctx;
  const t = createThread(ctx.root, {
    eyebrow: 'Übersetzungs-Erweiterung',
    title: 'Post aus aller Welt',
    intro: 'Ein neuer Junge ist in die Stadt gezogen. Seine E-Mail kann Santa nicht lesen …',
  });

  const mateo = world.addKid('mateo', -14);
  world.walk('mateo', 40, 24).then(() => {
    if (!ctx.isActive()) return;
    mateo.pose = 'type';
    world.say('mateo', '¡Hola, Papá Noel! ¿Me traes un telescopio?', 3400, 'say-es');
    setTimeout(() => { if (ctx.isActive()) void world.sendEmail({ x: mateo.x + 5, y: mateo.base - 12 }); }, 900);
    setTimeout(() => { if (ctx.isActive()) { mateo.pose = 'stand'; world.say('santa', '??? Ich verstehe kein Wort!', 2600); } }, 2000);
  });

  const browser = el(`
    <div class="browser">
      <div class="browser-bar">
        <span class="dots3" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="url">mail.nordpol.de/posteingang/mateo</span>
        <button class="ext-btn pulse" type="button" aria-label="OneMachine-Erweiterung öffnen" aria-expanded="false">${OM_AVATAR}</button>
      </div>
      <div class="browser-body">
        <div class="letter-meta"><b>${esc(MATEO.from)}</b> · ${esc(MATEO.subject)}</div>
        <p class="letter-text" lang="es">${esc(MATEO.original)}</p>
        <div class="lang-row"></div>
      </div>
    </div>`);
  t.list.appendChild(browser);
  t.dock.innerHTML = '<p class="muted" style="text-align:center;font-size:14px">👆 Tippe oben rechts auf das OneMachine-Symbol</p>';

  const ext = browser.querySelector<HTMLButtonElement>('.ext-btn')!;
  const text = browser.querySelector<HTMLElement>('.letter-text')!;

  await new Promise<void>(res => ext.addEventListener('click', () => res(), { once: true }));
  if (!ctx.isActive()) return;
  sfx.select();
  ext.classList.remove('pulse');
  ext.setAttribute('aria-expanded', 'true');
  t.dock.innerHTML = '';

  const pop = el(`
    <div class="ext-pop">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">${OM_AVATAR}<b>OneMachine</b></div>
      <p style="font-size:14px;color:var(--ink-2)">Sprache erkannt: <b>${esc(MATEO.languageLabel)}</b></p>
      <button class="btn btn-accent btn-block btn-sm" type="button" style="margin-top:12px">Auf Deutsch übersetzen</button>
    </div>`);
  browser.appendChild(pop);
  const go = pop.querySelector('button')!;
  go.focus({ preventScroll: true });

  await new Promise<void>(res => go.addEventListener('click', () => res(), { once: true }));
  if (!ctx.isActive()) return;
  sfx.power();
  pop.remove();
  text.classList.add('fade');
  world.sparkle(world.phonePt(), ['#e0651a', '#ffd34d', '#ffffff'], 16);
  await wait(320);
  text.textContent = MATEO.translated;
  text.lang = 'de';
  text.classList.remove('fade');
  ledger.translated = true;
  world.pile = 0;

  const row = browser.querySelector('.lang-row')!;
  row.innerHTML = `
    <div class="lang-toggle" role="group" aria-label="Sprache">
      <button type="button" data-l="de" aria-pressed="true">Deutsch</button>
      <button type="button" data-l="es" aria-pressed="false">Original</button>
    </div>`;
  row.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.addEventListener('click', () => {
    sfx.select();
    row.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    text.textContent = b.dataset.l === 'de' ? MATEO.translated : MATEO.original;
    text.lang = b.dataset.l!;
  }));

  world.say('santa', 'Ah! Ein Teleskop für Mateo!', 2400);
  await wait(500);
  if (!ctx.isActive()) return;
  await thinking(t, 'Prüfe Wunsch und Lager …', 900);
  if (!ctx.isActive()) return;
  agentMsg(t, `
    <p>Wunsch erkannt und automatisch abgeglichen:</p>
    <div class="card" style="display:flex;align-items:center;gap:10px">
      <span style="font-size:24px" aria-hidden="true">🔭</span>
      <div style="flex:1"><b>${esc(MATEO.summary)}</b><div class="muted" style="font-size:13px">1 Stück reserviert</div></div>
      <span class="chip chip-green">auf Lager</span>
    </div>`);

  await dockButton(t, 'Zur Wunschliste hinzufügen ▶');
  if (!ctx.isActive()) return;
  mateo.pose = 'cheer';
  world.say('mateo', '¡Gracias! Danke!', 1800);
  await world.giftToSleigh(icon('teleskop'));
  if (!ctx.isActive()) return;
  mateo.pose = 'stand';
  void world.walk('mateo', -16, 20);
  await wait(500);
  ctx.finish('translate');
}
