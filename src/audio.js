export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.ambientGain = null;
    this.volume = 0.65;
    this.started = false;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 20; comp.ratio.value = 8; comp.attack.value = .002; comp.release.value = .24;
    this.master.connect(comp).connect(ctx.destination);
    this.noiseBuffer = this.makeNoise(2.2);
    this.startAmbience();
    this.started = true;
  }

  resume() { this.init(); if (this.ctx?.state === 'suspended') this.ctx.resume(); }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .03);
  }

  makeNoise(seconds = 1) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * .35 + white * .65;
      data[i] = last;
    }
    return buffer;
  }

  startAmbience() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer; src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 360; filter.Q.value = .6;
    const gain = ctx.createGain(); gain.gain.value = 0.028;
    const lfo = ctx.createOscillator(); lfo.frequency.value = .09;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = .012;
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(); lfo.start();
    this.ambientGain = gain;
    // distant desert tone
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 52;
    const og = ctx.createGain(); og.gain.value = .007;
    const of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 120;
    osc.connect(of).connect(og).connect(this.master); osc.start();
  }

  noiseBurst({ dur = .18, gain = .5, filter = 1800, type = 'lowpass', q = .8, pan = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(filter, t); f.Q.value = q;
    f.frequency.exponentialRampToValueAtTime(Math.max(180, filter * .25), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    const p = ctx.createStereoPanner?.(); if (p) { p.pan.value = pan; }
    src.connect(f); if (p) { f.connect(p).connect(g); } else f.connect(g);
    g.connect(this.master);
    src.start(t); src.stop(t + dur + .03);
  }

  tone({ freq = 440, endFreq = freq, dur = .12, gain = .18, type = 'sine', delay = 0, pan = 0 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (endFreq !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    const p = ctx.createStereoPanner?.(); if (p) { p.pan.value = pan; o.connect(p).connect(g); } else o.connect(g);
    g.connect(this.master); o.start(t); o.stop(t + dur + .02);
  }

  gunshot(kind = 'm4', distance = 1, pan = 0) {
    if (!this.ctx) return;
    const near = Math.max(0, Math.min(1, 1.25 - distance / 110));
    const sniper = kind === 'awp';
    const pistol = kind === 'usp';
    const gain = (sniper ? .95 : pistol ? .52 : .7) * near;
    this.noiseBurst({ dur: sniper ? .38 : .16, gain, filter: sniper ? 1300 : 2600, q: .7, pan });
    this.noiseBurst({ dur: .07, gain: gain * .7, filter: 700, type: 'bandpass', q: 1.2, pan, delay: .005 });
    this.tone({ freq: sniper ? 95 : pistol ? 145 : 112, endFreq: 38, dur: sniper ? .3 : .12, gain: gain * .7, type: 'sine', pan });
    if (near > .25) this.tone({ freq: 2200, endFreq: 900, dur: .035, gain: .04, type: 'square', pan });
    // slap of the action
    if (!sniper) this.noiseBurst({ dur: .04, gain: gain * .18, filter: 4200, type: 'highpass', pan, delay: .12 });
  }

  footstep(running = false, pan = 0) {
    const g = running ? .085 : .05;
    this.noiseBurst({ dur: .075, gain: g, filter: 440, q: 1.4, pan });
    this.tone({ freq: 90, endFreq: 52, dur: .08, gain: g * .55, type: 'sine', pan });
  }

  reload(kind = 'rifle') {
    if (!this.ctx) return;
    const times = kind === 'pistol' ? [0, .18, .45, .72] : [0, .28, .7, 1.18, 1.55];
    times.forEach((d, i) => {
      this.noiseBurst({ dur: .035, gain: .12, filter: 2800, type: 'bandpass', q: 1.8, delay: d });
      this.tone({ freq: i % 2 ? 540 : 310, endFreq: 220, dur: .04, gain: .045, type: 'square', delay: d });
    });
  }

  hitmarker(head = false) {
    this.tone({ freq: head ? 1580 : 1050, endFreq: head ? 1240 : 860, dur: head ? .13 : .055, gain: .075, type: 'triangle' });
    if (head) this.tone({ freq: 2100, endFreq: 1700, dur: .16, gain: .05, type: 'sine', delay: .02 });
  }

  kill() { this.tone({ freq: 320, endFreq: 190, dur: .18, gain: .07, type: 'triangle' }); }

  bulletWhiz(pan = 0) {
    this.noiseBurst({ dur: .13, gain: .06, filter: 5200, type: 'highpass', pan });
    this.tone({ freq: 1600, endFreq: 320, dur: .11, gain: .025, type: 'sine', pan, delay: .01 });
  }

  impact(pan = 0) { this.noiseBurst({ dur: .055, gain: .07, filter: 1600, type: 'bandpass', q: 2, pan }); }

  explosion() {
    if (!this.ctx) return;
    this.tone({ freq: 70, endFreq: 18, dur: 1.1, gain: .65, type: 'sine' });
    this.noiseBurst({ dur: 1.2, gain: .8, filter: 2400, q: .5 });
    this.noiseBurst({ dur: .35, gain: .45, filter: 420, q: .6 });
    this.tone({ freq: 42, endFreq: 15, dur: 1.7, gain: .5, type: 'triangle', delay: .08 });
  }

  beep(fast = false) {
    this.tone({ freq: fast ? 1550 : 1180, endFreq: fast ? 1450 : 1080, dur: .055, gain: .08, type: 'square' });
  }

  roundStart() {
    this.tone({ freq: 210, endFreq: 210, dur: .22, gain: .1, type: 'sawtooth' });
    this.tone({ freq: 315, endFreq: 315, dur: .22, gain: .06, type: 'sawtooth', delay: .25 });
    this.tone({ freq: 420, endFreq: 420, dur: .32, gain: .07, type: 'sawtooth', delay: .5 });
  }

  win() {
    [392, 523, 659, 784].forEach((f, i) => this.tone({ freq: f, endFreq: f, dur: .5, gain: .07, type: 'triangle', delay: i * .16 }));
  }

  lose() {
    [330, 277, 220, 165].forEach((f, i) => this.tone({ freq: f, endFreq: f, dur: .6, gain: .06, type: 'sine', delay: i * .19 }));
  }

  defuseTick(p = 0) { this.tone({ freq: 650 + p * 500, endFreq: 660 + p * 500, dur: .04, gain: .055, type: 'square' }); }

  defused() {
    this.tone({ freq: 784, endFreq: 1046, dur: .4, gain: .12, type: 'triangle' });
    this.tone({ freq: 1046, endFreq: 1318, dur: .5, gain: .1, type: 'triangle', delay: .2 });
  }

  click() { this.tone({ freq: 680, endFreq: 520, dur: .045, gain: .025, type: 'square' }); }
  hover() { this.tone({ freq: 900, endFreq: 880, dur: .025, gain: .012, type: 'sine' }); }

  heart() {
    this.tone({ freq: 62, endFreq: 45, dur: .12, gain: .16, type: 'sine' });
    this.tone({ freq: 55, endFreq: 40, dur: .13, gain: .11, type: 'sine', delay: .16 });
  }
}
