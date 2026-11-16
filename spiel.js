'use strict';
/* Hell Simulator – die Bibliothek aus "A Short Stay in Hell".
   Die Welt ist periodisch: Es wird immer derselbe Ausschnitt gezeichnet, der Spieler
   wird beim Verlassen eines Abschnitts/Stockwerks zurückgesetzt und ein Zähler (BigInt)
   merkt sich, wo er wirklich ist. Buchinhalte entstehen erst beim Aufschlagen aus der Adresse. */

// ---------- Maße (Meter) ----------
const REGAL = 61, NISCHE = 3, TREPPE = 3, PERIODE = REGAL + NISCHE + TREPPE; // 67
const HOEHE = 3, GANG = 3, SCHACHT = 12, TIEFE = GANG * 2 + SCHACHT;          // 18
const BRETTER = 8, BRETT_H = 0.254, SOCKEL = 0.1, PLAETZE = 1600, PLATZ_B = REGAL / PLAETZE;
const SEITEN = 410, ZEILEN = 40, SPALTEN = 80, ZEICHEN = ZEILEN * SPALTEN;
const TX0 = REGAL + NISCHE, TXM = TX0 + TREPPE / 2;          // Treppenhaus 64..67, Mitte 65.5
const STELLEN_STOCK = 1297386, STELLEN_ABSCHNITT = 1297384;  // Ziffern der wahren Koordinaten
const NX = 5, NY = 60, AUGE = 1.65, REICHWEITE = 2.4;
const MIN_PRO_SEK = 1;                                       // 1 echte Sekunde = 1 Spielminute

// ---------- Zufall ----------
function hash128(s) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < s.length; i++) {
    k = s.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
function sfc32(a, b, c, d) {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (a + b | 0) + d | 0; d = d + 1 | 0;
    a = b ^ b >>> 9; b = c + (c << 3) | 0; c = c << 21 | c >>> 11; c = c + t | 0;
    return t >>> 0;
  };
}
function zufall(s) { const h = hash128(s); const r = sfc32(h[0], h[1], h[2], h[3]); for (let i = 0; i < 12; i++) r(); return r; }
function ziffern(s, n) { const r = zufall(s); let o = String(1 + r() % 9); while (o.length < n) o += r() % 10; return o; }

// ---------- Zustand ----------
const SPEICHER = 'hoelle-bibliothek-v1';
let Z = laden() || neu();
function neu() {
  const saat = Array.from(crypto.getRandomValues(new Uint32Array(4)), v => v.toString(36)).join('');
  return { saat, seite: 0, stock: '0', abschnitt: '0', x: 20 + Math.random() * 20, z: 1.5, hoch: 0, gier: 0, nick: 0,
    minuten: 6 * 60, start: false,
    stat: { buecher: 0, seiten: 0, woerter: 0, laengstes: '', tode: 0, mahlzeiten: 0, geworfen: 0, meter: 0, gefallen: '0' },
    funde: [] };
}
function laden() { try { const z = JSON.parse(localStorage.getItem(SPEICHER)); return z && z.saat ? z : null; } catch (e) { return null; } }
function speichern() {
  Z.stock = String(stock); Z.abschnitt = String(abschnitt); Z.stat.gefallen = String(gefallen);
  try { localStorage.setItem(SPEICHER, JSON.stringify(Z)); } catch (e) {}
}
let stock = BigInt(Z.stock), abschnitt = BigInt(Z.abschnitt), gefallen = BigInt(Z.stat.gefallen || '0');
const KOPF_S = ziffern(Z.saat + '|stock-kopf', 6), KOPF_A = ziffern(Z.saat + '|abschnitt-kopf', 6);
const FUSS_S = BigInt(ziffern(Z.saat + '|stock-fuss', 15)), FUSS_A = BigInt(ziffern(Z.saat + '|abschnitt-fuss', 15));
const MOD = 10n ** 12n;
function ende(basis, versatz) { let v = (basis + versatz) % MOD; if (v < 0n) v += MOD; return String(v).padStart(12, '0'); }
let SPR = Z.sprache === 'de' ? 'de' : 'en';
function T(k) { let t = window.TEXTE[SPR][k]; for (let i = 1; i < arguments.length; i++) t = t.split('{' + (i - 1) + '}').join(arguments[i]); return t; }
function tausender(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, T('punkt')); }
const stockText = (s) => KOPF_S + '…' + ende(FUSS_S, s === undefined ? stock : s);
const abschnittText = (a) => KOPF_A + '…' + ende(FUSS_A, a === undefined ? abschnitt : a);

