'use strict';
// Alle sichtbaren Texte. Englisch ist Standard; {0}, {1} … werden ersetzt.
window.TEXTE = {
  en: {
    titel: 'Hell Simulator', punkt: ',',
    tafel: `<h1>Welcome to Hell</h1>
  <div style="margin:-4px 0 14px;padding:8px 12px;font-size:14px;line-height:1.45;border-left:3px solid #c9a45c;background:#1f1a14">An unofficial, non-commercial fan project inspired by the novella <i>A Short Stay in Hell</i> by Steven L. Peck. It tries to simulate the hell described there: the same library, at its full size. Not affiliated with or endorsed by the author or the publisher. It contains no text from the book; all rights to the novella remain with their owners.</div>
  <div>This is the Library. It holds every book that can be written on 410 pages of 40 lines with 80 characters each. One of them tells the story of your life.</div>
  <h2>The rules</h2>
  <ol>
    <li>If you die, you wake up again the next morning.</li>
    <li>The kiosks give you whatever you ask for to eat and drink.</li>
    <li>The lights go out at 10 p.m. and come back on at 6 a.m. Overnight every book returns to its place.</li>
    <li>Whoever finds the book that tells their own life without a single error may leave.</li>
  </ol>
  <h2>Controls</h2>
  <ul>
    <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk, <kbd>Shift</kbd> run, mouse or arrow keys to look around</li>
    <li><kbd>E</kbd> pull a book, use the kiosk, sleep</li>
    <li><kbd>Space</kbd> jump (also over the railing)</li>
    <li><kbd>Tab</kbd> finds, <kbd>H</kbd> this sign, <kbd>M</kbd> sound on/off</li>
  </ul>
  <div style="margin-top:10px">Real words in the gibberish are marked in yellow. Your longest find is your record.</div>
  <button id="los">Enter</button> <button id="sprache" style="background:#2a231b;color:#e8dfcf;border:1px solid #5b4a33">Deutsch</button>`,
    buchhilfe: '← → turn pages · PgUp/PgDn ±10 · Home/End · G throw into the shaft · E put back',
    kiosktitel: 'Kiosk', kioskfrage: 'What would you like to eat or drink?', kioskhilfe: 'Enter confirms, Esc cancels.',
    fundetitel: 'Finds', schliessen: 'Close',
    geworfen: 'The book vanishes silently into the depths. Tomorrow morning it will be back on the shelf.',
    dunkel: 'It is too dark to read.', tonAus: 'Sound off', tonAn: 'Sound on',
    ort: 'Side {0} · Floor …{1} · Section …{2}', ortBuch: ' · Shelf {0} · Slot {1}', ortSeite: ' · p. {0}',
    kiosk: 'The kiosk hums. In front of you: {0}. It tastes exactly the way you imagined.',
    morgen: 'Day {0}. The lights come on. Every book is back in its place.',
    erwacht: 'Day {0}. You wake up unharmed. Nothing has changed.',
    nacht: '10 p.m. The lights go out.',
    aufschlag: 'You hit the railing. {0} floors further down, everything goes dark.',
    seiteVon: 'Page {0} of {1}', rekord: 'New record: “{0}” ({1} letters)',
    aufSeite: '{0} word(s) on this page, longest: {1}', keinWort: 'no word on this page',
    fundeKopf: 'Words found in total: {0}. Listed here are the longest, five letters and up.',
    fundeLeer: 'Nothing with five or more letters yet.', tagKurz: 'Day {0}',
    hud: 'Day {0} · {1}{2}\nSide {3}\nFloor {4}  ({5} digits)\nSection {6}  ({7} digits)', hudNacht: ' · night',
    stat: 'Books opened: {0} · Pages read: {1}\nWords found: {2} · Longest: {3}\nWalked: {4} m · Fallen: {5} floors · Deaths: {6}',
    faellt: 'You are falling. {0} floors, {1} km/h. Steer towards a railing.',
    ziehen: 'E: pull book (shelf {0}, slot {1})', schlafen: 'E: sleep until 6 a.m.', kioskNutzen: 'E: use kiosk',
  },
  de: {
    titel: 'Hell Simulator', punkt: '.',
    tafel: `<h1>Willkommen in der Hölle</h1>
  <div style="margin:-4px 0 14px;padding:8px 12px;font-size:14px;line-height:1.45;border-left:3px solid #c9a45c;background:#1f1a14">Ein inoffizielles, nicht kommerzielles Fanprojekt, inspiriert von der Novelle <i>A Short Stay in Hell</i> von Steven L. Peck. Es versucht, die dort beschriebene Hölle zu simulieren: dieselbe Bibliothek, in voller Größe. Es besteht keine Verbindung zum Autor oder zum Verlag und keine Billigung durch sie. Das Spiel enthält keinen Text aus dem Buch; alle Rechte an der Novelle liegen bei ihren Inhabern.</div>
  <div>Dies ist die Bibliothek. Sie enthält jedes Buch, das sich auf 410 Seiten mit je 40 Zeilen zu 80 Zeichen schreiben lässt. Eines davon erzählt dein Leben.</div>
  <h2>Die Regeln</h2>
  <ol>
    <li>Wer stirbt, wacht am nächsten Morgen wieder auf.</li>
    <li>Die Kioske geben dir zu essen und zu trinken, was immer du verlangst.</li>
    <li>Um 22 Uhr geht das Licht aus, um 6 Uhr wieder an. Über Nacht kehrt jedes Buch an seinen Platz zurück.</li>
    <li>Wer das Buch findet, das sein eigenes Leben fehlerfrei erzählt, darf gehen.</li>
  </ol>
  <h2>Steuerung</h2>
  <ul>
    <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> gehen, <kbd>Shift</kbd> rennen, Maus oder Pfeiltasten umsehen</li>
    <li><kbd>E</kbd> Buch ziehen, Kiosk benutzen, schlafen</li>
    <li><kbd>Leertaste</kbd> springen (auch über das Geländer)</li>
    <li><kbd>Tab</kbd> Fundstücke, <kbd>H</kbd> diese Tafel, <kbd>M</kbd> Ton an/aus</li>
  </ul>
  <div style="margin-top:10px">Echte Wörter im Zeichensalat werden gelb markiert. Dein längster Fund ist dein Rekord.</div>
  <button id="los">Eintreten</button> <button id="sprache" style="background:#2a231b;color:#e8dfcf;border:1px solid #5b4a33">English</button>`,
    buchhilfe: '← → blättern · Bild↑/↓ ±10 · Pos1/Ende · G in den Schacht werfen · E zurückstellen',
    kiosktitel: 'Kiosk', kioskfrage: 'Was möchtest du essen oder trinken?', kioskhilfe: 'Eingabe bestätigt, Esc bricht ab.',
    fundetitel: 'Fundstücke', schliessen: 'Schließen',
    geworfen: 'Das Buch verschwindet lautlos in der Tiefe. Morgen früh steht es wieder im Regal.',
    dunkel: 'Es ist zu dunkel zum Lesen.', tonAus: 'Ton aus', tonAn: 'Ton an',
    ort: 'Seite {0} · Stockwerk …{1} · Abschnitt …{2}', ortBuch: ' · Brett {0} · Platz {1}', ortSeite: ' · S. {0}',
    kiosk: 'Der Kiosk surrt. Vor dir steht: {0}. Es schmeckt genau so, wie du es dir vorgestellt hast.',
    morgen: 'Tag {0}. Das Licht geht an. Alle Bücher stehen wieder an ihrem Platz.',
    erwacht: 'Tag {0}. Du wachst unversehrt auf. Nichts hat sich geändert.',
    nacht: '22 Uhr. Das Licht geht aus.',
    aufschlag: 'Du schlägst auf dem Geländer auf. {0} Stockwerke tiefer wird es dunkel.',
    seiteVon: 'Seite {0} von {1}', rekord: 'Neuer Rekord: „{0}“ ({1} Buchstaben)',
    aufSeite: '{0} Wort/Wörter auf dieser Seite, längstes: {1}', keinWort: 'kein Wort auf dieser Seite',
    fundeKopf: 'Gefundene Wörter insgesamt: {0}. Hier stehen die längsten ab fünf Buchstaben.',
    fundeLeer: 'Noch nichts mit fünf oder mehr Buchstaben.', tagKurz: 'Tag {0}',
    hud: 'Tag {0} · {1}{2}\nSeite {3}\nStockwerk {4}  ({5} Stellen)\nAbschnitt {6}  ({7} Stellen)', hudNacht: ' · Nacht',
    stat: 'Bücher geöffnet: {0} · Seiten gelesen: {1}\nWörter gefunden: {2} · Längstes: {3}\nGelaufen: {4} m · Gefallen: {5} Stockwerke · Tode: {6}',
    faellt: 'Du fällst. {0} Stockwerke, {1} km/h. Steuere zu einem Geländer.',
    ziehen: 'E: Buch ziehen (Brett {0}, Platz {1})', schlafen: 'E: Schlafen bis 6 Uhr', kioskNutzen: 'E: Kiosk benutzen',
  },
};
