import type { SceneCtx } from '../main';
import { JONAS_DOC } from '../content.de';
import { ledger } from '../state';
import { agentMsg, ask, createThread, dockButton, thinking } from '../ui/chat';
import { el, esc, typeText, wait } from '../ui/dom';

const KEYS = {
  wunsch: { color: '#fde2e4', label: 'Wunsch', text: 'Er wünscht sich einen Fußball.', cite: 'Absatz 2' },
  bedarf: { color: '#ffe9c7', label: 'Bedarf', text: 'Seine Winterjacke ist zu klein – er sagt es nur nebenbei.', cite: 'Absatz 4' },
  kontext: { color: '#e3e8ff', label: 'Kontext', text: 'Die Familie ist umgezogen und muss dieses Jahr sparen.', cite: 'Absatz 3' },
  interesse: { color: '#dff3e7', label: 'Interesse', text: 'Liest abends gern Abenteuergeschichten.', cite: 'Absatz 5' },
} as const;

export async function drive(ctx: SceneCtx) {
  const t = createThread(ctx.root, {
    eyebrow: 'Level 4 · Dokumenten-Insights',
    title: 'Der Wunsch, der nie ankam',
    intro: 'Alle Briefe sind da. Alle Geschenke auf Lager. Oder etwa doch nicht?',
  });

  await wait(700);
  if (!ctx.isActive()) return;
  const nudge = agentMsg(t, `
    <div class="nudge">
      <span class="bell" aria-hidden="true">🔔</span>
      <div>
        <b>Mir ist etwas aufgefallen.</b>
        <p style="font-size:14px;margin-top:4px;color:var(--ink-2)">In <span class="cite">Google Drive</span> liegt ein Dokument „${esc(JONAS_DOC.title)}“ von <b>${esc(JONAS_DOC.owner)}</b>. Es wurde nie an dich geschickt.</p>
      </div>
    </div>`);
  void nudge;

  await dockButton(t, 'Dokument öffnen');
  if (!ctx.isActive()) return;
  ledger.driveFound = true;

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

  const m = agentMsg(t, `
    <p>Hier ist, was ich im Dokument gefunden habe:</p>
    <div class="insights"></div>`);
  const list = m.querySelector('.insights')!;
  for (const k of ['wunsch', 'bedarf', 'kontext', 'interesse'] as const) {
    if (!ctx.isActive()) return;
    const v = KEYS[k];
    list.appendChild(el(`
      <div class="insight"><span class="sw" style="background:${v.color}"></span>
        <span><b>${v.label}:</b> ${esc(v.text)} <span class="cite">${v.cite}</span></span></div>`));
    await wait(450);
  }

  const fill = agentMsg(t, `
    <div class="card" style="font-size:16px;line-height:1.5">
      Santa weiß jetzt: Jonas’ Wunsch hatte <span class="blank"></span>
    </div>`);
  await wait(500);
  const blank = fill.querySelector<HTMLElement>('.blank')!;
  blank.classList.add('filled');
  await typeText(blank, 'nie den Nordpol erreicht – und hinter dem Fußball steckt eine warme Winterjacke.', 22);

  await dockButton(t, 'Vorschläge für Jonas ansehen →');
  ctx.finish('drive');
}
