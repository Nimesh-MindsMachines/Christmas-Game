import type { SceneCtx } from '../main';
import { Category, CATEGORY_ICON, CATEGORY_LABEL, EMAILS } from '../content.de';
import { ledger } from '../state';
import { agentMsg, ask, createThread, dockButton, thinking } from '../ui/chat';
import { el, esc, wait } from '../ui/dom';

const CATS: Category[] = ['wunsch', 'dringend', 'verwaltung', 'spam'];

export async function inbox(ctx: SceneCtx) {
  const t = createThread(ctx.root, {
    eyebrow: 'Level 1 · E-Mail-Management',
    title: 'Santas Postfach',
    intro: `${EMAILS.length} neue E-Mails seit heute Morgen. Wunschzettel, Rechnungen, Spam – alles durcheinander.`,
  });

  const box = el(`
    <div class="inbox">
      <div class="inbox-head"><span>📥 Posteingang</span><span class="mono">${EMAILS.length} ungelesen</span></div>
      ${EMAILS.map(e => `
        <div class="mail unread">
          <span class="av" aria-hidden="true">${esc(e.from[0])}</span>
          <div class="body">
            <div class="from"><span>${esc(e.from)}</span></div>
            <div class="subj">${esc(e.subject)}</div>
            <div class="prev">${esc(e.preview)}</div>
          </div>
        </div>`).join('')}
    </div>`);
  t.list.appendChild(box);

  await ask(t, 'sortiere mein Postfach und fasse alle Wunschzettel zusammen');
  if (!ctx.isActive()) return;
  box.remove();
  await thinking(t, `Lese ${EMAILS.length} E-Mails …`, 1300);
  if (!ctx.isActive()) return;

  const sure = EMAILS.filter(e => !e.uncertain);
  const unsure = EMAILS.filter(e => e.uncertain);
  const msg = agentMsg(t, `
    <p>Erledigt. Ich habe <b>${sure.length} E-Mails</b> einsortiert und jeden Wunschzettel in einer Zeile zusammengefasst.</p>
    <div class="buckets">
      ${CATS.map(c => `
        <div class="bucket" data-cat="${c}">
          <div class="bucket-head"><span aria-hidden="true">${CATEGORY_ICON[c]}</span>${CATEGORY_LABEL[c]}<span class="count">0</span></div>
          <div class="bucket-items"></div>
        </div>`).join('')}
    </div>`);

  for (const e of sure) {
    if (!ctx.isActive()) return;
    ledger.sorted[e.id] = e.category;
    const b = msg.querySelector(`.bucket[data-cat="${e.category}"]`)!;
    const label = e.summary ?? `${e.from}: ${e.subject}`;
    b.querySelector('.bucket-items')!.appendChild(el(`
      <div class="bucket-item"><span class="s">${esc(label)}</span></div>`));
    const count = b.querySelector('.count')!;
    count.textContent = String(Number(count.textContent) + 1);
    await wait(140);
  }

  await wait(400);
  if (!ctx.isActive()) return;
  const q = agentMsg(t, `
    <p>Bei <b>${unsure.length} E-Mails</b> bin ich mir nicht sicher. Mein Vorschlag ist markiert – du entscheidest.</p>
    ${unsure.map(e => `
      <div class="unsure" data-id="${e.id}">
        <div class="from">${esc(e.from)} · <span class="muted">${esc(e.subject)}</span></div>
        <div class="prev">${esc(e.preview)}</div>
        <div class="why">🤔 ${esc(e.uncertain!.reason)} <span class="mono">(${e.uncertain!.confidence} % sicher)</span></div>
        <div class="cat-choice" role="group" aria-label="Kategorie wählen">
          ${CATS.map(c => `<button type="button" data-cat="${c}" aria-pressed="false" class="${c === e.uncertain!.guess ? 'suggested' : ''}">${CATEGORY_ICON[c]} ${CATEGORY_LABEL[c]}</button>`).join('')}
        </div>
      </div>`).join('')}`);

  const choices: Record<string, Category> = {};
  const done = dockButton(t, 'Einsortieren');
  const btn = t.dock.querySelector('button')!;
  btn.disabled = true;
  btn.textContent = `Noch ${unsure.length} offen`;

  q.querySelectorAll<HTMLElement>('.unsure').forEach(card => {
    card.querySelectorAll<HTMLButtonElement>('.cat-choice button').forEach(b => {
      b.addEventListener('click', () => {
        card.querySelectorAll('.cat-choice button').forEach(x => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        choices[card.dataset.id!] = b.dataset.cat as Category;
        const open = unsure.length - Object.keys(choices).length;
        btn.disabled = open > 0;
        btn.textContent = open > 0 ? `Noch ${open} offen` : 'Einsortieren →';
      });
    });
  });

  await done;
  if (!ctx.isActive()) return;
  for (const e of unsure) {
    const c = choices[e.id];
    ledger.sorted[e.id] = c;
    const b = msg.querySelector(`.bucket[data-cat="${c}"]`)!;
    b.querySelector('.bucket-items')!.appendChild(el(`
      <div class="bucket-item"><span class="s">${esc(c === 'wunsch' && e.summary ? e.summary : `${e.from}: ${e.subject}`)}</span><span class="chip">von dir</span></div>`));
    const count = b.querySelector('.count')!;
    count.textContent = String(Number(count.textContent) + 1);
  }
  q.remove();
  const wishes = Object.values(ledger.sorted).filter(c => c === 'wunsch').length;
  agentMsg(t, `<p>Danke! Postfach ist leer. <b>${wishes} Wunschzettel</b> sind bereit für den Lagerabgleich.</p>`);
  await wait(900);
  ctx.finish('inbox');
}
