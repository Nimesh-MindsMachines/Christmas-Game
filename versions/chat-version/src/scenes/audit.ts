import type { SceneCtx } from '../main';
import { computeAudit } from '../state';
import { agentMsg, ask, createThread, dockButton, thinking } from '../ui/chat';
import { countUp, el, esc, fmt, wait } from '../ui/dom';

export async function audit(ctx: SceneCtx) {
  const t = createThread(ctx.root, {
    eyebrow: 'Level 6 · Prüfbericht & Punkte',
    title: 'Die Weihnachts-Prüfung',
    intro: 'Jede deiner Entscheidungen steht im Geschenke-Ledger. OneMachine liest es und erstellt den Prüfbericht.',
  });

  const a = computeAudit();

  const ledgerEl = el(`
    <div class="card" style="padding:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span aria-hidden="true">📒</span><b style="font-size:14px">Geschenke-Ledger 2026.xlsx</b><span class="chip" style="margin-left:auto">Drive</span></div>
      <div class="ledger"><div class="ledger-row"><span>Kind · Geschenk</span><span>Status</span></div></div>
    </div>`);
  t.list.appendChild(ledgerEl);
  const rows = ledgerEl.querySelector('.ledger')!;
  for (const c of a.children) {
    if (!ctx.isActive()) return;
    rows.appendChild(el(`<div class="ledger-row"><span>${esc(c.name)} · ${esc(c.gift)}</span><span class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✓ gepackt' : '✗ offen'}</span></div>`));
    await wait(90);
  }

  await ask(t, 'erstelle den Prüfbericht für Weihnachten', '@Prüf-Agent');
  if (!ctx.isActive()) return;
  await thinking(t, 'Prüfe Ledger, Bestellungen und Postfach …', 1400);
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
    <div class="card" style="padding:8px 14px">
      <div class="score-lines">
        ${a.lines.map(l => `
          <div class="score-line">
            <span>${esc(l.label)}</span><span class="pts">${l.points} / ${l.max}</span>
            <span class="src"><span class="cite">${esc(l.source)}</span></span>
          </div>`).join('')}
      </div>
    </div>`);

  await wait(700);
  if (!ctx.isActive()) return;
  const hero = agentMsg(t, `
    <div class="score-hero">
      <div class="eyebrow" style="color:#ffb98a">Deine Punktzahl</div>
      <div class="total">0</div>
      <div class="of">von ${fmt(a.max)} Punkten</div>
      <div class="stars" aria-label="${a.stars} von 5 Sternen">${[1, 2, 3, 4, 5].map(i => `<span class="${i <= a.stars ? '' : 'off'}" style="animation-delay:${0.9 + i * 0.12}s">⭐</span>`).join('')}</div>
      <div class="rank">${esc(a.title)}</div>
    </div>
    <p>Damit hast du <b>${a.gifts} Geschenke</b> für den Spendenkorb verdient.</p>`);
  await countUp(hero.querySelector<HTMLElement>('.total')!, a.total, 1100);

  await dockButton(t, 'Zum Spendenkorb →', 'btn-accent');
  ctx.finish('audit');
}
