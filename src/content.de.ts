// Alle Texte und Spieldaten an einem Ort – Marketing kann hier ändern,
// ohne die Spiellogik anzufassen.

export type Category = 'wunsch' | 'dringend' | 'verwaltung' | 'spam';

export const CATEGORY_LABEL: Record<Category, string> = {
  wunsch: 'Wunschzettel',
  dringend: 'Dringend',
  verwaltung: 'Verwaltung',
  spam: 'Spam',
};

export const CATEGORY_ICON: Record<Category, string> = {
  wunsch: '💌',
  dringend: '🔥',
  verwaltung: '📁',
  spam: '🚫',
};

export type GiftId = 'malset' | 'fussball' | 'bausteine' | 'pluesch' | 'buecher' | 'auto' | 'fahrrad' | 'teleskop';

export interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  category: Category;
  /** Kurz-Zusammenfassung, die OneMachine bei Wunschzetteln anzeigt */
  summary?: string;
  /** Kind + Geschenk, wenn es ein Wunsch ist */
  child?: { name: string; age: number; gift: GiftId };
  /** OneMachine ist unsicher – Spieler entscheidet */
  uncertain?: { guess: Category; confidence: number; reason: string };
}

export const EMAILS: Email[] = [
  { id: 'e1', from: 'Lena, 7', subject: 'Mein Wunschzettel 🎨', preview: 'Lieber Weihnachtsmann, ich male so gern! Ich wünsche mir einen Malkasten mit viel Blau…', category: 'wunsch', summary: 'Lena, 7 · Malset · mag Blau', child: { name: 'Lena', age: 7, gift: 'malset' } },
  { id: 'e2', from: 'Rudolph', subject: 'Nase blinkt nicht mehr!!', preview: 'Chef, meine Nase flackert. Tierarzt hat morgen 9 Uhr noch einen Termin frei…', category: 'dringend' },
  { id: 'e3', from: 'Ben, 9', subject: 'Fußball bitte ⚽', preview: 'Hallo Weihnachtsmann, mein Ball ist kaputt gegangen. Kann ich einen neuen haben?', category: 'wunsch', summary: 'Ben, 9 · Fußball', child: { name: 'Ben', age: 9, gift: 'fussball' } },
  { id: 'e4', from: 'Gewinnspiel-Zentrale', subject: 'SIE HABEN EINEN SCHLITTEN GEWONNEN!!!', preview: 'Klicken Sie jetzt, um Ihren Gratis-Turbo-Schlitten abzuholen…', category: 'spam' },
  { id: 'e5', from: 'Emma, 8', subject: 'Weltraumstation', preview: 'Ich baue so gern! Am liebsten eine Weltraumstation aus Bausteinen…', category: 'wunsch', summary: 'Emma, 8 · Bausteine · Weltraum', child: { name: 'Emma', age: 8, gift: 'bausteine' } },
  { id: 'e6', from: 'Elfen-Personalabteilung', subject: 'Schichtplan Dezember', preview: 'Anbei der Schichtplan für die Werkstatt. Bitte bis Freitag freigeben.', category: 'verwaltung' },
  { id: 'e7', from: 'Noah, 5', subject: 'Rentier 🦌', preview: '(von Mama getippt) Noah wünscht sich ein kuscheliges Rentier zum Einschlafen.', category: 'wunsch', summary: 'Noah, 5 · Plüsch-Rentier', child: { name: 'Noah', age: 5, gift: 'pluesch' } },
  { id: 'e8', from: 'Nordpol-Konto-Service', subject: 'Ihr Konto wurde gesperrt', preview: 'Bestätigen Sie jetzt Ihr Passwort, sonst wird der Nordpol abgeschaltet…', category: 'spam' },
  { id: 'e9', from: 'Hannah, 10', subject: 'Bücher, Bücher, Bücher', preview: 'Ich habe alle meine Bücher schon dreimal gelesen. Hast du neue Abenteuergeschichten?', category: 'wunsch', summary: 'Hannah, 10 · Kinderbücher', child: { name: 'Hannah', age: 10, gift: 'buecher' } },
  { id: 'e10', from: 'Schlitten-TÜV', subject: 'Prüfplakette läuft am 20.12. ab', preview: 'Ohne gültige Plakette darf Ihr Schlitten nicht starten. Termin buchen…', category: 'dringend' },
  { id: 'e11', from: 'Paul, 7', subject: 'Schnelles Auto!', preview: 'Ich wünsche mir ein ferngesteuertes Auto, das GANZ schnell fährt.', category: 'wunsch', summary: 'Paul, 7 · Ferngest. Auto', child: { name: 'Paul', age: 7, gift: 'auto' } },
  { id: 'e12', from: 'Nordpol Stadtwerke', subject: 'Ihre Rechnung November', preview: 'Lichterketten-Verbrauch: 1,2 Mio. kWh. Fällig zum 30.11.', category: 'verwaltung' },
  { id: 'e13', from: 'Mia, 6', subject: 'Einhorn 🦄', preview: 'Lieber Weihnachtsmann, ich hätte so gern ein Einhorn zum Kuscheln.', category: 'wunsch', summary: 'Mia, 6 · Plüsch-Einhorn', child: { name: 'Mia', age: 6, gift: 'pluesch' } },
  { id: 'e14', from: 'Bart-Deluxe Shop', subject: '90 % Rabatt auf Bartpflege', preview: 'Nur heute! Glanz-Öl für den perfekten Weihnachtsbart…', category: 'spam' },
  { id: 'e15', from: 'Leon, 6', subject: 'Ritterburg', preview: 'Ich will eine Ritterburg bauen. Mit ganz vielen Steinen!', category: 'wunsch', summary: 'Leon, 6 · Bausteine · Ritter', child: { name: 'Leon', age: 6, gift: 'bausteine' } },
  // Unsichere Fälle – hier entscheidet der Spieler
  { id: 'u1', from: 'Oma Gertrud', subject: 'Für meinen Enkel Tim', preview: 'Lieber Weihnachtsmann, Tim (8) traut sich nicht zu schreiben. Er wünscht sich so sehr ein Fahrrad…', category: 'wunsch', summary: 'Tim, 8 · Fahrrad (über Oma)', child: { name: 'Tim', age: 8, gift: 'fahrrad' }, uncertain: { guess: 'wunsch', confidence: 72, reason: 'Absender ist kein Kind, aber es geht um einen Kinderwunsch.' } },
  { id: 'u2', from: 'Elfe Pepper', subject: 'Bandsäge macht komische Geräusche', preview: 'Die große Säge in Halle 3 qualmt ein bisschen. Sollen wir weitermachen?', category: 'dringend', uncertain: { guess: 'dringend', confidence: 64, reason: 'Klingt nach Verwaltung, aber „qualmt“ deutet auf ein Sicherheitsrisiko hin.' } },
  { id: 'u3', from: 'Weihnachtsmarkt Düsseldorf', subject: 'Einladung: Auftritt am 21.12.', preview: 'Wir würden uns freuen, wenn Sie am Samstag die Kinder auf dem Markt besuchen…', category: 'verwaltung', uncertain: { guess: 'verwaltung', confidence: 58, reason: 'Sieht aus wie Werbung, ist aber eine echte Terminanfrage.' } },
];

