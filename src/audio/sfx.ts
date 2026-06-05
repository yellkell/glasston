/**
 * Tiny WebAudio sound kit — every sound is synthesised at runtime (no asset
 * files to ship or load). Short, playful blips that fit the toy aesthetic.
 *
 * The AudioContext can only start inside a user gesture, so we unlock it on the
 * first DOM interaction (the "Enter VR" button click happens before the
 * immersive session, which is enough); after that, sounds triggered from the
 * frame loop play fine.
 */

type Ctx = AudioContext & { _master?: GainNode };

let ctx: Ctx | null = null;

function getCtx(): Ctx | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC() as Ctx;
    const master = ctx.createGain();
    master.gain.value = 0.28;
    master.connect(ctx.destination);
    ctx._master = master;
  }
  return ctx;
}

function unlock(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'click', 'keydown', 'touchstart']) {
    window.addEventListener(ev, unlock, { capture: true });
  }
}

/** Call from a user gesture (e.g. menu click) to make sure audio is live. */
export function ensureAudio(): void {
  unlock();
}

function ready(): Ctx | null {
  const c = getCtx();
  if (!c) return null;
  if (c.state === 'suspended') void c.resume();
  return c.state === 'running' ? c : null;
}

interface ToneOpts {
  freq: number;
  to?: number; // glide target
  type?: OscillatorType;
  dur?: number;
  gain?: number;
  delay?: number;
}

function tone(o: ToneOpts): void {
  const c = ready();
  if (!c) return;
  const { freq, to, type = 'sine', dur = 0.12, gain = 0.2, delay = 0 } = o;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c._master!);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noise(dur = 0.08, gain = 0.15, delay = 0): void {
  const c = ready();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1400;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(c._master!);
  src.start(t0);
}

// --- Game sounds ---------------------------------------------------------

/** Firing a blaster — a light toy "pop". */
export function fire(): void {
  tone({ freq: 540, to: 190, type: 'triangle', dur: 0.09, gain: 0.22 });
  noise(0.04, 0.08);
}

/** Your shot lands on the cat — satisfying "thock". */
export function hitDealt(): void {
  tone({ freq: 320, to: 120, type: 'sine', dur: 0.14, gain: 0.3 });
  noise(0.05, 0.12);
}

/** You take a hit — a duller, lower thud. */
export function hitTaken(): void {
  tone({ freq: 170, to: 70, type: 'sawtooth', dur: 0.2, gain: 0.26 });
}

/** A dropped weapon blocks a ball — a bright "ping". */
export function block(): void {
  tone({ freq: 880, to: 1250, type: 'square', dur: 0.07, gain: 0.16 });
  tone({ freq: 1250, type: 'square', dur: 0.06, gain: 0.12, delay: 0.05 });
}

/** Soft UI tick for menu buttons. */
export function uiClick(): void {
  tone({ freq: 680, to: 900, type: 'sine', dur: 0.05, gain: 0.16 });
}

/** A weapon finished respawning — a bright little "ready" chime. */
export function weaponReady(): void {
  tone({ freq: 740, type: 'triangle', dur: 0.07, gain: 0.16 });
  tone({ freq: 1110, type: 'triangle', dur: 0.1, gain: 0.16, delay: 0.07 });
}

/** End-of-round cue. */
export function roundEnd(win: boolean): void {
  if (win) {
    tone({ freq: 523, type: 'triangle', dur: 0.1, gain: 0.2 });
    tone({ freq: 784, type: 'triangle', dur: 0.12, gain: 0.2, delay: 0.1 });
  } else {
    tone({ freq: 392, to: 300, type: 'sine', dur: 0.2, gain: 0.2 });
  }
}

/** End-of-match fanfare / sad cue. */
export function matchEnd(win: boolean): void {
  if (win) {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.16, gain: 0.22, delay: i * 0.12 }));
  } else {
    [392, 330, 262].forEach((f, i) => tone({ freq: f, to: f * 0.9, type: 'sine', dur: 0.24, gain: 0.2, delay: i * 0.16 }));
  }
}