// ---------- Bücher ----------
function seitenText(adr, seite) {
  const r = zufall(Z.saat + '|' + adr + '|' + seite);
  const c = new Array(ZEICHEN);
  for (let i = 0; i < ZEICHEN; i++) c[i] = 32 + Math.floor(r() / 4294967296 * 95);
  return String.fromCharCode.apply(null, c);
}
let WOERTER = new Set(window.WOERTER[SPR].split(' '));
const istBuchstabe = (c) => (c >= 97 && c <= 122);
function findeWoerter(text) {
  const t = text.toLowerCase(), treffer = [];
  for (let i = 0; i < t.length - 3; i++) {
    if (!istBuchstabe(t.charCodeAt(i))) continue;
    let lauf = 1; while (lauf < 14 && i + lauf < t.length && istBuchstabe(t.charCodeAt(i + lauf))) lauf++;
    for (let L = lauf; L >= 4; L--) {
      // Wörter über einen Zeilenumbruch hinweg zählen nicht
      if (Math.floor(i / SPALTEN) !== Math.floor((i + L - 1) / SPALTEN)) continue;
      if (WOERTER.has(t.substr(i, L))) { treffer.push([i, L]); i += L - 1; break; }
    }
  }
  return treffer;
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function seitenHtml(text, treffer) {
  let html = '', k = 0;
  for (let z = 0; z < ZEILEN; z++) {
    const a = z * SPALTEN, e = a + SPALTEN; let p = a;
    while (k < treffer.length && treffer[k][0] < e) {
      const [i, L] = treffer[k++];
      html += esc(text.slice(p, i)) + '<mark>' + esc(text.slice(i, i + L)) + '</mark>'; p = i + L;
    }
    html += esc(text.slice(p, e)) + '\n';
  }
  return html;
}

// ---------- Szene ----------
const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.prepend(renderer.domElement);
const szene = new THREE.Scene();
const TAG_NEBEL = new THREE.Color(0x2b241c), NACHT_NEBEL = new THREE.Color(0x020202);
szene.fog = new THREE.FogExp2(TAG_NEBEL.getHex(), 0.012);
szene.background = TAG_NEBEL.clone();
const kamera = new THREE.PerspectiveCamera(72, 1, 0.08, 520);
kamera.rotation.order = 'YXZ';
const umlicht = new THREE.AmbientLight(0xfff0d8, 0.95);
const richtlicht = new THREE.DirectionalLight(0xfff4e0, 0.55);
richtlicht.position.set(0.3, 1, 0.6);
szene.add(umlicht, richtlicht);

function buchTextur() {
  const N = 50, c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
  const g = c.getContext('2d'), bw = c.width / N, bh = c.height / BRETTER;
  const farben = ['#5a2a22', '#3d3324', '#27402f', '#263a52', '#5b4a2a', '#472838', '#6a5a44', '#2d2d33', '#70331f', '#3a4a3a'];
  const r = zufall('buchruecken');
  g.fillStyle = '#120d09'; g.fillRect(0, 0, c.width, c.height);
  for (let b = 0; b < BRETTER; b++) for (let i = 0; i < N; i++) {
    const h = bh * (0.80 + (r() % 100) / 1000), x = i * bw, y = (b + 1) * bh - 10 - h;
    g.fillStyle = farben[r() % farben.length]; g.fillRect(x + 1, y, bw - 2, h);
    g.fillStyle = 'rgba(255,230,170,.35)'; g.fillRect(x + 6, y + h * 0.18, bw - 12, 3); g.fillRect(x + 6, y + h * 0.78, bw - 12, 3);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + bw - 4, y, 3, h);
  }
  g.fillStyle = '#4a3622'; for (let b = 0; b < BRETTER; b++) g.fillRect(0, (b + 1) * bh - 10, c.width, 10);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(PLAETZE / N, 1);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const lampenMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8 });
