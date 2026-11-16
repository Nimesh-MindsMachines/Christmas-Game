// Das Geschenke-Ledger: hält jede Entscheidung fest und berechnet daraus
// den Prüfbericht und die Punktzahl.
import {
  Category, DONATION, EMAILS, GiftId, JONAS_RECS, MATEO, RANKS, RESTOCK_BUFFER, STOCK,
} from './content.de';

export type LevelId = 'inbox' | 'inventory' | 'translate' | 'drive' | 'decision' | 'audit';

export interface Ledger {
  skipped: Set<LevelId>;
  /** Kategorie je E-Mail nach Level 1 */
  sorted: Record<string, Category>;
  /** Nachbestellung je Artikel nach Level 2 */
  order: Partial<Record<GiftId, number>>;
  restockApproved: boolean;
  translated: boolean;
  driveFound: boolean;
  /** Entscheidung je Empfehlung für Jonas */
  jonas: Record<string, 'accept' | 'reject'>;
  donated: number;
}

export const ledger: Ledger = {
  skipped: new Set(),
  sorted: {},
  order: {},
  restockApproved: false,
  translated: false,
  driveFound: false,
  jonas: {},
  donated: 0,
};

export function resetLedger() {
  ledger.skipped.clear();
  ledger.sorted = {};
  ledger.order = {};
  ledger.restockApproved = false;
  ledger.translated = false;
  ledger.driveFound = false;
  ledger.jonas = {};
  ledger.donated = 0;
}

export interface ChildResult {
  name: string;
  gift: string;
  ok: boolean;
  note?: string;
}

export interface ScoreLine {
  label: string;
  points: number;
  max: number;
  source: string;
}

export interface Audit {
  children: ChildResult[];
  shortages: { name: string; missing: number }[];
  overstock: { name: string; extra: number }[];
  lines: ScoreLine[];
  total: number;
  max: number;
  stars: number;
  title: string;
  gifts: number;
}

function giftName(id: GiftId): string {
  if (id === 'fahrrad') return 'Fahrrad';
  if (id === 'teleskop') return 'Teleskop';
  return STOCK.find(s => s.id === id)?.name ?? id;
}

export function computeAudit(): Audit {
  const inboxDone = !ledger.skipped.has('inbox');
  const restockDone = ledger.restockApproved;

  // --- Bestand nach Nachbestellung ---
  const shortages: Audit['shortages'] = [];
  const overstock: Audit['overstock'] = [];
  let restockPoints = 0;
  const perRow = 50 / STOCK.length;
  const covered = new Set<GiftId>(['fahrrad', 'teleskop']); // immer auf Lager
  for (const s of STOCK) {
    const ordered = restockDone ? ledger.order[s.id] ?? 0 : 0;
    const total = s.inStock + ordered;
    const need = Math.max(0, s.requested - s.inStock);
    if (total < s.requested) shortages.push({ name: s.name, missing: s.requested - total });
    else covered.add(s.id);
    if (ordered > need + RESTOCK_BUFFER) overstock.push({ name: s.name, extra: ordered - need });
    if (restockDone && total >= s.requested && ordered <= need + RESTOCK_BUFFER) restockPoints += perRow;
  }

  // --- Kinder ---
  const children: ChildResult[] = [];
  for (const e of EMAILS) {
    if (!e.child) continue;
    const recognised = inboxDone && ledger.sorted[e.id] === 'wunsch';
    if (e.uncertain && !recognised) {
      children.push({ name: e.child.name, gift: giftName(e.child.gift), ok: false, note: inboxDone ? 'Brief falsch einsortiert' : 'Postfach nicht sortiert' });
      continue;
    }
    const ok = covered.has(e.child.gift);
    children.push({ name: e.child.name, gift: giftName(e.child.gift), ok, note: ok ? undefined : 'nicht auf Lager' });
  }
  children.push({
    name: 'Mateo', gift: giftName(MATEO.gift), ok: ledger.translated,
    note: ledger.translated ? undefined : 'Brief nicht verstanden',
  });
  const jonasAccepted = JONAS_RECS.filter(r => ledger.jonas[r.id] === 'accept');
  const jonasOk = ledger.driveFound && jonasAccepted.length > 0;
  children.push({
    name: 'Jonas',
    gift: jonasAccepted.length ? jonasAccepted.map(r => r.name.split(',')[0]).join(', ') : 'Fußball',
    ok: jonasOk,
    note: jonasOk ? undefined : ledger.driveFound ? 'kein Geschenk freigegeben' : 'Wunsch nie gefunden',
  });

  // --- Punkte ---
  const sortable = EMAILS.length;
  const correctlySorted = inboxDone ? EMAILS.filter(e => ledger.sorted[e.id] === e.category).length : 0;
  const fulfilled = children.filter(c => c.ok).length;
  const jonasPoints = jonasAccepted.reduce((a, r) => a + r.points, 0);
  const jonasMax = JONAS_RECS.reduce((a, r) => a + r.points, 0);

  const lines: ScoreLine[] = [
    { label: 'Wünsche erfüllt', points: fulfilled * 10, max: children.length * 10, source: 'Geschenke-Ledger' },
    { label: 'E-Mails richtig sortiert', points: correctlySorted * 5, max: sortable * 5, source: 'Postfach' },
    { label: 'Passende Nachbestellung', points: Math.round(restockPoints), max: 50, source: 'Werkstatt-Datenbank' },
    { label: 'Brief übersetzt', points: ledger.translated ? 25 : 0, max: 25, source: 'Erweiterung' },
    { label: 'Versteckter Wunsch gefunden', points: ledger.driveFound ? 50 : 0, max: 50, source: 'Google Drive' },
    { label: 'Jonas gut versorgt', points: jonasPoints, max: jonasMax, source: 'Freigaben' },
  ];
  const total = lines.reduce((a, l) => a + l.points, 0);
  const max = lines.reduce((a, l) => a + l.max, 0);
  const ratio = max ? total / max : 0;
  const rank = [...RANKS].reverse().find(r => ratio >= r.min) ?? RANKS[0];
  const gifts = Math.min(DONATION.maxGifts, DONATION.baseGifts + Math.floor(total / DONATION.pointsPerGift));

  return { children, shortages, overstock, lines, total, max, stars: rank.stars, title: rank.title, gifts };
}
