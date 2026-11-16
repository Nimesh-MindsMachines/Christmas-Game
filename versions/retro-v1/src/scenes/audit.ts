import type { SceneCtx } from '../main';
import { computeAudit } from '../state';
import { agentMsg, ask, createThread, dockButton, thinking } from '../ui/chat';
import { el, esc, fmt, wait } from '../ui/dom';
import { sfx } from '../ui/sfx';

export async function audit(ctx: SceneCtx) {
  const { world } = ctx;
  const t = createThread(ctx.root, {
    eyebrow: 'Prüfbericht & Punkte',
    title: 'Die große Prüfung',
    intro: 'Jede deiner Entscheidungen steht im Geschenke-Ledger. OneMachine liest es und erstellt den Prüfbericht.',
  });
  world.say('santa', 'Haben wir an alle gedacht?', 2400);

  const a = computeAudit();

  const ledgerEl = el(`
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span aria-hidden="true">📒</span><b style="font-size:14px">Geschenke-Ledger 2026.xlsx</b><span class="chip" style="margin-left:auto">Drive</span></div>
      <div class="ledger"><div class="ledger-row"><span>Kind · Geschenk</span><span>Status</span></div></div>
    </div>`);
  t.list.appendChild(ledgerEl);
  const rows = ledgerEl.querySelector('.ledger')!;
  for (const c of a.children) {
    if (!ctx.isActive()) return;
    rows.appendChild(el(`<div class="ledger-row"><span>${esc(c.name)} · ${esc(c.gift)}</span><span class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✓ gepackt' : '✗ offen'}</span></div>`));
    await wait(80);
  }

  await ask(t, 'erstelle den Prüfbericht für Weihnachten', '@Prüf-Agent');
  if (!ctx.isActive()) return;
  world.tag('audit-scan', 'santa', 'PRÜFE …', 'tag-om');
  await thinking(t, 'Prüfe Ledger, Bestellungen und Postfach …', 1400);
  world.untag('audit-scan');
  if (!ctx.isActive()) return;

  const open = a.children.filter(c => !c.ok);
  const flags: string[] = [];
  for (const c of open) flags.push(`<div class="flag">⚠️ <span><b>${esc(c.name)}</b> hat noch kein Geschenk – ${esc(c.note ?? '')}.</span></div>`);
  for (const s of a.shortages) flags.push(`<div class="flag">📦 <span>${esc(s.name)}: <b>${fmt(s.missing)}</b> fehlen im Lager.</span></div>`);
  for (const o of a.overstock) flags.push(`<div class="flag">📈 <span>${esc(o.name)}: <b>${fmt(o.extra)}</b> mehr bestellt als nötig.</span></div>`);
  if (!flags.length) flags.push('<div class="flag good">✅ <span>Keine Auffälligkeiten. Jedes Kind bekommt ein Geschenk.</span></div>');

  agentMsg(t, `
    <p><b>Prüfbericht Weihnachten 2026</b> · ${a.children.filter(c => c.ok).length} von ${a.children.length} Wünschen erfüllt.</p>
    ${flags.join('')}
    <div class="card" style="padding:6px 12px">
      ${a.lines.map(l => `
        <div class="score-line">
          <span>${esc(l.label)}</span><span class="pts">${l.points}/${l.max}</span>
          <span class="src"><span class="cite">${esc(l.source)}</span></span>
        </div>`).join('')}
    </div>`);

  // Arcade-Punktetafel auf der Bühne
  const board = el(`
    <div class="scoreboard" role="status">
      <h2>PRÜFBERICHT</h2>
      ${a.lines.map(l => `<div class="sb-line"><span>${esc(l.label.toUpperCase())}</span><b>${l.points}</b></div>`).join('')}
      <div class="sb-total"><span>PUNKTE</span><b class="sb-num">0</b></div>
      <div class="sb-stars">${[1, 2, 3, 4, 5].map(i => `<span class="${i <= a.stars ? '' : 'off'}">★</span>`).join('')}</div>
      <div class="sb-rank">${esc(a.title.toUpperCase())}</div>
    </div>`);
  const stars = board.querySelector<HTMLElement>('.sb-stars')!;
  const rank = board.querySelector<HTMLElement>('.sb-rank')!;
  stars.style.visibility = 'hidden';
  rank.style.visibility = 'hidden';
  world.ui.appendChild(board);
  const num = board.querySelector<HTMLElement>('.sb-num')!;
  let running = 0;
  for (const [i, line] of [...board.querySelectorAll<HTMLElement>('.sb-line')].entries()) {
    if (!ctx.isActive()) { board.remove(); return; }
    line.classList.add('on');
    running += a.lines[i].points;
    num.textContent = String(running);
    a.lines[i].points > 0 ? sfx.coin() : sfx.back();
    await wait(420);
  }
  if (!ctx.isActive()) { board.remove(); return; }
  stars.style.visibility = 'visible';
  rank.style.visibility = 'visible';
  sfx.fanfare();
  world.sparkle({ x: 160, y: 100 }, ['#ffd34d', '#e0651a', '#ffffff'], 30);

  agentMsg(t, `<p>Damit hast du <b>${a.gifts} Geschenke</b> für den Spendenkorb verdient. 🎁</p>`);
  await dockButton(t, 'Zum Spendenkorb ▶', 'btn-accent');
  board.remove();
  ctx.finish('audit');
}
