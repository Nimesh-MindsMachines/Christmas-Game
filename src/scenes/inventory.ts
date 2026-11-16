import type { SceneCtx } from '../main';
import { RESTOCK_STEP, STOCK } from '../content.de';
import { ledger } from '../state';
import { agentMsg, ask, createThread, OM_AVATAR, thinking } from '../ui/chat';
import { esc, fmt, wait } from '../ui/dom';
import { sfx } from '../ui/sfx';
import { dataUrl, giftBox, icon } from '../world/pixels';

export async function inventory(ctx: SceneCtx) {
  const { world } = ctx;
  void world.shot('workshop');
  const t = createThread(ctx.root, {
    eyebrow: 'Daten & Lager',
    title: 'Reicht der Vorrat?',
    intro: 'Die Wünsche sind sortiert. Jetzt muss die Werkstatt liefern – aber ist genug im Lager?',
  });
  world.say('elf', 'Chef, schaffen wir das?', 2200);

  await ask(t, 'gleiche alle Wünsche mit dem Lagerbestand ab', '@Lager-Agent');
  if (!ctx.isActive()) return;
  world.shelfOn = true;
  world.shelfScan = true;
  world.ring(world.phonePt(), '#ffd34d', 22);
  world.tag('scan-shelf', { x: 278, y: 122 }, 'SCANNE …', 'tag-om');
  await thinking(t, 'Frage die Werkstatt-Datenbank ab …', 1500);
  world.shelfScan = false;
  world.untag('scan-shelf');
  if (!ctx.isActive()) return;

  const short = STOCK.filter(s => s.requested > s.inStock);
  world.stockAlert = true;
  sfx.bonk();
  world.emote('elf', '!');
  world.say('elf', `Bei ${short.length} Sachen wird’s knapp!`, 2600);
  agentMsg(t, `
    <p>Abgleich mit der <span class="cite">Werkstatt-Datenbank</span>: Bei <b>${short.length} Artikeln</b> fehlt Ware.</p>
    <div class="card" style="padding:6px 10px">
      <table class="stock-table">
        <thead><tr><th>Artikel</th><th class="num">Wünsche</th><th class="num">Lager</th><th class="num">±</th></tr></thead>
        <tbody>
          ${STOCK.map(s => {
            const gap = s.requested - s.inStock;
            return `<tr>
              <td><span class="item"><img src="${dataUrl(icon(s.id), 2)}" alt="" />${esc(s.name)}</span></td>
              <td class="num">${fmt(s.requested)}</td>
              <td class="num">${fmt(s.inStock)}</td>
              <td class="num">${gap > 0 ? `<span class="status-low">−${fmt(gap)}</span>` : '<span class="status-ok">✓</span>'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <p>Die Nachbestellung liegt unter <b>„Braucht dich“</b> zur Freigabe bereit.</p>`);

  await wait(700);
  if (!ctx.isActive()) return;

  const order: Record<string, number> = {};
  short.forEach(s => (order[s.id] = Math.ceil((s.requested - s.inStock) / RESTOCK_STEP) * RESTOCK_STEP));

  const approval = agentMsg(t, `
    <div class="approval">
      <div class="approval-head">${OM_AVATAR} BRAUCHT DICH <span class="badge">1</span></div>
      <div class="approval-body">
        <p class="muted" style="font-size:14.5px;padding:8px 0 4px">Nachbestellung bei der Elfen-Manufaktur – Mengen kannst du anpassen.</p>
        ${short.map(s => `
          <div class="order-row" data-id="${s.id}">
            <span class="item"><img src="${dataUrl(icon(s.id), 2)}" alt="" /><span>${esc(s.name)}<small>Fehlen: ${fmt(s.requested - s.inStock)}</small></span></span>
            <div class="stepper">
              <button type="button" data-d="-1" aria-label="${esc(s.name)} weniger">−</button>
              <output>${order[s.id]}</output>
              <button type="button" data-d="1" aria-label="${esc(s.name)} mehr">+</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="approval-foot">
        <button class="btn btn-ghost" type="button" data-act="reject">Ablehnen</button>
        <button class="btn btn-accent" type="button" data-act="approve">Freigeben</button>
      </div>
    </div>`);

  approval.querySelectorAll<HTMLElement>('.order-row').forEach(row => {
    const id = row.dataset.id!;
    const suggested = order[id];
    const out = row.querySelector<HTMLElement>('output')!;
    row.querySelectorAll<HTMLButtonElement>('.stepper button').forEach(b => {
      b.addEventListener('click', () => {
        sfx.select();
        order[id] = Math.max(0, order[id] + Number(b.dataset.d) * RESTOCK_STEP);
        out.textContent = String(order[id]);
        out.classList.remove('bump');
        void out.offsetWidth;
        out.classList.add('bump');
        row.classList.toggle('changed', order[id] !== suggested);
      });
    });
  });

  const decision = await new Promise<'approve' | 'reject'>(res => {
    approval.querySelectorAll<HTMLButtonElement>('[data-act]').forEach(b =>
      b.addEventListener('click', () => res(b.dataset.act as 'approve' | 'reject'), { once: true }));
  });
  if (!ctx.isActive()) return;
  approval.querySelectorAll('button').forEach(b => (b.disabled = true));

  if (decision === 'approve') {
    sfx.select();
    ledger.order = { ...order };
    ledger.restockApproved = true;
    const total = Object.values(order).reduce((a, b) => a + b, 0);
    agentMsg(t, `<p>Freigegeben ✅ <b>${fmt(total)} Geschenke</b> sind bestellt. Die Elfen liefern!</p>`);
    world.say('elf', 'Lieferung kommt!', 1800);
    await world.deliver(order);
    if (!ctx.isActive()) return;
    ctx.award('shelf');
    world.elf.jump = 500;
    world.say('elf', 'Lager voll!', 2000);
    world.emote('elf', '♥', 1600);
    for (let i = 0; i < 3; i++) { if (!ctx.isActive()) return; await world.giftToSleigh(giftBox(i + 1)); }
    world.hoho();
  } else {
    sfx.back();
    ledger.restockApproved = false;
    world.stockAlert = false;
    world.say('elf', 'Okay, Chef. Deine Entscheidung.', 2400);
    agentMsg(t, '<p>In Ordnung, ich bestelle nichts. Die Engpässe merke ich mir für den Prüfbericht.</p>');
    await wait(1400);
  }
  await wait(700);
  ctx.finish('inventory');
}
