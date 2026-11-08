import * as THREE from 'three';

function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) / 4294967296);
  };
}

function makeCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function finishTexture(canvas, { repeat = 1, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

function monochrome(canvas, contrast = 1.0, lift = 0) {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114) - 128) * contrast + 128 + lift));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function speckle(ctx, w, h, count, colors, sizeMin = .4, sizeMax = 1.8) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    const s = sizeMin + Math.random() * (sizeMax - sizeMin);
    ctx.globalAlpha = .08 + Math.random() * .25;
    ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

export function createSandTexture() {
  const S = 512, c = makeCanvas(S), ctx = c.getContext('2d');
  const r = rng(71);
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#b78451'); g.addColorStop(.45, '#c59a67'); g.addColorStop(1, '#a8774b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const img = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - .5) * 22;
    img.data[i] += n; img.data[i + 1] += n * .85; img.data[i + 2] += n * .7;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = .04 + r() * .08;
    ctx.fillStyle = r() > .5 ? '#7b5531' : '#e3bc86';
    ctx.beginPath();
    ctx.ellipse(r() * S, r() * S, 22 + r() * 75, 7 + r() * 22, r() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Fine wind ripples.
  ctx.strokeStyle = 'rgba(80,53,29,.16)'; ctx.lineWidth = 1;
  for (let i = 0; i < 36; i++) {
    const y = r() * S;
    ctx.beginPath();
    for (let x = 0; x <= S; x += 16) ctx.lineTo(x, y + Math.sin((x + i * 27) * .045) * (3 + r() * 3));
    ctx.stroke();
  }
  speckle(ctx, S, S, 1600, ['#6f4c2e', '#dfbc85', '#88633b'], .5, 2);
  // Faint tire / boot scuffs.
  ctx.strokeStyle = 'rgba(58,38,22,.16)'; ctx.lineWidth = 5;
  for (let i = 0; i < 5; i++) {
    const x = r() * S;
    ctx.beginPath(); ctx.moveTo(x, -20); ctx.bezierCurveTo(x + 30, S * .3, x - 18, S * .75, x + 16, S + 20); ctx.stroke();
  }
  return { map: finishTexture(c, { repeat: 18 }), bump: finishTexture(monochrome(c, .65), { repeat: 18, srgb: false }) };
}

export function createSandstoneTexture(seed = 4, repeat = 3) {
  const S = 512, c = makeCanvas(S), ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = '#b3895a'; ctx.fillRect(0, 0, S, S);
  const rows = 12, bh = S / rows;
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? -45 : 0;
    for (let x = off; x < S; x += 92) {
      const w = 82 + r() * 13, h = bh - 4;
      const base = 171 + r() * 30;
      ctx.fillStyle = `rgb(${base + 20 | 0},${base - 15 | 0},${base - 67 | 0})`;
      ctx.fillRect(x + 2, row * bh + 2, w, h);
      // bevels and aged mortar edges
      ctx.fillStyle = 'rgba(255,228,184,.08)'; ctx.fillRect(x + 2, row * bh + 2, w, 2);
      ctx.fillStyle = 'rgba(53,34,19,.17)'; ctx.fillRect(x + 2, row * bh + h, w, 2);
      if (r() > .55) {
        ctx.strokeStyle = 'rgba(70,45,25,.25)'; ctx.lineWidth = .7;
        ctx.beginPath(); const sx = x + 8 + r() * w * .8, sy = row * bh + 4;
        ctx.moveTo(sx, sy); ctx.lineTo(sx + (r() - .5) * 22, sy + 8 + r() * 14); ctx.stroke();
      }
    }
  }
  // raised stucco grit
  const img = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - .5) * 13;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n * .8;
  }
  ctx.putImageData(img, 0, 0);
  speckle(ctx, S, S, 1100, ['#5f4026', '#d0a777', '#8d633c'], .4, 1.6);
  return { map: finishTexture(c, { repeat }), bump: finishTexture(monochrome(c, 1.0), { repeat, srgb: false }) };
}