const schirmMat = new THREE.MeshBasicMaterial({ color: 0x9fe8ff });
function baueSeite() {
  const gruppe = new THREE.Group(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const lam = (farbe, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: farbe }, extra));
  const holz = lam(0x3b2a1a), putz = lam(0x6b6256, { side: THREE.DoubleSide }), teppich = lam(0x5a2323);
  const L = (2 * NX + 1) * PERIODE, cx = PERIODE / 2;
  // teile: [Geometrie, Material, x, y, z, rotX, rotY, proAbschnitt]
  const teile = [
    [new THREE.BoxGeometry(L, 0.25, GANG + 0.3), teppich, cx, -0.125, GANG / 2, 0, 0, false],              // Boden/Decke
    [new THREE.BoxGeometry(L, 0.95, 0.05), lam(0x4a3a28), cx, 0.475, GANG, 0, 0, false],                    // Geländerfüllung
    [new THREE.BoxGeometry(L, 0.08, 0.12), lam(0x9a7840), cx, 1.03, GANG, 0, 0, false],                     // Handlauf
    [new THREE.BoxGeometry(L, 0.04, 0.25), lampenMat, cx, 2.72, GANG / 2, 0, 0, false],                     // Leuchtband
    [new THREE.BoxGeometry(REGAL, 2.75, 0.3), holz, REGAL / 2, 1.375, -0.15, 0, 0, true],                   // Regalkorpus
    [new THREE.PlaneGeometry(REGAL, BRETTER * BRETT_H), lam(0xffffff, { map: buchTextur() }), REGAL / 2, SOCKEL + BRETTER * BRETT_H / 2, 0.005, 0, 0, true],
    [new THREE.BoxGeometry(NISCHE, 2.75, 0.3), putz, REGAL + NISCHE / 2, 1.375, -0.15, 0, 0, true],         // Nischenwand
    [new THREE.BoxGeometry(1, 2.1, 0.06), lam(0x2b1d12), REGAL + 1, 1.05, 0.03, 0, 0, true],                // Schlafraumtür
    [new THREE.BoxGeometry(1, 1.3, 0.45), lam(0x77808a), REGAL + 2.3, 0.65, 0.225, 0, 0, true],             // Kiosk
    [new THREE.BoxGeometry(0.6, 0.3, 0.02), schirmMat, REGAL + 2.3, 1.0, 0.46, 0, 0, true],                 // Kioskanzeige
    [new THREE.CircleGeometry(0.22, 24), new THREE.MeshBasicMaterial({ color: 0xe9e2d0 }), REGAL + 1, 2.45, 0.012, 0, 0, true], // Uhr
    [new THREE.PlaneGeometry(TREPPE, HOEHE), putz, TXM, 1.5, -7, 0, 0, true],                               // Treppenhaus hinten
    [new THREE.PlaneGeometry(7, HOEHE), putz, TX0, 1.5, -3.5, 0, Math.PI / 2, true],
    [new THREE.PlaneGeometry(7, HOEHE), putz, TX0 + TREPPE, 1.5, -3.5, 0, -Math.PI / 2, true],
    [new THREE.BoxGeometry(0.08, HOEHE, 5), putz, TXM, 1.5, -2.5, 0, 0, true],                              // Trennwand
    [new THREE.BoxGeometry(TREPPE, 0.15, 2), teppich, TXM, 1.5 - 0.075, -6, 0, 0, true],                    // Podest
    [new THREE.BoxGeometry(1.5, 0.15, Math.hypot(5, 1.5)), teppich, TX0 + 0.75, 0.75 - 0.075, -2.5, Math.atan(1.5 / 5), 0, true],  // Lauf hoch
    [new THREE.BoxGeometry(1.5, 0.15, Math.hypot(5, 1.5)), teppich, TXM + 0.75, 2.25 - 0.075, -2.5, -Math.atan(1.5 / 5), 0, true], // Lauf weiter
  ];
  for (const [geo, mat, x, y, z, rx, ry, pro] of teile) {
    const n = (2 * NY + 1) * (pro ? 2 * NX + 1 : 1), netz = new THREE.InstancedMesh(geo, mat, n);
    let k = 0; q.setFromEuler(e.set(rx, ry, 0));
    for (let j = -NY; j <= NY; j++) for (let i = pro ? -NX : 0; i <= (pro ? NX : 0); i++) {
      m.compose(new THREE.Vector3(x + i * PERIODE, y + j * HOEHE, z), q, new THREE.Vector3(1, 1, 1));
      netz.setMatrixAt(k++, m);
    }
    netz.frustumCulled = false; gruppe.add(netz);
  }
  return gruppe;
}
const seiteA = baueSeite(), seiteB = baueSeite();
seiteB.rotation.y = Math.PI; seiteB.position.z = TIEFE;
szene.add(seiteA, seiteB);
// Zeiger der Uhr im eigenen Abschnitt, Markierung des anvisierten Buchs
const zeigerMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
const zeigerH = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.004).translate(0, 0.06, 0), zeigerMat);
const zeigerM = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.19, 0.004).translate(0, 0.095, 0), zeigerMat);
zeigerH.position.set(REGAL + 1, 2.45, 0.02); zeigerM.position.set(REGAL + 1, 2.45, 0.024);
const marke = new THREE.Mesh(new THREE.BoxGeometry(PLATZ_B * 0.92, BRETT_H * 0.84, 0.16),
  new THREE.MeshBasicMaterial({ color: 0xf2d27a }));
