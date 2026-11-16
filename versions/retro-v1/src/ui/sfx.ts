// Kleine 8-Bit-Soundeffekte mit WebAudio – keine Audiodateien nötig.

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
try { muted = localStorage.getItem('om-muted') === '1'; } catch { /* Speicher nicht verfügbar */ }

export function unlockAudio() {
  if (ac) { if (ac.state === 'suspended') void ac.resume(); return; }
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.22;
    master.connect(ac.destination);
  } catch { ac = null; }
}

export function isMuted() { return muted; }
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('om-muted', m ? '1' : '0'); } catch { /* egal */ }
  if (master) master.gain.value = m ? 0 : 0.22;
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; slide?: number; delay?: number } = {}) {
  if (!ac || !master || muted) return;
  const t = ac.currentTime + (opts.delay ?? 0);
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = opts.type ?? 'square';
  o.frequency.setValueAtTime(freq, t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
  g.gain.setValueAtTime(opts.vol ?? 0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.15, delay = 0) {
  if (!ac || !master || muted) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  const g = ac.createGain();
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(g).connect(master);
  src.start(ac.currentTime + delay);
}

const N: Record<string, number> = { C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988, C6: 1047, D6: 1175, E6: 1319, G4: 392, A4: 440, C4: 262, E4: 330 };

let lastType = 0;
export const sfx = {
  type() {
    const now = performance.now();
    if (now - lastType < 45) return;
    lastType = now;
    tone(880 + Math.random() * 120, 0.03, { vol: 0.06 });
  },
  select() { tone(N.E5, 0.06, { vol: 0.15 }); tone(N.A5, 0.08, { vol: 0.15, delay: 0.06 }); },
  back() { tone(N.A4, 0.07, { vol: 0.12 }); tone(N.E4, 0.09, { vol: 0.12, delay: 0.06 }); },
  coin() { tone(N.B5, 0.07, { vol: 0.18 }); tone(N.E6, 0.22, { vol: 0.18, delay: 0.07 }); },
  whoosh() { tone(300, 0.18, { type: 'triangle', vol: 0.12, slide: 1200 }); },
  mail() { tone(N.C6, 0.05, { vol: 0.1 }); tone(N.G5, 0.05, { vol: 0.1, delay: 0.05 }); },
  bonk() { tone(140, 0.12, { vol: 0.25, slide: 70 }); },
  pop() { tone(600, 0.06, { vol: 0.15, slide: 1200 }); },
  drop() { tone(900, 0.2, { type: 'triangle', vol: 0.15, slide: 300 }); },
  storm() { noise(1.8, 0.12); },
  power() { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, 0.09, { vol: 0.14, delay: i * 0.07 })); },
  unlock() { [N.G5, N.C6, N.E6, N.G5 * 2].forEach((f, i) => tone(f, 0.1, { vol: 0.14, delay: i * 0.08 })); },
  fanfare() {
    const m = [N.C5, N.E5, N.G5, N.C6, 0, N.G5, N.C6];
    m.forEach((f, i) => f && tone(f, i === m.length - 1 ? 0.4 : 0.11, { vol: 0.16, delay: i * 0.11 }));
    m.forEach((f, i) => f && tone(f / 2, 0.1, { type: 'triangle', vol: 0.12, delay: i * 0.11 }));
  },
  buzz() { tone(180, 0.08, { type: 'sawtooth', vol: 0.06 }); tone(180, 0.08, { type: 'sawtooth', vol: 0.06, delay: 0.12 }); },
  firework() { tone(400, 0.3, { type: 'triangle', vol: 0.08, slide: 1400 }); noise(0.35, 0.1, 0.3); },
};
