import type { SceneCtx } from '../main';
import { RESTOCK_STEP, STOCK } from '../content.de';
import { ledger } from '../state';
import { agentMsg, ask, createThread, thinking } from '../ui/chat';
import { esc, fmt, wait } from '../ui/dom';
import { AGENT_ICON } from '../ui/brand';

export async function inventory(ctx: SceneCtx) {
  const t = createThread(ctx.root, {
    eyebrow: 'Level 2 · Daten & Lager',
    title: 'Reicht der Vorrat?',
    intro: 'Die Wünsche sind sortiert. Jetzt muss die Werkstatt liefern – aber ist genug im Lager?',
  });

  await ask(t, 'gleiche alle Wünsche mit dem Lagerbestand ab', '@Lager-Agent');
  if (!ctx.isActive()) return;
  await thinking(t, 'Frage die Werkstatt-Datenbank ab …', 1200);
  if (!ctx.isActive()) return;

  const short = STOCK.filter(s => s.requested > s.inStock);
  agentMsg(t, `
    <p>Ich habe alle Wunschzettel weltweit mit der <span class="cite">Werkstatt-Datenbank</span> abgeglichen. Bei <b>${short.length} Artikeln</b> wird es knapp:</p>
    <div class="card" style="padding:8px 12px">
      <table class="stock-table">
        <thead><tr><th>Artikel</th><th class="num" style="text-align:right">Wünsche</th><th style="text-align:right">Lager</th><th style="text-align:right">Status</th></tr></thead>
        <tbody>
          ${STOCK.map(s => {
            const gap = s.requested - s.inStock;
            return `<tr>
              <td><span class="item"><span aria-hidden="true">${s.icon}</span>${esc(s.name)}</span></td>
              <td class="num">${fmt(s.requested)}</td>
              <td class="num">${fmt(s.inStock)}</td>
              <td class="num">${gap > 0 ? `<span class="status-low">−${fmt(gap)}</span>` : '<span class="status-ok">✓</span>'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <p>Ich habe eine Nachbestellung vorbereitet. Sie liegt unter <b>„Braucht dich“</b> zur Freigabe.</p>`);

  await wait(600);
  if (!ctx.isActive()) return;

  const order: Record<string, number> = {};
  short.forEach(s => (order[s.id] = Math.ceil((s.requested - s.inStock) / RESTOCK_STEP) * RESTOCK_STEP));

  const approval = agentMsg(t, `
    <div class="approval">
      <div class="approval-head">${AGENT_ICON} Braucht dich <span class="badge">1</span></div>
      <div class="approval-body">
        <p class="muted" style="font-size:13px;padding:8px 0 4px">Nachbestellung bei der Elfen-Manufaktur · passe die Mengen an, wenn du willst.</p>
        ${short.map(s => `
          <div class="order-row" data-id="${s.id}">
            <span class="item"><span aria-hidden="true">${s.icon}</span> ${esc(s.name)}<small>Fehlen: ${fmt(s.requested - s.inStock)}</small></span>
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
    const out = row.querySelector('output')!;
    row.querySelectorAll<HTMLButtonElement>('.stepper button').forEach(b => {
      b.addEventListener('click', () => {
        order[id] = Math.max(0, order[id] + Number(b.dataset.d) * RESTOCK_STEP);
        out.textContent = String(order[id]);
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
    ledger.order = { ...order };
    ledger.restockApproved = true;
    const total = Object.values(order).reduce((a, b) => a + b, 0);
    const m = agentMsg(t, `
      <p>Freigegeben ✅ <b>${fmt(total)} Geschenke</b> sind bestellt und werden eingeräumt.</p>
      <div class="shelves" aria-hidden="true"></div>`);
    const shelf = m.querySelector('.shelves')!;
    const icons = STOCK.map(s => s.icon);
    for (let i = 0; i < 18; i++) {
      if (!ctx.isActive()) return;
      const s = document.createElement('span');
      s.textContent = icons[i % icons.length];
      shelf.appendChild(s);
      await wait(70);
    }
  } else {
    ledger.restockApproved = false;
    agentMsg(t, '<p>In Ordnung, ich bestelle nichts. Deine Entscheidung. Die Engpässe merke ich mir für den Prüfbericht.</p>');
  }
  await wait(900);
  ctx.finish('inventory');
}
