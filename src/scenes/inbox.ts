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
  void world.shot('village');
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
  world.ring(world.phonePt(), '#ffd34d', 22);
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

  const addToBucket = (cat: Category, label: string, byUser = false) => {
    const b = msg.querySelector(`.bucket[data-cat="${cat}"]`)!;
    b.querySelector('.bucket-items')!.appendChild(el(`<div class="bucket-item"><span class="s">${esc(label)}</span>${byUser ? '<span class="chip">von dir</span>' : ''}</div>`));
    const count = b.querySelector<HTMLElement>('.count')!;
    count.textContent = String(Number(count.textContent) + 1);
    count.classList.remove('bump');
    void count.offsetWidth;
    count.classList.add('bump');
  };

  for (const e of sure) {
    if (!ctx.isActive()) return;
    ledger.sorted[e.id] = e.category;
    void world.sortOne(e.category).then(() => ctx.award(world.sackPt(e.category)));
    addToBucket(e.category, e.summary ?? `${e.from}: ${e.subject}`);
    await wait(180);
  }
  await wait(600);
  if (!ctx.isActive()) return;

  // Die unsicheren Briefe schweben über Santa
  world.pile = 0;
  world.unsure = unsure.length;
  world.emote('santa', '?', 2200);
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
    void world.resolveUnsure(unsure.length - 1 - i, c).then(() => ctx.award(world.sackPt(c)));
    addToBucket(c, c === 'wunsch' && e.summary ? e.summary : `${e.from}: ${e.subject}`, true);
    await wait(280);
  }
  q.remove();
  const wishes = Object.values(ledger.sorted).filter(c => c === 'wunsch').length;
  agentMsg(t, `<p>Postfach leer! <b>${wishes} Wunschzettel</b> sind bereit für den Lagerabgleich.</p>`);
  await wait(800);
  if (!ctx.isActive()) return;

  // Kinder jubeln und gehen nach Hause, der Wunschsack kommt auf den Schlitten
  MAIN_KIDS.forEach(id => { const k = world.kids.get(id); if (k) k.pose = 'cheer'; });
  world.say('lena', 'Juhu! Angekommen!', 1800);
  world.emote('emma', '♥', 1600);
  await wait(1400);
  if (!ctx.isActive()) return;
  MAIN_KIDS.forEach(id => { const k = world.kids.get(id); if (k) { k.pose = 'stand'; void world.goHome(id); } });
  world.litter = [];
  await world.sackToSleigh();
  world.hoho();
  await wait(600);
  ctx.finish('inbox');
}
