import type { SceneCtx } from '../main';
import { JONAS_RECS } from '../content.de';
import { ledger } from '../state';
import { agentMsg, createThread, dockButton } from '../ui/chat';
import { esc, wait } from '../ui/dom';
import { AGENT_ICON } from '../ui/brand';

export async function decision(ctx: SceneCtx) {
  const t = createThread(ctx.root, {
    eyebrow: 'Level 5 · Du entscheidest',
    title: 'Was bekommt Jonas?',
    intro: 'OneMachine schlägt vor – mit Begründung und Quelle. Annehmen oder ablehnen liegt ganz bei dir.',
  });

  const found = ledger.driveFound;
  await wait(400);
  if (!ctx.isActive()) return;

  const card = agentMsg(t, `
    ${found ? '' : '<p class="muted" style="font-size:13.5px">Hinweis: Das Drive-Dokument wurde übersprungen – die Vorschläge stützen sich auf weniger Informationen.</p>'}
    <div class="approval">
      <div class="approval-head">${AGENT_ICON} Braucht dich <span class="badge">${JONAS_RECS.length}</span></div>
      <div class="approval-body">
        <p class="muted" style="font-size:13px;padding:10px 0 2px">Jonas, 9 · würde sich freuen über:</p>
        ${JONAS_RECS.map(r => `
          <div class="rec" data-id="${r.id}">
            <span class="big" aria-hidden="true">${r.icon}</span>
            <div class="info">
              <b>${esc(r.name)}</b>
              <p>${esc(r.reason)}</p>
              <div class="meta">
                <span class="cite">${esc(r.source)}</span>
                <span class="conf-bar" aria-hidden="true"><i style="width:${r.confidence}%"></i></span>
                <span class="conf">${r.confidence} % passend</span>
              </div>
              <div class="rec-actions" role="group" aria-label="${esc(r.name)}">
                <button type="button" class="rej" aria-pressed="false">✕ Ablehnen</button>
                <button type="button" class="acc" aria-pressed="false">✓ Annehmen</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`);

  const btnDone = dockButton(t, 'Entscheidung bestätigen');
  const doneBtn = t.dock.querySelector('button')!;
  const refresh = () => {
    const open = JONAS_RECS.length - Object.keys(ledger.jonas).length;
    doneBtn.disabled = open > 0;
    doneBtn.textContent = open > 0 ? `Noch ${open} offen` : 'Entscheidung bestätigen →';
  };
  refresh();

  card.querySelectorAll<HTMLElement>('.rec').forEach(rec => {
    const id = rec.dataset.id!;
    const acc = rec.querySelector<HTMLButtonElement>('.acc')!;
    const rej = rec.querySelector<HTMLButtonElement>('.rej')!;
    const set = (v: 'accept' | 'reject') => {
      ledger.jonas[id] = v;
      acc.setAttribute('aria-pressed', String(v === 'accept'));
      rej.setAttribute('aria-pressed', String(v === 'reject'));
      rec.classList.toggle('decided-reject', v === 'reject');
      refresh();
    };
    acc.addEventListener('click', () => set('accept'));
    rej.addEventListener('click', () => set('reject'));
  });

  await btnDone;
  if (!ctx.isActive()) return;
  card.querySelectorAll('button').forEach(b => (b.disabled = true));
  const accepted = JONAS_RECS.filter(r => ledger.jonas[r.id] === 'accept');
  agentMsg(t, accepted.length
    ? `<p>Erledigt. ${accepted.map(r => r.icon).join(' ')} ${accepted.length === 1 ? 'geht' : 'gehen'} an Jonas – genau wie du entschieden hast.</p>`
    : '<p>Verstanden, du hast alle Vorschläge abgelehnt. Ich ändere nichts ohne deine Freigabe.</p>');
  await wait(900);
  ctx.finish('decision');
}
