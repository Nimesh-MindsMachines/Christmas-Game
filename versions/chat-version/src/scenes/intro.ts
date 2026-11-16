import type { SceneCtx } from '../main';
import { DONATION } from '../content.de';
import { BRAND_HTML } from '../ui/brand';
import { esc } from '../ui/dom';

const CONNECTORS = [
  { id: 'mail', ico: '✉️', name: 'E-Mail', desc: 'Santas Postfach am Nordpol' },
  { id: 'db', ico: '🗄️', name: 'Werkstatt-Datenbank', desc: 'Lagerbestand aller Geschenke' },
  { id: 'drive', ico: '📄', name: 'Google Drive', desc: 'Dokumente und Notizen' },
];

export function intro(ctx: SceneCtx) {
  ctx.root.innerHTML = `
    <section class="intro">
      <div class="intro-brand">${BRAND_HTML}</div>

      <div class="intro-hero">
        <span class="eyebrow" style="color:#ffb98a">Ein Weihnachtsspiel von MindsMachines</span>
        <h1>Die Briefe kommen nicht mehr an.</h1>
        <p>Früher kamen Wunschzettel per Post. Heute schreiben die Kinder dem Weihnachtsmann E-Mails – und sein Postfach platzt aus allen Nähten. Zeit für OneMachine.</p>
        <div class="letters" aria-hidden="true"><span class="stuck">✉️</span><span class="stuck">✉️</span><span>📧</span><span>📧</span></div>
      </div>

      <div class="home-greet">
        <h2>Hallo, Weihnachtsmann!<br>Woran arbeiten wir heute?</h2>
        <p>Verbinde zuerst deine Tools. Alles, was Daten verändert, wartet auf deine Freigabe.</p>
      </div>

      <div class="connectors">
        ${CONNECTORS.map(c => `
          <div class="connector">
            <span class="ico" aria-hidden="true">${c.ico}</span>
            <span class="txt"><b>${esc(c.name)}</b><span>${esc(c.desc)}</span></span>
            <button class="toggle" type="button" role="switch" aria-checked="false" aria-label="${esc(c.name)} verbinden" data-id="${c.id}"></button>
          </div>`).join('')}
      </div>

      <button class="btn btn-accent btn-block" id="start" type="button">Alle verbinden & loslegen</button>

      <div class="donation-note"><span aria-hidden="true">💚</span><span>${esc(DONATION.line)}</span></div>
    </section>`;

  const toggles = [...ctx.root.querySelectorAll<HTMLButtonElement>('.toggle')];
  const start = ctx.root.querySelector<HTMLButtonElement>('#start')!;
  const update = () => {
    const all = toggles.every(t => t.getAttribute('aria-checked') === 'true');
    start.textContent = all ? 'Santa helfen →' : 'Alle verbinden & loslegen';
  };
  toggles.forEach(t => t.addEventListener('click', () => {
    t.setAttribute('aria-checked', String(t.getAttribute('aria-checked') !== 'true'));
    update();
  }));
  start.addEventListener('click', async () => {
    const missing = toggles.filter(t => t.getAttribute('aria-checked') !== 'true');
    if (missing.length) {
      for (const t of missing) {
        t.setAttribute('aria-checked', 'true');
        await new Promise(r => setTimeout(r, 180));
      }
      update();
      await new Promise(r => setTimeout(r, 300));
    }
    ctx.finish('connect');
  });
}
