import type { SceneCtx } from '../main';
import { DONATION, EMAILS } from '../content.de';
import { OM_AVATAR } from '../ui/chat';
import { SPEAKERS } from '../ui/dialog';
import { el, esc, wait } from '../ui/dom';
import { sfx, unlockAudio } from '../ui/sfx';
import { MAIN_KIDS } from '../world/world';

const CONNECTORS = [
  { id: 'mail', ico: '✉️', name: 'E-Mail', desc: 'Santas Postfach am Nordpol' },
  { id: 'db', ico: '🗄️', name: 'Werkstatt-Datenbank', desc: 'Lagerbestand aller Geschenke' },
  { id: 'drive', ico: '📄', name: 'Google Drive', desc: 'Dokumente und Notizen' },
];

export async function intro(ctx: SceneCtx) {
  const { world, root } = ctx;
  world.setMode('title');

  // ---------- Titelbild ----------
  const title = el(`
    <div class="title-screen">
      <div class="title-badge">MINDSMACHINES PRÄSENTIERT</div>
      <h1 class="title-main">SANTAS<br>POSTFACH</h1>
      <p class="title-sub">Ein Weihnachtsabenteuer mit OneMachine</p>
      <button class="press-start" type="button">▶ START</button>
      <p class="title-don">💚 ${esc(DONATION.line)}</p>
    </div>`);
  world.ui.appendChild(title);
  lockScreen(root, []);

  await new Promise<void>(res => title.querySelector('button')!.addEventListener('click', () => res(), { once: true }));
  if (!ctx.isActive()) return;
  unlockAudio();
  sfx.unlock();
  title.remove();

  // ---------- Zwischensequenz: Der eingeschneite Briefkasten ----------
  await world.wipe(() => {
    world.setMode('north');
    MAIN_KIDS.forEach(id => { const k = world.addKid(id); k.letter = true; });
  });
  if (!ctx.isActive()) return;
  await ctx.talk(SPEAKERS.narrator(), '1. Dezember am Nordpol. Überall schreiben Kinder ihre Wunschzettel an den Weihnachtsmann …');
  if (!ctx.isActive()) return;

  world.say('lena', 'Ab in den Briefkasten!', 2000);
  await Promise.all(MAIN_KIDS.map((id, i) => world.walk(id, 34 + i * 12, 26)));
  if (!ctx.isActive()) return;

  world.say('santa', 'Hohoho … was für ein Sturm!', 2200);
  await world.buryMailbox();
  if (!ctx.isActive()) return;
  await ctx.talk(SPEAKERS.narrator(), 'Doch dieses Jahr schneit es so heftig wie nie. Der Briefkasten ist komplett eingeschneit!');
  if (!ctx.isActive()) return;

  for (const [i, id] of MAIN_KIDS.entries()) {
    setTimeout(() => { if (ctx.isActive()) void world.throwLetter(id); }, i * 260);
  }
  await wait(1300);
  world.say('ben', 'Oh nein! Er geht nicht rein!', 2200);
  world.say('emma', '?!', 1600);
  await wait(1400);
  if (!ctx.isActive()) return;

  await ctx.talk(SPEAKERS.kid('lena'), 'Kein Problem – dann schicken wir dem Weihnachtsmann eben eine E-Mail!');
  if (!ctx.isActive()) return;

  // ---------- E-Mail-Flut ----------
  MAIN_KIDS.forEach(id => (world.kid(id).pose = 'type'));
  world.santa.phone = true;
  const notifs: string[] = [];
  const flights: Promise<void>[] = [];
  for (let i = 0; i < EMAILS.length; i++) {
    if (!ctx.isActive()) return;
    const kidId = MAIN_KIDS[i % MAIN_KIDS.length];
    const k = world.kid(kidId);
    const fromKid = EMAILS[i].child || i % 3 === 0;
    const from = fromKid ? { x: k.x + 5, y: k.base - 12 } : { x: 330, y: 20 + (i * 17) % 60 };
    flights.push(world.sendEmail(from).then(() => {
      if (!ctx.isActive()) return;
      notifs.unshift(`<b>${esc(EMAILS[i].from)}</b><span>${esc(EMAILS[i].subject)}</span>`);
      lockScreen(root, notifs);
    }));
    await wait(170);
  }
  await Promise.all(flights);
  if (!ctx.isActive()) return;
  MAIN_KIDS.forEach(id => (world.kid(id).pose = 'stand'));
  world.santa.sweat = true;
  world.shake(300);
  world.say('santa', `${EMAILS.length} E-Mails?!`, 2400);
  await wait(900);
  await ctx.talk(SPEAKERS.santa(), 'Hohoho … so viele E-Mails! Und das Lager muss ich auch noch prüfen. Ich brauche Hilfe!');
  if (!ctx.isActive()) return;

  // ---------- OneMachine öffnen & Tools verbinden ----------
  sfx.power();
  world.flash();
  root.innerHTML = `
    <section class="home">
      <div class="app-bar" style="margin:-14px -16px 0">${OM_AVATAR}<span class="app-name">OneMachine</span></div>
      <h2>Hallo, Weihnachts&shy;mann! Woran arbeiten wir heute?</h2>
      <p class="lede" style="margin:0">Verbinde deine Tools. Alles, was Daten verändert, wartet auf deine Freigabe.</p>
      <div class="connectors">
        ${CONNECTORS.map(c => `
          <div class="connector">
            <span class="ico" aria-hidden="true">${c.ico}</span>
            <span class="txt"><b>${esc(c.name)}</b><span>${esc(c.desc)}</span></span>
            <button class="toggle" type="button" role="switch" aria-checked="false" aria-label="${esc(c.name)} verbinden" data-id="${c.id}"></button>
          </div>`).join('')}
      </div>
      <button class="btn btn-accent btn-block" id="start" type="button">Alle verbinden</button>
      <div class="donation-note"><span aria-hidden="true">💚</span><span>${esc(DONATION.line)}</span></div>
    </section>`;
  await ctx.talk(SPEAKERS.onemachine(), 'Hallo, Weihnachtsmann! Ich bin OneMachine. Verbinde dein Postfach, dein Lager und deine Dokumente – dann legen wir los.');
  if (!ctx.isActive()) return;

  const toggles = [...root.querySelectorAll<HTMLButtonElement>('.toggle')];
  const start = root.querySelector<HTMLButtonElement>('#start')!;
  const connect = (t: HTMLButtonElement) => {
    if (t.getAttribute('aria-checked') === 'true') return;
    t.setAttribute('aria-checked', 'true');
    sfx.coin();
    const id = t.dataset.id;
    if (id === 'mail') { world.say('santa', 'Postfach verbunden!', 1600, 'say-om'); }
    if (id === 'db') { world.shelfOn = true; world.say('elf', 'Lager ist online!', 1800); world.sparkle({ x: 278, y: 90 }); }
    if (id === 'drive') { world.cloud.visible = true; world.sparkle({ x: 72, y: 44 }, ['#ffffff', '#9fe0ff']); }
    const all = toggles.every(x => x.getAttribute('aria-checked') === 'true');
    start.textContent = all ? 'Los geht’s ▶' : 'Alle verbinden';
  };
  toggles.forEach(t => t.addEventListener('click', () => connect(t)));
  start.addEventListener('click', async () => {
    const missing = toggles.filter(t => t.getAttribute('aria-checked') !== 'true');
    for (const t of missing) { connect(t); await wait(260); }
    await wait(300);
    world.santa.sweat = false;
    ctx.finish('connect');
  });
}

function lockScreen(root: HTMLElement, notifs: string[]) {
  const date = 'Dienstag, 1. Dezember';
  const shown = notifs.slice(0, 5);
  root.innerHTML = `
    <section class="lock">
      <div class="lock-time">18:00</div>
      <div class="lock-date">${date}</div>
      <div class="notifs">
        ${shown.map(n => `<div class="notif">${OM_AVATAR}${n}</div>`).join('')}
        ${notifs.length > shown.length ? `<div class="notif-more">+${notifs.length - shown.length} weitere E-Mails</div>` : ''}
      </div>
      <div class="lock-hint">${notifs.length ? `📧 ${notifs.length} NEUE E-MAILS` : 'Santas Handy'}</div>
    </section>`;
}