export interface StockItem {
  id: GiftId;
  name: string;
  icon: string;
  requested: number;
  inStock: number;
}

/** Werkstatt-Datenbank – Nachfrage aus allen Wunschzetteln weltweit */
export const STOCK: StockItem[] = [
  { id: 'malset', name: 'Malsets', icon: '🎨', requested: 320, inStock: 280 },
  { id: 'fussball', name: 'Fußbälle', icon: '⚽', requested: 410, inStock: 430 },
  { id: 'bausteine', name: 'Bausteinsets', icon: '🧱', requested: 560, inStock: 470 },
  { id: 'pluesch', name: 'Plüschtiere', icon: '🧸', requested: 380, inStock: 350 },
  { id: 'buecher', name: 'Kinderbücher', icon: '📚', requested: 290, inStock: 310 },
  { id: 'auto', name: 'Ferngest. Autos', icon: '🏎️', requested: 240, inStock: 180 },
];

export const RESTOCK_STEP = 10;
/** Toleranz: so viel Überbestand gilt noch als „passend“ */
export const RESTOCK_BUFFER = 20;

export const MATEO = {
  from: 'Mateo, 8',
  subject: 'Querido Papá Noel ⭐',
  original:
    'Querido Papá Noel: Me llamo Mateo y tengo 8 años. Este año nos mudamos a Düsseldorf y todavía no hablo bien alemán. Me gustaría un telescopio para mirar las estrellas con mi papá. ¡Muchas gracias!',
  translated:
    'Lieber Weihnachtsmann, ich heiße Mateo und bin 8 Jahre alt. Dieses Jahr sind wir nach Düsseldorf gezogen und ich spreche noch nicht so gut Deutsch. Ich hätte gern ein Teleskop, um mit meinem Papa die Sterne anzuschauen. Vielen Dank!',
  languageLabel: 'Spanisch',
  gift: 'teleskop' as GiftId,
  summary: 'Mateo, 8 · Teleskop · neu in Düsseldorf',
};

