'use strict';
/* Geräusche, vollständig im Browser erzeugt (Web Audio), keine Tondateien.
   TON.start() muss nach einer Nutzereingabe aufgerufen werden, vorher bleibt alles still. */
window.TON = (function () {
  let ac = null, aus = null, rauschen = null, stumm = false;
  let windGain, windFilter, windTief, raumGain, raumAn = null;

  function start() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    aus = ac.createGain(); aus.gain.value = stumm ? 0 : 0.9; aus.connect(ac.destination);
    rauschen = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = rauschen.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Wind: Dauerrauschen, Lautstärke und Tonhöhe folgen der Fallgeschwindigkeit
    const q = ac.createBufferSource(); q.buffer = rauschen; q.loop = true;
    windFilter = ac.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 200; windFilter.Q.value = 0.7;
    windTief = ac.createBiquadFilter(); windTief.type = 'lowpass'; windTief.frequency.value = 120;
    windGain = ac.createGain(); windGain.gain.value = 0;
    const tiefGain = ac.createGain(); tiefGain.gain.value = 1.6;
    q.connect(windFilter).connect(windGain); q.connect(windTief).connect(tiefGain).connect(windGain);
    windGain.connect(aus); q.start();
    // Raumton: leises Brummen der Beleuchtung
    raumGain = ac.createGain(); raumGain.gain.value = 0; raumGain.connect(aus);
    for (const [f, v] of [[100, 1], [200, 0.35], [300, 0.12]]) {
      const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = v;
      o.connect(g).connect(raumGain); o.start();
    }
    if (raumAn !== null) { const an = raumAn; raumAn = null; raum(an); }
  }
  const bereit = () => ac && ac.state === 'running';

  // Rauschstoß durch einen Filter mit Hüllkurve
  function stoss(o) {
    if (!bereit()) return;
    const t = ac.currentTime + (o.ab || 0), q = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    q.buffer = rauschen; q.loop = true;
    f.type = o.typ || 'lowpass'; f.Q.value = o.q || 0.8;
    f.frequency.setValueAtTime(o.f0, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dauer);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol, t + (o.an || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dauer);
    q.connect(f).connect(g).connect(aus); q.start(t, Math.random() * 1.5); q.stop(t + o.dauer + 0.05);
  }
  // Einzelton mit Abklingen
  function klang(o) {
    if (!bereit()) return;
    const t = ac.currentTime + (o.ab || 0), os = ac.createOscillator(), g = ac.createGain();
    os.type = o.typ || 'sine'; os.frequency.setValueAtTime(o.f0, t);
    if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t + o.dauer);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol, t + (o.an || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dauer);
    os.connect(g).connect(aus); os.start(t); os.stop(t + o.dauer + 0.05);
  }
  const streu = (v, s) => v * (1 + (Math.random() * 2 - 1) * s);

  function schritt(rennt, treppe) {            // gedämpfter Tritt auf Teppich, auf der Treppe etwas härter
    const v = rennt ? 0.5 : 0.28;
    klang({ f0: streu(treppe ? 120 : 85, 0.12), f1: 45, dauer: 0.11, vol: v });
    stoss({ f0: streu(treppe ? 900 : 500, 0.2), dauer: rennt ? 0.07 : 0.09, vol: v * 0.5 });
  }
  function sprung() { stoss({ typ: 'bandpass', f0: 400, f1: 900, dauer: 0.12, vol: 0.12 }); }
  function landung() { klang({ f0: 90, f1: 40, dauer: 0.16, vol: 0.55 }); stoss({ f0: 600, dauer: 0.1, vol: 0.3 }); }
  function wind(v) {                           // v = Fallgeschwindigkeit in m/s, 0 schaltet ab
    if (!bereit()) return;
    const k = Math.max(0, Math.min(1, v / 55)), t = ac.currentTime;
    windGain.gain.setTargetAtTime(k * k * 0.9 + (k > 0 ? 0.03 : 0), t, 0.15);
    windFilter.frequency.setTargetAtTime(180 + k * 1500, t, 0.2);
    windTief.frequency.setTargetAtTime(80 + k * 260, t, 0.2);
  }
  function aufprall(hart) {
    klang({ f0: hart ? 70 : 95, f1: 28, dauer: hart ? 0.6 : 0.2, vol: hart ? 1 : 0.5 });
    stoss({ f0: hart ? 2500 : 700, f1: 200, dauer: hart ? 0.35 : 0.12, vol: hart ? 0.9 : 0.3 });
    if (hart) klang({ f0: 420, f1: 380, dauer: 1.4, vol: 0.12, typ: 'triangle', ab: 0.02 });   // nachklingendes Geländer
  }
  function buchAuf() {                         // Buch aus dem Regal ziehen und aufschlagen
    stoss({ typ: 'bandpass', f0: 700, f1: 1600, q: 1.2, dauer: 0.22, vol: 0.2, an: 0.08 });
    klang({ f0: 130, f1: 70, dauer: 0.12, vol: 0.35, ab: 0.24 });
    stoss({ typ: 'highpass', f0: 2500, dauer: 0.16, vol: 0.14, ab: 0.25 });
  }
  function blatt() { stoss({ typ: 'bandpass', f0: streu(2200, 0.25), f1: streu(5200, 0.2), q: 1.5, dauer: 0.13, vol: 0.16, an: 0.03 }); }
  function buchZu() {
    klang({ f0: 150, f1: 60, dauer: 0.14, vol: 0.45 }); stoss({ f0: 1400, dauer: 0.07, vol: 0.25 });
    stoss({ typ: 'bandpass', f0: 1200, f1: 500, dauer: 0.2, vol: 0.12, ab: 0.15, an: 0.05 });
  }
  function wurf() { stoss({ typ: 'bandpass', f0: 1800, f1: 250, q: 1.4, dauer: 1.3, vol: 0.3, an: 0.08 }); }
  function kioskAn() { klang({ f0: 660, dauer: 0.09, vol: 0.12, typ: 'square' }); klang({ f0: 880, dauer: 0.12, vol: 0.12, typ: 'square', ab: 0.09 }); }
  function kiosk() {                           // Surren, mechanisches Klacken, Glocke
    klang({ f0: 110, f1: 135, dauer: 1.3, vol: 0.22, typ: 'sawtooth', an: 0.15 });
    klang({ f0: 222, f1: 268, dauer: 1.3, vol: 0.08, typ: 'square', an: 0.15 });
    stoss({ f0: 1800, dauer: 0.05, vol: 0.35, ab: 1.3 }); klang({ f0: 100, f1: 60, dauer: 0.12, vol: 0.4, ab: 1.3 });
    klang({ f0: 1568, dauer: 1.1, vol: 0.22, ab: 1.5 }); klang({ f0: 2352, dauer: 0.7, vol: 0.08, ab: 1.5 });
  }
  function tuer() {
    klang({ f0: 320, f1: 260, dauer: 0.5, vol: 0.06, typ: 'sawtooth', an: 0.1 });
    klang({ f0: 80, f1: 45, dauer: 0.25, vol: 0.6, ab: 0.7 }); stoss({ f0: 900, dauer: 0.1, vol: 0.3, ab: 0.7 });
  }
  function licht(an) {                         // Schütz klackt, beim Einschalten flackern die Röhren kurz
    klang({ f0: 60, f1: 40, dauer: 0.3, vol: 0.7 }); stoss({ f0: 2200, dauer: 0.05, vol: 0.5 });
    if (an) for (let i = 0; i < 4; i++) stoss({ typ: 'highpass', f0: 4000, dauer: 0.04, vol: 0.12, ab: 0.15 + i * 0.11 + Math.random() * 0.05 });
    raum(an);
  }
  function raum(an) {
    if (an === raumAn) return; raumAn = an;
    if (bereit()) raumGain.gain.setTargetAtTime(an ? 0.014 : 0, ac.currentTime, an ? 0.8 : 0.15);
    else raumAn = null;                        // später erneut versuchen
  }
  function rekord() { [784, 988, 1175].forEach((f, i) => klang({ f0: f, dauer: 0.9, vol: 0.14, ab: i * 0.12 })); }
  function tod() { klang({ f0: 55, f1: 30, dauer: 2.5, vol: 0.5, an: 0.3 }); }
  function schalteStumm() { stumm = !stumm; if (ac) aus.gain.setTargetAtTime(stumm ? 0 : 0.9, ac.currentTime, 0.05); return stumm; }

  return { start, schritt, sprung, landung, wind, aufprall, buchAuf, blatt, buchZu, wurf, kioskAn, kiosk, tuer, licht, raum, rekord, tod,
    schalteStumm, get zustand() { return ac ? ac.state : 'kein'; } };
})();