marke.visible = false;
szene.add(zeigerH, zeigerM, marke);

function groesse() {
  renderer.setSize(innerWidth, innerHeight); kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix();
}
addEventListener('resize', groesse); groesse();

// ---------- Eingabe ----------
const taste = {};
let modus = Z.start ? 'gehen' : 'start';       // start | gehen | buch | kiosk | funde | tot
let schrittWeg = 0, buch = null, ziel = null, vy = 0, amBoden = true, faellt = false, fallStart = 0n;
const leinwand = renderer.domElement;
function fangeMaus() { if (leinwand.requestPointerLock) { try { const p = leinwand.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } }
function lasseMaus() { if (document.pointerLockElement) document.exitPointerLock(); }
leinwand.addEventListener('click', () => { TON.start(); if (modus === 'gehen') fangeMaus(); });
let ziehen = false;
leinwand.addEventListener('mousedown', () => { ziehen = true; });
addEventListener('mouseup', () => { ziehen = false; });
addEventListener('mousemove', (e) => {
  if (modus !== 'gehen' || !(document.pointerLockElement === leinwand || ziehen)) return;
  Z.gier -= e.movementX * 0.0023; Z.nick = Math.max(-1.5, Math.min(1.5, Z.nick - e.movementY * 0.0023));
});
function ebene(id, an) { $(id).classList.toggle('an', an); }
function setzeModus(m) {
  modus = m;
  ebene('start', m === 'start'); ebene('buch', m === 'buch'); ebene('kiosk', m === 'kiosk'); ebene('funde', m === 'funde');
  if (m !== 'gehen') lasseMaus();
  for (const k in taste) taste[k] = false;
}
function uebersetze() {
  document.documentElement.lang = SPR;
  $('tafel').innerHTML = T('tafel');
  for (const id of ['buchhilfe', 'kiosktitel', 'kioskfrage', 'kioskhilfe', 'fundetitel']) $(id).textContent = T(id);
  $('fundezu').textContent = T('schliessen');
  $('los').onclick = () => { TON.start(); Z.start = true; setzeModus('gehen'); fangeMaus(); speichern(); };
  $('sprache').onclick = () => { SPR = SPR === 'en' ? 'de' : 'en'; Z.sprache = SPR;
    WOERTER = new Set(window.WOERTER[SPR].split(' ')); uebersetze(); speichern(); };
}
uebersetze();
$('fundezu').onclick = () => setzeModus('gehen');
addEventListener('keydown', (e) => {
  const k = e.code; TON.start();
  if (modus === 'kiosk') {
    if (k === 'Escape') setzeModus('gehen');
    if (k === 'Enter') kioskFertig();
    return;
  }
  if (k === 'Tab') { e.preventDefault(); if (modus === 'funde') setzeModus('gehen'); else if (modus === 'gehen') zeigeFunde(); return; }
  if (modus === 'buch') {
    e.preventDefault();
    if (k === 'ArrowRight' || k === 'KeyD') blaettere(1);
    else if (k === 'ArrowLeft' || k === 'KeyA') blaettere(-1);
    else if (k === 'PageDown') blaettere(10); else if (k === 'PageUp') blaettere(-10);
    else if (k === 'Home') blaettere(-SEITEN); else if (k === 'End') blaettere(SEITEN);
    else if (k === 'KeyE' || k === 'Escape') { TON.buchZu(); setzeModus('gehen'); fangeMaus(); }
    else if (k === 'KeyG') { Z.stat.geworfen++; TON.wurf(); setzeModus('gehen'); fangeMaus();
      melde(T('geworfen')); }
    return;
  }
  if (modus === 'funde') { if (k === 'Escape') setzeModus('gehen'); return; }
  if (modus === 'start') { if (k === 'Enter') $('los').click(); return; }
  if (modus !== 'gehen') return;
  taste[k] = true;
  if (k === 'Space') e.preventDefault();
  if (k === 'KeyE' && !e.repeat) benutze();
  if (k === 'KeyH') setzeModus('start');
  if (k === 'KeyM') melde(T(TON.schalteStumm() ? 'tonAus' : 'tonAn'), 2000);
});
addEventListener('keyup', (e) => { taste[e.code] = false; });

// ---------- Meldungen ----------
let meldeBis = 0;
function melde(text, dauer) { $('meldung').textContent = text; $('meldung').style.opacity = 1; meldeBis = performance.now() + (dauer || 5000); }

// ---------- Zeit ----------
const stunde = () => (Z.minuten / 60) % 24;
const lichtAn = () => stunde() >= 6 && stunde() < 22;
const tag = () => Math.floor((Z.minuten - 360) / 1440) + 1;
let warLicht = lichtAn();
function uhr() { const m = Math.floor(Z.minuten) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
function setzeLicht(an) {
  umlicht.intensity = an ? 0.95 : 0.035; richtlicht.intensity = an ? 0.55 : 0.02;
  lampenMat.color.setHex(an ? 0xfff1c8 : 0x14120f); schirmMat.color.setHex(an ? 0x9fe8ff : 0x1c3038);
  const f = an ? TAG_NEBEL : NACHT_NEBEL; szene.fog.color.copy(f); szene.background.copy(f);
}
function bisMorgen() { const m = Z.minuten % 1440; Z.minuten += (m < 360 ? 360 - m : 1440 - m + 360); }
let gesehen = new Set();
function morgen() { gesehen = new Set(); }

// ---------- Handlungen ----------
function adresse(z) { return Z.seite + '|' + stock + '|' + abschnitt + '|' + z.brett + '|' + z.platz; }
function ortText() {
  return T('ort', Z.seite ? 'B' : 'A', ende(FUSS_S, stock).slice(-9), ende(FUSS_A, abschnitt).slice(-9));
}
function benutze() {
  if (!ziel) return;
  if (ziel.art === 'buch') {
    if (!lichtAn()) return melde(T('dunkel'));
    buch = { adr: adresse(ziel), ort: ortText() + T('ortBuch', ziel.brett + 1, ziel.platz + 1), seite: 0 };
    Z.stat.buecher++; TON.buchAuf(); setzeModus('buch'); zeigeSeite();
  } else if (ziel.art === 'kiosk') {
    TON.kioskAn(); setzeModus('kiosk'); $('kioskfeld').value = ''; setTimeout(() => $('kioskfeld').focus(), 30);
  } else if (ziel.art === 'tuer') schlafe();
}
function kioskFertig() {
  const w = $('kioskfeld').value.trim(); setzeModus('gehen'); fangeMaus();
  if (!w) return;
  Z.stat.mahlzeiten++; TON.kiosk();
  melde(T('kiosk', w), 6000);
}
function schwarz(an) { $('schwarz').style.opacity = an ? 1 : 0; }
function schlafe() {
  TON.tuer(); modus = 'tot'; lasseMaus(); schwarz(true);
  setTimeout(() => { bisMorgen(); schwarz(false); setzeModus('gehen');
    melde(T('morgen', tausender(tag()))); speichern(); }, 1800);
}
function stirb(text) {
  Z.stat.tode++; TON.tod(); modus = 'tot'; lasseMaus(); schwarz(true); melde(text, 4000);
  setTimeout(() => { bisMorgen(); schwarz(false); setzeModus('gehen');
    melde(T('erwacht', tausender(tag()))); speichern(); }, 4200);
}
function zeigeSeite() {
  const text = seitenText(buch.adr, buch.seite), treffer = findeWoerter(text);
  $('seite').innerHTML = seitenHtml(text, treffer);
  $('buchort').textContent = buch.ort;
  $('buchseite').textContent = T('seiteVon', buch.seite + 1, SEITEN);
  const schluessel = buch.adr + '|' + buch.seite;
  let bestes = '';
  for (const [i, L] of treffer) if (L > bestes.length) bestes = text.substr(i, L);
  if (!gesehen.has(schluessel)) {
    gesehen.add(schluessel); Z.stat.seiten++; Z.stat.woerter += treffer.length;
    for (const [i, L] of treffer) {
      const w = text.substr(i, L);
      if (L > Z.stat.laengstes.length) { Z.stat.laengstes = w; melde(T('rekord', w, L)); TON.rekord(); }
      if (L >= 5) { Z.funde.push({ w, tag: tag(), ort: buch.ort + T('ortSeite', buch.seite + 1) }); }
    }
    Z.funde.sort((a, b) => b.w.length - a.w.length); Z.funde.length = Math.min(Z.funde.length, 40);
  }
  $('buchfund').textContent = treffer.length ? T('aufSeite', treffer.length, bestes) : T('keinWort');
}
function blaettere(d) {
  const alt = buch.seite; buch.seite = Math.max(0, Math.min(SEITEN - 1, buch.seite + d));
  if (buch.seite !== alt) { TON.blatt(); zeigeSeite(); }
}
function zeigeFunde() {
  let h = '<div style="margin-bottom:10px">' + T('fundeKopf', tausender(Z.stat.woerter)) + '</div>';
  if (!Z.funde.length) h += '<div style="opacity:.7">' + T('fundeLeer') + '</div>';
  else h += '<table>' + Z.funde.map(f => '<tr><td>' + esc(f.w) + '</td><td>' + T('tagKurz', f.tag) + '</td><td>' + esc(f.ort) + '</td></tr>').join('') + '</table>';
  $('fundliste').innerHTML = h; setzeModus('funde');
}

// ---------- Bewegung ----------
const imTreppenhaus = (x) => x > TX0 + 0.2 && x < TX0 + TREPPE - 0.2;
function boden(x, z, hoch) {            // Bodenhöhe relativ zum Stockwerk, passend zur aktuellen Höhe
  if (z >= 0) return Math.round(hoch / HOEHE) * HOEHE;
  const t = Math.min(1, -z / 5);
  const basis = (z < -5) ? 1.5 : (x < TXM ? 1.5 * t : -1.5 * t);
  return basis + Math.round((hoch - basis) / HOEHE) * HOEHE;
}
function spiegeln() {                    // Wechsel auf die andere Seite des Schachts
  Z.seite ^= 1; Z.x = PERIODE - Z.x; Z.z = TIEFE - Z.z; Z.gier += Math.PI;
}
function bewege(dt) {
  const vor = (taste.KeyW || taste.ArrowUp ? 1 : 0) - (taste.KeyS || taste.ArrowDown ? 1 : 0);
  const quer = (taste.KeyD ? 1 : 0) - (taste.KeyA ? 1 : 0);
  Z.gier += ((taste.ArrowLeft ? 1 : 0) - (taste.ArrowRight ? 1 : 0)) * 1.9 * dt;
  const tempo = faellt ? 3 : (taste.ShiftLeft || taste.ShiftRight ? 8.5 : 4.2);
  const s = Math.sin(Z.gier), c = Math.cos(Z.gier), n = Math.hypot(vor, quer) || 1;
  const dx = (-s * vor + c * quer) / n * tempo * dt, dz = (-c * vor - s * quer) / n * tempo * dt;
  let nx = Z.x + dx, nz = Z.z + dz;
  if (faellt) {
    vy = Math.max(vy - 12 * dt, -55); Z.hoch += vy * dt; Z.x = nx; Z.z = nz;
    if (Z.z <= GANG || Z.z >= GANG + SCHACHT) {
      const wucht = -vy; if (Z.z >= GANG + SCHACHT) spiegeln();
      Z.z = GANG - 0.6; Z.hoch = Math.floor(Z.hoch / HOEHE) * HOEHE; vy = 0; faellt = false; amBoden = true;
      const n = fallStart - (stock + BigInt(Math.floor(Z.hoch / HOEHE)));
      if (n > 0n) gefallen += n;
      TON.aufprall(wucht > 14);
      if (wucht > 14) stirb(T('aufschlag', tausender(n)));
    }
  } else {
    const g0 = boden(Z.x, Z.z, Z.hoch), ueber = Z.hoch - g0;
    const drin = Z.z < 0.3;                                   // schon im Treppenhaus
    if (drin) {
      nx = Math.max(TX0 + 0.2, Math.min(TX0 + TREPPE - 0.2, nx));
      if (nz > -5 && Z.z > -5.01) nx = Z.x < TXM ? Math.min(nx, TXM - 0.2) : Math.max(nx, TXM + 0.2);
      else if (nz > -5) { if (Math.abs(nx - TXM) < 0.2) nz = -5; }
      nz = Math.max(-6.7, nz);
    } else if (nz < 0.3 && !imTreppenhaus(nx)) nz = 0.3;
    if (nz > GANG - 0.25 && ueber < 1.05) nz = GANG - 0.25;   // Geländer
    const weg = Math.hypot(nx - Z.x, nz - Z.z); Z.stat.meter += weg;
    if (amBoden && weg > 0) {
      const rennt = !!(taste.ShiftLeft || taste.ShiftRight); schrittWeg += weg;
      if (schrittWeg >= (rennt ? 1.25 : 0.72)) { schrittWeg = 0; TON.schritt(rennt, nz < 0); }
    }
    Z.x = nx; Z.z = nz;
    if (Z.z > GANG) { faellt = true; amBoden = false; fallStart = stock + BigInt(Math.floor(Z.hoch / HOEHE)); }
    else {
      const g = boden(Z.x, Z.z, Z.hoch);
      if (amBoden) { Z.hoch = g; if (taste.Space) { vy = 5.7; amBoden = false; TON.sprung(); } }
      else { vy -= 12 * dt; Z.hoch += vy * dt; if (Z.hoch <= g) { Z.hoch = g; vy = 0; amBoden = true; TON.landung(); } }
    }
  }
  // zurück in den Grundausschnitt, Zähler nachführen
  const wx = Math.floor(Z.x / PERIODE); if (wx) { Z.x -= wx * PERIODE; abschnitt += BigInt(Z.seite ? -wx : wx); }
  const wy = Math.floor((Z.hoch + 1e-6) / HOEHE); if (wy) { Z.hoch -= wy * HOEHE; stock += BigInt(wy); }
}
function suche() {                       // was liegt unter dem Fadenkreuz?
  ziel = null; marke.visible = false;
  if (faellt || Z.z < 0.25 || Math.abs(Z.hoch) > 0.05) return;
  const cp = Math.cos(Z.nick), dz = -Math.cos(Z.gier) * cp; if (dz > -0.05) return;
  const t = -Z.z / dz; if (t > REICHWEITE) return;
  const x = Z.x - Math.sin(Z.gier) * cp * t, y = AUGE + Math.sin(Z.nick) * t;
  if (x >= 0 && x < REGAL) {
    const brett = Math.floor((y - SOCKEL) / BRETT_H); if (brett < 0 || brett >= BRETTER) return;
    const platz = Math.floor(x / PLATZ_B);
    ziel = { art: 'buch', brett, platz };
    marke.position.set((platz + 0.5) * PLATZ_B, SOCKEL + (brett + 0.45) * BRETT_H, 0.06); marke.visible = lichtAn();
  } else if (x > REGAL + 0.5 && x < REGAL + 1.5 && y < 2.1) ziel = { art: 'tuer' };
  else if (x > REGAL + 1.8 && x < REGAL + 2.8 && y < 1.4) ziel = { art: 'kiosk' };
}

// ---------- Anzeige ----------
function anzeige() {
  $('hud').textContent = T('hud', tausender(tag()), uhr(), lichtAn() ? '' : T('hudNacht'), Z.seite ? 'B' : 'A',
    stockText(stock + BigInt(Math.floor((Z.hoch + 0.01) / HOEHE))), tausender(STELLEN_STOCK), abschnittText(), tausender(STELLEN_ABSCHNITT));
  const st = Z.stat;
  $('stat').textContent = T('stat', tausender(st.buecher), tausender(st.seiten), tausender(st.woerter), st.laengstes || '–',
    tausender(Math.round(st.meter)), tausender(gefallen), st.tode);
  let h = '';
  if (modus === 'gehen') {
    if (faellt) h = T('faellt', tausender(fallStart - stock), Math.round(-vy * 3.6));
    else if (ziel && ziel.art === 'buch') h = T('ziehen', ziel.brett + 1, ziel.platz + 1);
    else if (ziel && ziel.art === 'tuer') h = T('schlafen');
    else if (ziel && ziel.art === 'kiosk') h = T('kioskNutzen');
  }
  $('hinweis').textContent = h;
  if (performance.now() > meldeBis) $('meldung').style.opacity = 0;
}

// ---------- Schleife ----------
let zuletzt = performance.now(), gespeichert = 0;
function bild(jetzt) {
  const dt = Math.min(0.05, (jetzt - zuletzt) / 1000); zuletzt = jetzt;
  if (modus !== 'start' && modus !== 'tot') Z.minuten += dt * MIN_PRO_SEK;
  if (modus === 'gehen') { bewege(dt); suche(); }
  const an = lichtAn();
  if (an !== warLicht) {
    warLicht = an;
    if (an) { morgen(); melde(T('morgen', tausender(tag()))); }
    else { melde(T('nacht')); if (modus === 'buch') setzeModus('gehen'); }
    TON.licht(an);
  }
  TON.raum(an && modus !== 'start');
  TON.wind(faellt && modus === 'gehen' ? Math.abs(vy) : 0);
  setzeLicht(an);
  const h = stunde();
  zeigerH.rotation.z = -(h % 12) / 12 * Math.PI * 2; zeigerM.rotation.z = -(Z.minuten % 60) / 60 * Math.PI * 2;
  kamera.position.set(Z.x, Z.hoch + AUGE, Z.z); kamera.rotation.set(Z.nick, Z.gier, 0);
  renderer.render(szene, kamera);
  anzeige();
  if (jetzt - gespeichert > 5000) { gespeichert = jetzt; speichern(); }
  requestAnimationFrame(bild);
}
setzeModus(modus);
requestAnimationFrame(bild);
addEventListener('beforeunload', speichern);

// Für Tests in der Konsole
window.spiel = { Z, seitenText, findeWoerter, boden, get stock() { return stock; }, get abschnitt() { return abschnitt; },
  bewege, get modus() { return modus; }, get faellt() { return faellt; }, taste, benutze, blaettere, get ziel() { return ziel; } };
