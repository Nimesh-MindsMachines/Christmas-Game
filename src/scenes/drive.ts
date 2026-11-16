import type { SceneCtx } from '../main';
import { JONAS_DOC } from '../content.de';
import { ledger } from '../state';
import { agentMsg, ask, createThread, dockButton, thinking } from '../ui/chat';
import { SPEAKERS } from '../ui/dialog';
import { el, esc, typeText, wait } from '../ui/dom';

const KEYS = {
  wunsch: { color: '#fde2e4', label: 'Wunsch', text: 'Er wünscht sich einen Fußball.', cite: 'Absatz 2' },
  bedarf: { color: '#ffe9c7', label: 'Bedarf', text: 'Seine Winterjacke ist zu klein – er sagt es nur nebenbei.', cite: 'Absatz 4' },
  kontext: { color: '#e3e8ff', label: 'Kontext', text: 'Die Familie ist umgezogen und muss dieses Jahr sparen.', cite: 'Absatz 3' },
  interesse: { color: '#dff3e7', label: 'Interesse', text: 'Liest abends gern Abenteuergeschichten.', cite: 'Absatz 5' },
} as const;

export async function drive(ctx: SceneCtx) {
  const { world } = ctx;
  void world.shot('cloud', 1200);
  world.cloud.visible = true;
  world.cloud.doc = true;
  world.cloud.found = false;
  world.tag('cloud', 'cloud', 'DRIVE', 'tag-small');

  const jonas = world.addKid('jonas', 63);
  jonas.shiver = true;

  const t = createThread(ctx.root, {
    eyebrow: 'Dokumenten-Insights',
    title: 'Der verlorene Wunsch',
    intro: 'Alle Briefe sind da. Alle Geschenke auf Lager. Oder etwa doch nicht?',
  });

  await wait(2000);
  if (!ctx.isActive()) return;
  world.say('jonas', 'Brrr …', 2000);
  await ctx.talk(SPEAKERS.narrator(), 'Jonas ist neu in der Nachbarschaft. Seinen Wunschzettel hat er geschrieben – aber nie abgeschickt.');
  if (!ctx.isActive()) return;

  world.fx.buzz = 600;
  world.ring(world.phonePt(), '#ffd34d', 22);
  world.emote('cloud', '!', 60000);
  agentMsg(t, `
    <div class="nudge">
      <span class="bell" aria-hidden="true">🔔</span>
      <div>
        <b>Mir ist etwas aufgefallen.</b>
        <p style="font-size:14.5px;margin-top:4px;color:var(--ink-2)">In <span class="cite">Google Drive</span> liegt „${esc(JONAS_DOC.title)}“ von <b>${esc(JONAS_DOC.owner)}</b>. Es wurde nie an dich geschickt.</p>
      </div>
    </div>`);

  await dockButton(t, 'Dokument öffnen');
  if (!ctx.isActive()) return;
  world.clearBubbles();
  await world.scan();
  if (!ctx.isActive()) return;
  ledger.driveFound = true;
  ctx.award('cloud');
  await world.docToPhone();
  if (!ctx.isActive()) return;
  world.emote('santa', '!', 1400);

  const doc = el(`
    <div class="gdoc">
      <div class="gdoc-bar">
        <span class="doc-ico" aria-hidden="true"></span>
        <span><b>${esc(JONAS_DOC.title)}</b><small>${esc(JONAS_DOC.edited)}</small></span>
      </div>
      <div class="gdoc-page">
        ${JONAS_DOC.paragraphs.map(p => `<p>${p.mark ? `<mark data-k="${p.mark}">${esc(p.text)}</mark>` : esc(p.text)}</p>`).join('')}
      </div>
    </div>`);
  t.list.appendChild(doc);
  doc.scrollIntoView({ block: 'start' });

  await ask(t, 'was braucht Jonas wirklich?', '@Drive-Agent');
  if (!ctx.isActive()) return;
  await thinking(t, 'Lese das Dokument und verknüpfe Hinweise …', 1300);
  if (!ctx.isActive()) return;
  doc.querySelector('.gdoc-page')!.classList.add('analysed');

  const m = agentMsg(t, '<p>Das habe ich im Dokument gefunden:</p><div class="insights"></div>');
  const list = m.querySelector('.insights')!;
  for (const k of ['wunsch', 'bedarf', 'kontext', 'interesse'] as const) {
    if (!ctx.isActive()) return;
    const v = KEYS[k];
    list.appendChild(el(`<div class="insight"><span class="sw" style="background:${v.color}"></span><span><b>${v.label}:</b> ${esc(v.text)} <span class="cite">${v.cite}</span></span></div>`));
    if (k === 'bedarf') world.say('jonas', 'Brrr … ist das kalt.', 1800);
    await wait(550);
  }

  const fill = agentMsg(t, '<div class="card" style="font-size:16.5px;line-height:1.5">Santa weiß jetzt: Jonas’ Wunsch hatte <span class="blank"></span></div>');
  await wait(400);
  await typeText(fill.querySelector<HTMLElement>('.blank')!, 'nie den Nordpol erreicht – und hinter dem Fußball steckt eine warme Winterjacke.', 22);
  if (!ctx.isActive()) return;
  world.say('santa', 'Das hätte ich nie erfahren!', 2400);

  await dockButton(t, 'Vorschläge für Jonas ▶');
  ctx.finish('drive');
}