export function createPlasterTexture(seed = 10, repeat = 4) {
  const S = 512, c = makeCanvas(S), ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = '#bda381'; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${120 + r() * 100 | 0},${105 + r() * 80 | 0},${75 + r() * 55 | 0},${.05 + r() * .1})`;
    ctx.beginPath(); ctx.ellipse(r() * S, r() * S, 20 + r() * 90, 10 + r() * 50, r() * 6, 0, 7); ctx.fill();
  }
  const img = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - .5) * 19;
    img.data[i] += n; img.data[i + 1] += n * .9; img.data[i + 2] += n * .7;
  }
  ctx.putImageData(img, 0, 0);
  // Cracks and water stains.
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = 'rgba(63,48,34,.18)'; ctx.lineWidth = .8 + r();
    let x = r() * S, y = r() * S;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 6; j++) { x += (r() - .5) * 24; y += 8 + r() * 18; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const g = ctx.createLinearGradient(0, 0, 0, 110);
    g.addColorStop(0, 'rgba(67,48,28,.15)'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(r() * S, r() * S * .6, 20 + r() * 50, 110);
  }
  return { map: finishTexture(c, { repeat }), bump: finishTexture(monochrome(c, 1.1), { repeat, srgb: false }) };
}

export function createCrateTexture() {
  const S = 512, c = makeCanvas(S), ctx = c.getContext('2d');
  const r = rng(33);
  ctx.fillStyle = '#6c4727'; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 6; i++) {
    const y = i * (S / 6);
    const g = ctx.createLinearGradient(0, y, 0, y + S / 6);
    g.addColorStop(0, `rgb(${123 + r() * 26 | 0},${88 + r() * 18 | 0},${50 + r() * 15 | 0})`);
    g.addColorStop(.5, `rgb(${107 + r() * 24 | 0},${74 + r() * 17 | 0},${41 + r() * 14 | 0})`);
    g.addColorStop(1, `rgb(${91 + r() * 23 | 0},${61 + r() * 15 | 0},${33 + r() * 11 | 0})`);
    ctx.fillStyle = g; ctx.fillRect(4, y + 3, S - 8, S / 6 - 6);
    ctx.strokeStyle = 'rgba(45,25,10,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(4, y + S / 6 - 3); ctx.lineTo(S - 4, y + S / 6 - 3); ctx.stroke();
    for (let k = 0; k < 10; k++) {
      ctx.strokeStyle = `rgba(${60 + r() * 30 | 0},${35 + r() * 20 | 0},${17 + r() * 10 | 0},.25)`;
      ctx.beginPath(); const gx = 8 + r() * (S - 16); ctx.moveTo(gx, y + 5); ctx.bezierCurveTo(gx + 13, y + 20, gx - 9, y + 50, gx + 7, y + S / 6 - 6); ctx.stroke();
    }
  }
  // Steel bands.
  ctx.fillStyle = '#3b3a34'; ctx.fillRect(0, 22, S, 17); ctx.fillRect(0, S - 43, S, 17);
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(0, 23, S, 2);
  for (const y of [30, S - 34]) for (const x of [32, S - 32]) {
    ctx.fillStyle = '#2a2924'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(220,210,190,.3)'; ctx.beginPath(); ctx.arc(x - 1, y - 1, 2, 0, 7); ctx.fill();
  }
  // Stenciled crate marks.
  ctx.save(); ctx.translate(S * .5, S * .5); ctx.rotate(-.03);
  ctx.strokeStyle = 'rgba(228,205,166,.43)'; ctx.lineWidth = 4; ctx.strokeRect(-94, -60, 188, 120);
  ctx.fillStyle = 'rgba(228,205,166,.5)'; ctx.font = 'bold 46px Arial'; ctx.textAlign = 'center'; ctx.fillText('7.62', 0, 3);
  ctx.font = 'bold 16px Arial'; ctx.fillText('HANDLE WITH CARE', 0, 28); ctx.restore();
  speckle(ctx, S, S, 700, ['#3c2411', '#d3ad79'], .4, 1.3);
  return { map: finishTexture(c, { repeat: 1 }), bump: finishTexture(monochrome(c, 1.0), { repeat: 1, srgb: false }) };
}

export function createMetalTexture(seed = 5, repeat = 2) {
  const S = 256, c = makeCanvas(S), ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = '#464b4b'; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 600; i++) {
    ctx.strokeStyle = `rgba(${r() > .5 ? 210 : 20},${r() > .5 ? 210 : 20},${r() > .5 ? 205 : 20},${r() * .045})`;
    ctx.lineWidth = r() * 1.2; const y = r() * S;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y + (r() - .5) * 5); ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = `rgba(112,62,28,${.06 + r() * .08})`; ctx.lineWidth = 2 + r() * 8;
    ctx.beginPath(); ctx.moveTo(r() * S, 0); ctx.lineTo(r() * S, S); ctx.stroke();
  }
  return finishTexture(c, { repeat });
}

export function createRugTexture(seed = 9) {
  const S = 384, c = makeCanvas(S), ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = '#772d20'; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#2c1916'; ctx.fillRect(2, 2, S - 4, S - 4);
  ctx.fillStyle = '#8d3a29'; ctx.fillRect(8, 8, S - 16, S - 16);
  // geometric border and medallion
  ctx.strokeStyle = '#bd7a42'; ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) ctx.strokeRect(20 + i * 7, 20 + i * 7, S - 40 - i * 14, S - 40 - i * 14);
  ctx.save(); ctx.translate(S / 2, S / 2);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i % 2 ? '#a44f32' : '#c08a4e';
    ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(20, 0); ctx.lineTo(0, 54); ctx.lineTo(-20, 0); ctx.fill();
  }
  ctx.strokeStyle = '#d0a367'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 77, 0, 7); ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 1300; i++) {
    ctx.fillStyle = `rgba(${20 + r() * 40 | 0},${10 + r() * 20 | 0},${8 + r() * 15 | 0},.1)`;
    ctx.fillRect(r() * S, r() * S, 1 + r() * 3, 1 + r() * 3);
  }
  // worn holes at the edges
  for (let i = 0; i < 15; i++) {
    ctx.fillStyle = 'rgba(107,84,55,.28)';
    ctx.beginPath(); ctx.ellipse(r() > .5 ? r() * 12 : S - r() * 12, r() * S, 2 + r() * 7, 1 + r() * 3, 0, 0, 7); ctx.fill();
  }
  return finishTexture(c, { repeat: 1 });
}

export function createClothTexture(seed = 11) {
  const S = 256, c = makeCanvas(S), ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = '#8c3b25'; ctx.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += 36) {
    ctx.fillStyle = x % 72 ? '#b46b3d' : '#37201d';
    ctx.fillRect(x, 0, 18, S);
  }
  for (let y = 0; y < S; y += 7) {
    ctx.fillStyle = `rgba(20,10,8,${.04 + r() * .07})`; ctx.fillRect(0, y, S, 2);
  }
  const im = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < im.data.length; i += 4) {
    const n = (r() - .5) * 18;
    im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n;
  }
  ctx.putImageData(im, 0, 0);
  return finishTexture(c, { repeat: 1 });
}

export function createGroundDecal(letter, color = '#db8b42', sub = 'SITE') {
  const S = 512, c = makeCanvas(S), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.translate(S / 2, S / 2);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.globalAlpha = .62;
  ctx.lineWidth = 10; ctx.setLineDash([28, 12]);
  ctx.beginPath(); ctx.arc(0, 0, 205, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  ctx.globalAlpha = .31; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 224, 0, 7); ctx.stroke();
  ctx.globalAlpha = .82; ctx.font = 'bold 245px Arial Black, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(letter, 0, -6);
  ctx.font = 'bold 30px Arial'; ctx.letterSpacing = '12px'; ctx.fillText(sub, 4, 145);
  // distressed patches
  const r = rng(letter.charCodeAt(0) * 17);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 240; i++) { ctx.globalAlpha = .1 + r() * .7; ctx.beginPath(); ctx.ellipse((r() - .5) * 440, (r() - .5) * 440, 1 + r() * 9, 1 + r() * 3, r() * 3, 0, 7); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function createSignTexture(text, opts = {}) {
  const { bg = '#43352a', fg = '#e7d5b0', accent = '#de7b39', size = 512, font = 'bold 130px Arial' } = opts;
  const c = makeCanvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = accent; ctx.lineWidth = 13; ctx.strokeRect(18, 18, size - 36, size - 36);
  ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2 + 5);
  const r = rng(3);
  for (let i = 0; i < 240; i++) {
    ctx.fillStyle = `rgba(30,22,16,${r() * .35})`;
    ctx.fillRect(r() * size, r() * size, 1 + r() * 9, 1 + r() * 5);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function createDustTexture() {
  const S = 64, c = makeCanvas(S), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,231,190,.8)'); g.addColorStop(.3, 'rgba(255,218,164,.35)'); g.addColorStop(1, 'rgba(255,205,150,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

export function createSmokeTexture() {
  const S = 128, c = makeCanvas(S), ctx = c.getContext('2d');
  const r = rng(22);
  for (let i = 0; i < 20; i++) {
    const x = S / 2 + (r() - .5) * 45, y = S / 2 + (r() - .5) * 45, rad = 15 + r() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(230,220,200,${.08 + r() * .1})`); g.addColorStop(1, 'rgba(220,210,190,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }
  return new THREE.CanvasTexture(c);
}

