import type { SceneCtx } from '../main';
import { CTA, DONATION } from '../content.de';
import { computeAudit, ledger } from '../state';
import { AGENT_ICON } from '../ui/brand';
import { esc, wait } from '../ui/dom';
import { enableDrag } from '../ui/drag';
import { toast } from '../ui/learnCard';

export function donate(ctx: SceneCtx) {
  const { gifts, total, title } = computeAudit();
  ledger.donated = 0;

  ctx.root.innerHTML = `
    <section class="donate">
      <div>
        <span class="eyebrow">Finale · Santas Spendenkorb</span>
        <h1 style="font-size:26px;font-weight:800;margin-top:4px">Geschenke für Düsseldorf</h1>
        <p class="lede">Als <b>${esc(title)}</b> hast du ${total} Punkte und <b>${gifts} Geschenke</b> verdient. Zieh sie in den Spendenkorb – oder tippe sie an.</p>
      </div>

      <div class="gift-shelf" aria-label="Deine Geschenke">
        ${Array.from({ length: gifts }, (_, i) => `<button class="gift" type="button" aria-label="Geschenk ${i + 1} spenden">${DONATION.giftIcons[i % DONATION.giftIcons.length]}</button>`).join('')}
      </div>

      <div class="basket" aria-live="polite">
        <div class="fill" style="height:0%"></div>
        <div class="bk" aria-hidden="true">🧺</div>
        <h2>${esc(DONATION.ngo)}</h2>
        <p>${esc(DONATION.city)}</p>
        <div class="counter">0 / ${gifts} im Korb</div>
      </div>

      <div class="donate-actions" style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-ghost btn-block" type="button" id="all">Alle in den Korb legen</button>
        <button class="btn btn-accent btn-block" type="button" id="finish" disabled>Spende abschließen</button>
      </div>
    </section>`;

  const basket = ctx.root.querySelector<HTMLElement>('.basket')!;
  const fill = basket.querySelector<HTMLElement>('.fill')!;
  const counter = basket.querySelector<HTMLElement>('.counter')!;
  const bk = basket.querySelector<HTMLElement>('.bk')!;
  const finish = ctx.root.querySelector<HTMLButtonElement>('#finish')!;
  const allBtn = ctx.root.querySelector<HTMLButtonElement>('#all')!;
  const items = [...ctx.root.querySelectorAll<HTMLElement>('.gift')];

  const add = (item: HTMLElement) => {
    if (item.dataset.done) return;
    item.dataset.done = '1';
    item.setAttribute('aria-disabled', 'true');
    ledger.donated++;
    counter.textContent = `${ledger.donated} / ${gifts} im Korb`;
    fill.style.height = `${(ledger.donated / gifts) * 100}%`;
    bk.classList.remove('bump'); void bk.offsetWidth; bk.classList.add('bump');
    finish.disabled = false;
    if (ledger.donated === gifts) {
      allBtn.hidden = true;
      toast(ctx.overlay, 'Der Korb ist voll! 💚');
    }
  };

  enableDrag({ items, target: basket, onDrop: add });

  allBtn.addEventListener('click', async () => {
    allBtn.disabled = true;
    for (const i of items) { if (!ctx.isActive()) return; add(i); await wait(160); }
  });

  finish.addEventListener('click', () => endCard(ctx));
}

function endCard(ctx: SceneCtx) {
  ctx.overlay.innerHTML = '';
  ctx.root.innerHTML = `
    <section class="donate">
      <div class="endcard">
        <div style="font-size:56px" aria-hidden="true">🎄</div>
        <h1>Frohe Weihnachten!</h1>
        <p class="thanks">Danke fürs Mitspielen. Du hast ${ledger.donated} ${ledger.donated === 1 ? 'Geschenk' : 'Geschenke'} in den Korb gelegt.</p>
        <p class="thanks">${esc(DONATION.line.replace(DONATION.ngo, '§'))
          .replace('§', `<span class="ngo">${esc(DONATION.ngo)}</span>`)}</p>
        <div class="automate">${AGENT_ICON.replace('class="agent-icon"', 'class="agent-icon" width="28" height="28"')}
          <span><b>Tipp vom Weihnachtsmann:</b> Mit „Automatisieren“ sortiert OneMachine sein Postfach jetzt jeden Morgen um 7 Uhr – ganz von allein.</span></div>
        <div class="end-actions">
          <a class="btn btn-accent btn-block" href="${esc(CTA.url)}" target="_blank" rel="noopener" style="text-decoration:none">${esc(CTA.label)}</a>
          <button class="btn btn-ghost btn-block" type="button" id="share">Spiel teilen</button>
          <button class="btn btn-ghost btn-block" type="button" id="again">Nochmal spielen</button>
        </div>
        <p class="muted" style="font-size:12.5px">Herzliche Grüße von MindsMachines</p>
      </div>
    </section>`;

  ctx.root.querySelector('#again')!.addEventListener('click', () => ctx.restart());
  ctx.root.querySelector('#share')!.addEventListener('click', async () => {
    const data = { title: 'Santas Postfach · OneMachine', text: 'Hilf dem Weihnachtsmann – für jeden Besuch wird an die Suppenküche der Franziskaner in Düsseldorf gespendet.', url: location.origin + location.pathname };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); toast(ctx.overlay, 'Link kopiert'); }
    } catch { /* abgebrochen */ }
  });
}