export const JONAS_DOC = {
  title: 'Mein Wunsch an den Weihnachtsmann',
  owner: 'Jonas, 9',
  edited: 'Zuletzt bearbeitet am 2. Dezember · nie geteilt',
  paragraphs: [
    { text: 'Lieber Weihnachtsmann,', mark: null },
    { text: 'ich wünsche mir einen Fußball. Seit wir umgezogen sind, spiele ich jeden Nachmittag im Park mit meinen neuen Freunden.', mark: 'wunsch' },
    { text: 'Mama sagt, dass wir dieses Jahr sparen müssen, weil die neue Wohnung teurer ist.', mark: 'kontext' },
    { text: 'Meine alte Winterjacke ist zu klein geworden, aber das ist nicht so schlimm, ich ziehe einfach zwei Pullis an.', mark: 'bedarf' },
    { text: 'Abends lese ich am liebsten Abenteuergeschichten mit Taschenlampe.', mark: 'interesse' },
    { text: 'Viele Grüße, dein Jonas', mark: null },
  ] as { text: string; mark: null | 'wunsch' | 'kontext' | 'bedarf' | 'interesse' }[],
};

export interface Recommendation {
  id: string;
  icon: string;
  name: string;
  reason: string;
  source: string;
  confidence: number;
  points: number;
}

export const JONAS_RECS: Recommendation[] = [
  { id: 'ball', icon: '⚽', name: 'Fußball', reason: 'Sein ausdrücklicher Wunsch.', source: 'Drive · Absatz 2', confidence: 98, points: 15 },
  { id: 'jacke', icon: '🧥', name: 'Winterjacke, Gr. 134', reason: 'Die alte Jacke ist zu klein – im Dezember wichtig.', source: 'Drive · Absatz 4', confidence: 91, points: 15 },
  { id: 'buch', icon: '📚', name: 'Abenteuerbuch + Taschenlampe', reason: 'Liest abends gern Abenteuergeschichten.', source: 'Drive · Absatz 5', confidence: 76, points: 10 },
  { id: 'pluesch', icon: '🧸', name: 'Plüschtier', reason: 'Beliebt in seinem Alter – aber kein Hinweis im Dokument.', source: 'Allgemeine Statistik', confidence: 34, points: 0 },
];

export const LEARN = {
  connect: { title: 'Alles verbunden', text: 'OneMachine verbindet sich mit Mail, Dateien und Datenbanken. Alles, was Daten verändert, wartet auf deine Freigabe.' },
  inbox: { title: 'Postfach im Griff', text: 'OneMachine sortiert, fasst zusammen und priorisiert dein Postfach – und fragt nach, wenn es sich nicht sicher ist.' },
  inventory: { title: 'Daten, die handeln', text: 'OneMachine verknüpft E-Mails mit deinen Daten, erkennt Engpässe und bereitet die Bestellung vor. Du gibst frei.' },
  translate: { title: 'Ohne Sprachbarriere', text: 'Die OneMachine-Erweiterung arbeitet direkt in den Tools, die du schon nutzt – und übersetzt auf Knopfdruck.' },
  drive: { title: 'Was zwischen den Zeilen steht', text: 'OneMachine findet, was in deinen Dokumenten wichtig ist – auch das, was dir nie jemand geschickt hat. Mit Quellenangabe.' },
  decision: { title: 'Du behältst die Kontrolle', text: 'OneMachine liefert dir die besten Optionen mit Begründung. Die Entscheidung triffst immer du.' },
  audit: { title: 'Prüfbericht in Sekunden', text: 'OneMachine liest deine Dokumente und erstellt einen prüffähigen Bericht – jede Zahl mit Quelle.' },
};

export const RANKS = [
  { min: 0, stars: 1, title: 'Lehrling-Elf' },
  { min: 0.35, stars: 2, title: 'Geschenke-Packer' },
  { min: 0.55, stars: 3, title: 'Werkstatt-Leitung' },
  { min: 0.75, stars: 4, title: 'Rentier-Chef' },
  { min: 0.92, stars: 5, title: 'Chief Christmas Officer' },
];

export const DONATION = {
  ngo: 'Suppenküche der Franziskaner',
  city: 'Düsseldorf',
  line: 'Für jeden Besuch spenden wir an die Suppenküche der Franziskaner in Düsseldorf.',
  baseGifts: 3,
  pointsPerGift: 50,
  maxGifts: 10,
  giftIcons: ['🎁', '🧣', '🍪', '🧤', '☕', '🎁', '🍫', '🧦', '🥫', '🎁'],
};

export const CTA = {
  label: 'OneMachine-Demo buchen',
  url: 'https://mindsmachines.ai',
};