export function createMuzzleTexture() {
  const S = 128, c = makeCanvas(S), ctx = c.getContext('2d');
  ctx.translate(S / 2, S / 2);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 58);
  g.addColorStop(0, 'rgba(255,255,236,1)'); g.addColorStop(.15, 'rgba(255,230,150,.95)'); g.addColorStop(.45, 'rgba(255,127,25,.46)'); g.addColorStop(1, 'rgba(255,90,10,0)');
  ctx.fillStyle = g; ctx.fillRect(-64, -64, 128, 128);
  ctx.fillStyle = 'rgba(255,244,200,.9)';
  for (let i = 0; i < 7; i++) {
    ctx.rotate(Math.PI / 3.5);
    ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(0, -54 - (i % 2) * 13); ctx.lineTo(5, -3); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createNoiseTexture() {
  const S = 256, c = makeCanvas(S), ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return finishTexture(c, { repeat: 4, srgb: false });
}

export function createPosterTexture(title, subtitle, hue = 28) {
  const S = 512, c = makeCanvas(S), ctx = c.getContext('2d');
  ctx.fillStyle = `hsl(${hue},28%,17%)`; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = `hsl(${hue},63%,49%)`; ctx.fillRect(0, 0, S, 120);
  ctx.fillStyle = '#efe3d0'; ctx.font = 'bold 44px Arial'; ctx.textAlign = 'center'; ctx.fillText(title, S / 2, 180);
  ctx.fillStyle = '#b3a38e'; ctx.font = '24px Arial'; ctx.fillText(subtitle, S / 2, 225);
  // silhouette figure
  ctx.fillStyle = 'rgba(10,10,9,.75)';
  ctx.beginPath(); ctx.arc(S / 2, 310, 48, 0, 7); ctx.fill();
  ctx.fillRect(S / 2 - 62, 355, 124, 180);
  ctx.fillRect(S / 2 - 96, 383, 34, 125); ctx.fillRect(S / 2 + 62, 383, 34, 125);
  ctx.fillStyle = '#d27836'; ctx.fillRect(0, 479, S, 10);
  const r = rng(4);
  for (let i = 0; i < 140; i++) { ctx.fillStyle = `rgba(30,20,10,${r() * .25})`; ctx.fillRect(r() * S, r() * S, 2 + r() * 10, 1 + r() * 3); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function createTextures(renderer) {
  const anisoMax = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const sand = createSandTexture();
  sand.map.anisotropy = sand.bump.anisotropy = anisoMax;
  const sandstone = createSandstoneTexture(4, 4);
  const plaster = createPlasterTexture(15, 3);
  const crate = createCrateTexture();
  return {
    sand, sandstone, plaster, crate,
    metal: createMetalTexture(5, 2),
    darkMetal: createMetalTexture(14, 1),
    rug: createRugTexture(9),
    cloth: createClothTexture(11),
    dust: createDustTexture(),
    smoke: createSmokeTexture(),
    muzzle: createMuzzleTexture(),
    noise: createNoiseTexture(),
    siteA: createGroundDecal('A', '#e6a157', 'ALPHA'),
    siteB: createGroundDecal('B', '#e6a157', 'BRAVO'),
    signA: createSignTexture('A', { font: 'bold 280px Arial Black, Arial' }),
    signB: createSignTexture('B', { font: 'bold 280px Arial Black, Arial' }),
    warning: createSignTexture('!', { bg: '#1c1b18', fg: '#e8a13c', accent: '#e8a13c', font: 'bold 310px Arial Black, Arial' }),
    poster1: createPosterTexture('DUST', 'PROTOCOL / 04', 29),
    poster2: createPosterTexture('HOLD', 'THE LINE', 205),
  };
}
