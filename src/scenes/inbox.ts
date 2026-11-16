import type { SceneCtx } from '../main';
import { Category, CATEGORY_ICON, CATEGORY_LABEL, EMAILS } from '../content.de';
import { ledger } from '../state';
import { agentMsg, ask, createThread, dockButton, thinking } from '../ui/chat';
import { el, esc, wait } from '../ui/dom';
import { sfx } from '../ui/sfx';
import { MAIN_KIDS } from '../world/world';

const CATS: Category[] = ['wunsch', 'dringend', 'verwaltung', 'spam'];

export async function inbox(ctx: SceneCtx) {
  const { world } = ctx;
  world.santa.sweat = true;
  world.say('santa', 'Wo fange ich nur an?', 2400);

  const t = createThread(ctx.root, {
    eyebrow: 'E-Mail-Management',
    title: 'Santas Postfach',
    intro: `${EMAILS.length} neue E-Mails. Wunschzettel, Rechnungen, Spam – alles durcheinander.`,
  });

  const box = el(`
    <div class="inbox">
      <div class="inbox-head"><span>📥 Posteingang</span><span class="mono">${EMAILS.length} NEU</span></div>
      ${EMAILS.map(e => `
        <div class="mail">
          <span class="av" aria-hidden="true">${esc(e.from[0])}</span>
          <div class="body">
            <div class="from">${esc(e.from)}</div>
            <div class="subj">${esc(e.subject)}</div>
            <div class="prev">${esc(e.preview)}</div>
          </div>
        </div>`).join('')}
    </div>`);
  t.list.appendChild(box);

  await ask(t, 'sortiere mein Postfach und fasse alle Wunschzettel zusammen');
  if (!ctx.isActive()) return;
  box.remove();
  world.santa.sweat = false;
  world.say('santa', 'OneMachine, übernimm!', 1600, 'say-om');
  await thinking(t, `Lese ${EMAILS.length} E-Mails …`, 1200);
  if (!ctx.isActive()) return;

  const sure = EMAILS.filter(e => !e.uncertain);
  const unsure = EMAILS.filter(e => e.uncertain);
  world.sacks.visible = true;
  world.updateSackTags();
  const msg = agentMsg(t, `
    <p>Erledigt! <b>${sure.length} E-Mails</b> sind einsortiert, jeder Wunschzettel ist in einer Zeile zusammengefasst.</p>
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
    void world.sortOne(e.category);
    const b = msg.querySelector(`.bucket[data-cat="${e.category}"]`)!;
    b.querySelector('.bucket-items')!.appendChild(el(`<div class="bucket-item"><span class="s">${esc(e.summary ?? `${e.from}: ${e.subject}`)}</span></div>`));
    const count = b.querySelector('.count')!;
    count.textContent = String(Number(count.textContent) + 1);
    await wait(170);
  }
  await wait(500);
  if (!ctx.isActive()) return;

  // Die unsicheren Briefe schweben über Santa
  world.pile = 0;
  world.unsure = unsure.length;
  world.say('santa', 'Und diese drei?', 2200);
  const q = agentMsg(t, `
    <p>Bei <b>${unsure.length} E-Mails</b> bin ich mir nicht sicher. Mein Tipp ist markiert – <b>du entscheidest</b>.</p>
    ${unsure.map(e => `
      <div class="unsure" data-id="${e.id}">
        <div class="from">${esc(e.from)} · <span class="muted">${esc(e.subject)}</span></div>
        <div class="prev">${esc(e.preview)}</div>
        <div class="why">🤔 ${esc(e.uncertain!.reason)} (${e.uncertain!.confidence} % sicher)</div>
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
        sfx.select();
        card.querySelectorAll('.cat-choice button').forEach(x => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        choices[card.dataset.id!] = b.dataset.cat as Category;
        const open = unsure.length - Object.keys(choices).length;
        btn.disabled = open > 0;
        btn.textContent = open > 0 ? `Noch ${open} offen` : 'Einsortieren ▶';
      });
    });
  });

  await done;
  if (!ctx.isActive()) return;
  for (const [i, e] of unsure.entries()) {
    const c = choices[e.id];
    ledger.sorted[e.id] = c;
    void world.resolveUnsure(unsure.length - 1 - i, c);
    const b = msg.querySelector(`.bucket[data-cat="${c}"]`)!;
    b.querySelector('.bucket-items')!.appendChild(el(`<div class="bucket-item"><span class="s">${esc(c === 'wunsch' && e.summary ? e.summary : `${e.from}: ${e.subject}`)}</span><span class="chip">von dir</span></div>`));
    const count = b.querySelector('.count')!;
    count.textContent = String(Number(count.textContent) + 1);
    await wait(250);
  }
  q.remove();
  const wishes = Object.values(ledger.sorted).filter(c => c === 'wunsch').length;
  agentMsg(t, `<p>Postfach leer! <b>${wishes} Wunschzettel</b> sind bereit für den Lagerabgleich.</p>`);
  await wait(700);
  if (!ctx.isActive()) return;

  // Kinder jubeln und gehen nach Hause, der Wunschsack kommt auf den Schlitten
  MAIN_KIDS.forEach(id => { const k = world.kids.get(id); if (k) k.pose = 'cheer'; });
  world.say('lena', 'Juhu! Angekommen!', 1800);
  await wait(1200);
  if (!ctx.isActive()) return;
  MAIN_KIDS.forEach(id => { const k = world.kids.get(id); if (k) { k.pose = 'stand'; void world.goHome(id); } });
  await world.sackToSleigh();
  await wait(500);
  ctx.finish('inbox');
}
